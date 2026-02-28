from sqlalchemy import text
from tests.conftest import test_engine


def _seed_data():
    """Insert test sites and observations into the SQLite test DB."""
    with test_engine.connect() as conn:
        conn.execute(
            text(
                "INSERT INTO spawning_sites (id, nuseds_pop_id, stream_name, species, region, lat, lon)"
                " VALUES (1, 100, 'Harrison River', 'chinook', 'FRASER', 49.28, -121.79),"
                "        (2, 200, 'Adams River', 'sockeye', 'FRASER', 50.99, -119.58)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO escapement_observations (site_id, year, species, total_spawners)"
                " VALUES (1, 2020, 'chinook', 5000),"
                "        (1, 2021, 'chinook', 6000),"
                "        (1, 2022, 'chinook', 4000),"
                "        (2, 2021, 'sockeye', 120000),"
                "        (2, 2022, 'sockeye', 95000)"
            )
        )
        conn.commit()


def test_status(client):
    response = client.get("/v1/status")
    assert response.status_code == 200


def test_populations_returns_geojson(client):
    response = client.get("/v1/populations?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert "total" in data


def test_populations_species_filter(client):
    _seed_data()
    response = client.get("/v1/populations?species=chinook&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["features"][0]["properties"]["species"] == "chinook"


def test_populations_returns_latest_and_peak(client):
    _seed_data()
    response = client.get("/v1/populations")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2

    chinook = next(
        f for f in data["features"] if f["properties"]["species"] == "chinook"
    )
    assert chinook["properties"]["latest_year"] == 2022
    assert chinook["properties"]["latest_count"] == 4000
    assert chinook["properties"]["peak_count"] == 6000
    assert chinook["properties"]["peak_year"] == 2021

    sockeye = next(
        f for f in data["features"] if f["properties"]["species"] == "sockeye"
    )
    assert sockeye["properties"]["latest_year"] == 2022
    assert sockeye["properties"]["latest_count"] == 95000
    assert sockeye["properties"]["peak_count"] == 120000
    assert sockeye["properties"]["peak_year"] == 2021


def test_populations_year_filter(client):
    _seed_data()
    response = client.get("/v1/populations?year_min=2021&year_max=2021")
    data = response.json()
    chinook = next(
        f for f in data["features"] if f["properties"]["species"] == "chinook"
    )
    # Latest within 2021 range should be 2021, not 2022
    assert chinook["properties"]["latest_year"] == 2021
    assert chinook["properties"]["latest_count"] == 6000


def test_population_not_found(client):
    response = client.get("/v1/populations/999999")
    assert response.status_code == 404


def test_timeseries_not_found(client):
    response = client.get("/v1/populations/999999/timeseries")
    assert response.status_code == 404


def test_populations_include_health_fields(client):
    _seed_data()
    from tests.conftest import test_engine
    with test_engine.connect() as conn:
        conn.execute(text(
            "INSERT INTO population_analytics (site_id, health_score, health_status) "
            "VALUES (1, 45, 'fair'), (2, 72, 'good')"
        ))
        conn.commit()
    response = client.get("/v1/populations")
    data = response.json()
    chinook = next(f for f in data["features"] if f["properties"]["species"] == "chinook")
    assert chinook["properties"]["health_score"] == 45
    assert chinook["properties"]["health_status"] == "fair"


def test_stats(client):
    response = client.get("/v1/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_populations" in data
    assert "species_counts" in data
