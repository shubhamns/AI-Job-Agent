from pydantic import BaseModel, Field


class TelegramLinkResponse(BaseModel):
    link_url: str
    bot_username: str | None = None


class TelegramStatusResponse(BaseModel):
    connected: bool
    notifications_enabled: bool
    notify_min_score: int


class TelegramSettingsRequest(BaseModel):
    notifications_enabled: bool | None = None
    notify_min_score: int | None = Field(default=None, ge=0, le=100)
