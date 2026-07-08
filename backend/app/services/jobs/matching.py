from __future__ import annotations

import re
from collections.abc import Iterable

from app.models.candidate_profile import CandidateProfile
from app.models.job_preference import JobPreference
from app.schemas.job import (
    AiFitScore,
    FilterDecision,
    JobMatch,
    JobMatchListResponse,
    JobSearchQuery,
    MatchScoreBreakdown,
    NormalizedJob,
)
from app.services.jobs.sources import JobSource

TOKEN_PATTERN = re.compile(r"[a-z0-9\+\#\.]+")
COMMON_TECH_HINTS = (
    "python",
    "javascript",
    "typescript",
    "react",
    "next",
    "node",
    "java",
    "go",
    "rust",
    "sql",
    "postgresql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "fastapi",
    "django",
    "flask",
    "vue",
    "angular",
    "graphql",
    "redis",
    "kafka",
    "git",
    "agile",
    "rest",
    "api",
    "microservices",
    "ci",
    "cd",
)
REMOTE_LOCATION_HINTS = ("remote", "wfh", "work from home", "anywhere")
CITY_ALIASES: dict[str, set[str]] = {
    "bangalore": {"bangalore", "bengaluru", "bangaluru", "bengaluru urban"},
    "mumbai": {"mumbai", "bombay"},
    "hyderabad": {"hyderabad", "secunderabad"},
    "delhi": {"delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida", "faridabad"},
    "chennai": {"chennai", "madras"},
    "pune": {"pune", "poona"},
    "kolkata": {"kolkata", "calcutta"},
}
EMPLOYMENT_EQUIVALENTS: dict[str, set[str]] = {
    "permanent": {"permanent", "full time", "full_time", "fulltime"},
    "contract": {"contract", "contractor", "temporary"},
    "part time": {"part time", "part_time", "parttime"},
}


def is_remote_location_label(location: str) -> bool:
    normalized = normalize_value(location)
    if not normalized:
        return True
    return any(hint in normalized for hint in REMOTE_LOCATION_HINTS)


def pick_adzuna_location(preferred_locations: list[str]) -> str | None:
    for location in preferred_locations:
        if not is_remote_location_label(location):
            return location
    return None


def location_tokens(location: str) -> set[str]:
    normalized = normalize_value(location)
    tokens = set(normalized.split()) if normalized else set()
    for canonical, aliases in CITY_ALIASES.items():
        if normalized in aliases or tokens & aliases:
            tokens.update(aliases)
            tokens.add(canonical)
    return tokens


def locations_match(preferred_location: str, job: NormalizedJob) -> bool:
    if is_remote_location_label(preferred_location):
        return normalize_value(job.remote_type) == "remote"
    preferred_tokens = location_tokens(preferred_location)
    job_text = normalize_value(job.location_display or "")
    job_areas = {normalize_value(area) for area in job.location_area}
    return any(
        token in job_text or any(token in area or area in token for area in job_areas)
        for token in preferred_tokens
    )


def employment_matches(preference_values: set[str], job_value: str) -> bool:
    if job_value in preference_values:
        return True
    for preference in preference_values:
        equivalents = EMPLOYMENT_EQUIVALENTS.get(preference, {preference})
        if job_value in equivalents:
            return True
    return False


def build_job_search_query(
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    *,
    page: int,
    results_per_page: int,
) -> JobSearchQuery:
    desired_titles = preference.desired_titles if preference else []
    keywords = desired_titles[0] if desired_titles else ""
    if not keywords and profile and profile.skills:
        keywords = " ".join(profile.skills[:3])
    if not keywords:
        keywords = "software engineer"

    preferred_locations = preference.preferred_locations if preference else []
    required_excluded = preference.required_excluded_technologies if preference else []
    employment_types = preference.employment_types if preference else []
    search_location = pick_adzuna_location(preferred_locations)

    return JobSearchQuery(
        keywords=keywords,
        location=search_location,
        page=page,
        results_per_page=results_per_page,
        salary_min=preference.salary_min if preference else None,
        employment_types=employment_types,
        required_excluded_technologies=required_excluded,
    )


async def fetch_and_rank_job_matches(
    source: JobSource,
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    *,
    page: int,
    results_per_page: int,
    tracking_status_by_job_key: dict[tuple[str, str], str] | None = None,
    min_score: int = 0,
    sort_by: str = "score",
    include_skipped: bool = False,
    search: str | None = None,
    remote_types: str | None = None,
    ai_scores_by_dedupe_key: dict[str, AiFitScore] | None = None,
    ai_scoring_enabled: bool = False,
) -> JobMatchListResponse:
    query = build_job_search_query(
        profile,
        preference,
        page=page,
        results_per_page=results_per_page,
    )
    jobs = await source.search_jobs(query)

    matches = []
    for job in jobs:
        filter_decision = evaluate_hard_filters(job, preference)
        if not filter_decision.passed:
            continue
        tracking_status = (tracking_status_by_job_key or {}).get(
            (job.source, job.source_job_id),
            "new",
        )
        if tracking_status == "skipped" and not include_skipped:
            continue
        match = score_job(job, profile, preference, filter_decision)
        match.tracking_status = tracking_status
        if ai_scores_by_dedupe_key:
            match.ai_fit = ai_scores_by_dedupe_key.get(match.dedupe_key)
        matches.append(match)

    deduped = deduplicate_matches(matches)
    if search:
        search_value = normalize_value(search)
        deduped = [
            match for match in deduped if search_value in normalize_value(job_text(match.job))
        ]
    remote_type_filters = parse_remote_type_filters(remote_types)
    if remote_type_filters:
        deduped = [
            match
            for match in deduped
            if normalize_value(match.job.remote_type) in remote_type_filters
        ]
    deduped = [match for match in deduped if match.score >= min_score]
    deduped.sort(key=lambda match: sort_key(match, sort_by))
    return JobMatchListResponse(
        items=deduped,
        total=len(deduped),
        ai_scoring_enabled=ai_scoring_enabled,
    )


def evaluate_hard_filters(
    job: NormalizedJob,
    preference: JobPreference | None,
) -> FilterDecision:
    if preference is None:
        return FilterDecision(passed=True)

    reasons: list[str] = []
    required_hits = detect_technologies(
        job_text=job_text(job),
        technologies=preference.required_excluded_technologies,
    )

    if required_hits:
        reasons.append("Job contains required excluded technologies.")

    if (
        preference.salary_min is not None
        and job.salary_max is not None
        and job.salary_max < preference.salary_min
    ):
        reasons.append("Job salary is below the minimum preference.")

    if preference.employment_types and job.employment_type:
        employment_types = {normalize_value(item) for item in preference.employment_types}
        job_employment = normalize_value(job.employment_type)
        if not employment_matches(employment_types, job_employment):
            reasons.append("Job employment type does not match the allowed preferences.")

    if preference.remote_preference:
        remote_preference = normalize_value(preference.remote_preference)
        remote_type = normalize_value(job.remote_type)
        if remote_preference == "remote-only" and remote_type != "remote":
            reasons.append("Job is not remote-only.")
        if remote_preference == "onsite-only" and remote_type == "remote":
            reasons.append("Job is not onsite.")
        if remote_preference == "hybrid-only" and remote_type != "hybrid":
            reasons.append("Job is not hybrid.")

    if preference.preferred_locations:
        physical_locations = [
            location
            for location in preference.preferred_locations
            if not is_remote_location_label(location)
        ]
        wants_remote = any(
            is_remote_location_label(location) for location in preference.preferred_locations
        )
        location_matches = any(locations_match(location, job) for location in physical_locations)
        if wants_remote and normalize_value(job.remote_type) == "remote":
            location_matches = True
        if not location_matches:
            reasons.append("Job location does not match preferred locations.")

    return FilterDecision(
        passed=not reasons,
        reasons=reasons,
        required_excluded_technologies_found=required_hits,
    )


def score_job(
    job: NormalizedJob,
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    filter_decision: FilterDecision,
) -> JobMatch:
    breakdown = MatchScoreBreakdown()
    matched_skills = detect_technologies(
        job_text=job_text(job),
        technologies=profile.skills if profile else [],
    )

    if preference and preference.desired_titles:
        title_tokens = tokenize(" ".join(preference.desired_titles))
        job_title_tokens = tokenize(job.title)
        overlap = len(title_tokens & job_title_tokens)
        breakdown.title_points = min(25, overlap * 8)
        desired_titles = {normalize_value(title) for title in preference.desired_titles}
        if normalize_value(job.title) in desired_titles:
            breakdown.title_points = 25

    breakdown.skill_points = min(35, len(matched_skills) * 7)

    if preference:
        remote_preference = normalize_value(preference.remote_preference or "")
        if remote_preference == "remote-first" and normalize_value(job.remote_type) == "remote":
            breakdown.location_points = 10
        elif remote_preference == "hybrid" and normalize_value(job.remote_type) == "hybrid":
            breakdown.location_points = 10
        elif preference.preferred_locations and any(
            normalize_value(location) in normalize_value(job.location_display or "")
            for location in preference.preferred_locations
        ):
            breakdown.location_points = 10
        elif not preference.preferred_locations:
            breakdown.location_points = 5

        if preference.employment_types:
            allowed = {normalize_value(item) for item in preference.employment_types}
            if employment_matches(allowed, normalize_value(job.employment_type or "")):
                breakdown.employment_type_points = 10
        else:
            breakdown.employment_type_points = 5

        if preference.salary_min is not None:
            if job.salary_min is not None and job.salary_min >= preference.salary_min:
                breakdown.compensation_points = 10
            elif job.salary_max is not None and job.salary_max >= preference.salary_min:
                breakdown.compensation_points = 6
        else:
            breakdown.compensation_points = 5

        preferred_excluded_hits = detect_technologies(
            job_text=job_text(job),
            technologies=preference.preferred_excluded_technologies,
        )
        breakdown.preferred_exclusion_penalty = len(preferred_excluded_hits) * 8
    else:
        preferred_excluded_hits = []

    raw_score = (
        breakdown.title_points
        + breakdown.skill_points
        + breakdown.location_points
        + breakdown.employment_type_points
        + breakdown.compensation_points
        - breakdown.preferred_exclusion_penalty
    )
    score = max(0, min(100, raw_score))

    return JobMatch(
        dedupe_key=build_dedupe_key(job),
        score=score,
        job=job,
        filter_decision=filter_decision,
        tracking_status="new",
        matched_skills=sorted(matched_skills),
        preferred_excluded_technologies_found=sorted(preferred_excluded_hits),
        score_breakdown=breakdown,
    )


def deduplicate_matches(matches: list[JobMatch]) -> list[JobMatch]:
    best_by_key: dict[str, JobMatch] = {}
    for match in matches:
        existing = best_by_key.get(match.dedupe_key)
        if existing is None or _match_sort_tuple(match) < _match_sort_tuple(existing):
            best_by_key[match.dedupe_key] = match
    return list(best_by_key.values())


def build_dedupe_key(job: NormalizedJob) -> str:
    parts = [
        normalize_value(job.title),
        normalize_value(job.company_name or ""),
        normalize_value(job.location_display or ""),
    ]
    return "::".join(parts)


def detect_technologies(*, job_text: str, technologies: Iterable[str]) -> list[str]:
    haystack = normalize_value(job_text)
    matches = []
    for technology in technologies:
        needle = normalize_value(technology)
        if needle and needle in haystack:
            matches.append(technology)
    return sorted(set(matches), key=lambda value: normalize_value(value))


def job_text_from_payload(job: dict) -> str:
    parts: list[str] = []
    for key in ("title", "description", "company_name", "category"):
        value = job.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    return " ".join(parts)


def payload_text(job: dict, key: str, fallback: str = "") -> str:
    value = job.get(key)
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def job_text(job: NormalizedJob) -> str:
    return job_text_from_payload(
        {
            "title": job.title,
            "description": job.description,
            "company_name": job.company_name,
            "category": job.category,
        }
    )


def normalize_value(value: str) -> str:
    return " ".join(TOKEN_PATTERN.findall(value.lower()))


def parse_remote_type_filters(raw: str | None) -> set[str]:
    if not raw:
        return set()
    allowed = {"remote", "hybrid", "onsite", "unknown"}
    values: set[str] = set()
    for part in raw.split(","):
        normalized = normalize_value(part)
        if not normalized:
            continue
        if normalized in allowed:
            values.add(normalized)
        elif normalized in {"on site", "on-site"}:
            values.add("onsite")
    return values


def tokenize(value: str) -> set[str]:
    return set(TOKEN_PATTERN.findall(value.lower()))


def _match_sort_tuple(match: JobMatch) -> tuple:
    return (
        -match.score,
        -(match.job.salary_max or match.job.salary_min or 0),
        match.job.posted_at.isoformat() if match.job.posted_at else "",
        match.job.redirect_url,
        match.job.source_job_id,
    )


def sort_key(match: JobMatch, sort_by: str) -> tuple:
    if sort_by == "recent":
        return (
            -(match.job.posted_at.timestamp() if match.job.posted_at else 0),
            -match.score,
            match.job.redirect_url,
            match.job.source_job_id,
        )
    if sort_by == "salary":
        return (
            -(match.job.salary_max or match.job.salary_min or 0),
            -match.score,
            match.job.redirect_url,
            match.job.source_job_id,
        )
    return (
        -match.score,
        -(match.job.salary_max or match.job.salary_min or 0),
        -(match.job.posted_at.timestamp() if match.job.posted_at else 0),
        match.job.redirect_url,
        match.job.source_job_id,
    )
