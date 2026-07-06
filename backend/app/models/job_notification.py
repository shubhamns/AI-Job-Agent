from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class JobNotification(Base):
    __tablename__ = "job_notifications"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "source",
            "source_job_id",
            name="uq_job_notification_user_source_job",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_job_id: Mapped[str] = mapped_column(String(255), nullable=False)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    job_payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    telegram_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    check_type: Mapped[str] = mapped_column(String(20), nullable=False)
    notified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    user: Mapped[User] = relationship(back_populates="job_notifications")
