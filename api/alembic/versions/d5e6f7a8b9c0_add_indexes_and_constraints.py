"""add performance indexes and data constraints

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Performance indexes for analytics queries
    op.create_index(
        "ix_pop_analytics_monitored_recent",
        "population_analytics",
        ["is_monitored_recent"],
    )
    op.create_index(
        "ix_pop_analytics_trend_10yr",
        "population_analytics",
        ["trend_10yr"],
    )
    op.create_index(
        "ix_pop_analytics_years_since_survey",
        "population_analytics",
        ["years_since_survey"],
    )

    # Data integrity constraints
    op.create_check_constraint(
        "ck_observation_year_range",
        "escapement_observations",
        "year >= 1900 AND year <= 2100",
    )
    op.create_check_constraint(
        "ck_observation_spawners_positive",
        "escapement_observations",
        "total_spawners IS NULL OR total_spawners >= 0",
    )
    op.create_check_constraint(
        "ck_site_lat_range",
        "spawning_sites",
        "lat IS NULL OR (lat >= -90 AND lat <= 90)",
    )
    op.create_check_constraint(
        "ck_site_lon_range",
        "spawning_sites",
        "lon IS NULL OR (lon >= -180 AND lon <= 180)",
    )
    op.create_check_constraint(
        "ck_analytics_health_score_range",
        "population_analytics",
        "health_score IS NULL OR (health_score >= 0 AND health_score <= 100)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_analytics_health_score_range", "population_analytics", type_="check")
    op.drop_constraint("ck_site_lon_range", "spawning_sites", type_="check")
    op.drop_constraint("ck_site_lat_range", "spawning_sites", type_="check")
    op.drop_constraint("ck_observation_spawners_positive", "escapement_observations", type_="check")
    op.drop_constraint("ck_observation_year_range", "escapement_observations", type_="check")
    op.drop_index("ix_pop_analytics_years_since_survey", table_name="population_analytics")
    op.drop_index("ix_pop_analytics_trend_10yr", table_name="population_analytics")
    op.drop_index("ix_pop_analytics_monitored_recent", table_name="population_analytics")
