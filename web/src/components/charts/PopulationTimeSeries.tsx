"use client";

import { useRef, useEffect, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { Observation } from "@/lib/types";
import { aggregateByYear, getBestMetric } from "@/lib/aggregation";

interface PopulationTimeSeriesProps {
  data: Observation[];
  species: string;
  height?: number;
  color?: string;
}

export default function PopulationTimeSeries({
  data,
  species,
  height = 300,
  color = "#4a7fb5",
}: PopulationTimeSeriesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(Math.floor(w));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || data.length === 0 || containerWidth === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Aggregate duplicate years before charting
    const aggregated = aggregateByYear(data);

    const timestamps = aggregated.map(
      (d) => new Date(d.year, 0, 1).getTime() / 1000
    );
    const primary = aggregated.map((d) => getBestMetric(d) ?? null);
    const adults = aggregated.map((d) => d.natural_adult_spawners ?? null);

    const opts: uPlot.Options = {
      width: containerWidth,
      height,
      cursor: {
        drag: { x: true, y: false },
      },
      legend: {
        show: true,
      },
      axes: [
        {
          stroke: "#475569",
          grid: { stroke: "rgba(255,255,255,0.06)", width: 1 },
          ticks: { stroke: "rgba(255,255,255,0.08)", width: 1 },
          font: "11px 'JetBrains Mono', monospace",
          values: (_, ticks) =>
            ticks.map((t) => new Date(t * 1000).getFullYear().toString()),
        },
        {
          stroke: "#475569",
          grid: { stroke: "rgba(255,255,255,0.06)", width: 1 },
          ticks: { stroke: "rgba(255,255,255,0.08)", width: 1 },
          font: "11px 'JetBrains Mono', monospace",
          values: (_, ticks) =>
            ticks.map((t) =>
              t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(Math.round(t))
            ),
        },
      ],
      scales: {
        x: { time: true },
      },
      series: [
        {},
        {
          label: "Spawners",
          stroke: color,
          width: 2,
          fill: color + "18",
          spanGaps: true,
          points: { show: false },
        },
        {
          label: "Adults",
          stroke: color + "60",
          width: 1,
          dash: [4, 4],
          spanGaps: true,
          points: { show: false },
        },
      ],
    };

    const chartData: uPlot.AlignedData = [
      timestamps,
      primary,
      adults,
    ];

    chartRef.current = new uPlot(opts, chartData, containerRef.current);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, containerWidth, height, color, species]);

  return <div ref={containerRef} />;
}
