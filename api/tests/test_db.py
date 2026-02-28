from salmonwatch.db.tables import SpawningSite, EscapementObservation


def test_spawning_site_model():
    site = SpawningSite(
        nuseds_pop_id=12345,
        stream_name="Harrison River",
        species="chinook",
        lat=49.28,
        lon=-121.79,
    )
    assert site.stream_name == "Harrison River"
    assert site.species == "chinook"


def test_escapement_observation_model():
    obs = EscapementObservation(
        site_id=1,
        year=2023,
        species="chinook",
        total_spawners=5200,
        accuracy="Type 2",
    )
    assert obs.year == 2023
    assert obs.total_spawners == 5200
