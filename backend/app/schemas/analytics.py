from __future__ import annotations

from pydantic import BaseModel, Field


class OutcomeBucket(BaseModel):
    label: str
    applied: int
    interviews: int
    offers: int
    interview_rate: float
    offer_rate: float


class OutcomeIntelligenceResponse(BaseModel):
    total_applications: int
    total_interviews: int
    total_offers: int
    overall_interview_rate: float
    by_role_type: list[OutcomeBucket]
    by_skill: list[OutcomeBucket]
    by_location: list[OutcomeBucket]
    by_salary_band: list[OutcomeBucket]
    by_source: list[OutcomeBucket]


class StrategyRecommendation(BaseModel):
    kind: str = Field(pattern="^(evidence|suggestion)$")
    title: str
    message: str
    metric: str | None = None
    sample_size: int | None = None
    confidence: str | None = None


class StrategyResponse(BaseModel):
    recommendations: list[StrategyRecommendation]
    llm_enabled: bool
    evidence_count: int
    suggestion_count: int
