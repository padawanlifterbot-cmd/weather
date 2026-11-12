import type { Place } from "@/lib/weather";

/**
 * Where the dashboard points when there is no saved preference.
 * Nolop is at 200 College Ave, Medford, MA.
 */
export const DEFAULT_PLACE: Place = {
  label: "Medford, MA",
  detail: "Tufts University · Nolop",
  latitude: 42.4075,
  longitude: -71.119,
};

/** Quick picks shown under the location search box. */
export const SUGGESTED_PLACES: Place[] = [
  DEFAULT_PLACE,
  { label: "Boston, MA", latitude: 42.3601, longitude: -71.0589 },
  { label: "New York, NY", latitude: 40.7128, longitude: -74.006 },
  { label: "San Francisco, CA", latitude: 37.7749, longitude: -122.4194 },
  { label: "London, UK", latitude: 51.5072, longitude: -0.1276 },
  { label: "Tokyo, JP", latitude: 35.6762, longitude: 139.6503 },
];
