import { ScatterplotLayer } from "@deck.gl/layers";
import type { PopulationFeature } from "@/lib/types";
import { SPECIES_COLORS } from "@/lib/constants";
import type { Species } from "@/lib/types";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function createSpawningSiteLayer(data: PopulationFeature[]) {
  return new ScatterplotLayer<PopulationFeature>({
    id: "spawning-sites",
    data,
    getPosition: (d) => d.geometry.coordinates as [number, number],
    getRadius: (d) => {
      const count = d.properties.latest_count ?? d.properties.peak_count ?? 100;
      return Math.max(300, Math.min(5000, Math.log10(count + 1) * 1000));
    },
    getFillColor: (d) => {
      const species = d.properties.species as Species;
      const hex = SPECIES_COLORS[species] ?? "#94A3B8";
      return [...hexToRgb(hex), 180];
    },
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 24,
    pickable: true,
    antialiasing: true,
  });
}
