from __future__ import annotations

from collections import defaultdict

from app.models.job_interaction import JobInteraction
from app.schemas.analytics import OutcomeBucket, OutcomeIntelligenceResponse
from app.schemas.job import PIPELINE_STATUSES, POSITIVE_OUTCOMES
from app.services.jobs.matching import (
    COMMON_TECH_HINTS,
    detect_technologies,
    job_text_from_payload,
    normalize_value,
    payload_text,
    tokenize,
)

SALARY_BANDS = [
    (0, 500000, "0-5L"),
    (500001, 1000000, "5-10L"),
    (1000001, 1500000, "10-15L"),
    (1500001, 2500000, "15-25L"),
    (2500001, 10_000_000, "25L+"),
]
ROLE_HINTS = {
    "backend": {"backend", "api", "server", "python", "java", "node"},
    "frontend": {"frontend", "react", "next", "vue", "angular", "ui"},
    "fullstack": {"full", "stack", "fullstack"},
    "devops": {"devops", "sre", "platform", "infra", "kubernetes", "aws"},
    "data": {"data", "ml", "machine", "learning", "analytics"},
}


def _pipeline_interactions(interactions: list[JobInteraction]) -> list[JobInteraction]:
    return [item for item in interactions if item.status in PIPELINE_STATUSES]


def _interview_count(items: list[JobInteraction]) -> int:
    return sum(1 for item in items if item.status in POSITIVE_OUTCOMES)


def _offer_count(items: list[JobInteraction]) -> int:
    return sum(1 for item in items if item.status == "offer")


def _bucket_stats(items: list[JobInteraction]) -> tuple[int, int, int, float, float]:
    applied = len(items)
    interviews = _interview_count(items)
    offers = _offer_count(items)
    interview_rate = round((interviews / applied) * 100, 1) if applied else 0.0
    offer_rate = round((offers / applied) * 100, 1) if applied else 0.0
    return applied, interviews, offers, interview_rate, offer_rate


def _build_buckets(grouped: dict[str, list[JobInteraction]], limit: int = 8) -> list[OutcomeBucket]:
    buckets: list[OutcomeBucket] = []
    for label, items in grouped.items():
        applied, interviews, offers, interview_rate, offer_rate = _bucket_stats(items)
        if applied == 0:
            continue
        buckets.append(
            OutcomeBucket(
                label=label,
                applied=applied,
                interviews=interviews,
                offers=offers,
                interview_rate=interview_rate,
                offer_rate=offer_rate,
            )
        )
    buckets.sort(key=lambda item: (item.interview_rate, item.applied), reverse=True)
    return buckets[:limit]


def infer_role_type(title: str) -> str:
    tokens = tokenize(title)
    scores: dict[str, int] = defaultdict(int)
    for role, hints in ROLE_HINTS.items():
        scores[role] = len(tokens & hints)
    best = max(scores.items(), key=lambda pair: pair[1])
    return best[0] if best[1] > 0 else "other"


def salary_band(job_payload: dict) -> str:
    salary_min = job_payload.get("salary_min")
    salary_max = job_payload.get("salary_max")
    value = salary_max or salary_min
    if value is None:
        return "unknown"
    for low, high, label in SALARY_BANDS:
        if low <= int(value) <= high:
            return label
    return "unknown"


def compute_outcome_intelligence(interactions: list[JobInteraction]) -> OutcomeIntelligenceResponse:
    pipeline = _pipeline_interactions(interactions)
    by_role: dict[str, list[JobInteraction]] = defaultdict(list)
    by_skill: dict[str, list[JobInteraction]] = defaultdict(list)
    by_location: dict[str, list[JobInteraction]] = defaultdict(list)
    by_salary: dict[str, list[JobInteraction]] = defaultdict(list)
    by_source: dict[str, list[JobInteraction]] = defaultdict(list)
    for item in pipeline:
        job = item.job_payload
        role = infer_role_type(payload_text(job, "title"))
        by_role[role].append(item)
        by_source[str(item.source)].append(item)
        location = payload_text(job, "location_display") or payload_text(
            job, "remote_type", "unknown"
        )
        by_location[normalize_value(location) or "unknown"].append(item)
        by_salary[salary_band(job)].append(item)
        skills = detect_technologies(
            job_text=job_text_from_payload(job),
            technologies=_profile_skills_from_payload(job),
        )
        if not skills:
            skills = ["general"]
        for skill in skills[:5]:
            by_skill[normalize_value(skill)].append(item)
    total_applications = len(pipeline)
    total_interviews = _interview_count(pipeline)
    total_offers = _offer_count(pipeline)
    overall_rate = (
        round((total_interviews / total_applications) * 100, 1) if total_applications else 0.0
    )
    return OutcomeIntelligenceResponse(
        total_applications=total_applications,
        total_interviews=total_interviews,
        total_offers=total_offers,
        overall_interview_rate=overall_rate,
        by_role_type=_build_buckets(by_role),
        by_skill=_build_buckets(by_skill),
        by_location=_build_buckets(by_location),
        by_salary_band=_build_buckets(by_salary),
        by_source=_build_buckets(by_source),
    )


def _profile_skills_from_payload(job: dict) -> list[str]:
    return detect_technologies(job_text=job_text_from_payload(job), technologies=COMMON_TECH_HINTS)
