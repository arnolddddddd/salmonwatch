import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from salmonwatch.main import app
from salmonwatch.db.engine import Base, get_db

# Patch GeoAlchemy2 to work with SQLite (no PostGIS functions)
from geoalchemy2.types import Geometry

Geometry.column_expression = lambda self, col: col

# Use SQLite in-memory with StaticPool (shared across connections)
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(bind=test_engine)


@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create tables for SQLite (geom as TEXT instead of PostGIS Geometry)."""
    with test_engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS spawning_sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nuseds_pop_id INTEGER UNIQUE,
                stream_name TEXT,
                waterbody TEXT,
                species VARCHAR(50),
                region VARCHAR(100),
                watershed_code VARCHAR(50),
                conservation_unit TEXT,
                cu_status VARCHAR(20),
                geom TEXT,
                lat FLOAT,
                lon FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS escapement_observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL REFERENCES spawning_sites(id),
                year INTEGER NOT NULL,
                species VARCHAR(50),
                natural_adult_spawners INTEGER,
                natural_jack_spawners INTEGER,
                total_spawners INTEGER,
                adult_broodstock_removals INTEGER,
                total_return_to_river INTEGER,
                accuracy VARCHAR(50),
                run_type VARCHAR(50),
                survey_method TEXT
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_obs_site_year_species_runtype
            ON escapement_observations (site_id, year, species, COALESCE(run_type, ''))
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS population_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL UNIQUE REFERENCES spawning_sites(id),
                data_years INTEGER, first_year INTEGER, last_year INTEGER,
                years_since_survey INTEGER, mean_spawners FLOAT,
                median_spawners FLOAT, peak_count INTEGER, peak_year INTEGER,
                latest_count INTEGER, trend_10yr FLOAT, trend_20yr FLOAT,
                decline_rate_per_decade FLOAT, health_score INTEGER,
                health_status VARCHAR(20), monitoring_gap_years INTEGER,
                data_completeness FLOAT, is_monitored_recent INTEGER
            )
        """))
        conn.commit()
    yield
    with test_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS population_analytics"))
        conn.execute(text("DROP TABLE IF EXISTS escapement_observations"))
        conn.execute(text("DROP TABLE IF EXISTS spawning_sites"))
        conn.commit()


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = _override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
