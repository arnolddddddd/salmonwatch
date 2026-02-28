"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_URL, SPECIES_COLORS, SPECIES_LABELS } from "@/lib/constants";
import { getTimeseries } from "@/lib/api";
import { aggregateByYear, getBestMetric } from "@/lib/aggregation";
import type { Species, TimeseriesResponse } from "@/lib/types";
import PopulationTimeSeries from "@/components/charts/PopulationTimeSeries";

interface PopulationDetail {
  id: number;
  nuseds_pop_id: number;
  stream_name: string | null;
  waterbody: string | null;
  species: string;
  region: string | null;
  watershed_code: string | null;
  lat: number;
  lon: number;
  conservation_unit: string | null;
  cu_status: string | null;
  total_observations: number;
  first_year: number | null;
  last_year: number | null;
  mean_spawners: number | null;
  latest_year: number | null;
  latest_count: number | null;
  peak_count: number | null;
  peak_year: number | null;
}

function DetailNav({ streamName }: { streamName?: string | null }) {
  return (
    <nav className="border-b border-white/[0.08] sticky top-0 z-50 bg-[#080c14]/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/explorer"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors min-h-[44px] shrink-0"
          >
            <span className="text-lg">&larr;</span>
            <span className="hidden sm:inline">Explorer</span>
          </Link>
          {streamName && (
            <>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <span className="text-sm text-slate-300 font-medium truncate hidden sm:inline">
                {streamName}
              </span>
            </>
          )}
        </div>
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center border border-emerald-500/20">
            SW
          </div>
          <span className="font-semibold text-xs text-slate-300 hidden sm:inline">
            SalmonWatch <span className="text-slate-500">BC</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default function PopulationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [detail, setDetail] = useState<PopulationDetail | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic page title
  useEffect(() => {
    if (detail) {
      const name = detail.stream_name ?? "Population";
      const sp = detail.species ? ` (${detail.species})` : "";
      document.title = `${name}${sp} — SalmonWatch BC`;
    }
    return () => { document.title = "SalmonWatch BC"; };
  }, [detail]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/v1/populations/${id}`).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      }),
      getTimeseries(parseInt(id)),
    ])
      .then(([d, ts]) => {
        setDetail(d);
        setTimeseries(ts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Aggregate by year for trend calculation (must be before conditional returns)
  const observations = timeseries?.data ?? [];
  const aggregated = useMemo(
    () => aggregateByYear(observations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeseries]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14]">
        <DetailNav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-slate-500 text-sm font-mono animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#080c14]">
        <DetailNav />
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <div className="text-[#c4584a] text-sm">Population not found</div>
          <Link href="/explorer" className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
            &larr; Back to explorer
          </Link>
        </div>
      </div>
    );
  }

  const species = detail.species as Species;
  const color = SPECIES_COLORS[species] ?? "#8a95a8";

  // Compute trend using aggregated data
  const trendValues = aggregated.map(o => getBestMetric(o));
  const recent10 = trendValues.slice(-10).filter((v): v is number => v != null);
  const earlier = trendValues.slice(-20, -10).filter((v): v is number => v != null);
  const recentAvg = recent10.length > 0 ? recent10.reduce((a, b) => a + b, 0) / recent10.length : null;
  const earlierAvg = earlier.length > 0 ? earlier.reduce((a, b) => a + b, 0) / earlier.length : null;
  const trend = recentAvg != null && earlierAvg != null && earlierAvg > 0
    ? ((recentAvg - earlierAvg) / earlierAvg) * 100
    : null;

  return (
    <div className="min-h-screen bg-[#080c14]">
      <DetailNav streamName={detail.stream_name} />
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            {SPECIES_LABELS[species] ?? detail.species}
          </span>
          {detail.cu_status && (
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ml-2 ${
              detail.cu_status === "red"
                ? "bg-[#c4584a]/10 text-[#c4584a]"
                : detail.cu_status === "amber"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-[#3d9a6a]/10 text-[#3d9a6a]"
            }`}>
              {detail.cu_status}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {detail.stream_name ?? "Unknown Stream"}
        </h1>
        <p className="text-sm text-slate-500 font-mono">
          Area {detail.region}
          {detail.waterbody && detail.waterbody !== detail.stream_name && (
            <> &middot; {detail.waterbody}</>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Observations" value={detail.total_observations.toLocaleString()} />
        <StatCard
          label="Year Range"
          value={detail.first_year && detail.last_year ? `${detail.first_year}\u2013${detail.last_year}` : "N/A"}
        />
        <StatCard
          label="Latest Count"
          value={detail.latest_count?.toLocaleString() ?? "N/A"}
          sub={detail.latest_year?.toString()}
        />
        <StatCard
          label="Peak Spawners"
          value={detail.peak_count?.toLocaleString() ?? "N/A"}
          sub={detail.peak_year?.toString()}
        />
        <StatCard
          label="Mean Spawners"
          value={detail.mean_spawners?.toLocaleString() ?? "N/A"}
        />
        {trend != null && (
          <StatCard
            label="10yr Trend"
            value={`${trend > 0 ? "+" : ""}${trend.toFixed(0)}%`}
            color={trend > 0 ? "#3d9a6a" : "#c4584a"}
            sub="vs prior decade"
          />
        )}
        <StatCard
          label="Coordinates"
          value={`${detail.lat.toFixed(3)}, ${detail.lon.toFixed(3)}`}
          mono
        />
        {detail.nuseds_pop_id && (
          <StatCard label="NuSEDS Pop ID" value={String(detail.nuseds_pop_id)} mono />
        )}
      </div>

      {/* Conservation Unit */}
      {detail.conservation_unit && (
        <div className="glass-panel p-5 mb-8">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Conservation Unit</div>
          <div className="text-[15px] text-slate-200 font-medium">{detail.conservation_unit}</div>
          {detail.watershed_code && (
            <div className="text-[11px] text-slate-500 font-mono mt-1">{detail.watershed_code}</div>
          )}
        </div>
      )}

      {/* Time Series Chart */}
      <div className="glass-panel p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Escapement Time Series</h2>
        {observations.length > 0 ? (
          <PopulationTimeSeries
            data={observations}
            species={detail.species}
            height={320}
            color={color}
          />
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
            No time series data available
          </div>
        )}
      </div>

      {/* Observations Table */}
      {observations.length > 0 && (
        <div className="glass-panel p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">
            Annual Observations
            <span className="text-slate-500 font-normal ml-2 font-mono text-xs">
              {observations.length} records
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-4 font-medium">Year</th>
                  <th className="text-right py-2 px-4 font-medium">Total Spawners</th>
                  <th className="text-right py-2 px-4 font-medium">Adults</th>
                  <th className="text-right py-2 px-4 font-medium">Jacks</th>
                  <th className="text-right py-2 px-4 font-medium">Return to River</th>
                  <th className="text-left py-2 px-4 font-medium">Accuracy</th>
                  <th className="text-left py-2 pl-4 font-medium">Run Type</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[...observations].reverse().map((obs) => (
                  <tr key={obs.year} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-1.5 pr-4 text-slate-300 font-medium">{obs.year}</td>
                    <td className="py-1.5 px-4 text-right text-slate-200">
                      {obs.total_spawners?.toLocaleString() ?? <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-4 text-right text-slate-400">
                      {obs.natural_adult_spawners?.toLocaleString() ?? <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-4 text-right text-slate-400">
                      {obs.natural_jack_spawners?.toLocaleString() ?? <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-4 text-right text-slate-400">
                      {obs.total_return_to_river?.toLocaleString() ?? <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="py-1.5 px-4 text-left text-slate-500">{obs.accuracy ?? "\u2014"}</td>
                    <td className="py-1.5 pl-4 text-left text-slate-500">{obs.run_type ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div
        className={`text-lg font-semibold ${mono ? "font-mono text-sm" : ""}`}
        style={{ color: color ?? "#e2e8f0" }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}
