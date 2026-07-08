from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.models.resume_document import ResumeDocument
from app.schemas.application import ApplicationPackResponse
from app.schemas.job import NormalizedJob
from app.services.application_pack_service import generate_application_pack
from app.services.jobs.tracking import get_existing_interaction

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/{source}/{source_job_id}/pack", response_model=ApplicationPackResponse)
async def create_application_pack(
    source: str,
    source_job_id: str,
    user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    refresh: bool = Query(default=False),
) -> ApplicationPackResponse:
    interaction = await get_existing_interaction(
        session,
        user,
        source=source,
        source_job_id=source_job_id,
    )
    if interaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track this job first.")
    job = NormalizedJob.model_validate(interaction.job_payload)
    resume = await session.scalar(
        select(ResumeDocument)
        .where(ResumeDocument.user_id == user.id)
        .order_by(ResumeDocument.created_at.desc())
    )
    resume_text = resume.extracted_text if resume else ""
    return await generate_application_pack(
        session,
        settings,
        user,
        user.candidate_profile,
        resume_text,
        job,
        refresh=refresh,
    )
