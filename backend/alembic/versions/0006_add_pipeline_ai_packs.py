"""add pipeline fields ai cache and application packs

Revision ID: 0006_pipeline_ai_packs
Revises: 0005_telegram_notifications
Create Date: 2026-07-08 14:30:00
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_pipeline_ai_packs"
down_revision = "0005_telegram_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("job_interactions", sa.Column("ai_score", sa.Integer(), nullable=True))
    op.add_column("job_interactions", sa.Column("ai_score_rationale", sa.Text(), nullable=True))
    op.add_column("job_interactions", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column(
        "job_interactions", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True)
    )
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column(
            "job_interactions",
            "status",
            type_=sa.String(length=30),
            existing_type=sa.String(length=20),
        )
    op.create_table(
        "ai_score_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=500), nullable=False),
        sa.Column("ai_score", sa.Integer(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("score_source", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_ai_score_cache_user_dedupe"),
    )
    op.create_index(op.f("ix_ai_score_cache_user_id"), "ai_score_cache", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_ai_score_cache_dedupe_key"), "ai_score_cache", ["dedupe_key"], unique=False
    )
    op.create_table(
        "application_packs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("source_job_id", sa.String(length=255), nullable=False),
        sa.Column("pack_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "source",
            "source_job_id",
            name="uq_application_pack_user_source_job",
        ),
    )
    op.create_index(
        op.f("ix_application_packs_user_id"), "application_packs", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_application_packs_user_id"), table_name="application_packs")
    op.drop_table("application_packs")
    op.drop_index(op.f("ix_ai_score_cache_dedupe_key"), table_name="ai_score_cache")
    op.drop_index(op.f("ix_ai_score_cache_user_id"), table_name="ai_score_cache")
    op.drop_table("ai_score_cache")
    op.drop_column("job_interactions", "follow_up_at")
    op.drop_column("job_interactions", "notes")
    op.drop_column("job_interactions", "ai_score_rationale")
    op.drop_column("job_interactions", "ai_score")
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column(
            "job_interactions",
            "status",
            type_=sa.String(length=20),
            existing_type=sa.String(length=30),
        )
