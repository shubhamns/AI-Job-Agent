from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.job import DashboardStatsResponse
from app.services.jobs.tracking import build_dashboard_stats, list_job_interactions

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(user: CurrentUser, session: DbSession) -> DashboardStatsResponse:
    interactions = await list_job_interactions(session, user)
    return build_dashboard_stats(interactions)
