from fastapi import APIRouter, status
from sqlalchemy import text

from app.api.deps import AppSettings, DbSession
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health(settings: AppSettings) -> HealthResponse:
    return HealthResponse(status="ok", environment=settings.environment)


@router.get("/ready", response_model=ReadinessResponse, status_code=status.HTTP_200_OK)
async def readiness(
    settings: AppSettings,
    session: DbSession,
) -> ReadinessResponse:
    database = "skipped"
    if settings.database_url:
        await session.execute(text("SELECT 1"))
        database = "ok"
    return ReadinessResponse(status="ok", database=database)
