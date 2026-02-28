"use client";

import { useState, useCallback } from "react";
import { Map } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import type { MapViewState, PickingInfo } from "@deck.gl/core";
import type { PopulationFeature } from "@/lib/types";
import { DEFAULT_VIEW_STATE } from "@/lib/constants";
import { createSpawningSiteLayer } from "./SpawningSiteLayer";
import MapPopup from "./MapPopup";

import "maplibre-gl/dist/maplibre-gl.css";

const DARK_BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface SalmonMapProps {
  data: PopulationFeature[];
  initialViewState?: Partial<MapViewState>;
  onSiteClick?: (feature: PopulationFeature) => void;
}

export default function SalmonMap({
  data,
  initialViewState,
  onSiteClick,
}: SalmonMapProps) {
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });
  const [hoveredSite, setHoveredSite] = useState<{
    feature: PopulationFeature;
    x: number;
    y: number;
  } | null>(null);

  const onHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      setHoveredSite({
        feature: info.object as PopulationFeature,
        x: info.x ?? 0,
        y: info.y ?? 0,
      });
    } else {
      setHoveredSite(null);
    }
  }, []);

  const onClick = useCallback(
    (info: PickingInfo) => {
      if (info.object && onSiteClick) {
        onSiteClick(info.object as PopulationFeature);
      }
    },
    [onSiteClick]
  );

  const layers = [createSpawningSiteLayer(data)];

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) =>
          setViewState(vs as MapViewState)
        }
        controller={{ dragRotate: true }}
        layers={layers}
        onHover={onHover}
        onClick={onClick}
        pickingRadius={8}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
      >
        <Map mapStyle={DARK_BASEMAP} />
      </DeckGL>

      {hoveredSite && (
        <MapPopup
          feature={hoveredSite.feature}
          x={hoveredSite.x}
          y={hoveredSite.y}
        />
      )}
    </div>
  );
}
