from typing import Annotated

from fastapi import APIRouter, File, UploadFile, status

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.models.resume_document import ResumeDocument
from app.schemas.profile import CandidateProfileResponse
from app.schemas.resume import ResumeUploadResponse
from app.services.profile_service import apply_candidate_profile_update, extract_basic_candidate_profile
from app.services.resume_service import process_resume_upload

router = APIRouter(prefix="/resumes", tags=["resumes"])
ResumeFile = Annotated[UploadFile, File(...)]


@router.post("", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    user: CurrentUser,
    session: DbSession,
    settings: AppSettings,
    file: ResumeFile,
) -> ResumeUploadResponse:
    processed = await process_resume_upload(file, settings)
    profile = apply_candidate_profile_update(
        user.candidate_profile,
        user,
        extract_basic_candidate_profile(processed.extracted_text),
    )
    session.add(profile)
    resume = ResumeDocument(
        user_id=user.id,
        original_filename=processed.original_filename,
        stored_filename=processed.stored_filename,
        content_type=processed.content_type,
        file_size_bytes=processed.file_size_bytes,
        extracted_text=processed.extracted_text,
        storage_path=processed.storage_path,
    )
    session.add(resume)
    await session.commit()
    await session.refresh(resume)
    await session.refresh(profile)
    return ResumeUploadResponse(
        id=resume.id,
        original_filename=resume.original_filename,
        content_type=resume.content_type,
        file_size_bytes=resume.file_size_bytes,
        extracted_text=resume.extracted_text,
        profile=CandidateProfileResponse.model_validate(profile),
    )
