"use client";

import { useRef, useEffect } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface SparklineProps {
  years: number[];
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({
  years,
  values,
  width = 240,
  height = 60,
  color = "#3B82F6",
}: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || years.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // uPlot expects timestamps in seconds for x-axis
    // Convert years to unix timestamps (Jan 1 of each year)
    const timestamps = years.map((y) => new Date(y, 0, 1).getTime() / 1000);

    const opts: uPlot.Options = {
      width,
      height,
      cursor: {
        show: false,
      },
      legend: {
        show: false,
      },
      axes: [
        { show: false },
        { show: false },
      ],
      scales: {
        x: { time: true },
      },
      series: [
        {},
        {
          stroke: color,
          width: 1.5,
          fill: color + "20",
          spanGaps: true,
        },
      ],
    };

    const data: uPlot.AlignedData = [
      timestamps,
      values.map((v) => v ?? null),
    ];

    chartRef.current = new uPlot(opts, data, containerRef.current);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [years, values, width, height, color]);

  return <div ref={containerRef} />;
}
