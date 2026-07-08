from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

_engine: AsyncEngine | None = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] | None = None


def configure_db_engine() -> None:
    global _engine, AsyncSessionLocal
    settings = get_settings()
    _engine = create_async_engine(settings.resolved_database_url, echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    if AsyncSessionLocal is None:
        configure_db_engine()
    assert AsyncSessionLocal is not None
    async with AsyncSessionLocal() as session:
        yield session


async def dispose_engine() -> None:
    global _engine, AsyncSessionLocal
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    AsyncSessionLocal = None
