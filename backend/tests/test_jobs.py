from app.api.routes.jobs import get_job_source
from app.schemas.job import JobSearchQuery, NormalizedJob
from app.services.jobs.matching import (
    build_job_search_query,
    deduplicate_matches,
    evaluate_hard_filters,
    job_text_from_payload,
    parse_remote_type_filters,
    score_job,
)
from app.services.jobs.sources import JobSource


class FakeJobSource(JobSource):
    def __init__(self, jobs: list[NormalizedJob]):
        self.jobs = jobs

    async def search_jobs(self, query: JobSearchQuery) -> list[NormalizedJob]:
        assert query.keywords == "Backend Engineer"
        assert query.required_excluded_technologies == ["php"]
        return self.jobs


def _update_profile_and_preferences(client, auth_headers) -> None:
    profile_response = client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={
            "full_name": "Jane Doe",
            "location": "Remote",
            "summary": "Backend engineer",
            "years_experience": 6,
            "skills": ["Python", "FastAPI", "SQLAlchemy"],
            "work_authorization": "US Citizen",
        },
    )
    assert profile_response.status_code == 200

    preference_response = client.put(
        "/api/v1/profile/preferences",
        headers=auth_headers,
        json={
            "desired_titles": ["Backend Engineer"],
            "preferred_locations": ["Remote", "Austin"],
            "remote_preference": "remote-first",
            "employment_types": ["permanent"],
            "required_excluded_technologies": ["php"],
            "preferred_excluded_technologies": ["wordpress"],
            "salary_min": 120000,
            "salary_currency": "USD",
        },
    )
    assert preference_response.status_code == 200


def test_build_job_search_query_skips_remote_only_locations() -> None:
    preference = type(
        "Preference",
        (),
        {
            "desired_titles": ["Full Stack Developer"],
            "preferred_locations": ["Remote India", "Bangalore"],
            "salary_min": None,
            "required_excluded_technologies": [],
            "employment_types": ["permanent"],
        },
    )()
    query = build_job_search_query(None, preference, page=1, results_per_page=20)
    assert query.location == "Bangalore"
    assert query.keywords == "Full Stack Developer"


def test_build_job_search_query_without_city_uses_keywords_only() -> None:
    preference = type(
        "Preference",
        (),
        {
            "desired_titles": ["Python Developer"],
            "preferred_locations": ["Remote India"],
            "salary_min": None,
            "required_excluded_technologies": [],
            "employment_types": [],
        },
    )()
    query = build_job_search_query(None, preference, page=1, results_per_page=20)
    assert query.location is None
    assert query.keywords == "Python Developer"


def test_job_matching_route_deduplicates_filters_and_scores_deterministically(
    client,
    auth_headers,
) -> None:
    _update_profile_and_preferences(client, auth_headers)

    jobs = [
        NormalizedJob(
            source="adzuna",
            source_job_id="1",
            title="Backend Engineer",
            company_name="Acme",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=150000,
            redirect_url="https://example.com/jobs/1",
        ),
        NormalizedJob(
            source="adzuna",
            source_job_id="2",
            title="Backend Engineer",
            company_name="Acme",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role with wordpress stack",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=160000,
            redirect_url="https://example.com/jobs/2",
        ),
        NormalizedJob(
            source="adzuna",
            source_job_id="3",
            title="Backend Engineer",
            company_name="Blocked Corp",
            location_display="Remote",
            description="Python role with php services",
            employment_type="permanent",
            remote_type="remote",
            salary_min=140000,
            salary_max=155000,
            redirect_url="https://example.com/jobs/3",
        ),
    ]

    client.app.dependency_overrides[get_job_source] = lambda: FakeJobSource(jobs)
    response_one = client.get("/api/v1/jobs/matches", headers=auth_headers)
    response_two = client.get("/api/v1/jobs/matches", headers=auth_headers)

    assert response_one.status_code == 200
    assert response_two.status_code == 200
    assert response_one.json() == response_two.json()

    payload = response_one.json()
    assert payload["total"] == 1
    match = payload["items"][0]
    assert match["job"]["source_job_id"] == "1"
    assert match["score"] > 0
    assert match["tracking_status"] == "new"
    assert match["matched_skills"] == ["FastAPI", "Python", "SQLAlchemy"]
    assert match["preferred_excluded_technologies_found"] == []


def test_parse_remote_type_filters() -> None:
    assert parse_remote_type_filters("remote, hybrid") == {"remote", "hybrid"}
    assert parse_remote_type_filters(" onsite ") == {"onsite"}
    assert parse_remote_type_filters("") == set()


def test_job_matching_route_filters_by_remote_types(client, auth_headers) -> None:
    _update_profile_and_preferences(client, auth_headers)
    jobs = [
        NormalizedJob(
            source="adzuna",
            source_job_id="1",
            title="Backend Engineer",
            company_name="Acme",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=150000,
            redirect_url="https://example.com/jobs/1",
        ),
        NormalizedJob(
            source="adzuna",
            source_job_id="2",
            title="Platform Engineer",
            company_name="Beta",
            location_display="Austin",
            description="Python FastAPI role",
            employment_type="permanent",
            remote_type="hybrid",
            salary_min=140000,
            salary_max=160000,
            redirect_url="https://example.com/jobs/2",
        ),
    ]
    client.app.dependency_overrides[get_job_source] = lambda: FakeJobSource(jobs)
    response = client.get(
        "/api/v1/jobs/matches?remote_types=hybrid&min_score=0",
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["job"]["source_job_id"] == "2"


def test_required_and_preferred_excluded_technologies_behave_differently(
    client,
    auth_headers,
) -> None:
    _update_profile_and_preferences(client, auth_headers)
    preference = client.get("/api/v1/profile/preferences", headers=auth_headers).json()
    profile = client.get("/api/v1/profile", headers=auth_headers).json()

    query = build_job_search_query(
        profile=type("Profile", (), profile)(),
        preference=type("Preference", (), preference)(),
        page=1,
        results_per_page=20,
    )
    assert query.required_excluded_technologies == ["php"]

    safe_job = NormalizedJob(
        source="adzuna",
        source_job_id="safe",
        title="Backend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="Python FastAPI role with wordpress migration",
        employment_type="permanent",
        remote_type="remote",
        salary_min=130000,
        salary_max=140000,
        redirect_url="https://example.com/safe",
    )
    blocked_job = NormalizedJob(
        source="adzuna",
        source_job_id="blocked",
        title="Backend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="Python FastAPI role with php migration",
        employment_type="permanent",
        remote_type="remote",
        salary_min=130000,
        salary_max=140000,
        redirect_url="https://example.com/blocked",
    )

    profile_obj = type("Profile", (), profile)()
    preference_obj = type("Preference", (), preference)()

    safe_filter = evaluate_hard_filters(safe_job, preference_obj)
    blocked_filter = evaluate_hard_filters(blocked_job, preference_obj)
    assert safe_filter.passed is True
    assert blocked_filter.passed is False
    assert blocked_filter.required_excluded_technologies_found == ["php"]

    scored_safe = score_job(safe_job, profile_obj, preference_obj, safe_filter)
    rescored_safe = score_job(safe_job, profile_obj, preference_obj, safe_filter)
    assert scored_safe.score == rescored_safe.score
    assert scored_safe.preferred_excluded_technologies_found == ["wordpress"]

    deduped = deduplicate_matches([scored_safe, rescored_safe])
    assert len(deduped) == 1


def test_job_tracking_and_dashboard_stats_flow(client, auth_headers) -> None:
    _update_profile_and_preferences(client, auth_headers)

    jobs = [
        NormalizedJob(
            source="adzuna",
            source_job_id="1",
            title="Backend Engineer",
            company_name="Acme",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=150000,
            redirect_url="https://example.com/jobs/1",
        ),
        NormalizedJob(
            source="adzuna",
            source_job_id="2",
            title="Platform Engineer",
            company_name="Beta",
            location_display="Austin",
            description="Python FastAPI role",
            employment_type="permanent",
            remote_type="hybrid",
            salary_min=140000,
            salary_max=160000,
            redirect_url="https://example.com/jobs/2",
        ),
    ]

    client.app.dependency_overrides[get_job_source] = lambda: FakeJobSource(jobs)
    matches_response = client.get(
        "/api/v1/jobs/matches?sort_by=salary&min_score=1",
        headers=auth_headers,
    )
    assert matches_response.status_code == 200
    items = matches_response.json()["items"]
    assert items[0]["job"]["source_job_id"] == "2"

    save_response = client.post(
        "/api/v1/jobs/actions",
        headers=auth_headers,
        json={"status": "saved", "score": items[0]["score"], "job": items[0]["job"]},
    )
    assert save_response.status_code == 200
    assert save_response.json()["status"] == "saved"

    apply_response = client.post(
        "/api/v1/jobs/actions",
        headers=auth_headers,
        json={"status": "applied", "score": items[1]["score"], "job": items[1]["job"]},
    )
    assert apply_response.status_code == 200
    assert apply_response.json()["status"] == "applied"

    tracked_response = client.get("/api/v1/jobs/tracked", headers=auth_headers)
    assert tracked_response.status_code == 200
    tracked_items = tracked_response.json()
    assert len(tracked_items) == 2

    stats_response = client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_saved"] == 1
    assert stats["total_applied"] == 1
    assert stats["total_skipped"] == 0
    assert stats["total_tracked"] == 2

    matches_after_tracking = client.get("/api/v1/jobs/matches", headers=auth_headers)
    assert matches_after_tracking.status_code == 200
    statuses = {
        item["job"]["source_job_id"]: item["tracking_status"]
        for item in matches_after_tracking.json()["items"]
    }
    assert statuses["1"] == "applied"
    assert statuses["2"] == "saved"

    clear_response = client.delete("/api/v1/jobs/tracked", headers=auth_headers)
    assert clear_response.status_code == 200
    assert clear_response.json()["cleared"] == 2

    stats_after_clear = client.get("/api/v1/dashboard/stats", headers=auth_headers).json()
    assert stats_after_clear["total_tracked"] == 0


def test_job_text_from_payload_skips_null_values() -> None:
    text = job_text_from_payload(
        {
            "title": "Backend Engineer",
            "description": "Build APIs",
            "company_name": None,
            "category": None,
        }
    )
    assert text == "Backend Engineer Build APIs"
    assert "None" not in text


def test_evaluate_hard_filters_rejects_remote_for_city_only_preference() -> None:
    preference = type(
        "Preference",
        (),
        {
            "preferred_locations": ["Bangalore"],
            "remote_preference": None,
            "required_excluded_technologies": [],
            "preferred_excluded_technologies": [],
            "employment_types": [],
            "salary_min": None,
        },
    )()
    remote_job = NormalizedJob(
        source="adzuna",
        source_job_id="remote",
        title="Backend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="Python role",
        employment_type="permanent",
        remote_type="remote",
        redirect_url="https://example.com/remote",
    )
    decision = evaluate_hard_filters(remote_job, preference)
    assert decision.passed is False


def test_score_job_uses_employment_equivalence() -> None:
    preference = type(
        "Preference",
        (),
        {
            "desired_titles": [],
            "preferred_locations": [],
            "remote_preference": None,
            "required_excluded_technologies": [],
            "preferred_excluded_technologies": [],
            "employment_types": ["contract"],
            "salary_min": None,
        },
    )()
    job = NormalizedJob(
        source="adzuna",
        source_job_id="contractor",
        title="Backend Engineer",
        company_name="Acme",
        location_display="Remote",
        description="Python role",
        employment_type="contractor",
        remote_type="remote",
        redirect_url="https://example.com/contractor",
    )
    decision = evaluate_hard_filters(job, preference)
    match = score_job(job, None, preference, decision)
    assert match.score_breakdown.employment_type_points == 10


def test_clear_tracked_jobs_supports_recent_limit(client, auth_headers) -> None:
    _update_profile_and_preferences(client, auth_headers)
    jobs = [
        NormalizedJob(
            source="adzuna",
            source_job_id="1",
            title="Backend Engineer",
            company_name="Acme",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=150000,
            redirect_url="https://example.com/jobs/1",
        ),
        NormalizedJob(
            source="adzuna",
            source_job_id="2",
            title="Backend Engineer",
            company_name="Beta",
            location_display="Remote",
            description="Python FastAPI SQLAlchemy role",
            employment_type="permanent",
            remote_type="remote",
            salary_min=130000,
            salary_max=150000,
            redirect_url="https://example.com/jobs/2",
        ),
    ]
    client.app.dependency_overrides[get_job_source] = lambda: FakeJobSource(jobs)
    matches = client.get("/api/v1/jobs/matches", headers=auth_headers).json()["items"]
    for match in matches:
        client.post(
            "/api/v1/jobs/actions",
            headers=auth_headers,
            json={
                "status": "saved",
                "score": match["score"],
                "job": match["job"],
            },
        )
    clear_response = client.delete("/api/v1/jobs/tracked?limit=1", headers=auth_headers)
    assert clear_response.status_code == 200
    assert clear_response.json()["cleared"] == 1
    stats = client.get("/api/v1/dashboard/stats", headers=auth_headers).json()
    assert stats["total_tracked"] == 1
