import type { PopulationFeature } from "@/lib/types";
import { SPECIES_COLORS, SPECIES_LABELS } from "@/lib/constants";
import type { Species } from "@/lib/types";

interface MapPopupProps {
  feature: PopulationFeature;
  x: number;
  y: number;
}

export default function MapPopup({ feature, x, y }: MapPopupProps) {
  const { properties: p } = feature;
  const species = p.species as Species;
  const color = SPECIES_COLORS[species] ?? "#8a95a8";
  const label = SPECIES_LABELS[species] ?? p.species;

  return (
    <div
      className="absolute z-50 pointer-events-none glass-panel px-3.5 py-2.5 shadow-2xl"
      style={{
        left: x + 14,
        top: y - 14,
        maxWidth: 280,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[13px] font-semibold text-slate-100 truncate">
          {p.stream_name ?? "Unknown Stream"}
        </span>
      </div>

      <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
        <div>
          {label} &middot; Area {p.region}
        </div>
        {p.latest_count != null && (
          <div>
            Latest: <span className="text-slate-200">{p.latest_count.toLocaleString()}</span>{" "}
            ({p.latest_year})
          </div>
        )}
        {p.peak_count != null && (
          <div>
            Peak: <span className="text-slate-200">{p.peak_count.toLocaleString()}</span>{" "}
            ({p.peak_year})
          </div>
        )}
      </div>
    </div>
  );
}
