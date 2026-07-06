from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.profile import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    JobPreferenceResponse,
    JobPreferenceUpdate,
)
from app.services.profile_service import apply_candidate_profile_update, apply_job_preference_update

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=CandidateProfileResponse | None)
async def get_profile(user: CurrentUser) -> CandidateProfileResponse | None:
    if user.candidate_profile is None:
        return None
    return CandidateProfileResponse.model_validate(user.candidate_profile)


@router.put("", response_model=CandidateProfileResponse)
async def update_profile(
    payload: CandidateProfileUpdate,
    user: CurrentUser,
    session: DbSession,
) -> CandidateProfileResponse:
    profile = apply_candidate_profile_update(user.candidate_profile, user, payload)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return CandidateProfileResponse.model_validate(profile)


@router.get("/preferences", response_model=JobPreferenceResponse | None)
async def get_job_preferences(user: CurrentUser) -> JobPreferenceResponse | None:
    if user.job_preference is None:
        return None
    return JobPreferenceResponse.model_validate(user.job_preference)


@router.put("/preferences", response_model=JobPreferenceResponse)
async def update_job_preferences(
    payload: JobPreferenceUpdate,
    user: CurrentUser,
    session: DbSession,
) -> JobPreferenceResponse:
    preference = apply_job_preference_update(user.job_preference, user, payload)
    session.add(preference)
    await session.commit()
    await session.refresh(preference)
    return JobPreferenceResponse.model_validate(preference)
