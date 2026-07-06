"""add telegram and job notifications

Revision ID: 0005_telegram_notifications
Revises: 0004_job_interactions
Create Date: 2026-07-06 19:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_telegram_notifications"
down_revision = "0004_job_interactions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_link_token", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "users",
        sa.Column("notify_min_score", sa.Integer(), nullable=False, server_default="50"),
    )
    op.create_index(op.f("ix_users_telegram_chat_id"), "users", ["telegram_chat_id"], unique=True)
    op.create_index(
        op.f("ix_users_telegram_link_token"),
        "users",
        ["telegram_link_token"],
        unique=True,
    )
    op.create_table(
        "job_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("source_job_id", sa.String(length=255), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("job_payload", sa.JSON(), nullable=False),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
        sa.Column("check_type", sa.String(length=20), nullable=False),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "source",
            "source_job_id",
            name="uq_job_notification_user_source_job",
        ),
    )
    op.create_index(
        op.f("ix_job_notifications_user_id"),
        "job_notifications",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_job_notifications_user_id"), table_name="job_notifications")
    op.drop_table("job_notifications")
    op.drop_index(op.f("ix_users_telegram_link_token"), table_name="users")
    op.drop_index(op.f("ix_users_telegram_chat_id"), table_name="users")
    op.drop_column("users", "notify_min_score")
    op.drop_column("users", "notifications_enabled")
    op.drop_column("users", "telegram_link_token")
    op.drop_column("users", "telegram_chat_id")
