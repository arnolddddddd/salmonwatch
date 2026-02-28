from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from salmonwatch.db.engine import get_db
from salmonwatch.db.tables import SpawningSite, EscapementObservation, PopulationAnalytics
from salmonwatch.api.schemas import (
    PopulationDetail,
    Observation,
    StatsResponse,
)

router = APIRouter(prefix="/v1")


@router.get("/populations")
def list_populations(
    species: str | None = Query(None, description="Comma-separated species filter"),
    region: str | None = Query(None, description="Region filter"),
    year_min: int | None = Query(None),
    year_max: int | None = Query(None),
    limit: int = Query(1000, le=10000),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Return populations as GeoJSON FeatureCollection."""

    # --- Subquery: latest observation per site (using ROW_NUMBER window) ---
    obs_query = db.query(EscapementObservation)
    if year_min:
        obs_query = obs_query.filter(EscapementObservation.year >= year_min)
    if year_max:
        obs_query = obs_query.filter(EscapementObservation.year <= year_max)

    latest_rn = func.row_number().over(
        partition_by=EscapementObservation.site_id,
        order_by=desc(EscapementObservation.year),
    ).label("rn")

    latest_ranked = (
        obs_query.with_entities(
            EscapementObservation.site_id,
            EscapementObservation.year.label("latest_year"),
            EscapementObservation.total_spawners.label("latest_count"),
            latest_rn,
        )
        .subquery("latest_ranked")
    )

    latest = (
        db.query(
            latest_ranked.c.site_id,
            latest_ranked.c.latest_year,
            latest_ranked.c.latest_count,
        )
        .filter(latest_ranked.c.rn == 1)
        .subquery("latest")
    )

    # --- Subquery: peak spawner count per site (all-time, not year-filtered) ---
    peak_rn = func.row_number().over(
        partition_by=EscapementObservation.site_id,
        order_by=desc(EscapementObservation.total_spawners),
    ).label("rn")

    peak_ranked = (
        db.query(EscapementObservation)
        .filter(EscapementObservation.total_spawners.isnot(None))
        .with_entities(
            EscapementObservation.site_id,
            EscapementObservation.total_spawners.label("peak_count"),
            EscapementObservation.year.label("peak_year"),
            peak_rn,
        )
        .subquery("peak_ranked")
    )

    peak = (
        db.query(
            peak_ranked.c.site_id,
            peak_ranked.c.peak_count,
            peak_ranked.c.peak_year,
        )
        .filter(peak_ranked.c.rn == 1)
        .subquery("peak")
    )

    # --- Main query: sites LEFT JOIN latest, peak, analytics ---
    query = (
        db.query(
            SpawningSite,
            latest.c.latest_year,
            latest.c.latest_count,
            peak.c.peak_count,
            peak.c.peak_year,
            PopulationAnalytics.health_score,
            PopulationAnalytics.health_status,
        )
        .outerjoin(latest, SpawningSite.id == latest.c.site_id)
        .outerjoin(peak, SpawningSite.id == peak.c.site_id)
        .outerjoin(PopulationAnalytics, SpawningSite.id == PopulationAnalytics.site_id)
    )

    if species:
        species_list = [s.strip().lower() for s in species.split(",")]
        query = query.filter(SpawningSite.species.in_(species_list))

    if region:
        query = query.filter(SpawningSite.region.ilike(f"%{region}%"))

    # Count on base table (faster than counting joined query)
    count_query = db.query(SpawningSite)
    if species:
        count_query = count_query.filter(
            SpawningSite.species.in_([s.strip().lower() for s in species.split(",")])
        )
    if region:
        count_query = count_query.filter(SpawningSite.region.ilike(f"%{region}%"))
    total = count_query.count()

    results = query.offset(offset).limit(limit).all()

    features = []
    for site, latest_year, latest_count, peak_count, peak_year, health_score, health_status in results:
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [site.lon, site.lat]},
                "properties": {
                    "id": site.id,
                    "nuseds_pop_id": site.nuseds_pop_id,
                    "stream_name": site.stream_name,
                    "species": site.species,
                    "region": site.region,
                    "lat": site.lat,
                    "lon": site.lon,
                    "conservation_unit": site.conservation_unit,
                    "cu_status": site.cu_status,
                    "latest_year": latest_year,
                    "latest_count": latest_count,
                    "peak_count": peak_count,
                    "peak_year": peak_year,
                    "health_score": health_score,
                    "health_status": health_status,
                },
            }
        )

    return JSONResponse(
        content={"type": "FeatureCollection", "features": features, "total": total},
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/populations/{population_id}")
def get_population(population_id: int, db: Session = Depends(get_db)):
    """Return full detail for a single population."""
    site = db.query(SpawningSite).filter(SpawningSite.id == population_id).first()
    if not site:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Population not found")

    obs_query = db.query(EscapementObservation).filter(
        EscapementObservation.site_id == site.id
    )
    obs_count = obs_query.count()

    stats = (
        db.query(
            func.min(EscapementObservation.year),
            func.max(EscapementObservation.year),
            func.avg(EscapementObservation.total_spawners),
        )
        .filter(EscapementObservation.site_id == site.id)
        .first()
    )

    latest = obs_query.order_by(desc(EscapementObservation.year)).first()
    peak = (
        obs_query.filter(EscapementObservation.total_spawners.isnot(None))
        .order_by(desc(EscapementObservation.total_spawners))
        .first()
    )

    return PopulationDetail(
        id=site.id,
        nuseds_pop_id=site.nuseds_pop_id,
        stream_name=site.stream_name,
        waterbody=site.waterbody,
        species=site.species,
        region=site.region,
        watershed_code=site.watershed_code,
        lat=site.lat,
        lon=site.lon,
        conservation_unit=site.conservation_unit,
        cu_status=site.cu_status,
        total_observations=obs_count,
        first_year=stats[0] if stats else None,
        last_year=stats[1] if stats else None,
        mean_spawners=round(float(stats[2]), 1) if stats and stats[2] else None,
        latest_year=latest.year if latest else None,
        latest_count=latest.total_spawners if latest else None,
        peak_count=peak.total_spawners if peak else None,
        peak_year=peak.year if peak else None,
    )


@router.get("/populations/{population_id}/timeseries")
def get_timeseries(
    population_id: int,
    year_min: int | None = Query(None),
    year_max: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """Return annual escapement time series for a population."""
    site = db.query(SpawningSite).filter(SpawningSite.id == population_id).first()
    if not site:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Population not found")

    query = (
        db.query(EscapementObservation)
        .filter(EscapementObservation.site_id == site.id)
        .order_by(EscapementObservation.year)
    )

    if year_min:
        query = query.filter(EscapementObservation.year >= year_min)
    if year_max:
        query = query.filter(EscapementObservation.year <= year_max)

    observations = query.all()

    return {
        "population_id": site.id,
        "stream_name": site.stream_name,
        "species": site.species,
        "data": [
            Observation(
                year=obs.year,
                natural_adult_spawners=obs.natural_adult_spawners,
                natural_jack_spawners=obs.natural_jack_spawners,
                total_spawners=obs.total_spawners,
                total_return_to_river=obs.total_return_to_river,
                accuracy=obs.accuracy,
                run_type=obs.run_type,
            )
            for obs in observations
        ],
    }


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Return aggregate statistics."""
    total_pops = db.query(SpawningSite).count()
    total_obs = db.query(EscapementObservation).count()

    species_counts = dict(
        db.query(SpawningSite.species, func.count(SpawningSite.id))
        .group_by(SpawningSite.species)
        .all()
    )

    year_range = db.query(
        func.min(EscapementObservation.year),
        func.max(EscapementObservation.year),
    ).first()

    regions = [
        r[0]
        for r in db.query(SpawningSite.region)
        .distinct()
        .order_by(SpawningSite.region)
        .all()
        if r[0]
    ]

    return StatsResponse(
        total_populations=total_pops,
        total_observations=total_obs,
        species_counts=species_counts,
        year_range=[year_range[0] or 0, year_range[1] or 0],
        regions=regions,
    )
