from pydantic import BaseModel, ConfigDict

from app.schemas.profile import CandidateProfileResponse


class ResumeUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    content_type: str
    file_size_bytes: int
    extracted_text: str
    profile: CandidateProfileResponse | None = None
