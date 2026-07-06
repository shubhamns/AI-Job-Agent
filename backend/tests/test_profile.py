def test_profile_and_job_preferences_are_editable(client, auth_headers) -> None:
    profile_response = client.put(
        "/api/v1/profile",
        headers=auth_headers,
        json={
            "full_name": "Jane Doe",
            "phone": "+1-555-0100",
            "location": "New York, NY",
            "summary": "Backend engineer",
            "years_experience": 6,
            "skills": ["Python", "FastAPI"],
            "work_authorization": "US Citizen",
        },
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["full_name"] == "Jane Doe"
    assert profile_response.json()["skills"] == ["Python", "FastAPI"]

    preference_response = client.put(
        "/api/v1/profile/preferences",
        headers=auth_headers,
        json={
            "desired_titles": ["Backend Engineer"],
            "preferred_locations": ["Remote", "New York, NY"],
            "remote_preference": "remote-first",
            "employment_types": ["full-time"],
            "salary_min": 150000,
            "salary_currency": "USD",
        },
    )
    assert preference_response.status_code == 200
    assert preference_response.json()["desired_titles"] == ["Backend Engineer"]
    assert preference_response.json()["salary_min"] == 150000

