from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

PIPELINE_STATUSES = frozenset({"applied", "interview", "rejected", "offer", "no_response"})
POSITIVE_OUTCOMES = frozenset({"interview", "offer"})


class JobSearchQuery(BaseModel):
    keywords: str
    location: str | None = None
    page: int = Field(default=1, ge=1)
    results_per_page: int = Field(default=20, ge=1, le=50)
    salary_min: int | None = Field(default=None, ge=0)
    employment_types: list[str] = Field(default_factory=list)
    required_excluded_technologies: list[str] = Field(default_factory=list)


class NormalizedJob(BaseModel):
    source: str
    source_job_id: str
    title: str
    company_name: str | None = None
    location_display: str | None = None
    location_area: list[str] = Field(default_factory=list)
    description: str
    category: str | None = None
    employment_type: str | None = None
    remote_type: str = "unknown"
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    redirect_url: str
    posted_at: datetime | None = None
    raw_payload: dict = Field(default_factory=dict)


class FilterDecision(BaseModel):
    passed: bool
    reasons: list[str] = Field(default_factory=list)
    required_excluded_technologies_found: list[str] = Field(default_factory=list)


class MatchScoreBreakdown(BaseModel):
    title_points: int = 0
    skill_points: int = 0
    location_points: int = 0
    employment_type_points: int = 0
    compensation_points: int = 0
    preferred_exclusion_penalty: int = 0


class AiFitScore(BaseModel):
    score: int = Field(ge=0, le=100)
    rationale: str
    score_source: str = "heuristic"


class JobMatch(BaseModel):
    dedupe_key: str
    score: int
    job: NormalizedJob
    filter_decision: FilterDecision
    tracking_status: str = "new"
    matched_skills: list[str] = Field(default_factory=list)
    preferred_excluded_technologies_found: list[str] = Field(default_factory=list)
    score_breakdown: MatchScoreBreakdown
    ai_fit: AiFitScore | None = None


class JobMatchListResponse(BaseModel):
    items: list[JobMatch]
    total: int
    ai_scoring_enabled: bool = False


class JobActionRequest(BaseModel):
    status: str = Field(
        pattern="^(saved|applied|skipped|interview|rejected|offer|no_response)$"
    )
    score: int | None = Field(default=None, ge=0, le=100)
    ai_score: int | None = Field(default=None, ge=0, le=100)
    ai_score_rationale: str | None = None
    job: NormalizedJob


class TrackedJobUpdateRequest(BaseModel):
    status: str | None = Field(
        default=None,
        pattern="^(saved|applied|skipped|interview|rejected|offer|no_response)$",
    )
    notes: str | None = None
    follow_up_at: datetime | None = None


class TrackedJobResponse(BaseModel):
    source: str
    source_job_id: str
    dedupe_key: str
    status: str
    score: int | None = None
    ai_score: int | None = None
    ai_score_rationale: str | None = None
    notes: str | None = None
    follow_up_at: datetime | None = None
    job: NormalizedJob
    updated_at: datetime


class DashboardStatsResponse(BaseModel):
    total_saved: int
    total_applied: int
    total_skipped: int
    total_interview: int
    total_rejected: int
    total_offer: int
    total_no_response: int
    total_tracked: int
    average_saved_score: float
    interview_rate: float
    recent_activity: list[TrackedJobResponse]
    upcoming_follow_ups: list[TrackedJobResponse]
