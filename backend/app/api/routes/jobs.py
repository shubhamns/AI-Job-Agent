from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.integrations.adzuna import AdzunaJobSource
from app.schemas.job import JobActionRequest, JobMatchListResponse, TrackedJobResponse
from app.services.jobs.matching import fetch_and_rank_job_matches
from app.services.jobs.sources import JobSource
from app.services.jobs.tracking import (
    apply_job_action,
    clear_job_interactions,
    get_existing_interaction,
    list_job_interactions,
    tracked_job_response,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


def get_job_source(settings: AppSettings) -> JobSource:
    return AdzunaJobSource(settings)


@router.get("/matches", response_model=JobMatchListResponse)
async def list_job_matches(
    user: CurrentUser,
    source: Annotated[JobSource, Depends(get_job_source)],
    session: DbSession,
    settings: AppSettings,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    min_score: int = Query(default=0, ge=0, le=100),
    sort_by: str = Query(default="score", pattern="^(score|recent|salary)$"),
    include_skipped: bool = Query(default=False),
    search: str | None = Query(default=None),
    remote_types: str | None = Query(default=None),
) -> JobMatchListResponse:
    interactions = await list_job_interactions(session, user)
    tracking_status_by_job_key = {
        (item.source, item.source_job_id): item.status for item in interactions
    }
    return await fetch_and_rank_job_matches(
        source,
        user.candidate_profile,
        user.job_preference,
        page=page,
        results_per_page=min(limit, settings.adzuna_results_per_page),
        tracking_status_by_job_key=tracking_status_by_job_key,
        min_score=min_score,
        sort_by=sort_by,
        include_skipped=include_skipped,
        search=search,
        remote_types=remote_types,
    )


@router.get("/tracked", response_model=list[TrackedJobResponse])
async def list_tracked_jobs(
    user: CurrentUser,
    session: DbSession,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[TrackedJobResponse]:
    interactions = await list_job_interactions(session, user, status=status_filter)
    return [tracked_job_response(item) for item in interactions]


@router.post("/actions", response_model=TrackedJobResponse, status_code=status.HTTP_200_OK)
async def track_job_action(
    payload: JobActionRequest,
    user: CurrentUser,
    session: DbSession,
) -> TrackedJobResponse:
    interaction = await get_existing_interaction(
        session,
        user,
        source=payload.job.source,
        source_job_id=payload.job.source_job_id,
    )
    interaction = apply_job_action(interaction, user, payload)
    session.add(interaction)
    await session.commit()
    await session.refresh(interaction)
    return tracked_job_response(interaction)


@router.delete("/tracked", status_code=status.HTTP_200_OK)
async def clear_tracked_jobs(
    user: CurrentUser,
    session: DbSession,
    status_filter: str | None = Query(default=None, alias="status"),
) -> dict[str, int]:
    cleared = await clear_job_interactions(session, user, status=status_filter)
    return {"cleared": cleared}
