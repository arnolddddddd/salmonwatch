import type { Species } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Muted, sophisticated species palette
export const SPECIES_COLORS: Record<Species, string> = {
  chinook: "#c4584a",   // muted rust
  sockeye: "#4a7fb5",   // steel blue
  coho: "#8a95a8",      // cool grey
  chum: "#3d9a6a",      // sage green
  pink: "#b5628a",      // dusty mauve
  steelhead: "#7c6eb5", // soft lavender
};

export const SPECIES_LABELS: Record<Species, string> = {
  chinook: "Chinook",
  sockeye: "Sockeye",
  coho: "Coho",
  chum: "Chum",
  pink: "Pink",
  steelhead: "Steelhead",
};

// BC center with 3D pitch
export const DEFAULT_VIEW_STATE = {
  latitude: 54.0,
  longitude: -125.0,
  zoom: 5,
  pitch: 45,
  bearing: -10,
};

// Fraser Valley view
export const FRASER_VALLEY_VIEW = {
  latitude: 49.2,
  longitude: -121.8,
  zoom: 8,
  pitch: 45,
  bearing: 0,
};
