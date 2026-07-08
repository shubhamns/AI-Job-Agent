from fastapi import APIRouter

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.schemas.analytics import OutcomeIntelligenceResponse, StrategyResponse
from app.services.jobs.tracking import list_job_interactions
from app.services.outcome_intelligence import compute_outcome_intelligence
from app.services.strategy_service import build_strategy_response

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/outcomes", response_model=OutcomeIntelligenceResponse)
async def get_outcome_intelligence(
    user: CurrentUser,
    session: DbSession,
) -> OutcomeIntelligenceResponse:
    interactions = await list_job_interactions(session, user, pipeline_only=True)
    return compute_outcome_intelligence(interactions)


@router.get("/strategy", response_model=StrategyResponse)
async def get_strategy_recommendations(
    user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
) -> StrategyResponse:
    interactions = await list_job_interactions(session, user)
    return await build_strategy_response(
        settings,
        user.candidate_profile,
        user.job_preference,
        interactions,
    )
