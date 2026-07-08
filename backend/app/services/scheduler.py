from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import session_scope
from app.integrations.telegram import TelegramClient
from app.services.telegram_service import (
    get_user_by_chat_id,
    handle_job_action_callback,
    link_telegram_account,
    run_job_checks,
)

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None
_polling_task: asyncio.Task | None = None
_update_offset: int | None = None
_telegram_client: TelegramClient | None = None


def get_telegram_client(settings: Settings | None = None) -> TelegramClient | None:
    global _telegram_client
    settings = settings or get_settings()
    if not settings.telegram_bot_token:
        return None
    if _telegram_client is None:
        _telegram_client = TelegramClient(settings.telegram_bot_token)
    return _telegram_client


async def process_telegram_update(update: dict[str, Any], session: AsyncSession) -> None:
    settings = get_settings()
    telegram = get_telegram_client(settings)
    if telegram is None:
        return
    if "callback_query" in update:
        callback = update["callback_query"]
        chat_id = callback["message"]["chat"]["id"]
        message_id = callback["message"]["message_id"]
        data = callback.get("data", "")
        user = await get_user_by_chat_id(session, chat_id)
        if user is None:
            await telegram.answer_callback_query(
                callback["id"], "Link your account from the web app first."
            )
            return
        if data.startswith("act:"):
            parts = data.split(":")
            if len(parts) != 3:
                await telegram.answer_callback_query(callback["id"], "Invalid action.")
                return
            _, status, notification_id_raw = parts
            if status not in {"saved", "applied", "skipped"}:
                await telegram.answer_callback_query(callback["id"], "Invalid action.")
                return
            message = await handle_job_action_callback(
                session, user, int(notification_id_raw), status
            )
            await telegram.answer_callback_query(callback["id"], message)
            original_text = callback["message"].get("text", "")
            await telegram.edit_message_text(
                chat_id,
                message_id,
                f"{original_text}\n\nStatus: {status}",
                reply_markup=None,
            )
        return
    message = update.get("message") or update.get("edited_message")
    if not message:
        return
    chat_id = message["chat"]["id"]
    text = (message.get("text") or "").strip()
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            linked = await link_telegram_account(session, chat_id, parts[1].strip())
            if linked:
                await telegram.send_message(
                    chat_id,
                    "Telegram linked to AI-Job-Agent.\n"
                    "You will receive hourly job alerts and a daily summary.\n"
                    "Use Save / Applied / Skip on each job message.",
                )
            else:
                await telegram.send_message(
                    chat_id, "Invalid or expired link token. Generate a new link from the web app."
                )
            return
        await telegram.send_message(
            chat_id,
            "Welcome to AI-Job-Agent bot.\n"
            "1. Upload resume on the web app\n"
            "2. Set job preferences\n"
            "3. Click Connect Telegram on Profile page\n"
            "4. Open the link and press Start",
        )
        return
    if text == "/status":
        user = await get_user_by_chat_id(session, chat_id)
        if user is None:
            await telegram.send_message(chat_id, "Account not linked yet.")
            return
        profile_ready = user.candidate_profile is not None
        prefs_ready = user.job_preference is not None
        await telegram.send_message(
            chat_id,
            f"Linked: yes\nProfile: {'ready' if profile_ready else 'missing'}\n"
            f"Preferences: {'ready' if prefs_ready else 'missing'}\n"
            f"Alerts: {'on' if user.notifications_enabled else 'off'}\n"
            f"Min score: {user.notify_min_score}",
        )


async def _poll_telegram_updates() -> None:
    global _update_offset
    settings = get_settings()
    telegram = get_telegram_client(settings)
    if telegram is None:
        return
    try:
        await telegram.delete_webhook(drop_pending_updates=True)
    except Exception:
        logger.warning("Could not reset Telegram webhook before polling", exc_info=True)
    while True:
        try:
            updates = await telegram.get_updates(_update_offset, timeout=30)
            for update in updates:
                _update_offset = update["update_id"] + 1
                async with session_scope() as session:
                    await process_telegram_update(update, session)
        except asyncio.CancelledError:
            raise
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 409:
                logger.warning(
                    "Telegram polling conflict: another bot instance or webhook is active. "
                    "Retrying in 30s. Set TELEGRAM_MODE=disabled locally if this persists."
                )
                await asyncio.sleep(30)
                continue
            logger.exception("Telegram polling HTTP error")
            await asyncio.sleep(5)
        except Exception:
            logger.exception("Telegram polling error")
            await asyncio.sleep(5)


async def _run_scheduled_checks(check_type: str) -> None:
    settings = get_settings()
    telegram = get_telegram_client(settings)
    if telegram is None or not settings.cron_enabled:
        return
    async with session_scope() as session:
        try:
            sent = await run_job_checks(session, settings, telegram, check_type=check_type)
            logger.info("Job check %s sent %s notifications", check_type, sent)
        except Exception:
            logger.exception("Scheduled job check failed")


def start_background_workers() -> None:
    global _scheduler, _polling_task
    settings = get_settings()
    if settings.environment == "test":
        return
    telegram = get_telegram_client(settings)
    if telegram is None:
        return
    if settings.telegram_mode == "polling" and _polling_task is None:
        _polling_task = asyncio.create_task(_poll_telegram_updates())
    if settings.cron_enabled and _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=settings.job_check_timezone)
        _scheduler.add_job(
            _run_scheduled_checks,
            "interval",
            hours=1,
            args=["hourly"],
            id="hourly_job_check",
            replace_existing=True,
        )
        _scheduler.add_job(
            _run_scheduled_checks,
            "cron",
            hour=settings.job_check_daily_hour,
            minute=0,
            args=["daily"],
            id="daily_job_check",
            replace_existing=True,
        )
        _scheduler.start()


async def stop_background_workers() -> None:
    global _scheduler, _polling_task
    if _polling_task is not None:
        _polling_task.cancel()
        try:
            await _polling_task
        except asyncio.CancelledError:
            pass
        _polling_task = None
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
