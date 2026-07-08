from unittest.mock import AsyncMock, patch

import pytest

from app.services.telegram_service import run_job_checks


@pytest.mark.asyncio
@patch("app.services.telegram_service.send_daily_summary", new_callable=AsyncMock)
@patch("app.services.telegram_service.run_job_check_for_user", new_callable=AsyncMock)
async def test_run_job_checks_sends_daily_summary_for_all_users(
    mock_run_job_check,
    mock_send_daily_summary,
) -> None:
    mock_run_job_check.return_value = 0
    user_one = type("User", (), {"telegram_chat_id": 111})()
    user_two = type("User", (), {"telegram_chat_id": 222})()
    session = AsyncMock()
    session.scalars = AsyncMock(return_value=[user_one, user_two])
    telegram = AsyncMock()
    settings = type("Settings", (), {})()
    sent = await run_job_checks(session, settings, telegram, check_type="daily")
    assert sent == 0
    assert mock_run_job_check.await_count == 2
    assert mock_send_daily_summary.await_count == 2
    mock_send_daily_summary.assert_any_await(session, user_one, telegram)
    mock_send_daily_summary.assert_any_await(session, user_two, telegram)
