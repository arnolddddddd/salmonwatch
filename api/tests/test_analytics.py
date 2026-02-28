"""Tests for analytics computation."""

from sqlalchemy import text
from tests.conftest import test_engine, TestSessionLocal


def _seed_sites():
    with test_engine.connect() as conn:
        conn.execute(text(
            "INSERT OR IGNORE INTO spawning_sites "
            "(id, nuseds_pop_id, stream_name, species, region, lat, lon) "
            "VALUES (1, 100, 'Harrison River', 'chinook', 'FRASER', 49.28, -121.79),"
            "       (2, 200, 'Adams River', 'sockeye', 'FRASER', 50.99, -119.58),"
            "       (3, 300, 'Nass River', 'chinook', 'NASS', 55.0, -129.0)"
        ))
        conn.commit()


def _seed_observations():
    with test_engine.connect() as conn:
        rows = []
        # Site 1: declining chinook (2005-2023)
        for yr in range(2005, 2024):
            count = max(100, 5000 - (yr - 2005) * 200)
            rows.append(f"(1, {yr}, 'chinook', {count})")
        # Site 2: stable sockeye (2010-2023)
        for yr in range(2010, 2024):
            rows.append(f"(2, {yr}, 'sockeye', 10000)")
        # Site 3: unmonitored since 2015
        for yr in range(2005, 2016):
            rows.append(f"(3, {yr}, 'chinook', 3000)")
        conn.execute(text(
            "INSERT INTO escapement_observations (site_id, year, species, total_spawners) "
            f"VALUES {','.join(rows)}"
        ))
        conn.commit()


def test_compute_population_analytics():
    _seed_sites()
    _seed_observations()

    from salmonwatch.analytics.compute import compute_all_population_analytics

    db = TestSessionLocal()
    try:
        count = compute_all_population_analytics(db, current_year=2026)
        assert count == 3

        row1 = db.execute(text(
            "SELECT * FROM population_analytics WHERE site_id = 1"
        )).fetchone()
        assert row1 is not None
        assert row1.first_year == 2005
        assert row1.last_year == 2023
        assert row1.years_since_survey == 3
        assert row1.is_monitored_recent in (True, 1)
        assert row1.health_score is not None
        assert row1.health_status in ("critical", "poor", "fair", "good", "strong")

        row3 = db.execute(text(
            "SELECT * FROM population_analytics WHERE site_id = 3"
        )).fetchone()
        assert row3 is not None
        assert row3.last_year == 2015
        assert row3.years_since_survey == 11
        assert row3.is_monitored_recent in (False, 0)
    finally:
        db.close()


def test_health_score_range():
    _seed_sites()
    _seed_observations()

    from salmonwatch.analytics.compute import compute_all_population_analytics

    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
        rows = db.execute(text("SELECT health_score FROM population_analytics")).fetchall()
        for row in rows:
            assert 0 <= row.health_score <= 100
    finally:
        db.close()


def test_trend_computation():
    """Declining population should have negative trend."""
    _seed_sites()
    _seed_observations()

    from salmonwatch.analytics.compute import compute_all_population_analytics

    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
        row = db.execute(text(
            "SELECT trend_10yr FROM population_analytics WHERE site_id = 1"
        )).fetchone()
        assert row.trend_10yr is not None
        assert row.trend_10yr < 0  # declining
    finally:
        db.close()


def test_analytics_overview_endpoint(client):
    _seed_sites()
    _seed_observations()
    from salmonwatch.analytics.compute import compute_all_population_analytics
    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
    finally:
        db.close()
    response = client.get("/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_populations" in data
    assert "pct_declining" in data
    assert "avg_health_score" in data
    assert 0 <= data["avg_health_score"] <= 100


def test_analytics_species_endpoint(client):
    _seed_sites()
    _seed_observations()
    from salmonwatch.analytics.compute import compute_all_population_analytics
    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
    finally:
        db.close()
    response = client.get("/v1/analytics/species")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "species" in data[0]


def test_analytics_declining_endpoint(client):
    _seed_sites()
    _seed_observations()
    from salmonwatch.analytics.compute import compute_all_population_analytics
    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
    finally:
        db.close()
    response = client.get("/v1/analytics/declining?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_analytics_health_distribution_endpoint(client):
    _seed_sites()
    _seed_observations()
    from salmonwatch.analytics.compute import compute_all_population_analytics
    db = TestSessionLocal()
    try:
        compute_all_population_analytics(db, current_year=2026)
    finally:
        db.close()
    response = client.get("/v1/analytics/health-distribution")
    assert response.status_code == 200
    data = response.json()
    for key in ("critical", "poor", "fair", "good", "strong"):
        assert key in data
