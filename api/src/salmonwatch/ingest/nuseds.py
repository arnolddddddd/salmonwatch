"""Ingest NuSEDS CSV data into the PostGIS database."""

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from salmonwatch.db.engine import SessionLocal
from salmonwatch.db.tables import SpawningSite, EscapementObservation

logger = logging.getLogger(__name__)

# NuSEDS species name normalization
SPECIES_MAP = {
    "Chinook": "chinook",
    "Sockeye": "sockeye",
    "Coho": "coho",
    "Chum": "chum",
    "Pink": "pink",
    "Steelhead": "steelhead",
    "Lake Trout": "lake_trout",
    "Kokanee": "kokanee",
    "Cutthroat Trout": "cutthroat",
}


def load_nuseds_csv(csv_path: Path) -> pd.DataFrame:
    """Load and clean NuSEDS CSV file."""
    df = pd.read_csv(csv_path, low_memory=False)
    logger.info(f"Loaded {len(df)} rows from {csv_path.name}")
    logger.info(f"Columns: {list(df.columns)}")
    return df


def _find_pop_id_col(df: pd.DataFrame) -> str:
    """Find the population ID column in a NuSEDS dataframe."""
    for candidate in ["POP_ID", "POPULATION_ID", "POP_ID "]:
        if candidate in df.columns:
            return candidate
    raise ValueError(
        f"Cannot find population ID column. Available: {list(df.columns)}"
    )


def load_cu_sites(cu_sites_path: Path) -> pd.DataFrame:
    """Load CU census sites file and deduplicate by POP_ID.

    Returns a DataFrame with columns: POP_ID, lat, lon, conservation_unit, cu_index.
    """
    cu = pd.read_csv(cu_sites_path, low_memory=False)
    logger.info(f"Loaded {len(cu)} rows from {cu_sites_path.name}")

    # Keep only rows with valid coordinates and POP_ID
    cu = cu.dropna(subset=["POP_ID", "Y_LAT", "X_LONGT"])
    cu["POP_ID"] = cu["POP_ID"].astype(int)

    # Deduplicate: keep first row per POP_ID (some have multiple species entries)
    cu = cu.drop_duplicates(subset=["POP_ID"], keep="first")

    result = cu[["POP_ID"]].copy()
    result["lat"] = cu["Y_LAT"].astype(float)
    result["lon"] = cu["X_LONGT"].astype(float)
    result["conservation_unit"] = cu.get("CU_NAME")
    result["cu_index"] = cu.get("FULL_CU_IN", cu.get("CU_INDEX"))

    logger.info(f"CU sites: {len(result)} unique populations with coordinates")
    return result


def extract_sites(df: pd.DataFrame, cu_sites_path: Path | None = None) -> pd.DataFrame:
    """Extract unique spawning sites from NuSEDS data.

    Groups by POP_ID to get unique sites. Coordinates are joined from the
    CU census sites file (cu_census_sites.csv) since the main NuSEDS CSV
    does not include lat/lon.
    """
    pop_id_col = _find_pop_id_col(df)

    # Group by population to get unique sites
    sites = (
        df.groupby(pop_id_col)
        .agg(
            stream_name=("GAZETTED_NAME", "first"),
            waterbody=("WATERBODY", "first"),
            species=("SPECIES", "first"),
            region=("AREA", "first"),
            watershed_code=("WATERSHED_CDE", "first"),
        )
        .reset_index()
    )

    sites = sites.rename(columns={pop_id_col: "nuseds_pop_id"})

    # Normalize species names
    sites["species"] = sites["species"].map(SPECIES_MAP).fillna(sites["species"].str.lower())

    # Join coordinates from CU census sites
    if cu_sites_path is not None:
        cu = load_cu_sites(cu_sites_path)
        sites = sites.merge(
            cu, left_on="nuseds_pop_id", right_on="POP_ID", how="left"
        )
        sites = sites.drop(columns=["POP_ID"], errors="ignore")
    else:
        # Fallback: check if lat/lon exist in the main CSV
        lat_col = next(
            (c for c in df.columns if c.upper() in ("Y_LAT", "LAT", "LATITUDE")),
            None,
        )
        lon_col = next(
            (c for c in df.columns if c.upper() in ("X_LONGT", "LON", "LONGITUDE")),
            None,
        )
        if lat_col and lon_col:
            coords = df.groupby(pop_id_col).agg(
                lat=(lat_col, "first"), lon=(lon_col, "first")
            ).reset_index().rename(columns={pop_id_col: "nuseds_pop_id"})
            sites = sites.merge(coords, on="nuseds_pop_id", how="left")
        else:
            sites["lat"] = None
            sites["lon"] = None

    # Drop rows without coordinates
    before = len(sites)
    sites = sites.dropna(subset=["lat", "lon"])
    dropped = before - len(sites)
    if dropped > 0:
        logger.warning(f"Dropped {dropped} sites without coordinates")

    logger.info(f"Extracted {len(sites)} unique spawning sites")
    return sites


def extract_observations(df: pd.DataFrame) -> pd.DataFrame:
    """Extract annual escapement observations from NuSEDS data."""
    pop_id_col = _find_pop_id_col(df)

    obs = df[
        [
            pop_id_col,
            "ANALYSIS_YR",
            "SPECIES",
            "NATURAL_ADULT_SPAWNERS",
            "NATURAL_JACK_SPAWNERS",
            "NATURAL_SPAWNERS_TOTAL",
            "ADULT_BROODSTOCK_REMOVALS",
            "TOTAL_RETURN_TO_RIVER",
            "ACCURACY",
            "RUN_TYPE",
        ]
    ].copy()

    obs = obs.rename(
        columns={
            pop_id_col: "nuseds_pop_id",
            "ANALYSIS_YR": "year",
            "SPECIES": "species",
            "NATURAL_ADULT_SPAWNERS": "natural_adult_spawners",
            "NATURAL_JACK_SPAWNERS": "natural_jack_spawners",
            "NATURAL_SPAWNERS_TOTAL": "total_spawners",
            "ADULT_BROODSTOCK_REMOVALS": "adult_broodstock_removals",
            "TOTAL_RETURN_TO_RIVER": "total_return_to_river",
            "ACCURACY": "accuracy",
            "RUN_TYPE": "run_type",
        }
    )

    obs["species"] = obs["species"].map(SPECIES_MAP).fillna(obs["species"].str.lower())

    # Convert numeric columns, coerce errors to NaN
    for col in [
        "natural_adult_spawners",
        "natural_jack_spawners",
        "total_spawners",
        "adult_broodstock_removals",
        "total_return_to_river",
    ]:
        obs[col] = pd.to_numeric(obs[col], errors="coerce")

    logger.info(f"Extracted {len(obs)} escapement observations")
    return obs


def _clean_str(val) -> str | None:
    """Convert pandas value to clean string or None."""
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s and s.lower() != "nan" else None


def ingest_sites(db: Session, sites_df: pd.DataFrame) -> dict[int, int]:
    """Insert spawning sites into database. Returns mapping of nuseds_pop_id -> db id."""
    pop_id_to_db_id = {}
    inserted = 0
    skipped = 0

    for _, row in sites_df.iterrows():
        geom_wkt = f"SRID=4326;POINT({row['lon']} {row['lat']})"
        stmt = insert(SpawningSite).values(
            nuseds_pop_id=int(row["nuseds_pop_id"]),
            stream_name=_clean_str(row.get("stream_name")),
            waterbody=_clean_str(row.get("waterbody")),
            species=row["species"],
            region=str(row.get("region", "")),
            watershed_code=_clean_str(row.get("watershed_code")),
            conservation_unit=_clean_str(row.get("conservation_unit")),
            lat=float(row["lat"]),
            lon=float(row["lon"]),
            geom=geom_wkt,
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=["nuseds_pop_id"])
        result = db.execute(stmt)
        if result.rowcount > 0:
            inserted += 1
        else:
            skipped += 1

    db.commit()
    logger.info(f"Sites: {inserted} inserted, {skipped} already existed")

    # Build lookup
    for site in db.query(SpawningSite).all():
        pop_id_to_db_id[site.nuseds_pop_id] = site.id

    return pop_id_to_db_id


def ingest_observations(
    db: Session, obs_df: pd.DataFrame, pop_id_to_db_id: dict[int, int]
) -> int:
    """Insert escapement observations into database."""
    records = []
    skipped = 0

    for _, row in obs_df.iterrows():
        pop_id = int(row["nuseds_pop_id"])
        if pop_id not in pop_id_to_db_id:
            skipped += 1
            continue

        records.append(
            {
                "site_id": pop_id_to_db_id[pop_id],
                "year": int(row["year"]),
                "species": row["species"],
                "natural_adult_spawners": (
                    int(row["natural_adult_spawners"])
                    if pd.notna(row["natural_adult_spawners"])
                    else None
                ),
                "natural_jack_spawners": (
                    int(row["natural_jack_spawners"])
                    if pd.notna(row["natural_jack_spawners"])
                    else None
                ),
                "total_spawners": (
                    int(row["total_spawners"])
                    if pd.notna(row["total_spawners"])
                    else None
                ),
                "adult_broodstock_removals": (
                    int(row["adult_broodstock_removals"])
                    if pd.notna(row["adult_broodstock_removals"])
                    else None
                ),
                "total_return_to_river": (
                    int(row["total_return_to_river"])
                    if pd.notna(row["total_return_to_river"])
                    else None
                ),
                "accuracy": row.get("accuracy") if pd.notna(row.get("accuracy")) else None,
                "run_type": row.get("run_type") if pd.notna(row.get("run_type")) else None,
            }
        )

    # Batch upsert: skip duplicates on (site_id, year, species, run_type)
    inserted = 0
    if records:
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            for record in batch:
                stmt = insert(EscapementObservation).values(**record)
                stmt = stmt.on_conflict_do_nothing()
                result = db.execute(stmt)
                inserted += result.rowcount
            db.flush()
        db.commit()

    dup_count = len(records) - inserted
    logger.info(
        f"Observations: {inserted} inserted, {dup_count} duplicates skipped, "
        f"{skipped} skipped (no matching site)"
    )
    return inserted


def run_ingest(csv_path: str | Path, cu_sites_path: str | Path | None = None):
    """Full ingest pipeline: CSV -> extract -> load into PostGIS."""
    csv_path = Path(csv_path)
    cu_sites_path = Path(cu_sites_path) if cu_sites_path else None
    logging.basicConfig(level=logging.INFO)

    logger.info(f"Starting NuSEDS ingest from {csv_path}")
    df = load_nuseds_csv(csv_path)

    sites_df = extract_sites(df, cu_sites_path=cu_sites_path)
    obs_df = extract_observations(df)

    db = SessionLocal()
    try:
        pop_id_map = ingest_sites(db, sites_df)
        ingest_observations(db, obs_df, pop_id_map)

        from salmonwatch.analytics.compute import compute_all_population_analytics
        logger.info("Computing population analytics...")
        analytics_count = compute_all_population_analytics(db)
        logger.info(f"Computed analytics for {analytics_count} populations")

        logger.info("Ingest complete.")
    finally:
        db.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: python -m salmonwatch.ingest.nuseds <nuseds_csv> [cu_census_sites_csv]"
        )
        sys.exit(1)

    cu_path = sys.argv[2] if len(sys.argv) >= 3 else None
    run_ingest(sys.argv[1], cu_sites_path=cu_path)
