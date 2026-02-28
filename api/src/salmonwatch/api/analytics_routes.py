"""Analytics API endpoints."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from salmonwatch.db.engine import get_db
from salmonwatch.db.tables import (
    SpawningSite,
    EscapementObservation,
    PopulationAnalytics,
)
from salmonwatch.api.schemas import (
    AnalyticsOverview,
    SpeciesSummary,
    RegionalSummary,
    DecliningPopulation,
    MonitoringGap,
    HealthDistribution,
)

router = APIRouter(prefix="/v1/analytics")

CACHE_HEADERS = {"Cache-Control": "public, max-age=3600"}


@router.get("/overview")
def analytics_overview(db: Session = Depends(get_db)) -> JSONResponse:
    """Province-wide headline analytics."""
    total_pops = db.query(PopulationAnalytics).count()
    total_obs = db.query(EscapementObservation).count()

    if total_pops == 0:
        return JSONResponse(
            content=AnalyticsOverview(
                total_populations=0, total_observations=total_obs,
                total_monitored_recent=0, pct_declining=0, pct_critical=0,
                pct_unmonitored=0, avg_health_score=0, year_range=[0, 0],
            ).model_dump(),
            headers=CACHE_HEADERS,
        )

    # Single query with conditional aggregation
    row = db.query(
        func.count().filter(PopulationAnalytics.is_monitored_recent.is_(True)),
        func.count().filter(PopulationAnalytics.trend_10yr < 0),
        func.count().filter(PopulationAnalytics.health_status == "critical"),
        func.avg(PopulationAnalytics.health_score),
    ).one()

    monitored_recent, declining, critical, avg_health = row

    year_range_result = db.query(
        func.min(EscapementObservation.year), func.max(EscapementObservation.year),
    ).first()

    data = AnalyticsOverview(
        total_populations=total_pops, total_observations=total_obs,
        total_monitored_recent=monitored_recent,
        pct_declining=round(declining / total_pops * 100, 1),
        pct_critical=round(critical / total_pops * 100, 1),
        pct_unmonitored=round((total_pops - monitored_recent) / total_pops * 100, 1),
        avg_health_score=round(float(avg_health or 0), 1),
        year_range=[year_range_result[0] or 0, year_range_result[1] or 0],
    )
    return JSONResponse(content=data.model_dump(), headers=CACHE_HEADERS)


@router.get("/species")
def analytics_species(db: Session = Depends(get_db)) -> JSONResponse:
    """Per-species analytics summary — single GROUP BY query."""
    results = (
        db.query(
            SpawningSite.species,
            func.count().label("total"),
            func.count().filter(PopulationAnalytics.is_monitored_recent.is_(True)).label("monitored"),
            func.count().filter(PopulationAnalytics.trend_10yr < 0).label("declining"),
            func.count().filter(PopulationAnalytics.health_status == "critical").label("critical_count"),
            func.avg(PopulationAnalytics.health_score).label("avg_health"),
        )
        .join(SpawningSite, PopulationAnalytics.site_id == SpawningSite.id)
        .filter(SpawningSite.species.isnot(None))
        .group_by(SpawningSite.species)
        .order_by(SpawningSite.species)
        .all()
    )

    data = []
    for species, total, monitored, declining, critical_count, avg_health in results:
        if total == 0:
            continue
        data.append(SpeciesSummary(
            species=species, total_populations=total, monitored_recent=monitored,
            pct_unmonitored=round((total - monitored) / total * 100, 1),
            avg_health_score=round(float(avg_health or 0), 1),
            pct_declining=round(declining / total * 100, 1),
            pct_critical=round(critical_count / total * 100, 1),
        ))
    return JSONResponse(
        content=[d.model_dump() for d in data],
        headers=CACHE_HEADERS,
    )


@router.get("/regions")
def analytics_regions(db: Session = Depends(get_db)) -> JSONResponse:
    """Per-region analytics summary — single GROUP BY query."""
    results = (
        db.query(
            SpawningSite.region,
            func.count().label("total"),
            func.count().filter(PopulationAnalytics.is_monitored_recent.is_(True)).label("monitored"),
            func.count().filter(PopulationAnalytics.trend_10yr < 0).label("declining"),
            func.count().filter(PopulationAnalytics.health_status == "critical").label("critical_count"),
            func.avg(PopulationAnalytics.health_score).label("avg_health"),
        )
        .join(SpawningSite, PopulationAnalytics.site_id == SpawningSite.id)
        .filter(SpawningSite.region.isnot(None))
        .group_by(SpawningSite.region)
        .order_by(SpawningSite.region)
        .all()
    )

    data = []
    for region, total, monitored, declining, critical_count, avg_health in results:
        if total == 0:
            continue
        data.append(RegionalSummary(
            region=region, total_populations=total, monitored_recent=monitored,
            pct_unmonitored=round((total - monitored) / total * 100, 1),
            avg_health_score=round(float(avg_health or 0), 1),
            pct_declining=round(declining / total * 100, 1),
            pct_critical=round(critical_count / total * 100, 1),
        ))
    return JSONResponse(
        content=[d.model_dump() for d in data],
        headers=CACHE_HEADERS,
    )


@router.get("/declining")
def analytics_declining(
    limit: int = Query(20, le=100),
    species: str | None = Query(None),
    region: str | None = Query(None),
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Top declining populations by 10yr trend."""
    query = (
        db.query(PopulationAnalytics, SpawningSite)
        .join(SpawningSite, PopulationAnalytics.site_id == SpawningSite.id)
        .filter(PopulationAnalytics.trend_10yr.isnot(None))
        .order_by(PopulationAnalytics.trend_10yr)
    )
    if species:
        query = query.filter(SpawningSite.species == species.lower())
    if region:
        query = query.filter(SpawningSite.region.ilike(f"%{region}%"))
    results = query.limit(limit).all()
    data = [
        DecliningPopulation(
            id=site.id, stream_name=site.stream_name, species=site.species,
            region=site.region, trend_10yr=analytics.trend_10yr,
            health_score=analytics.health_score, health_status=analytics.health_status,
            latest_count=analytics.latest_count,
        )
        for analytics, site in results
    ]
    return JSONResponse(
        content=[d.model_dump() for d in data],
        headers=CACHE_HEADERS,
    )


@router.get("/gaps")
def analytics_gaps(
    limit: int = Query(20, le=100),
    species: str | None = Query(None),
    region: str | None = Query(None),
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Populations with longest monitoring gaps."""
    query = (
        db.query(PopulationAnalytics, SpawningSite)
        .join(SpawningSite, PopulationAnalytics.site_id == SpawningSite.id)
        .filter(PopulationAnalytics.years_since_survey.isnot(None))
        .order_by(PopulationAnalytics.years_since_survey.desc())
    )
    if species:
        query = query.filter(SpawningSite.species == species.lower())
    if region:
        query = query.filter(SpawningSite.region.ilike(f"%{region}%"))
    results = query.limit(limit).all()
    data = [
        MonitoringGap(
            id=site.id, stream_name=site.stream_name, species=site.species,
            region=site.region, last_year=analytics.last_year,
            years_since_survey=analytics.years_since_survey,
        )
        for analytics, site in results
    ]
    return JSONResponse(
        content=[d.model_dump() for d in data],
        headers=CACHE_HEADERS,
    )


@router.get("/health-distribution")
def analytics_health_distribution(
    species: str | None = Query(None),
    region: str | None = Query(None),
    db: Session = Depends(get_db),
) -> JSONResponse:
    """Count of populations per health status bucket — single GROUP BY."""
    query = db.query(
        PopulationAnalytics.health_status,
        func.count().label("cnt"),
    )
    if species or region:
        query = query.join(SpawningSite, PopulationAnalytics.site_id == SpawningSite.id)
        if species:
            query = query.filter(SpawningSite.species == species.lower())
        if region:
            query = query.filter(SpawningSite.region.ilike(f"%{region}%"))

    rows = query.group_by(PopulationAnalytics.health_status).all()
    counts = {status: 0 for status in ("critical", "poor", "fair", "good", "strong")}
    for status, cnt in rows:
        if status in counts:
            counts[status] = cnt

    return JSONResponse(
        content=HealthDistribution(**counts).model_dump(),
        headers=CACHE_HEADERS,
    )
