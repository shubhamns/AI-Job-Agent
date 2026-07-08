def test_pipeline_update_and_analytics_flow(client, auth_headers) -> None:
    from app.api.routes.jobs import get_job_source
    from app.schemas.job import NormalizedJob
    from app.services.jobs.sources import JobSource

    class FakeJobSource(JobSource):
        async def search_jobs(self, query):
            return [
                NormalizedJob(
                    source="adzuna",
                    source_job_id="react-1",
                    title="React Developer",
                    company_name="Acme",
                    location_display="Remote",
                    description="React Next.js TypeScript frontend role",
                    employment_type="permanent",
                    remote_type="remote",
                    salary_min=1200000,
                    salary_max=1800000,
                    redirect_url="https://example.com/react-1",
                ),
                NormalizedJob(
                    source="adzuna",
                    source_job_id="python-1",
                    title="Python Backend Engineer",
                    company_name="Beta",
                    location_display="Remote",
                    description="Python FastAPI backend role",
                    employment_type="permanent",
                    remote_type="remote",
                    salary_min=1400000,
                    salary_max=2000000,
                    redirect_url="https://example.com/python-1",
                ),
            ]

    client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={
            "full_name": "Jane Doe",
            "location": "Remote",
            "summary": "Full stack engineer",
            "years_experience": 5,
            "skills": ["React", "Next.js", "Python", "FastAPI"],
            "work_authorization": "Authorized",
        },
    )
    client.put(
        "/api/v1/profile/preferences",
        headers=auth_headers,
        json={
            "desired_titles": ["React Developer"],
            "preferred_locations": ["Remote"],
            "remote_preference": "remote-first",
            "employment_types": ["permanent"],
            "required_excluded_technologies": [],
            "preferred_excluded_technologies": [],
            "salary_min": 1000000,
            "salary_currency": "INR",
        },
    )
    client.app.dependency_overrides[get_job_source] = lambda: FakeJobSource()
    matches = client.get("/api/v1/jobs/matches?min_score=0", headers=auth_headers)
    assert matches.status_code == 200
    items = matches.json()["items"]
    assert items
    assert "ai_fit" in items[0]
    react_job = next(item for item in items if item["job"]["source_job_id"] == "react-1")
    applied = client.post(
        "/api/v1/jobs/actions",
        headers=auth_headers,
        json={
            "status": "applied",
            "score": react_job["score"],
            "ai_score": react_job["ai_fit"]["score"] if react_job.get("ai_fit") else None,
            "ai_score_rationale": react_job["ai_fit"]["rationale"]
            if react_job.get("ai_fit")
            else None,
            "job": react_job["job"],
        },
    )
    assert applied.status_code == 200
    updated = client.patch(
        "/api/v1/jobs/tracked/adzuna/react-1",
        headers=auth_headers,
        json={
            "status": "interview",
            "notes": "Phone screen scheduled",
            "follow_up_at": "2026-07-15T09:00:00Z",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "interview"
    assert updated.json()["notes"] == "Phone screen scheduled"
    assert updated.json()["follow_up_at"] is not None
    cleared = client.patch(
        "/api/v1/jobs/tracked/adzuna/react-1",
        headers=auth_headers,
        json={"follow_up_at": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["follow_up_at"] is None
    tracked = client.get("/api/v1/jobs/adzuna/react-1", headers=auth_headers)
    assert tracked.status_code == 200
    outcomes = client.get("/api/v1/analytics/outcomes", headers=auth_headers)
    assert outcomes.status_code == 200
    assert outcomes.json()["total_applications"] == 1
    strategy = client.get("/api/v1/analytics/strategy", headers=auth_headers)
    assert strategy.status_code == 200
    assert strategy.json()["recommendations"]
    pack = client.post("/api/v1/applications/adzuna/react-1/pack", headers=auth_headers)
    assert pack.status_code == 200
    payload = pack.json()
    assert payload["cv_suggestions"]
    assert payload["cover_letter"]
    assert payload["verified_claims"]
    stats = client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert stats.status_code == 200
    assert stats.json()["total_interview"] == 1
    assert stats.json()["interview_rate"] == 100.0
