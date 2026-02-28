import type { Observation } from "./types";

function sumNullable(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

/** Aggregate observations by year — sum numeric fields, deduplicate for charting. */
export function aggregateByYear(data: Observation[]): Observation[] {
  const map = new Map<number, Observation>();
  for (const obs of data) {
    const existing = map.get(obs.year);
    if (!existing) {
      map.set(obs.year, { ...obs });
    } else {
      existing.total_spawners = sumNullable(existing.total_spawners, obs.total_spawners);
      existing.natural_adult_spawners = sumNullable(existing.natural_adult_spawners, obs.natural_adult_spawners);
      existing.natural_jack_spawners = sumNullable(existing.natural_jack_spawners, obs.natural_jack_spawners);
      existing.total_return_to_river = sumNullable(existing.total_return_to_river, obs.total_return_to_river);
      existing.accuracy = existing.accuracy ?? obs.accuracy;
      existing.run_type = existing.run_type ?? obs.run_type;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

/** Get the best available metric for an observation. */
export function getBestMetric(obs: Observation): number | null {
  return obs.total_spawners ?? obs.total_return_to_river ?? obs.natural_adult_spawners ?? null;
}
