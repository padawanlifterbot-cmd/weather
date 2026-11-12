import { NextResponse } from "next/server";
import type { GeocodeResult } from "@/lib/weather";

/**
 * City search, proxied through the server so the browser never talks to a
 * third-party origin and we can shape/validate the result list.
 */

export const revalidate = 86400;

const UPSTREAM = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_RESULTS = 6;

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] as GeocodeResult[] });
  }

  if (query.length > 100) {
    return NextResponse.json(
      { error: "Search query is too long." },
      { status: 400 },
    );
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("name", query);
  upstream.searchParams.set("count", String(MAX_RESULTS * 2));
  upstream.searchParams.set("language", "en");
  upstream.searchParams.set("format", "json");

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, {
      next: { revalidate: 86400 },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the location service." },
      { status: 502 },
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: "The location service returned an error." },
      { status: 502 },
    );
  }

  const data = (await upstreamResponse.json()) as OpenMeteoGeocodeResponse;

  // De-duplicate by name + region so "Boston" doesn't fill the whole list.
  const seen = new Set<string>();
  const results: GeocodeResult[] = [];

  for (const item of data.results ?? []) {
    const key = `${item.name}|${item.admin1 ?? ""}|${item.country_code ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country,
      countryCode: item.country_code,
      admin1: item.admin1,
      timezone: item.timezone,
    });

    if (results.length >= MAX_RESULTS) break;
  }

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
