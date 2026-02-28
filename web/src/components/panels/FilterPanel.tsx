"use client";

import { useState } from "react";
import { SPECIES_COLORS, SPECIES_LABELS } from "@/lib/constants";
import type { Species } from "@/lib/types";

const ALL_SPECIES: Species[] = [
  "chinook",
  "sockeye",
  "coho",
  "chum",
  "pink",
  "steelhead",
];

interface FilterPanelProps {
  selectedSpecies: Set<string>;
  onSpeciesChange: (species: Set<string>) => void;
  region: string;
  onRegionChange: (region: string) => void;
  regions: string[];
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  totalShown: number;
  totalAvailable: number;
}

export default function FilterPanel({
  selectedSpecies,
  onSpeciesChange,
  region,
  onRegionChange,
  regions,
  yearRange,
  onYearRangeChange,
  totalShown,
  totalAvailable,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const toggleSpecies = (s: string) => {
    const next = new Set(selectedSpecies);
    if (next.has(s)) {
      next.delete(s);
    } else {
      next.add(s);
    }
    onSpeciesChange(next);
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden fixed left-3 top-3 z-50 glass-panel min-w-[44px] min-h-[44px] px-3.5 py-2.5 text-sm text-slate-300 font-medium cursor-pointer flex items-center gap-1.5"
      >
        {open ? "✕ Close" : "☰ Filters"}
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div className={`fixed left-0 sm:left-4 top-0 sm:top-4 bottom-0 sm:bottom-4 w-64 sm:w-56 z-40 glass-panel sm:rounded-2xl rounded-none p-4 pt-16 sm:pt-4 flex flex-col gap-5 overflow-y-auto animate-slide-in-left transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-[calc(100%+16px)] sm:translate-x-0"}`}>
        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Filters</h2>
          <p className="text-xs font-mono text-slate-500">
            {totalShown.toLocaleString()} of {totalAvailable.toLocaleString()}
          </p>
        </div>

        {/* Species */}
        <div>
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2 block">
            Species
          </label>
          <div className="space-y-0.5">
            {ALL_SPECIES.map((s) => {
              const active = selectedSpecies.size === 0 || selectedSpecies.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSpecies(s)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2.5 sm:py-1.5 rounded-lg text-[13px] transition-all duration-200 cursor-pointer ${
                    active
                      ? "text-slate-200 bg-white/[0.04] hover:bg-white/[0.06]"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity duration-200"
                    style={{
                      backgroundColor: SPECIES_COLORS[s],
                      opacity: active ? 1 : 0.25,
                    }}
                  />
                  {SPECIES_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Region */}
        <div>
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2 block">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-3 sm:py-2 text-[13px] text-slate-300 focus:outline-none focus:border-white/[0.20] transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                Area {r}
              </option>
            ))}
          </select>
        </div>

        {/* Year Range */}
        <div>
          <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2 block">
            Year Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={yearRange[0]}
              min={1920}
              max={yearRange[1]}
              onChange={(e) =>
                onYearRangeChange([parseInt(e.target.value), yearRange[1]])
              }
              className="w-[72px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[13px] font-mono text-slate-300 text-center focus:outline-none focus:border-white/[0.20] transition-colors"
            />
            <span className="text-slate-600">&ndash;</span>
            <input
              type="number"
              value={yearRange[1]}
              min={yearRange[0]}
              max={2025}
              onChange={(e) =>
                onYearRangeChange([yearRange[0], parseInt(e.target.value)])
              }
              className="w-[72px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[13px] font-mono text-slate-300 text-center focus:outline-none focus:border-white/[0.20] transition-colors"
            />
          </div>
        </div>

        <div className="mt-auto pt-2">
          <button
            onClick={() => {
              onSpeciesChange(new Set());
              onRegionChange("");
              onYearRangeChange([1920, 2025]);
            }}
            className="text-[12px] sm:text-[11px] text-slate-500 hover:text-slate-200 transition-colors cursor-pointer py-2 sm:py-0"
          >
            Reset all filters
          </button>
        </div>
      </div>
    </>
  );
}
