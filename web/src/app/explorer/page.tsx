"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import SalmonMap from "@/components/map/SalmonMap";
import FilterPanel from "@/components/panels/FilterPanel";
import StatsBar from "@/components/panels/StatsBar";
import ContextPanel from "@/components/panels/ContextPanel";
import type { PopulationFeature } from "@/lib/types";
import { getPopulations, getStats } from "@/lib/api";
import { DEFAULT_VIEW_STATE } from "@/lib/constants";
import { useFilterParams } from "@/hooks/useFilterParams";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#080c14]">
          <div className="text-slate-500 text-sm font-mono animate-pulse">
            Loading explorer...
          </div>
        </div>
      }
    >
      <ExplorerPageInner />
    </Suspense>
  );
}

function ExplorerPageInner() {
  const [data, setData] = useState<PopulationFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);

  // Filter state — synced to URL search params
  const {
    selectedSpecies, setSelectedSpecies,
    selectedRegion, setSelectedRegion,
    yearRange, setYearRange,
  } = useFilterParams();

  // Context panel state
  const [selectedSite, setSelectedSite] = useState<PopulationFeature | null>(null);

  useEffect(() => {
    Promise.all([getPopulations({ limit: 10000 }), getStats()])
      .then(([collection, stats]) => {
        setData(collection.features);
        setRegions(stats.regions);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Client-side filtering for instant UX
  const filteredData = useMemo(() => {
    return data.filter((f) => {
      const p = f.properties;

      if (selectedSpecies.size > 0 && !selectedSpecies.has(p.species)) {
        return false;
      }

      if (selectedRegion && p.region !== selectedRegion) {
        return false;
      }

      // Year range: show populations last surveyed within the selected range
      if (yearRange[0] > 1920 || yearRange[1] < 2025) {
        if (
          p.latest_year == null ||
          p.latest_year < yearRange[0] ||
          p.latest_year > yearRange[1]
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedSpecies, selectedRegion, yearRange]);

  const handleSiteClick = useCallback((feature: PopulationFeature) => {
    setSelectedSite(feature);
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-[#c4584a]">
        Error loading data: {error}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#080c14]">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-slate-500 text-sm font-mono animate-pulse">
              Loading populations...
            </div>
          </div>
        ) : (
          <ErrorBoundary fallback={
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Map failed to load. Try refreshing the page.
            </div>
          }>
            <SalmonMap
              data={filteredData}
              initialViewState={DEFAULT_VIEW_STATE}
              onSiteClick={handleSiteClick}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Empty filter state */}
      {!loading && filteredData.length === 0 && data.length > 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="glass-panel px-6 py-4 text-center pointer-events-auto">
            <p className="text-slate-300 text-sm font-medium mb-1">No populations match your filters</p>
            <p className="text-slate-500 text-xs">Try adjusting species, region, or year range</p>
          </div>
        </div>
      )}

      {/* Floating nav */}
      <nav className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="pointer-events-auto hidden sm:flex items-center gap-2 glass-panel px-3 py-1.5 border-white/[0.06] hover:border-white/[0.12] transition-colors">
            <div className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center border border-emerald-500/20">
              SW
            </div>
            <span className="font-semibold text-xs text-slate-300">
              SalmonWatch <span className="text-slate-500">BC</span>
            </span>
          </Link>
          <div className="pointer-events-auto flex items-center gap-1 glass-panel px-1 py-1 border-white/[0.06] ml-auto">
            <span className="px-3 py-1 text-xs font-medium text-emerald-400 rounded-md bg-white/[0.06]">
              Explorer
            </span>
            <Link
              href="/analytics"
              className="px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-md hover:bg-white/[0.04] transition-colors"
            >
              Analytics
            </Link>
          </div>
        </div>
      </nav>

      {/* Floating UI overlays */}
      <FilterPanel
        selectedSpecies={selectedSpecies}
        onSpeciesChange={setSelectedSpecies}
        region={selectedRegion}
        onRegionChange={setSelectedRegion}
        regions={regions}
        yearRange={yearRange}
        onYearRangeChange={setYearRange}
        totalShown={filteredData.length}
        totalAvailable={data.length}
      />

      <StatsBar
        totalPopulations={data.length}
        yearRange={yearRange}
      />

      {selectedSite && (
        <ContextPanel
          feature={selectedSite}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </div>
  );
}
