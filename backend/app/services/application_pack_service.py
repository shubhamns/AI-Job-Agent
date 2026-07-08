from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.integrations.llm import LLMClient, LLMError
from app.models.application_pack import ApplicationPackRecord
from app.models.candidate_profile import CandidateProfile
from app.models.user import User
from app.schemas.application import ApplicationPackResponse, VerifiedClaim
from app.schemas.job import NormalizedJob
from app.services.jobs.matching import (
    COMMON_TECH_HINTS,
    TOKEN_PATTERN,
    detect_technologies,
    job_text,
    normalize_value,
    tokenize,
)


async def get_cached_pack(
    session: AsyncSession,
    user: User,
    source: str,
    source_job_id: str,
) -> ApplicationPackRecord | None:
    return await session.scalar(
        select(ApplicationPackRecord).where(
            ApplicationPackRecord.user_id == user.id,
            ApplicationPackRecord.source == source,
            ApplicationPackRecord.source_job_id == source_job_id,
        )
    )


def verify_claim(claim: str, sources: dict[str, str]) -> VerifiedClaim:
    normalized_claim = normalize_value(claim)
    claim_tokens = set(TOKEN_PATTERN.findall(normalized_claim))
    significant = {token for token in claim_tokens if len(token) > 2}
    for source_name, source_text in sources.items():
        if not source_text:
            continue
        haystack = normalize_value(source_text)
        source_tokens = set(TOKEN_PATTERN.findall(haystack))
        overlap = claim_tokens & source_tokens
        if (
            normalized_claim in haystack
            or significant & source_tokens
            or len(overlap) >= max(1, len(significant))
        ):
            return VerifiedClaim(claim=claim, source=source_name, verified=True)
    return VerifiedClaim(claim=claim, source="inferred", verified=False)


def extract_ats_keywords(
    job: NormalizedJob, profile: CandidateProfile | None
) -> tuple[list[str], list[str]]:
    job_tokens = tokenize(job_text(job))
    relevant = sorted(token for token in COMMON_TECH_HINTS if token in job_tokens)
    profile_tokens: set[str] = set()
    if profile:
        profile_tokens = tokenize(" ".join(profile.skills))
        if profile.summary:
            profile_tokens |= tokenize(profile.summary)
    present = sorted(token for token in relevant if token in profile_tokens)
    missing = sorted(token for token in relevant if token not in profile_tokens)
    return present, missing


def build_heuristic_pack(
    profile: CandidateProfile | None,
    resume_text: str,
    job: NormalizedJob,
) -> ApplicationPackResponse:
    present, missing = extract_ats_keywords(job, profile)
    skills = profile.skills if profile else []
    matched = detect_technologies(job_text=job_text(job), technologies=skills)
    cv_suggestions = []
    if missing:
        cv_suggestions.append(f"Add ATS keywords if truthful: {', '.join(missing[:6])}.")
    if matched:
        cv_suggestions.append(f"Move matched skills near the top: {', '.join(matched[:5])}.")
    if profile and profile.summary:
        cv_suggestions.append(
            "Tailor summary opening line to mirror the job title and top requirement."
        )
    else:
        cv_suggestions.append("Add a 2-line summary aligned to the role before applying.")
    name = profile.full_name if profile and profile.full_name else "Candidate"
    company = job.company_name or "the company"
    background = ", ".join(matched[:3]) or "software development"
    cover_letter = (
        f"Dear Hiring Team at {company},\n\n"
        f"I am applying for the {job.title} role. "
        f"My background in {background} aligns with your requirements. "
        f"I would welcome the opportunity to discuss how I can contribute.\n\n"
        f"Best regards,\n{name}"
    )
    interview_questions = [
        f"How does the team use {matched[0]} in day-to-day delivery?"
        if matched
        else "What does success look like in the first 90 days?",
        "What are the biggest technical challenges for this role?",
        "How is feedback and career growth handled on the team?",
    ]
    sources = {
        "resume": resume_text,
        "profile": " ".join(skills),
        "job": job_text(job),
    }
    claims = [verify_claim(f"Experience with {skill}", sources) for skill in matched[:4]]
    claims.append(verify_claim(f"Interest in {job.title} at {company}", sources))
    return ApplicationPackResponse(
        source=job.source,
        source_job_id=job.source_job_id,
        cv_suggestions=cv_suggestions,
        cover_letter=cover_letter,
        interview_questions=interview_questions,
        ats_keywords_present=present,
        ats_keywords_missing=missing,
        verified_claims=claims,
        pack_source="heuristic",
    )


async def generate_application_pack(
    session: AsyncSession,
    settings: Settings,
    user: User,
    profile: CandidateProfile | None,
    resume_text: str,
    job: NormalizedJob,
    *,
    refresh: bool = False,
) -> ApplicationPackResponse:
    if not refresh:
        cached = await get_cached_pack(session, user, job.source, job.source_job_id)
        if cached and cached.pack_payload:
            return ApplicationPackResponse.model_validate(cached.pack_payload)
    client = LLMClient(settings)
    if not client.enabled:
        pack = build_heuristic_pack(profile, resume_text, job)
    else:
        pack = await _generate_llm_pack(client, profile, resume_text, job)
    record = await get_cached_pack(session, user, job.source, job.source_job_id)
    payload = pack.model_dump(mode="json")
    if record:
        record.pack_payload = payload
        session.add(record)
    else:
        session.add(
            ApplicationPackRecord(
                user_id=user.id,
                source=job.source,
                source_job_id=job.source_job_id,
                pack_payload=payload,
            )
        )
    await session.commit()
    return pack


async def _generate_llm_pack(
    client: LLMClient,
    profile: CandidateProfile | None,
    resume_text: str,
    job: NormalizedJob,
) -> ApplicationPackResponse:
    profile_text = ""
    if profile:
        profile_text = (
            f"Name: {profile.full_name or 'Unknown'}\n"
            f"Skills: {', '.join(profile.skills)}\n"
            f"Summary: {profile.summary or 'N/A'}\n"
            f"Experience: {profile.years_experience or 'Unknown'} years"
        )
    prompt = (
        f"Resume text:\n{resume_text[:3000]}\n\n"
        f"Profile:\n{profile_text}\n\n"
        f"Job title: {job.title}\n"
        f"Company: {job.company_name or 'Unknown'}\n"
        f"Description: {job.description[:2500]}\n\n"
        "Return JSON with keys: cv_suggestions (string array), cover_letter (string), "
        "interview_questions (string array), claims (string array of factual claims used)."
    )
    try:
        payload = await client.complete_json(
            system=(
                "Generate an application pack using only supported resume/profile facts. "
                "Do not invent employers, degrees, or years."
            ),
            user=prompt,
        )
        present, missing = extract_ats_keywords(job, profile)
        sources = {
            "resume": resume_text,
            "profile": profile_text,
            "job": job_text(job),
        }
        raw_claims = payload.get("claims", [])
        claims = [verify_claim(str(claim), sources) for claim in raw_claims if str(claim).strip()]
        return ApplicationPackResponse(
            source=job.source,
            source_job_id=job.source_job_id,
            cv_suggestions=[str(item) for item in payload.get("cv_suggestions", [])][:6],
            cover_letter=str(payload.get("cover_letter", "")),
            interview_questions=[str(item) for item in payload.get("interview_questions", [])][:6],
            ats_keywords_present=present,
            ats_keywords_missing=missing,
            verified_claims=claims,
            pack_source="llm",
        )
    except (LLMError, ValueError, TypeError):
        return build_heuristic_pack(profile, resume_text, job)
