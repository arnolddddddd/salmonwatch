import { API_URL } from "./constants";
import type {
  PopulationCollection,
  TimeseriesResponse,
  StatsResponse,
  AnalyticsOverview,
  SpeciesSummary,
  RegionalSummary,
  DecliningPopulation,
  MonitoringGap,
  HealthDistribution,
} from "./types";

const REQUEST_TIMEOUT = 10_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchJSON<T>(path: string, retries = MAX_RETRIES): Promise<T> {
  const url = `${API_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, REQUEST_TIMEOUT);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Not found");
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`Request failed (${res.status})`);
        }
        // Server errors are retryable
        lastError = new Error(`Server error (${res.status})`);
      } else {
        return await res.json();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new Error("Request timed out — the server may be under load");
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        lastError = new Error("Unable to connect — check your internet connection");
      } else if (err instanceof Error && (err.message === "Not found" || err.message.startsWith("Request failed"))) {
        throw err; // Don't retry client errors
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    // Exponential backoff before retry
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
    }
  }
  throw lastError ?? new Error("Request failed after retries");
}

export async function getPopulations(params?: {
  species?: string;
  region?: string;
  year_min?: number;
  year_max?: number;
  limit?: number;
  offset?: number;
}): Promise<PopulationCollection> {
  const searchParams = new URLSearchParams();
  if (params?.species) searchParams.set("species", params.species);
  if (params?.region) searchParams.set("region", params.region);
  if (params?.year_min) searchParams.set("year_min", String(params.year_min));
  if (params?.year_max) searchParams.set("year_max", String(params.year_max));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return fetchJSON(`/v1/populations${qs ? `?${qs}` : ""}`);
}

export async function getTimeseries(
  populationId: number,
  params?: { year_min?: number; year_max?: number }
): Promise<TimeseriesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.year_min) searchParams.set("year_min", String(params.year_min));
  if (params?.year_max) searchParams.set("year_max", String(params.year_max));

  const qs = searchParams.toString();
  return fetchJSON(
    `/v1/populations/${populationId}/timeseries${qs ? `?${qs}` : ""}`
  );
}

export async function getStats(): Promise<StatsResponse> {
  return fetchJSON("/v1/stats");
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return fetchJSON("/v1/analytics/overview");
}

export async function getAnalyticsSpecies(): Promise<SpeciesSummary[]> {
  return fetchJSON("/v1/analytics/species");
}

export async function getAnalyticsRegions(): Promise<RegionalSummary[]> {
  return fetchJSON("/v1/analytics/regions");
}

export async function getAnalyticsDeclining(params?: {
  limit?: number;
  species?: string;
  region?: string;
}): Promise<DecliningPopulation[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.species) searchParams.set("species", params.species);
  if (params?.region) searchParams.set("region", params.region);
  const qs = searchParams.toString();
  return fetchJSON(`/v1/analytics/declining${qs ? `?${qs}` : ""}`);
}

export async function getAnalyticsGaps(params?: {
  limit?: number;
  species?: string;
  region?: string;
}): Promise<MonitoringGap[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.species) searchParams.set("species", params.species);
  if (params?.region) searchParams.set("region", params.region);
  const qs = searchParams.toString();
  return fetchJSON(`/v1/analytics/gaps${qs ? `?${qs}` : ""}`);
}

export async function getAnalyticsHealthDistribution(params?: {
  species?: string;
  region?: string;
}): Promise<HealthDistribution> {
  const searchParams = new URLSearchParams();
  if (params?.species) searchParams.set("species", params.species);
  if (params?.region) searchParams.set("region", params.region);
  const qs = searchParams.toString();
  return fetchJSON(`/v1/analytics/health-distribution${qs ? `?${qs}` : ""}`);
}
