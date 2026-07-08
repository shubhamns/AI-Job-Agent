from __future__ import annotations

from app.core.config import Settings
from app.integrations.llm import LLMClient, LLMError
from app.models.candidate_profile import CandidateProfile
from app.models.job_interaction import JobInteraction
from app.models.job_preference import JobPreference
from app.schemas.analytics import (
    OutcomeIntelligenceResponse,
    StrategyRecommendation,
    StrategyResponse,
)
from app.services.outcome_intelligence import compute_outcome_intelligence


def build_evidence_recommendations(
    outcomes: OutcomeIntelligenceResponse,
    min_sample_size: int,
) -> list[StrategyRecommendation]:
    recommendations: list[StrategyRecommendation] = []
    if outcomes.by_role_type:
        best = outcomes.by_role_type[0]
        worst = outcomes.by_role_type[-1]
        if best.applied >= min_sample_size and best.interview_rate > 0:
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Strong conversion in {best.label} roles",
                    message=(
                        f"{best.label.title()} roles converted to interviews at "
                        f"{best.interview_rate}% ({best.interviews}/{best.applied} applications)."
                    ),
                    metric=f"{best.interview_rate}% interview rate",
                    sample_size=best.applied,
                    confidence="high" if best.applied >= 5 else "medium",
                )
            )
        if (
            worst.applied >= min_sample_size
            and worst.interview_rate < best.interview_rate
            and worst.label != best.label
        ):
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Weaker conversion in {worst.label} roles",
                    message=(
                        f"{worst.label.title()} roles converted at only {worst.interview_rate}% "
                        f"({worst.interviews}/{worst.applied} applications)."
                    ),
                    metric=f"{worst.interview_rate}% interview rate",
                    sample_size=worst.applied,
                    confidence="high" if worst.applied >= 5 else "medium",
                )
            )
    if outcomes.by_skill:
        top_skill = outcomes.by_skill[0]
        if top_skill.applied >= min_sample_size and top_skill.interview_rate > 0:
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Skill signal: {top_skill.label}",
                    message=(
                        f"Applications mentioning {top_skill.label} reached interview stage "
                        f"at {top_skill.interview_rate}% "
                        f"({top_skill.interviews}/{top_skill.applied})."
                    ),
                    metric=f"{top_skill.interview_rate}% interview rate",
                    sample_size=top_skill.applied,
                    confidence="medium",
                )
            )
    if outcomes.by_location:
        top_location = outcomes.by_location[0]
        if top_location.applied >= min_sample_size and top_location.interview_rate > 0:
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Location signal: {top_location.label}",
                    message=(
                        f"Roles in {top_location.label} converted at "
                        f"{top_location.interview_rate}% "
                        f"({top_location.interviews}/{top_location.applied})."
                    ),
                    metric=f"{top_location.interview_rate}% interview rate",
                    sample_size=top_location.applied,
                    confidence="medium",
                )
            )
    if outcomes.by_salary_band:
        top_band = outcomes.by_salary_band[0]
        if top_band.applied >= min_sample_size and top_band.interview_rate > 0:
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Salary band signal: {top_band.label}",
                    message=(
                        f"Applications in the {top_band.label} band reached interviews "
                        f"at {top_band.interview_rate}% ({top_band.interviews}/{top_band.applied})."
                    ),
                    metric=f"{top_band.interview_rate}% interview rate",
                    sample_size=top_band.applied,
                    confidence="medium",
                )
            )
    if outcomes.by_source:
        top_source = outcomes.by_source[0]
        if top_source.applied >= min_sample_size and top_source.interview_rate > 0:
            recommendations.append(
                StrategyRecommendation(
                    kind="evidence",
                    title=f"Source signal: {top_source.label}",
                    message=(
                        f"Jobs from {top_source.label} converted at "
                        f"{top_source.interview_rate}% "
                        f"({top_source.interviews}/{top_source.applied})."
                    ),
                    metric=f"{top_source.interview_rate}% interview rate",
                    sample_size=top_source.applied,
                    confidence="medium",
                )
            )
    return recommendations


async def build_ai_suggestions(
    settings: Settings,
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    outcomes: OutcomeIntelligenceResponse,
) -> list[StrategyRecommendation]:
    client = LLMClient(settings)
    if not client.enabled:
        return _fallback_suggestions(profile, preference, outcomes)
    profile_text = ""
    if profile:
        profile_text = (
            f"Skills: {', '.join(profile.skills)}\n"
            f"Summary: {profile.summary or 'N/A'}\n"
            f"Experience: {profile.years_experience or 'Unknown'} years"
        )
    titles = preference.desired_titles if preference else []
    top_role = outcomes.by_role_type[0].label if outcomes.by_role_type else "unknown"
    prompt = (
        f"Candidate:\n{profile_text}\n\n"
        f"Desired titles: {', '.join(titles)}\n"
        f"Total applications: {outcomes.total_applications}\n"
        f"Interview rate: {outcomes.overall_interview_rate}%\n"
        f"Top role bucket: {top_role}\n"
        "Return JSON with key suggestions: array of up to 3 objects with title and message fields. "
        "These are AI suggestions, not proven facts. Keep each message under 180 characters."
    )
    try:
        payload = await client.complete_json(
            system=(
                "You are a job search strategist. "
                "Provide practical suggestions clearly marked as hypotheses."
            ),
            user=prompt,
        )
        suggestions = payload.get("suggestions", [])
        results: list[StrategyRecommendation] = []
        for item in suggestions[:3]:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "Strategy suggestion")).strip()
            message = str(item.get("message", "")).strip()
            if not message:
                continue
            results.append(
                StrategyRecommendation(
                    kind="suggestion",
                    title=title,
                    message=message,
                    confidence="low",
                )
            )
        return results or _fallback_suggestions(profile, preference, outcomes)
    except (LLMError, ValueError, TypeError):
        return _fallback_suggestions(profile, preference, outcomes)


def _fallback_suggestions(
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    outcomes: OutcomeIntelligenceResponse,
) -> list[StrategyRecommendation]:
    suggestions: list[StrategyRecommendation] = []
    if profile and profile.skills:
        suggestions.append(
            StrategyRecommendation(
                kind="suggestion",
                title="Highlight top skills in applications",
                message=(
                    f"Lead with {', '.join(profile.skills[:3])} in CV summaries and cover letters "
                    "to improve ATS alignment."
                ),
                confidence="low",
            )
        )
    if preference and preference.desired_titles:
        suggestions.append(
            StrategyRecommendation(
                kind="suggestion",
                title="Refine title targeting",
                message=(
                    f"Test variations around {preference.desired_titles[0]} and track which titles "
                    "produce more interview callbacks."
                ),
                confidence="low",
            )
        )
    if outcomes.total_applications < 5:
        suggestions.append(
            StrategyRecommendation(
                kind="suggestion",
                title="Collect more outcome data",
                message=(
                    "Track at least 5 applications through interview outcomes before relying "
                    "on evidence-based strategy shifts."
                ),
                confidence="low",
            )
        )
    return suggestions


async def build_strategy_response(
    settings: Settings,
    profile: CandidateProfile | None,
    preference: JobPreference | None,
    interactions: list[JobInteraction],
) -> StrategyResponse:
    outcomes = compute_outcome_intelligence(interactions)
    evidence = build_evidence_recommendations(outcomes, settings.min_evidence_sample_size)
    suggestions = await build_ai_suggestions(settings, profile, preference, outcomes)
    recommendations = evidence + suggestions
    return StrategyResponse(
        recommendations=recommendations,
        llm_enabled=LLMClient(settings).enabled,
        evidence_count=len(evidence),
        suggestion_count=len(suggestions),
    )
