"use client";

import { useState, useEffect, useRef } from "react";
import { Map } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { MapViewState } from "@deck.gl/core";
import type { PopulationFeature, Species } from "@/lib/types";
import { SPECIES_COLORS } from "@/lib/constants";
import { getPopulations } from "@/lib/api";

import "maplibre-gl/dist/maplibre-gl.css";

const DARK_BASEMAP =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const INITIAL_VIEW: MapViewState = {
  latitude: 54.0,
  longitude: -125.0,
  zoom: 5,
  pitch: 45,
  bearing: -10,
};

const ROTATION_SPEED = 0.015; // degrees per frame

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export default function HeroMap() {
  const [data, setData] = useState<PopulationFeature[]>([]);
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW);
  const [opacity, setOpacity] = useState(0);
  const animRef = useRef<number>(0);

  // Load population data
  useEffect(() => {
    let cancelled = false;
    getPopulations({ limit: 10000 })
      .then((res) => {
        if (!cancelled) {
          setData(res.features);
          // Fade dots in after data loads
          setTimeout(() => setOpacity(1), 100);
        }
      })
      .catch(() => {
        // Silently fail — hero map is decorative
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Slow auto-rotation
  useEffect(() => {
    const animate = () => {
      setViewState((prev) => ({
        ...prev,
        bearing: (prev.bearing ?? -10) + ROTATION_SPEED,
      }));
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const layers = [
    new ScatterplotLayer<PopulationFeature>({
      id: "hero-dots",
      data,
      getPosition: (d) => d.geometry.coordinates as [number, number],
      getRadius: (d) => {
        const count =
          d.properties.latest_count ?? d.properties.peak_count ?? 100;
        return Math.max(300, Math.min(4000, Math.log10(count + 1) * 800));
      },
      getFillColor: (d) => {
        const species = d.properties.species as Species;
        const hex = SPECIES_COLORS[species] ?? "#94A3B8";
        return [...hexToRgb(hex), Math.round(120 * opacity)];
      },
      radiusUnits: "meters",
      radiusMinPixels: 2,
      radiusMaxPixels: 16,
      pickable: false,
      antialiasing: true,
      updateTriggers: {
        getFillColor: [opacity],
      },
      transitions: {
        getFillColor: 2000,
      },
    }),
  ];

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity, transition: "opacity 2s ease-in-out" }}
    >
      <div className="w-full h-full" style={{ pointerEvents: "none" }}>
        <DeckGL
          viewState={viewState}
          controller={false}
          layers={layers}
          style={{ pointerEvents: "none" }}
        >
          <Map mapStyle={DARK_BASEMAP} />
        </DeckGL>
      </div>
      {/* Gradient overlay to blend map into page */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/40 via-transparent to-[#080c14]" />
    </div>
  );
}
