from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.schemas.telegram import (
    TelegramLinkResponse,
    TelegramSettingsRequest,
    TelegramStatusResponse,
)
from app.services.scheduler import get_telegram_client, process_telegram_update
from app.services.telegram_service import generate_link_token

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.get("/link", response_model=TelegramLinkResponse)
async def create_telegram_link(
    user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> TelegramLinkResponse:
    telegram = get_telegram_client(settings)
    if telegram is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot is not configured.",
        )
    token = await generate_link_token(session, user)
    username = await telegram.bot_username()
    if username:
        return TelegramLinkResponse(
            link_url=f"https://t.me/{username}?start={token}", bot_username=username
        )
    return TelegramLinkResponse(
        link_url=f"https://t.me/share/url?url=start%20{token}", bot_username=None
    )


@router.get("/status", response_model=TelegramStatusResponse)
async def telegram_status(user: CurrentUser) -> TelegramStatusResponse:
    return TelegramStatusResponse(
        connected=user.telegram_chat_id is not None,
        notifications_enabled=user.notifications_enabled,
        notify_min_score=user.notify_min_score,
    )


@router.patch("/settings", response_model=TelegramStatusResponse)
async def update_telegram_settings(
    payload: TelegramSettingsRequest,
    user: CurrentUser,
    session: DbSession,
) -> TelegramStatusResponse:
    if payload.notifications_enabled is not None:
        user.notifications_enabled = payload.notifications_enabled
    if payload.notify_min_score is not None:
        user.notify_min_score = payload.notify_min_score
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return TelegramStatusResponse(
        connected=user.telegram_chat_id is not None,
        notifications_enabled=user.notifications_enabled,
        notify_min_score=user.notify_min_score,
    )


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    session: DbSession,
    settings: AppSettings,
    secret: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
) -> dict[str, bool]:
    if settings.telegram_mode != "webhook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Webhook mode is disabled."
        )
    if settings.telegram_webhook_secret and secret != settings.telegram_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret."
        )
    update = await request.json()
    await process_telegram_update(update, session)
    return {"ok": True}
