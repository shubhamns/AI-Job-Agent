from app.schemas.job import NormalizedJob
from app.services.ai_scoring import heuristic_ai_score
from app.services.application_pack_service import (
    build_heuristic_pack,
    extract_ats_keywords,
    verify_claim,
)
from app.services.outcome_intelligence import compute_outcome_intelligence, infer_role_type
from app.services.strategy_service import build_evidence_recommendations


def test_heuristic_ai_score_returns_bounded_value() -> None:
    job = NormalizedJob(
        source="adzuna",
        source_job_id="1",
        title="React Developer",
        company_name="Acme",
        location_display="Remote",
        description="React Next.js TypeScript frontend role",
        employment_type="permanent",
        remote_type="remote",
        redirect_url="https://example.com/jobs/1",
    )
    profile = type(
        "Profile", (), {"skills": ["React", "Next.js", "TypeScript"], "years_experience": 4}
    )()
    result = heuristic_ai_score(profile, job, 70)
    assert 0 <= result.score <= 100
    assert result.score_source == "heuristic"
    assert result.rationale


def test_verify_claim_marks_resume_backed_claims() -> None:
    sources = {
        "resume": "Built React and Next.js dashboards for enterprise clients.",
        "profile": "React Next.js TypeScript",
        "job": "React Developer role",
    }
    verified = verify_claim("Experience with React", sources)
    unverified = verify_claim("Experience with COBOL mainframes", sources)
    assert verified.verified is True
    assert unverified.verified is False


def test_extract_ats_keywords() -> None:
    job = NormalizedJob(
        source="adzuna",
        source_job_id="1",
        title="Backend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="Python FastAPI PostgreSQL AWS microservices",
        employment_type="permanent",
        remote_type="remote",
        redirect_url="https://example.com/jobs/1",
    )
    profile = type(
        "Profile", (), {"skills": ["Python", "FastAPI"], "summary": "Backend engineer"}
    )()
    present, missing = extract_ats_keywords(job, profile)
    assert "python" in present
    assert "aws" in missing


def test_build_heuristic_application_pack() -> None:
    job = NormalizedJob(
        source="adzuna",
        source_job_id="1",
        title="Frontend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="React Next.js TypeScript role",
        employment_type="permanent",
        remote_type="remote",
        redirect_url="https://example.com/jobs/1",
    )
    profile = type(
        "Profile",
        (),
        {
            "full_name": "Jane Doe",
            "skills": ["React", "Next.js"],
            "summary": "Frontend engineer",
            "years_experience": 3,
        },
    )()
    pack = build_heuristic_pack(profile, "React Next.js experience", job)
    assert pack.cv_suggestions
    assert pack.cover_letter
    assert pack.interview_questions
    assert pack.pack_source == "heuristic"


def test_infer_role_type() -> None:
    assert infer_role_type("Senior React Frontend Engineer") == "frontend"
    assert infer_role_type("Python Backend API Engineer") == "backend"


def test_outcome_intelligence_and_evidence_recommendations() -> None:
    interactions = [
        type(
            "Interaction",
            (),
            {
                "status": "interview",
                "source": "adzuna",
                "job_payload": {
                    "title": "React Developer",
                    "description": "React Next.js frontend",
                    "location_display": "Remote",
                    "remote_type": "remote",
                    "salary_min": 1200000,
                    "salary_max": 1800000,
                },
            },
        )(),
        type(
            "Interaction",
            (),
            {
                "status": "applied",
                "source": "adzuna",
                "job_payload": {
                    "title": "React Engineer",
                    "description": "React Next.js frontend",
                    "location_display": "Remote",
                    "remote_type": "remote",
                    "salary_min": 1200000,
                    "salary_max": 1800000,
                },
            },
        )(),
        type(
            "Interaction",
            (),
            {
                "status": "applied",
                "source": "adzuna",
                "job_payload": {
                    "title": "Python Backend Engineer",
                    "description": "Python FastAPI backend",
                    "location_display": "Remote",
                    "remote_type": "remote",
                    "salary_min": 1200000,
                    "salary_max": 1800000,
                },
            },
        )(),
    ]
    outcomes = compute_outcome_intelligence(interactions)
    assert outcomes.total_applications == 3
    assert outcomes.total_interviews == 1
    evidence = build_evidence_recommendations(outcomes, min_sample_size=1)
    assert evidence
    assert all(item.kind == "evidence" for item in evidence)
