import pytest
from httpx import AsyncClient, MockTransport, Request, Response

from app.core.config import Settings
from app.integrations.adzuna import AdzunaJobSource
from app.schemas.job import JobSearchQuery


@pytest.mark.asyncio
async def test_adzuna_adapter_normalizes_response() -> None:
    def handler(request: Request) -> Response:
        assert request.url.path == "/v1/api/jobs/us/search/1"
        assert request.url.params["what"] == "backend engineer"
        assert request.url.params["where"] == "Remote"
        assert request.url.params["what_exclude"] == "php"
        return Response(
            200,
            json={
                "results": [
                    {
                        "id": "job-123",
                        "title": "Backend Engineer",
                        "description": "Remote Python role",
                        "redirect_url": "https://example.com/job-123",
                        "created": "2026-07-01T10:00:00Z",
                        "salary_min": 120000,
                        "salary_max": 140000,
                        "salary_currency": "USD",
                        "contract_type": "permanent",
                        "company": {"display_name": "Acme"},
                        "location": {
                            "display_name": "Austin, Texas",
                            "area": ["USA", "Texas", "Austin"],
                        },
                        "category": {"label": "IT Jobs"},
                    }
                ]
            },
        )

    settings = Settings(
        adzuna_app_id="app-id",
        adzuna_app_key="app-key",
        adzuna_country="us",
        adzuna_base_url="https://api.adzuna.com",
    )
    client = AsyncClient(
        transport=MockTransport(handler),
        base_url="https://api.adzuna.com",
    )
    source = AdzunaJobSource(settings, client=client)

    jobs = await source.search_jobs(
        JobSearchQuery(
            keywords="backend engineer",
            location="Remote",
            required_excluded_technologies=["php"],
        )
    )

    assert len(jobs) == 1
    job = jobs[0]
    assert job.source == "adzuna"
    assert job.source_job_id == "job-123"
    assert job.remote_type == "remote"
    assert job.employment_type == "permanent"
    assert job.location_area == ["USA", "Texas", "Austin"]

    await client.aclose()
