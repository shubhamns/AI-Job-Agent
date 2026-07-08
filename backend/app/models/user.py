from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ai_score_cache import AiScoreCache
    from app.models.application_pack import ApplicationPackRecord
    from app.models.candidate_profile import CandidateProfile
    from app.models.job_interaction import JobInteraction
    from app.models.job_notification import JobNotification
    from app.models.job_preference import JobPreference
    from app.models.resume_document import ResumeDocument


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    telegram_chat_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, unique=True, index=True
    )
    telegram_link_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    notifications_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    notify_min_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=50,
        server_default="50",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    candidate_profile: Mapped[CandidateProfile | None] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    job_preference: Mapped[JobPreference | None] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    resumes: Mapped[list[ResumeDocument]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    job_interactions: Mapped[list[JobInteraction]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    job_notifications: Mapped[list[JobNotification]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    ai_score_cache: Mapped[list[AiScoreCache]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    application_packs: Mapped[list[ApplicationPackRecord]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
