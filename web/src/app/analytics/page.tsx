"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AnalyticsOverview,
  SpeciesSummary,
  RegionalSummary,
  DecliningPopulation,
  MonitoringGap,
  HealthDistribution,
  Species,
} from "@/lib/types";
import {
  getAnalyticsOverview,
  getAnalyticsSpecies,
  getAnalyticsRegions,
  getAnalyticsDeclining,
  getAnalyticsGaps,
  getAnalyticsHealthDistribution,
} from "@/lib/api";
import { SPECIES_COLORS, SPECIES_LABELS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Helper utilities                                                   */
/* ------------------------------------------------------------------ */

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  return n.toLocaleString("en-CA");
}

function pct(n: number | null | undefined): string {
  if (n == null) return "--";
  return `${n.toFixed(1)}%`;
}

function healthColor(score: number | null | undefined): string {
  if (score == null) return "text-slate-500";
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  if (score >= 30) return "text-orange-400";
  return "text-red-400";
}

function healthBg(score: number | null | undefined): string {
  if (score == null) return "bg-slate-500/10 text-slate-400";
  if (score >= 70) return "bg-emerald-500/10 text-emerald-400";
  if (score >= 50) return "bg-yellow-500/10 text-yellow-400";
  if (score >= 30) return "bg-orange-500/10 text-orange-400";
  return "bg-red-500/10 text-red-400";
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function declineColor(pctVal: number | null | undefined): string {
  if (pctVal == null) return "text-slate-500";
  if (pctVal >= 30) return "text-red-400";
  if (pctVal >= 15) return "text-orange-400";
  return "text-yellow-400";
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-white/[0.08] sticky top-0 z-50 bg-[#080c14]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
              SW
            </div>
            <span className="font-semibold text-sm text-slate-200">
              SalmonWatch <span className="text-slate-500">BC</span>
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/explorer"
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Explorer
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 text-xs font-medium text-emerald-400 rounded-lg bg-white/[0.04]"
            >
              Analytics
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/argonBIsystems/salmonwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block"
          >
            GitHub
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/[0.06] px-4 py-3 flex flex-col gap-1 bg-[#080c14]/98 backdrop-blur-sm">
          <Link href="/explorer" className="px-3 py-2.5 text-sm text-slate-300 hover:text-slate-100 rounded-lg hover:bg-white/[0.04] transition-colors">
            Explorer
          </Link>
          <Link href="/analytics" className="px-3 py-2.5 text-sm text-emerald-400 font-medium rounded-lg bg-white/[0.04]">
            Analytics
          </Link>
          <a href="https://github.com/argonBIsystems/salmonwatch" target="_blank" rel="noopener noreferrer"
            className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/[0.04] transition-colors">
            GitHub
          </a>
        </div>
      )}
    </nav>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-6 border border-white/[0.08]">
              <div className="h-4 w-24 bg-white/[0.06] rounded animate-pulse mb-3" />
              <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Health bar skeleton */}
        <div className="glass-panel p-6 border border-white/[0.08] mb-10">
          <div className="h-4 w-40 bg-white/[0.06] rounded animate-pulse mb-4" />
          <div className="h-10 bg-white/[0.06] rounded-lg animate-pulse" />
        </div>
        {/* Table skeletons */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-panel p-6 border border-white/[0.08] mb-6">
            <div className="h-4 w-48 bg-white/[0.06] rounded animate-pulse mb-6" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-10 bg-white/[0.06] rounded animate-pulse mb-2" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200">
      <NavBar />
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-[#c4584a]/10 text-[#c4584a] flex items-center justify-center mx-auto mb-5 text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-semibold text-slate-200 mb-2">
            Failed to load analytics
          </h1>
          <p className="text-sm text-slate-500 mb-8">{message}</p>
          <button
            onClick={onRetry}
            className="glass-panel px-6 py-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 1: Hero Stats Bar                                          */
/* ------------------------------------------------------------------ */

function HeroStats({ data }: { data: AnalyticsOverview }) {
  const stats = [
    {
      label: "Populations tracked",
      value: fmt(data.total_populations),
      accent: "text-emerald-400",
    },
    {
      label: "Declining",
      value: pct(data.pct_declining),
      accent: "text-red-400",
    },
    {
      label: "Unmonitored since 2018",
      value: pct(data.pct_unmonitored),
      accent: "text-orange-400",
    },
    {
      label: "Avg health score",
      value: data.avg_health_score != null ? `${data.avg_health_score.toFixed(0)}/100` : "--",
      accent: healthColor(data.avg_health_score),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel p-5 sm:p-6 border border-white/[0.08]">
          <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">
            {s.label}
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono ${s.accent}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 2: Health Distribution                                     */
/* ------------------------------------------------------------------ */

const HEALTH_TIERS = [
  { key: "critical" as const, label: "Critical", color: "bg-red-500", textColor: "text-red-400" },
  { key: "poor" as const, label: "Poor", color: "bg-orange-400", textColor: "text-orange-400" },
  { key: "fair" as const, label: "Fair", color: "bg-yellow-400", textColor: "text-yellow-400" },
  { key: "good" as const, label: "Good", color: "bg-emerald-400", textColor: "text-emerald-400" },
  { key: "strong" as const, label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500" },
];

function HealthDistributionBar({ data }: { data: HealthDistribution }) {
  const total = data.critical + data.poor + data.fair + data.good + data.strong;
  if (total === 0) return null;

  return (
    <div className="glass-panel p-6 border border-white/[0.08] mb-10 animate-fade-in-up delay-100">
      <h2 className="text-sm font-semibold text-slate-200 mb-1">
        Health Distribution
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        {fmt(total)} populations by conservation health status
      </p>

      {/* Stacked bar */}
      <div className="flex h-10 rounded-lg overflow-hidden mb-4">
        {HEALTH_TIERS.map((tier) => {
          const count = data[tier.key];
          const widthPct = (count / total) * 100;
          if (widthPct < 0.5) return null;
          return (
            <div
              key={tier.key}
              className={`${tier.color} relative group transition-all duration-300 hover:brightness-110`}
              style={{ width: `${widthPct}%` }}
              title={`${tier.label}: ${fmt(count)} (${widthPct.toFixed(1)}%)`}
            >
              {widthPct > 6 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-black/70">
                  {widthPct.toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {HEALTH_TIERS.map((tier) => {
          const count = data[tier.key];
          const widthPct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={tier.key} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-sm ${tier.color}`} />
              <span className="text-xs text-slate-400">
                {tier.label}
              </span>
              <span className={`text-xs font-mono font-medium ${tier.textColor}`}>
                {fmt(count)}
              </span>
              <span className="text-xs text-slate-600">
                ({widthPct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 3: Species Comparison Table                                */
/* ------------------------------------------------------------------ */

function SpeciesTable({ data }: { data: SpeciesSummary[] }) {
  return (
    <div className="glass-panel p-6 border border-white/[0.08] mb-10 animate-fade-in-up delay-200">
      <h2 className="text-sm font-semibold text-slate-200 mb-1">
        Species Comparison
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Health and monitoring metrics by species
      </p>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Species
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Populations
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                % Monitored
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Health
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                % Declining
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                % Critical
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const species = row.species as Species;
              const color = SPECIES_COLORS[species] || "#8a95a8";
              const label = SPECIES_LABELS[species] || row.species;
              const monitoredPct = 100 - (row.pct_unmonitored ?? 0);

              return (
                <tr
                  key={row.species}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-slate-200">{label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-300">
                    {fmt(row.total_populations)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-300">
                    {pct(monitoredPct)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono font-medium ${healthColor(row.avg_health_score)}`}>
                    {row.avg_health_score != null ? row.avg_health_score.toFixed(0) : "--"}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono font-medium ${declineColor(row.pct_declining)}`}>
                    {pct(row.pct_declining)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono font-medium ${row.pct_critical != null && row.pct_critical >= 20 ? "text-red-400" : "text-slate-300"}`}>
                    {pct(row.pct_critical)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 4: Top Declining Populations                               */
/* ------------------------------------------------------------------ */

function SpeciesBadge({ species }: { species: string | null }) {
  if (!species) return null;
  const s = species as Species;
  const color = SPECIES_COLORS[s] || "#8a95a8";
  const label = SPECIES_LABELS[s] || species;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}

function HealthBadge({ score, status }: { score: number | null; status: string | null }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${healthBg(score)}`}>
      {score != null ? score.toFixed(0) : "--"} {statusLabel(status)}
    </span>
  );
}

function DecliningTable({ data }: { data: DecliningPopulation[] }) {
  return (
    <div className="glass-panel p-6 border border-white/[0.08] mb-10 animate-fade-in-up delay-300">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-200">
          Top Declining Populations
        </h2>
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          10-year trend
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Populations with the steepest recent declines
      </p>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-6">
                #
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Population
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Species
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Region
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Trend
              </th>
              <th className="text-center py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Health
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Latest Count
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-2 text-xs text-slate-600 font-mono">
                  {i + 1}
                </td>
                <td className="py-3 px-2">
                  <Link
                    href={`/population/${row.id}`}
                    className="text-slate-200 hover:text-emerald-400 transition-colors font-medium text-sm"
                  >
                    {row.stream_name || "Unknown stream"}
                  </Link>
                </td>
                <td className="py-3 px-2">
                  <SpeciesBadge species={row.species} />
                </td>
                <td className="py-3 px-2 text-xs text-slate-500 hidden sm:table-cell">
                  {row.region || "--"}
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="font-mono font-semibold text-red-400 text-sm">
                    {row.trend_10yr != null ? (
                      <>
                        <span className="inline-block mr-0.5">&darr;</span>
                        {Math.abs(row.trend_10yr).toFixed(0)}%
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </td>
                <td className="py-3 px-2 text-center hidden md:table-cell">
                  <HealthBadge score={row.health_score} status={row.health_status} />
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-400 text-sm hidden lg:table-cell">
                  {fmt(row.latest_count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-10 text-sm text-slate-500">
          No declining population data available
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 5: Monitoring Gaps                                         */
/* ------------------------------------------------------------------ */

function MonitoringGapsTable({ data }: { data: MonitoringGap[] }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="glass-panel p-6 border border-white/[0.08] mb-10 animate-fade-in-up delay-400">
      <h2 className="text-sm font-semibold text-slate-200 mb-1">
        Monitoring Gaps
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Populations with the longest time since last survey
      </p>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider w-6">
                #
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Population
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Species
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Region
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Last Surveyed
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Years Gap
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const gap = row.years_since_survey ?? (row.last_year != null ? currentYear - row.last_year : null);
              const gapSeverity =
                gap == null
                  ? "text-slate-500"
                  : gap >= 20
                    ? "text-red-400"
                    : gap >= 10
                      ? "text-orange-400"
                      : "text-yellow-400";

              return (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-2 text-xs text-slate-600 font-mono">
                    {i + 1}
                  </td>
                  <td className="py-3 px-2">
                    <Link
                      href={`/population/${row.id}`}
                      className="text-slate-200 hover:text-emerald-400 transition-colors font-medium text-sm"
                    >
                      {row.stream_name || "Unknown stream"}
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <SpeciesBadge species={row.species} />
                  </td>
                  <td className="py-3 px-2 text-xs text-slate-500 hidden sm:table-cell">
                    {row.region || "--"}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-400 text-sm">
                    {row.last_year ?? "--"}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono font-semibold text-sm ${gapSeverity}`}>
                    {gap != null ? `${gap} yr` : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-10 text-sm text-slate-500">
          No monitoring gap data available
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 6: Regional Comparison                                     */
/* ------------------------------------------------------------------ */

function RegionalTable({ data }: { data: RegionalSummary[] }) {
  // Sort by avg health ascending (worst regions first)
  const sorted = [...data].sort(
    (a, b) => (a.avg_health_score ?? 0) - (b.avg_health_score ?? 0)
  );

  return (
    <div className="glass-panel p-6 border border-white/[0.08] mb-10 animate-fade-in-up delay-600">
      <h2 className="text-sm font-semibold text-slate-200 mb-1">
        Regional Comparison
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Regions ranked by average health score (lowest first)
      </p>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Region
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Populations
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Health
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                % Declining
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                % Critical
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.region}
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3 px-2 font-medium text-slate-200">
                  {row.region || "Unknown"}
                </td>
                <td className="py-3 px-2 text-right font-mono text-slate-300">
                  {fmt(row.total_populations)}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Mini bar indicator */}
                    <div className="w-12 h-1.5 rounded-full bg-white/[0.06] hidden sm:block">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (row.avg_health_score ?? 0) >= 70
                            ? "bg-emerald-400"
                            : (row.avg_health_score ?? 0) >= 50
                              ? "bg-yellow-400"
                              : (row.avg_health_score ?? 0) >= 30
                                ? "bg-orange-400"
                                : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(row.avg_health_score ?? 0, 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono font-medium ${healthColor(row.avg_health_score)}`}>
                      {row.avg_health_score != null ? row.avg_health_score.toFixed(0) : "--"}
                    </span>
                  </div>
                </td>
                <td className={`py-3 px-2 text-right font-mono font-medium ${declineColor(row.pct_declining)}`}>
                  {pct(row.pct_declining)}
                </td>
                <td className={`py-3 px-2 text-right font-mono font-medium ${row.pct_critical != null && row.pct_critical >= 20 ? "text-red-400" : "text-slate-300"}`}>
                  {pct(row.pct_critical)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-10 text-sm text-slate-500">
          No regional data available
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

interface AnalyticsData {
  overview: AnalyticsOverview;
  species: SpeciesSummary[];
  regions: RegionalSummary[];
  declining: DecliningPopulation[];
  gaps: MonitoringGap[];
  health: HealthDistribution;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(() => {
    return Promise.all([
      getAnalyticsOverview(),
      getAnalyticsSpecies(),
      getAnalyticsRegions(),
      getAnalyticsDeclining({ limit: 20 }),
      getAnalyticsGaps({ limit: 20 }),
      getAnalyticsHealthDistribution(),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAllData()
      .then(([overview, species, regions, declining, gaps, health]) => {
        if (!cancelled) {
          setData({ overview, species, regions, declining, gaps, health });
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fetchAllData]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setData(null);
    fetchAllData()
      .then(([overview, species, regions, declining, gaps, health]) => {
        setData({ overview, species, regions, declining, gaps, health });
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return <ErrorState message={error || "Unknown error"} onRetry={handleRetry} />;
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200">
      <NavBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Province-wide salmon population health overview
            {data.overview.year_range && (
              <span className="font-mono">
                {" "}&middot; {data.overview.year_range[0]}&ndash;{data.overview.year_range[1]}
              </span>
            )}
          </p>
        </div>

        {/* Section 1: Hero Stats */}
        <HeroStats data={data.overview} />

        {/* Section 2: Health Distribution */}
        <HealthDistributionBar data={data.health} />

        {/* Section 3: Species Comparison */}
        <SpeciesTable data={data.species} />

        {/* Section 4: Top Declining */}
        <DecliningTable data={data.declining} />

        {/* Section 5: Monitoring Gaps */}
        <MonitoringGapsTable data={data.gaps} />

        {/* Section 6: Regional Comparison */}
        <RegionalTable data={data.regions} />

        {/* Footer CTA */}
        <div className="text-center py-8 animate-fade-in-up">
          <Link
            href="/explorer"
            className="inline-block glass-panel px-8 py-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:border-emerald-400/30 transition-all"
          >
            Explore on the map &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
