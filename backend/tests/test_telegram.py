from unittest.mock import AsyncMock, patch


def _auth_headers(client, email: str, password: str) -> dict[str, str]:
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()
    return {"Authorization": f"Bearer {login['access_token']}"}


@patch("app.api.routes.telegram.get_telegram_client")
def test_telegram_link(mock_get_client, client) -> None:
    mock_telegram = AsyncMock()
    async def bot_username() -> str:
        return "ai_job_agent_bot"
    mock_telegram.bot_username = bot_username
    mock_get_client.return_value = mock_telegram
    headers = _auth_headers(client, "telegram@example.com", "supersecret123")
    response = client.get("/api/v1/telegram/link", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert "start=" in body["link_url"]
    status = client.get("/api/v1/telegram/status", headers=headers)
    assert status.status_code == 200
    assert status.json()["connected"] is False


@patch("app.services.scheduler.get_telegram_client")
def test_telegram_webhook_links_account(mock_get_client, client, test_settings) -> None:
    mock_telegram = AsyncMock()
    async def bot_username() -> str:
        return "ai_job_agent_bot"
    mock_telegram.bot_username = bot_username
    mock_telegram.send_message = AsyncMock(return_value=1)
    mock_get_client.return_value = mock_telegram
    with patch("app.api.routes.telegram.get_telegram_client", return_value=mock_telegram):
        headers = _auth_headers(client, "webhook@example.com", "supersecret123")
        link = client.get("/api/v1/telegram/link", headers=headers).json()
    token = link["link_url"].split("start=")[-1]
    update = {"message": {"chat": {"id": 999001}, "text": f"/start {token}"}}
    response = client.post(
        "/api/v1/telegram/webhook",
        json=update,
        headers={"X-Telegram-Bot-Api-Secret-Token": test_settings.telegram_webhook_secret},
    )
    assert response.status_code == 200
    status = client.get("/api/v1/telegram/status", headers=headers)
    assert status.json()["connected"] is True


@patch("app.services.scheduler.get_telegram_client")
def test_telegram_settings_update(mock_get_client, client, test_settings) -> None:
    mock_telegram = AsyncMock()
    async def bot_username() -> str:
        return "ai_job_agent_bot"
    mock_telegram.bot_username = bot_username
    mock_telegram.send_message = AsyncMock(return_value=1)
    mock_get_client.return_value = mock_telegram
    with patch("app.api.routes.telegram.get_telegram_client", return_value=mock_telegram):
        headers = _auth_headers(client, "settings@example.com", "supersecret123")
        link = client.get("/api/v1/telegram/link", headers=headers).json()
    token = link["link_url"].split("start=")[-1]
    client.post(
        "/api/v1/telegram/webhook",
        json={"message": {"chat": {"id": 777001}, "text": f"/start {token}"}},
        headers={"X-Telegram-Bot-Api-Secret-Token": test_settings.telegram_webhook_secret},
    )
    response = client.patch(
        "/api/v1/telegram/settings",
        headers=headers,
        json={"notify_min_score": 70, "notifications_enabled": False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["notify_min_score"] == 70
    assert body["notifications_enabled"] is False
