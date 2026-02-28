"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { PopulationFeature, TimeseriesResponse } from "@/lib/types";
import type { Species } from "@/lib/types";
import { SPECIES_COLORS, SPECIES_LABELS } from "@/lib/constants";
import { getTimeseries } from "@/lib/api";
import { aggregateByYear, getBestMetric } from "@/lib/aggregation";
import Sparkline from "@/components/charts/Sparkline";
import Link from "next/link";

interface ContextPanelProps {
  feature: PopulationFeature;
  onClose: () => void;
}

export default function ContextPanel({ feature, onClose }: ContextPanelProps) {
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const { properties: p } = feature;
  const species = p.species as Species;
  const color = SPECIES_COLORS[species] ?? "#8a95a8";

  const loading = loadedId !== p.id;

  // Responsive sparkline width
  const sparkRef = useRef<HTMLDivElement>(null);
  const [sparkWidth, setSparkWidth] = useState(260);
  useEffect(() => {
    const el = sparkRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSparkWidth(Math.floor(entry.contentRect.width));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fetchTimeseries = useCallback((id: number) => {
    return getTimeseries(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTimeseries(p.id)
      .then((data) => {
        if (!cancelled) {
          setTimeseries(data);
          setLoadedId(p.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimeseries(null);
          setLoadedId(p.id);
        }
      });
    return () => { cancelled = true; };
  }, [p.id, fetchTimeseries]);

  // Aggregate duplicate years for charting
  const aggregated = useMemo(
    () => (timeseries ? aggregateByYear(timeseries.data) : []),
    [timeseries]
  );
  const years = aggregated.map((d) => d.year);
  const values = aggregated.map((d) => getBestMetric(d));

  // Compute trend
  const recent10 = values.slice(-10).filter((v): v is number => v != null);
  const earlier = values.slice(-20, -10).filter((v): v is number => v != null);
  const recentAvg =
    recent10.length > 0
      ? recent10.reduce((a, b) => a + b, 0) / recent10.length
      : null;
  const earlierAvg =
    earlier.length > 0
      ? earlier.reduce((a, b) => a + b, 0) / earlier.length
      : null;
  const trend =
    recentAvg != null && earlierAvg != null && earlierAvg > 0
      ? ((recentAvg - earlierAvg) / earlierAvg) * 100
      : null;

  return (
    <div className="fixed right-0 sm:right-4 bottom-0 sm:bottom-auto sm:top-4 z-50 w-full sm:w-[320px] max-h-[70vh] sm:max-h-[calc(100vh-32px)] overflow-y-auto glass-panel rounded-t-2xl sm:rounded-2xl p-5 pt-3 sm:pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 flex flex-col gap-4 animate-slide-up sm:animate-slide-in-right">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-1 pb-2">
        <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
      </div>

      {/* Close button — larger on mobile */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 sm:right-4 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-400 hover:text-slate-200 text-xl sm:text-sm cursor-pointer transition-colors"
      >
        &times;
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            {SPECIES_LABELS[species] ?? p.species}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-white leading-tight">
          {p.stream_name ?? "Unknown Stream"}
        </h3>
        {p.region && (
          <p className="text-[12px] text-slate-500 mt-0.5 font-mono">Area {p.region}</p>
        )}
      </div>

      {/* Sparkline */}
      <div ref={sparkRef} className="glass-subtle p-3 rounded-xl overflow-hidden">
        {loading ? (
          <div className="h-[60px] flex items-center justify-center text-[12px] text-slate-600">
            Loading...
          </div>
        ) : years.length > 0 ? (
          <Sparkline years={years} values={values} color={color} width={sparkWidth} height={72} />
        ) : (
          <div className="h-[60px] flex items-center justify-center text-[12px] text-slate-600">
            No time series data
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        {p.latest_count != null && (
          <StatBlock
            label="Latest Count"
            value={p.latest_count.toLocaleString()}
            sub={p.latest_year?.toString()}
          />
        )}
        {p.peak_count != null && (
          <StatBlock
            label="Peak"
            value={p.peak_count.toLocaleString()}
            sub={p.peak_year?.toString()}
          />
        )}
        {timeseries && (
          <StatBlock
            label="Data Points"
            value={String(timeseries.data.length)}
            sub={years.length > 0 ? `${years[0]}\u2013${years[years.length - 1]}` : undefined}
          />
        )}
        {trend != null && (
          <StatBlock
            label="10yr Trend"
            value={`${trend > 0 ? "+" : ""}${trend.toFixed(0)}%`}
            sub="vs prior decade"
            color={trend > 0 ? "#3d9a6a" : "#c4584a"}
          />
        )}
      </div>

      {/* CU Status */}
      {p.conservation_unit && (
        <div className="glass-subtle p-3 rounded-xl">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Conservation Unit</div>
          <div className="text-[13px] text-slate-200">{p.conservation_unit}</div>
          {p.cu_status && (
            <span
              className={`inline-block mt-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${
                p.cu_status === "red"
                  ? "bg-[#c4584a]/10 text-[#c4584a]"
                  : p.cu_status === "amber"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-[#3d9a6a]/10 text-[#3d9a6a]"
              }`}
            >
              {p.cu_status}
            </span>
          )}
        </div>
      )}

      {/* Detail link */}
      <Link
        href={`/population/${p.id}`}
        className="block text-center glass-subtle hover:bg-white/[0.06] text-emerald-400 hover:text-emerald-300 py-3.5 sm:py-2.5 rounded-xl text-sm sm:text-[13px] font-semibold transition-all duration-200"
      >
        View full details &rarr;
      </Link>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="glass-subtle p-2.5 rounded-xl">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-medium">
        {label}
      </div>
      <div className="text-base font-semibold font-mono" style={{ color: color ?? "#e2e8f0" }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-slate-500 font-mono">{sub}</div>}
    </div>
  );
}
