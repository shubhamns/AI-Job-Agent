from __future__ import annotations

from pydantic import BaseModel


class VerifiedClaim(BaseModel):
    claim: str
    source: str
    verified: bool


class ApplicationPackResponse(BaseModel):
    source: str
    source_job_id: str
    cv_suggestions: list[str]
    cover_letter: str
    interview_questions: list[str]
    ats_keywords_present: list[str]
    ats_keywords_missing: list[str]
    verified_claims: list[VerifiedClaim]
    pack_source: str
