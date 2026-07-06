import io
import zipfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import get_db_session
from app.main import create_app


@pytest.fixture
def test_settings(tmp_path: Path) -> Settings:
    return Settings(
        environment="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        jwt_secret_key="test-secret-key-with-32-chars-min",
        resume_upload_dir=tmp_path / "uploads",
        adzuna_app_id="test-adzuna-app-id",
        adzuna_app_key="test-adzuna-app-key",
        adzuna_results_per_page=20,
        telegram_bot_token="test-token",
        telegram_webhook_secret="local-dev-webhook-secret",
        telegram_mode="webhook",
        cron_enabled=False,
    )


@pytest.fixture
def client(test_settings: Settings) -> Generator[TestClient, None, None]:
    engine = create_async_engine(test_settings.database_url, future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db_session():
        async with session_factory() as session:
            yield session

    def override_get_settings() -> Settings:
        return test_settings

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_settings] = override_get_settings

    async def initialize_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def dispose_database() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    import asyncio

    asyncio.run(initialize_database())
    with TestClient(app) as test_client:
        yield test_client
    asyncio.run(dispose_database())


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    email = "candidate@example.com"
    password = "supersecret123"
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_docx_bytes() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            (
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Override PartName="/word/document.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                "</Types>"
            ),
        )
        archive.writestr(
            "word/document.xml",
            (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                "<w:body><w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p>"
                "<w:p><w:r><w:t>Python Engineer</w:t></w:r></w:p></w:body>"
                "</w:document>"
            ),
        )
    return buffer.getvalue()
