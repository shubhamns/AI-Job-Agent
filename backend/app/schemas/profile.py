from pydantic import BaseModel, ConfigDict, Field


class CandidateProfileBase(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=255)
    summary: str | None = None
    years_experience: int | None = Field(default=None, ge=0, le=80)
    skills: list[str] = Field(default_factory=list)
    work_authorization: str | None = Field(default=None, max_length=255)


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileExtraction(CandidateProfileBase):
    pass


class CandidateProfileResponse(CandidateProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class JobPreferenceBase(BaseModel):
    desired_titles: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)
    remote_preference: str | None = Field(default=None, max_length=50)
    employment_types: list[str] = Field(default_factory=list)
    required_excluded_technologies: list[str] = Field(default_factory=list)
    preferred_excluded_technologies: list[str] = Field(default_factory=list)
    salary_min: int | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, max_length=10)


class JobPreferenceUpdate(JobPreferenceBase):
    pass


class JobPreferenceResponse(JobPreferenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
