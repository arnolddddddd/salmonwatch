"""add unique index on observations for idempotent ingest

Revision ID: b3a1f2c4d5e6
Revises: 92a296d92ff4
Create Date: 2026-02-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b3a1f2c4d5e6"
down_revision: Union[str, Sequence[str], None] = "92a296d92ff4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Deduplicate existing rows: keep the one with the lowest id per natural key
    op.execute(
        sa.text(
            """
            DELETE FROM escapement_observations
            WHERE id NOT IN (
                SELECT MIN(id) FROM escapement_observations
                GROUP BY site_id, year, species, COALESCE(run_type, '')
            )
            """
        )
    )

    # Create unique expression index handling NULL run_type via COALESCE
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX uq_obs_site_year_species_runtype
            ON escapement_observations (site_id, year, species, COALESCE(run_type, ''))
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        "uq_obs_site_year_species_runtype", table_name="escapement_observations"
    )
