from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.integrations.llm import LLMClient, LLMError
from app.models.ai_score_cache import AiScoreCache
from app.models.candidate_profile import CandidateProfile
from app.models.user import User
from app.schemas.job import AiFitScore, NormalizedJob
from app.services.jobs.matching import detect_technologies, job_text, normalize_value, tokenize


async def get_cached_ai_score(
    session: AsyncSession,
    user: User,
    dedupe_key: str,
) -> AiScoreCache | None:
    return await session.scalar(
        select(AiScoreCache).where(
            AiScoreCache.user_id == user.id,
            AiScoreCache.dedupe_key == dedupe_key,
        )
    )


async def cache_ai_score(
    session: AsyncSession,
    user: User,
    dedupe_key: str,
    ai_score: int,
    rationale: str,
    score_source: str,
) -> AiScoreCache:
    existing = await get_cached_ai_score(session, user, dedupe_key)
    if existing:
        existing.ai_score = ai_score
        existing.rationale = rationale
        existing.score_source = score_source
        session.add(existing)
        return existing
    record = AiScoreCache(
        user_id=user.id,
        dedupe_key=dedupe_key,
        ai_score=ai_score,
        rationale=rationale,
        score_source=score_source,
    )
    try:
        async with session.begin_nested():
            session.add(record)
            await session.flush()
    except IntegrityError:
        existing = await get_cached_ai_score(session, user, dedupe_key)
        if existing is None:
            raise
        return existing
    return record


def heuristic_ai_score(
    profile: CandidateProfile | None,
    job: NormalizedJob,
    deterministic_score: int,
) -> AiFitScore:
    skills = profile.skills if profile else []
    matched = detect_technologies(job_text=job_text(job), technologies=skills)
    title_tokens = tokenize(job.title)
    profile_tokens = tokenize(" ".join(skills))
    title_overlap = len(title_tokens & profile_tokens)
    skill_ratio = len(matched) / max(len(skills), 1)
    experience_bonus = 0
    if profile and profile.years_experience is not None:
        if profile.years_experience >= 5 and "senior" in normalize_value(job.title):
            experience_bonus = 8
        elif profile.years_experience < 3 and "junior" in normalize_value(job.title):
            experience_bonus = 6
    raw = int(deterministic_score * 0.55 + skill_ratio * 30 + title_overlap * 4 + experience_bonus)
    score = max(0, min(100, raw))
    rationale_parts = [
        f"Skill alignment covers {len(matched)} of {len(skills)} profile skills.",
        f"Title overlap score: {title_overlap}.",
    ]
    if experience_bonus:
        rationale_parts.append("Experience level aligns with role seniority signals.")
    return AiFitScore(
        score=score,
        rationale=" ".join(rationale_parts),
        score_source="heuristic",
    )


async def score_job_with_ai(
    session: AsyncSession,
    settings: Settings,
    user: User,
    profile: CandidateProfile | None,
    job: NormalizedJob,
    dedupe_key: str,
    deterministic_score: int,
) -> AiFitScore:
    if not settings.ai_scoring_enabled:
        return heuristic_ai_score(profile, job, deterministic_score)
    cached = await get_cached_ai_score(session, user, dedupe_key)
    if cached:
        return AiFitScore(
            score=cached.ai_score,
            rationale=cached.rationale,
            score_source=cached.score_source,
        )
    client = LLMClient(settings)
    if not client.enabled:
        return heuristic_ai_score(profile, job, deterministic_score)
    profile_summary = ""
    if profile:
        profile_summary = (
            f"Name: {profile.full_name or 'Unknown'}\n"
            f"Skills: {', '.join(profile.skills)}\n"
            f"Experience: {profile.years_experience or 'Unknown'} years\n"
            f"Summary: {profile.summary or 'N/A'}"
        )
    prompt = (
        f"Candidate profile:\n{profile_summary}\n\n"
        f"Job title: {job.title}\n"
        f"Company: {job.company_name or 'Unknown'}\n"
        f"Description: {job.description[:2500]}\n\n"
        f"Deterministic score (reference only): {deterministic_score}\n\n"
        "Return JSON with keys: score (0-100 integer), rationale (short string explaining fit)."
    )
    try:
        payload = await client.complete_json(
            system="You evaluate job-candidate fit. Be concise and realistic.",
            user=prompt,
        )
        score = max(0, min(100, int(payload.get("score", deterministic_score))))
        rationale = str(payload.get("rationale", "AI fit assessment completed."))
        result = AiFitScore(score=score, rationale=rationale, score_source="llm")
        await cache_ai_score(session, user, dedupe_key, score, rationale, "llm")
        return result
    except (LLMError, ValueError, TypeError):
        return heuristic_ai_score(profile, job, deterministic_score)
