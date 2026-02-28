import pandas as pd

from salmonwatch.ingest.nuseds import extract_sites, extract_observations, SPECIES_MAP


def _make_test_df():
    """Create a minimal NuSEDS-like DataFrame for testing."""
    return pd.DataFrame(
        {
            "POP_ID": [100, 100, 200, 200],
            "GAZETTED_NAME": ["Harrison River", "Harrison River", "Adams River", "Adams River"],
            "WATERBODY": ["Harrison River", "Harrison River", "Adams River", "Adams River"],
            "SPECIES": ["Chinook", "Chinook", "Sockeye", "Sockeye"],
            "AREA": ["FRASER", "FRASER", "FRASER", "FRASER"],
            "WATERSHED_CDE": ["100-001", "100-001", "100-002", "100-002"],
            "ANALYSIS_YR": [2022, 2023, 2022, 2023],
            "NATURAL_ADULT_SPAWNERS": [5000, 4200, 120000, 95000],
            "NATURAL_JACK_SPAWNERS": [200, 180, 5000, 4500],
            "NATURAL_SPAWNERS_TOTAL": [5200, 4380, 125000, 99500],
            "ADULT_BROODSTOCK_REMOVALS": [0, 0, 1000, 800],
            "TOTAL_RETURN_TO_RIVER": [6000, 5000, 150000, 120000],
            "ACCURACY": ["Type 2", "Type 2", "Type 1", "Type 1"],
            "RUN_TYPE": ["Fall", "Fall", "Late", "Late"],
            "Y_LAT": [49.28, 49.28, 50.99, 50.99],
            "X_LONGT": [-121.79, -121.79, -119.58, -119.58],
        }
    )


def test_extract_sites():
    df = _make_test_df()
    sites = extract_sites(df)
    assert len(sites) == 2
    assert set(sites["species"]) == {"chinook", "sockeye"}
    assert all(sites["lat"].notna())
    assert all(sites["lon"].notna())


def test_extract_observations():
    df = _make_test_df()
    obs = extract_observations(df)
    assert len(obs) == 4
    assert obs["year"].min() == 2022
    assert obs["year"].max() == 2023
    assert obs["total_spawners"].iloc[0] == 5200


def test_species_map_covers_main_species():
    expected = {"Chinook", "Sockeye", "Coho", "Chum", "Pink", "Steelhead"}
    assert expected.issubset(set(SPECIES_MAP.keys()))
