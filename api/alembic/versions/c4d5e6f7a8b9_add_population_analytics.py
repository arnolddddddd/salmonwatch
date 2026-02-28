"""add population_analytics table

Revision ID: c4d5e6f7a8b9
Revises: b3a1f2c4d5e6
Create Date: 2026-03-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b3a1f2c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "population_analytics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "site_id",
            sa.Integer(),
            sa.ForeignKey("spawning_sites.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("data_years", sa.Integer()),
        sa.Column("first_year", sa.Integer()),
        sa.Column("last_year", sa.Integer()),
        sa.Column("years_since_survey", sa.Integer()),
        sa.Column("mean_spawners", sa.Float()),
        sa.Column("median_spawners", sa.Float()),
        sa.Column("peak_count", sa.Integer()),
        sa.Column("peak_year", sa.Integer()),
        sa.Column("latest_count", sa.Integer()),
        sa.Column("trend_10yr", sa.Float()),
        sa.Column("trend_20yr", sa.Float()),
        sa.Column("decline_rate_per_decade", sa.Float()),
        sa.Column("health_score", sa.Integer()),
        sa.Column("health_status", sa.String(20)),
        sa.Column("monitoring_gap_years", sa.Integer()),
        sa.Column("data_completeness", sa.Float()),
        sa.Column("is_monitored_recent", sa.Boolean()),
    )
    op.create_index(
        "ix_pop_analytics_health_status", "population_analytics", ["health_status"]
    )
    op.create_index(
        "ix_pop_analytics_health_score", "population_analytics", ["health_score"]
    )


def downgrade() -> None:
    op.drop_index("ix_pop_analytics_health_score", table_name="population_analytics")
    op.drop_index("ix_pop_analytics_health_status", table_name="population_analytics")
    op.drop_table("population_analytics")
