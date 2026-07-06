from __future__ import annotations

import secrets
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.integrations.adzuna import AdzunaJobSource
from app.integrations.telegram import TelegramClient
from app.models.job_notification import JobNotification
from app.models.user import User
from app.schemas.job import JobActionRequest, NormalizedJob
from app.services.jobs.matching import fetch_and_rank_job_matches
from app.services.jobs.tracking import (
    apply_job_action,
    get_existing_interaction,
    list_job_interactions,
)


async def generate_link_token(session: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(24)
    user.telegram_link_token = token
    session.add(user)
    await session.commit()
    return token


async def link_telegram_account(
    session: AsyncSession,
    chat_id: int,
    link_token: str,
) -> User | None:
    user = await session.scalar(select(User).where(User.telegram_link_token == link_token))
    if user is None:
        return None
    existing = await session.scalar(select(User).where(User.telegram_chat_id == chat_id))
    if existing and existing.id != user.id:
        existing.telegram_chat_id = None
        session.add(existing)
    user.telegram_chat_id = chat_id
    user.telegram_link_token = None
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_user_by_chat_id(session: AsyncSession, chat_id: int) -> User | None:
    return await session.scalar(
        select(User)
        .options(
            selectinload(User.candidate_profile),
            selectinload(User.job_preference),
        )
        .where(User.telegram_chat_id == chat_id)
    )


async def get_notified_job_keys(session: AsyncSession, user_id: int) -> set[tuple[str, str]]:
    rows = await session.scalars(select(JobNotification).where(JobNotification.user_id == user_id))
    return {(row.source, row.source_job_id) for row in rows}


async def run_job_check_for_user(
    session: AsyncSession,
    user: User,
    settings: Settings,
    telegram: TelegramClient,
    *,
    check_type: Literal["hourly", "daily"],
) -> int:
    if not user.telegram_chat_id or not user.notifications_enabled:
        return 0
    if user.candidate_profile is None or user.job_preference is None:
        return 0
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        return 0
    interactions = await list_job_interactions(session, user)
    tracking_status_by_job_key = {
        (item.source, item.source_job_id): item.status for item in interactions
    }
    notified_keys = await get_notified_job_keys(session, user.id)
    source = AdzunaJobSource(settings)
    response = await fetch_and_rank_job_matches(
        source,
        user.candidate_profile,
        user.job_preference,
        page=1,
        results_per_page=settings.adzuna_results_per_page,
        tracking_status_by_job_key=tracking_status_by_job_key,
        min_score=user.notify_min_score,
        sort_by="score",
    )
    sent = 0
    for match in response.items:
        key = (match.job.source, match.job.source_job_id)
        if match.tracking_status != "new" or key in notified_keys:
            continue
        notification = JobNotification(
            user_id=user.id,
            source=match.job.source,
            source_job_id=match.job.source_job_id,
            score=match.score,
            job_payload=match.job.model_dump(mode="json"),
            check_type=check_type,
        )
        session.add(notification)
        await session.flush()
        message_id = await telegram.send_job_alert(user.telegram_chat_id, match, notification.id)
        notification.telegram_message_id = message_id
        notified_keys.add(key)
        sent += 1
    if sent:
        await session.commit()
    return sent


async def run_job_checks(
    session: AsyncSession,
    settings: Settings,
    telegram: TelegramClient,
    *,
    check_type: Literal["hourly", "daily"],
) -> int:
    users = await session.scalars(
        select(User)
        .options(
            selectinload(User.candidate_profile),
            selectinload(User.job_preference),
        )
        .where(User.telegram_chat_id.is_not(None), User.notifications_enabled.is_(True))
    )
    total = 0
    for user in users:
        total += await run_job_check_for_user(
            session,
            user,
            settings,
            telegram,
            check_type=check_type,
        )
    if check_type == "daily":
        for user in users:
            if user.telegram_chat_id:
                await send_daily_summary(session, user, telegram)
    return total


async def send_daily_summary(session: AsyncSession, user: User, telegram: TelegramClient) -> None:
    interactions = await list_job_interactions(session, user)
    saved = sum(1 for item in interactions if item.status == "saved")
    applied = sum(1 for item in interactions if item.status == "applied")
    skipped = sum(1 for item in interactions if item.status == "skipped")
    text = (
        "Daily AI-Job-Agent summary\n"
        f"Saved: {saved} | Applied: {applied} | Skipped: {skipped}\n"
        "Hourly scans keep running. Use buttons on job alerts to track matches."
    )
    await telegram.send_message(user.telegram_chat_id, text)


async def handle_job_action_callback(
    session: AsyncSession,
    user: User,
    notification_id: int,
    status: str,
) -> str:
    notification = await session.scalar(
        select(JobNotification).where(
            JobNotification.id == notification_id,
            JobNotification.user_id == user.id,
        )
    )
    if notification is None:
        return "Job not found."
    job = NormalizedJob.model_validate(notification.job_payload)
    interaction = await get_existing_interaction(
        session,
        user,
        source=job.source,
        source_job_id=job.source_job_id,
    )
    interaction = apply_job_action(
        interaction,
        user,
        JobActionRequest(status=status, score=notification.score, job=job),
    )
    session.add(interaction)
    await session.commit()
    return f"Marked as {status}."
