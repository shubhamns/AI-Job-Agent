"""add job preference exclusion fields

Revision ID: 0003_job_preference_exclusions
Revises: 0002_candidate_data
Create Date: 2026-07-06 17:15:00
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_job_preference_exclusions"
down_revision = "0002_candidate_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "job_preferences",
        sa.Column(
            "required_excluded_technologies",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.add_column(
        "job_preferences",
        sa.Column(
            "preferred_excluded_technologies",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.alter_column("job_preferences", "required_excluded_technologies", server_default=None)
    op.alter_column("job_preferences", "preferred_excluded_technologies", server_default=None)


def downgrade() -> None:
    op.drop_column("job_preferences", "preferred_excluded_technologies")
    op.drop_column("job_preferences", "required_excluded_technologies")
