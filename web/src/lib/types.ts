export interface PopulationProperties {
  id: number;
  nuseds_pop_id: number;
  stream_name: string | null;
  species: string;
  region: string | null;
  lat: number;
  lon: number;
  conservation_unit: string | null;
  cu_status: string | null;
  latest_year: number | null;
  latest_count: number | null;
  peak_count: number | null;
  peak_year: number | null;
}

export interface PopulationFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: PopulationProperties;
}

export interface PopulationCollection {
  type: "FeatureCollection";
  features: PopulationFeature[];
  total: number;
}

export interface Observation {
  year: number;
  natural_adult_spawners: number | null;
  natural_jack_spawners: number | null;
  total_spawners: number | null;
  total_return_to_river: number | null;
  accuracy: string | null;
  run_type: string | null;
}

export interface TimeseriesResponse {
  population_id: number;
  stream_name: string;
  species: string;
  data: Observation[];
}

export interface StatsResponse {
  total_populations: number;
  total_observations: number;
  species_counts: Record<string, number>;
  year_range: [number, number];
  regions: string[];
}

export type Species =
  | "chinook"
  | "sockeye"
  | "coho"
  | "chum"
  | "pink"
  | "steelhead";

export interface AnalyticsOverview {
  total_populations: number;
  total_observations: number;
  total_monitored_recent: number;
  pct_declining: number;
  pct_critical: number;
  pct_unmonitored: number;
  avg_health_score: number;
  year_range: [number, number];
}

export interface SpeciesSummary {
  species: string;
  total_populations: number;
  monitored_recent: number;
  pct_unmonitored: number;
  avg_health_score: number;
  pct_declining: number;
  pct_critical: number;
}

export interface RegionalSummary {
  region: string;
  total_populations: number;
  monitored_recent: number;
  pct_unmonitored: number;
  avg_health_score: number;
  pct_declining: number;
  pct_critical: number;
}

export interface DecliningPopulation {
  id: number;
  stream_name: string | null;
  species: string | null;
  region: string | null;
  trend_10yr: number | null;
  health_score: number | null;
  health_status: string | null;
  latest_count: number | null;
}

export interface MonitoringGap {
  id: number;
  stream_name: string | null;
  species: string | null;
  region: string | null;
  last_year: number | null;
  years_since_survey: number | null;
}

export interface HealthDistribution {
  critical: number;
  poor: number;
  fair: number;
  good: number;
  strong: number;
}
