from app.services.profile_service import extract_basic_candidate_profile

SAMPLE_RESUME = """
Shubham Kumar
Python Engineer | Bangalore, India
+91 9876543210 | shubham@example.com
Summary
Backend engineer with 5 years of experience building APIs and data pipelines.
Skills
Python, FastAPI, PostgreSQL, Docker, React, AWS
Work Authorization
Indian citizen
"""


def test_extract_resume_profile_fields() -> None:
    profile = extract_basic_candidate_profile(SAMPLE_RESUME)
    assert profile.full_name == "Shubham Kumar"
    assert profile.phone == "+91 9876543210" or "9876543210" in (profile.phone or "")
    assert profile.location == "Bangalore, India"
    assert profile.years_experience == 5
    assert "Python" in profile.skills
    assert "FastAPI" in profile.skills
    assert "React" in profile.skills
    assert profile.work_authorization == "Indian citizen"
    assert profile.summary and "Backend engineer" in profile.summary


def test_extract_resume_ignores_remote_hybrid_as_work_authorization() -> None:
    profile = extract_basic_candidate_profile(
        "Jane Doe\nWork Authorization\nremote, hybrid\nSkills\nPython"
    )
    assert profile.work_authorization is None


def test_extract_resume_skills_from_inline_header() -> None:
    profile = extract_basic_candidate_profile(
        "Jane Doe\nTechnical Skills: Java, Spring Boot, Kubernetes\nMobile: +91 9123456780"
    )
    assert profile.full_name == "Jane Doe"
    assert profile.skills == ["Java", "Spring Boot", "Kubernetes"]
    assert profile.phone and "9123456780" in profile.phone
