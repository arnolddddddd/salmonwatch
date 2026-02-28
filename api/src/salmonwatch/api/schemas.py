from pydantic import BaseModel


class PopulationSummary(BaseModel):
    id: int
    nuseds_pop_id: int
    stream_name: str | None
    species: str
    region: str | None
    lat: float
    lon: float
    conservation_unit: str | None
    cu_status: str | None
    latest_year: int | None
    latest_count: int | None
    peak_count: int | None
    peak_year: int | None


class PopulationDetail(PopulationSummary):
    waterbody: str | None
    watershed_code: str | None
    total_observations: int
    first_year: int | None
    last_year: int | None
    mean_spawners: float | None


class Observation(BaseModel):
    year: int
    natural_adult_spawners: int | None
    natural_jack_spawners: int | None
    total_spawners: int | None
    total_return_to_river: int | None
    accuracy: str | None
    run_type: str | None


class PopulationGeoJSON(BaseModel):
    """GeoJSON Feature for a population."""

    type: str = "Feature"
    geometry: dict
    properties: PopulationSummary


class StatsResponse(BaseModel):
    total_populations: int
    total_observations: int
    species_counts: dict[str, int]
    year_range: list[int]
    regions: list[str]


class AnalyticsOverview(BaseModel):
    total_populations: int
    total_observations: int
    total_monitored_recent: int
    pct_declining: float
    pct_critical: float
    pct_unmonitored: float
    avg_health_score: float
    year_range: list[int]


class SpeciesSummary(BaseModel):
    species: str
    total_populations: int
    monitored_recent: int
    pct_unmonitored: float
    avg_health_score: float
    pct_declining: float
    pct_critical: float


class RegionalSummary(BaseModel):
    region: str
    total_populations: int
    monitored_recent: int
    pct_unmonitored: float
    avg_health_score: float
    pct_declining: float
    pct_critical: float


class DecliningPopulation(BaseModel):
    id: int
    stream_name: str | None
    species: str | None
    region: str | None
    trend_10yr: float | None
    health_score: int | None
    health_status: str | None
    latest_count: int | None


class MonitoringGap(BaseModel):
    id: int
    stream_name: str | None
    species: str | None
    region: str | None
    last_year: int | None
    years_since_survey: int | None


class HealthDistribution(BaseModel):
    critical: int
    poor: int
    fair: int
    good: int
    strong: int
