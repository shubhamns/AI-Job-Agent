"""add job interactions

Revision ID: 0004_job_interactions
Revises: 0003_job_preference_exclusions
Create Date: 2026-07-06 18:00:00
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_job_interactions"
down_revision = "0003_job_preference_exclusions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_interactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("source_job_id", sa.String(length=255), nullable=False),
        sa.Column("dedupe_key", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("job_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "source",
            "source_job_id",
            name="uq_job_interaction_user_source_job",
        ),
    )
    op.create_index(
        op.f("ix_job_interactions_user_id"),
        "job_interactions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_job_interactions_dedupe_key"),
        "job_interactions",
        ["dedupe_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_job_interactions_dedupe_key"), table_name="job_interactions")
    op.drop_index(op.f("ix_job_interactions_user_id"), table_name="job_interactions")
    op.drop_table("job_interactions")
