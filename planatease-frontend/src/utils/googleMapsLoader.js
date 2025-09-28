import { Loader } from "@googlemaps/js-api-loader";

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: "weekly",
  // include everything you use app-wide
  libraries: ["places", "marker"],
  mapIds: [import.meta.env.VITE_GOOGLE_MAPS_MAP_ID],
});

let loadPromise;

/** Call this from any component BEFORE using window.google */
export function ensureGoogleMaps() {
  if (!loadPromise) loadPromise = loader.load(); // singleton
  return loadPromise;
}
