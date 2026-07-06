from __future__ import annotations

from collections import Counter

from sqlalchemy import Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_interaction import JobInteraction
from app.models.user import User
from app.schemas.job import DashboardStatsResponse, JobActionRequest, TrackedJobResponse
from app.services.jobs.matching import build_dedupe_key


def apply_job_action(
    interaction: JobInteraction | None,
    user: User,
    payload: JobActionRequest,
) -> JobInteraction:
    interaction = interaction or JobInteraction(
        user_id=user.id,
        source=payload.job.source,
        source_job_id=payload.job.source_job_id,
    )
    interaction.dedupe_key = build_dedupe_key(payload.job)
    interaction.status = payload.status
    interaction.score = payload.score
    interaction.job_payload = payload.job.model_dump(mode="json")
    return interaction


async def get_existing_interaction(
    session: AsyncSession,
    user: User,
    *,
    source: str,
    source_job_id: str,
) -> JobInteraction | None:
    return await session.scalar(
        select(JobInteraction).where(
            JobInteraction.user_id == user.id,
            JobInteraction.source == source,
            JobInteraction.source_job_id == source_job_id,
        )
    )


async def list_job_interactions(
    session: AsyncSession,
    user: User,
    *,
    status: str | None = None,
) -> list[JobInteraction]:
    stmt: Select[tuple[JobInteraction]] = select(JobInteraction).where(
        JobInteraction.user_id == user.id
    )
    if status:
        stmt = stmt.where(JobInteraction.status == status)
    stmt = stmt.order_by(JobInteraction.updated_at.desc(), JobInteraction.id.desc())
    result = await session.scalars(stmt)
    return list(result)


async def clear_job_interactions(
    session: AsyncSession,
    user: User,
    *,
    status: str | None = None,
) -> int:
    stmt = delete(JobInteraction).where(JobInteraction.user_id == user.id)
    if status:
        stmt = stmt.where(JobInteraction.status == status)
    result = await session.execute(stmt)
    await session.commit()
    return int(result.rowcount or 0)


def tracked_job_response(interaction: JobInteraction) -> TrackedJobResponse:
    from app.schemas.job import NormalizedJob

    return TrackedJobResponse(
        source=interaction.source,
        source_job_id=interaction.source_job_id,
        dedupe_key=interaction.dedupe_key,
        status=interaction.status,
        score=interaction.score,
        job=NormalizedJob.model_validate(interaction.job_payload),
        updated_at=interaction.updated_at,
    )


def build_dashboard_stats(interactions: list[JobInteraction]) -> DashboardStatsResponse:
    counts = Counter(interaction.status for interaction in interactions)
    saved_scores = [
        interaction.score
        for interaction in interactions
        if interaction.status == "saved" and interaction.score is not None
    ]
    average_saved_score = round(sum(saved_scores) / len(saved_scores), 2) if saved_scores else 0.0
    recent_activity = [tracked_job_response(item) for item in interactions[:5]]
    return DashboardStatsResponse(
        total_saved=counts.get("saved", 0),
        total_applied=counts.get("applied", 0),
        total_skipped=counts.get("skipped", 0),
        total_tracked=len(interactions),
        average_saved_score=average_saved_score,
        recent_activity=recent_activity,
    )
