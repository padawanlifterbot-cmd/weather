import { NextResponse } from "next/server";
import type { WeatherSnapshot } from "@/lib/weather";

/**
 * Server-side proxy for Open-Meteo's current-conditions endpoint.
 *
 * Keeping the upstream call on the server means one cached response per
 * coordinate pair, no third-party origin in the browser, and a stable place
 * to shape the payload the UI needs.
 */

export const revalidate = 60;

const UPSTREAM = "https://api.open-meteo.com/v1/forecast";

function parseCoordinate(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"), -90, 90);
  const longitude = parseCoordinate(searchParams.get("lon"), -180, 180);

  if (latitude === null || longitude === null) {
    return NextResponse.json(
      { error: "Valid lat and lon query parameters are required." },
      { status: 400 },
    );
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("latitude", String(latitude));
  upstream.searchParams.set("longitude", String(longitude));
  upstream.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
  );
  upstream.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,weather_code,is_day",
  );
  upstream.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  upstream.searchParams.set("timezone", "auto");
  upstream.searchParams.set("forecast_hours", "12");
  upstream.searchParams.set("forecast_days", "1");
  upstream.searchParams.set("wind_speed_unit", "kmh");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      next: { revalidate: 60 },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the weather service. Try again shortly." },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: "The weather service returned an error. Try again shortly." },
      { status: 502 },
    );
  }

  const data = (await upstreamResponse.json()) as OpenMeteoResponse;

  if (!data.current || !data.hourly || !data.daily) {
    return NextResponse.json(
      { error: "The weather service returned an unexpected payload." },
      { status: 502 },
    );
  }

  const hourly = data.hourly.time
    .map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m[index],
      humidity: data.hourly.relative_humidity_2m[index],
      weatherCode: data.hourly.weather_code[index],
      isDay: data.hourly.is_day[index] === 1,
    }))
    .filter(
      (point) =>
        Number.isFinite(point.temperature) && Number.isFinite(point.humidity),
    );

  const snapshot: WeatherSnapshot = {
    place: {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      timezoneAbbreviation: data.timezone_abbreviation,
    },
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      apparentTemperature: data.current.apparent_temperature,
      isDay: data.current.is_day === 1,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
    },
    today: {
      max: data.daily.temperature_2m_max[0],
      min: data.daily.temperature_2m_min[0],
    },
    hourly,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
