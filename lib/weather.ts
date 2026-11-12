/**
 * Shared weather types and presentation helpers.
 *
 * Data comes from Open-Meteo (https://open-meteo.com), which is free for
 * non-commercial use and requires no API key. Weather conditions use the
 * WMO 4677 code table.
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Place = Coordinates & {
  label: string;
  /** Optional secondary line, e.g. "Massachusetts, United States". */
  detail?: string;
};

export type CurrentConditions = {
  /** ISO local time from the API, e.g. "2026-11-12T12:00". */
  time: string;
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  isDay: boolean;
  weatherCode: number;
  windSpeed: number;
};

export type HourlyPoint = {
  time: string;
  temperature: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherSnapshot = {
  place: Coordinates & {
    timezone: string;
    timezoneAbbreviation: string;
  };
  current: CurrentConditions;
  today: {
    max: number;
    min: number;
  };
  hourly: HourlyPoint[];
  fetchedAt: string;
};

export type GeocodeResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  admin1?: string;
  timezone?: string;
};

export type IconKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

type Condition = {
  label: string;
  icon: IconKind;
};

const CONDITIONS: Record<number, Condition> = {
  0: { label: "Clear sky", icon: "clear" },
  1: { label: "Mainly clear", icon: "clear" },
  2: { label: "Partly cloudy", icon: "partly" },
  3: { label: "Overcast", icon: "cloudy" },
  45: { label: "Fog", icon: "fog" },
  48: { label: "Freezing fog", icon: "fog" },
  51: { label: "Light drizzle", icon: "drizzle" },
  53: { label: "Drizzle", icon: "drizzle" },
  55: { label: "Heavy drizzle", icon: "drizzle" },
  56: { label: "Freezing drizzle", icon: "drizzle" },
  57: { label: "Freezing drizzle", icon: "drizzle" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "rain" },
  67: { label: "Freezing rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Light showers", icon: "rain" },
  81: { label: "Showers", icon: "rain" },
  82: { label: "Violent showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Heavy snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "thunder" },
  96: { label: "Thunderstorm with hail", icon: "thunder" },
  99: { label: "Thunderstorm with hail", icon: "thunder" },
};

export function describeWeather(code: number): Condition {
  return CONDITIONS[code] ?? { label: "Unknown conditions", icon: "cloudy" };
}

/** Convert a Celsius reading to the display unit. */
export function convertTemperature(celsius: number, unit: "C" | "F"): number {
  return unit === "C" ? celsius : celsius * 1.8 + 32;
}

export function formatTemperature(
  celsius: number,
  unit: "C" | "F",
  withUnit = false,
): string {
  const value = Math.round(convertTemperature(celsius, unit));
  return withUnit ? `${value}°${unit}` : `${value}°`;
}

/** "12:00" (24h API local time) -> "12 PM" in the requested clock style. */
export function formatHour(isoLocalTime: string, hour12: boolean): string {
  const hour = Number(isoLocalTime.slice(11, 13));
  if (!Number.isFinite(hour)) return isoLocalTime;
  if (!hour12) return `${String(hour).padStart(2, "0")}:00`;
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return `${hour % 12} ${hour < 12 ? "AM" : "PM"}`;
}

/** Accent palette keyed by temperature band, in Celsius. */
export function temperatureBand(celsius: number) {
  if (celsius < 0) return "freezing";
  if (celsius < 8) return "cold";
  if (celsius < 16) return "cool";
  if (celsius < 24) return "mild";
  if (celsius < 30) return "warm";
  return "hot";
}

/** Short, human label for the humidity reading. */
export function describeHumidity(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 80) return "Humid";
  return "Very humid";
}
