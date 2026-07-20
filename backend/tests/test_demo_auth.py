def test_demo_login_returns_tokens_when_enabled(client, test_settings) -> None:
    test_settings.demo_mode = True
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == test_settings.demo_user_email


def test_demo_login_disabled_by_default(client) -> None:
    response = client.post("/api/v1/auth/demo")
    assert response.status_code == 403
