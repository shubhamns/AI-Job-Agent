def test_login_returns_access_and_refresh_tokens(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "tokens@example.com", "password": "supersecret123"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "tokens@example.com", "password": "supersecret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_refresh_returns_new_token_pair(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@example.com", "password": "supersecret123"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@example.com", "password": "supersecret123"},
    ).json()
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login["refresh_token"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "refresh@example.com"
