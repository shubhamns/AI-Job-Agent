from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime

from sqlalchemy import Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_interaction import JobInteraction
from app.models.user import User
from app.schemas.job import (
    PIPELINE_STATUSES,
    POSITIVE_OUTCOMES,
    DashboardStatsResponse,
    JobActionRequest,
    TrackedJobResponse,
    TrackedJobUpdateRequest,
)
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
    if payload.ai_score is not None:
        interaction.ai_score = payload.ai_score
    if payload.ai_score_rationale is not None:
        interaction.ai_score_rationale = payload.ai_score_rationale
    interaction.job_payload = payload.job.model_dump(mode="json")
    return interaction


def apply_tracked_job_update(
    interaction: JobInteraction,
    payload: TrackedJobUpdateRequest,
) -> JobInteraction:
    fields_set = payload.model_fields_set
    if "status" in fields_set and payload.status is not None:
        interaction.status = payload.status
    if "notes" in fields_set:
        interaction.notes = payload.notes
    if "follow_up_at" in fields_set:
        interaction.follow_up_at = payload.follow_up_at
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
    pipeline_only: bool = False,
) -> list[JobInteraction]:
    stmt: Select[tuple[JobInteraction]] = select(JobInteraction).where(
        JobInteraction.user_id == user.id
    )
    if status:
        stmt = stmt.where(JobInteraction.status == status)
    elif pipeline_only:
        stmt = stmt.where(JobInteraction.status.in_(tuple(PIPELINE_STATUSES)))
    stmt = stmt.order_by(JobInteraction.updated_at.desc(), JobInteraction.id.desc())
    result = await session.scalars(stmt)
    return list(result)


async def clear_job_interactions(
    session: AsyncSession,
    user: User,
    *,
    status: str | None = None,
    limit: int | None = None,
) -> int:
    if limit is not None:
        interactions = await list_job_interactions(session, user, status=status)
        if not interactions:
            return 0
        ids = [item.id for item in interactions[:limit]]
        result = await session.execute(
            delete(JobInteraction).where(
                JobInteraction.user_id == user.id,
                JobInteraction.id.in_(ids),
            )
        )
        await session.commit()
        return int(result.rowcount or 0)
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
        ai_score=interaction.ai_score,
        ai_score_rationale=interaction.ai_score_rationale,
        notes=interaction.notes,
        follow_up_at=interaction.follow_up_at,
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
    pipeline = [item for item in interactions if item.status in PIPELINE_STATUSES]
    interviews = sum(1 for item in pipeline if item.status in POSITIVE_OUTCOMES)
    interview_rate = round((interviews / len(pipeline)) * 100, 1) if pipeline else 0.0
    now = datetime.now(UTC)
    upcoming = sorted(
        [
            item
            for item in interactions
            if item.follow_up_at is not None
            and (
                item.follow_up_at.replace(tzinfo=UTC)
                if item.follow_up_at.tzinfo is None
                else item.follow_up_at
            )
            >= now
        ],
        key=lambda item: (
            item.follow_up_at.replace(tzinfo=UTC)
            if item.follow_up_at and item.follow_up_at.tzinfo is None
            else item.follow_up_at
        )
        or now,
    )[:5]
    recent_activity = [tracked_job_response(item) for item in interactions[:5]]
    return DashboardStatsResponse(
        total_saved=counts.get("saved", 0),
        total_applied=counts.get("applied", 0),
        total_skipped=counts.get("skipped", 0),
        total_interview=counts.get("interview", 0),
        total_rejected=counts.get("rejected", 0),
        total_offer=counts.get("offer", 0),
        total_no_response=counts.get("no_response", 0),
        total_tracked=len(interactions),
        average_saved_score=average_saved_score,
        interview_rate=interview_rate,
        recent_activity=recent_activity,
        upcoming_follow_ups=[tracked_job_response(item) for item in upcoming],
    )
