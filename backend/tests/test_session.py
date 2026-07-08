import asyncio
from unittest.mock import patch

import pytest

from app.core.config import Settings, get_settings
from app.db import session as db_session


@pytest.fixture
def session_settings(tmp_path) -> Settings:
    return Settings(
        environment="local",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'session-test.db'}",
        jwt_secret_key="test-secret-key-with-32-chars-min",
    )


def test_session_scope_reads_live_factory_after_configure(session_settings: Settings) -> None:
    get_settings.cache_clear()
    db_session.AsyncSessionLocal = None
    db_session._engine = None
    import app.services.scheduler

    assert app.services.scheduler is not None
    with patch("app.db.session.get_settings", return_value=session_settings):
        db_session.configure_db_engine()

        async def open_session() -> None:
            async with db_session.session_scope() as session:
                assert session is not None

        asyncio.run(open_session())
    get_settings.cache_clear()
