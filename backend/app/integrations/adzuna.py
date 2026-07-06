from __future__ import annotations

from datetime import datetime

import httpx

from app.core.config import Settings
from app.schemas.job import JobSearchQuery, NormalizedJob
from app.services.jobs.sources import JobSource


class AdzunaConfigurationError(RuntimeError):
    pass


class AdzunaJobSource(JobSource):
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            raise AdzunaConfigurationError("Adzuna credentials are not configured.")
        self._settings = settings
        self._client = client

    async def search_jobs(self, query: JobSearchQuery) -> list[NormalizedJob]:
        async with self._get_client() as client:
            response = await client.get(
                f"/v1/api/jobs/{self._settings.adzuna_country}/search/{query.page}",
                params=self._build_params(query),
            )
            response.raise_for_status()
            payload = response.json()
        return [self._normalize_job(item) for item in payload.get("results", [])]

    def _build_params(self, query: JobSearchQuery) -> dict[str, str | int]:
        params: dict[str, str | int] = {
            "app_id": self._settings.adzuna_app_id or "",
            "app_key": self._settings.adzuna_app_key or "",
            "results_per_page": query.results_per_page,
            "what": query.keywords,
            "content-type": "application/json",
        }
        if query.location:
            params["where"] = query.location
        if query.salary_min is not None:
            params["salary_min"] = query.salary_min

        employment_types = {item.lower() for item in query.employment_types}
        if "full_time" in employment_types or "full-time" in employment_types:
            params["full_time"] = 1
        if "part_time" in employment_types or "part-time" in employment_types:
            params["part_time"] = 1
        if "permanent" in employment_types:
            params["permanent"] = 1
        if "contract" in employment_types:
            params["contract"] = 1
        if query.required_excluded_technologies:
            params["what_exclude"] = " ".join(query.required_excluded_technologies)
        return params

    def _normalize_job(self, item: dict) -> NormalizedJob:
        location = item.get("location") or {}
        company = item.get("company") or {}
        category = item.get("category") or {}

        return NormalizedJob(
            source="adzuna",
            source_job_id=str(item.get("id", "")),
            title=item.get("title", ""),
            company_name=company.get("display_name"),
            location_display=location.get("display_name"),
            location_area=location.get("area") or [],
            description=item.get("description", ""),
            category=category.get("label"),
            employment_type=self._normalize_employment_type(item),
            remote_type=infer_remote_type(
                title=item.get("title", ""),
                description=item.get("description", ""),
            ),
            salary_min=item.get("salary_min"),
            salary_max=item.get("salary_max"),
            salary_currency=item.get("salary_currency"),
            redirect_url=item.get("redirect_url", ""),
            posted_at=parse_adzuna_datetime(item.get("created")),
            raw_payload=item,
        )

    def _normalize_employment_type(self, item: dict) -> str | None:
        contract_type = item.get("contract_type")
        contract_time = item.get("contract_time")
        if contract_type:
            return str(contract_type).lower()
        if contract_time:
            return str(contract_time).lower()
        return None

    def _get_client(self):
        if self._client is not None:
            return _ExternalClientContext(self._client)
        return httpx.AsyncClient(base_url=self._settings.adzuna_base_url, timeout=20.0)


class _ExternalClientContext:
    def __init__(self, client: httpx.AsyncClient):
        self._client = client

    async def __aenter__(self) -> httpx.AsyncClient:
        return self._client

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        return False


def infer_remote_type(*, title: str, description: str) -> str:
    combined = f"{title} {description}".lower()
    if "hybrid" in combined:
        return "hybrid"
    if "remote" in combined or "work from home" in combined:
        return "remote"
    if "on-site" in combined or "onsite" in combined:
        return "onsite"
    return "unknown"


def parse_adzuna_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
