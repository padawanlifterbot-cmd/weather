"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Place, WeatherSnapshot } from "@/lib/weather";
import {
  convertTemperature,
  describeHumidity,
  describeWeather,
  formatHour,
  temperatureBand,
} from "@/lib/weather";
import { DEFAULT_PLACE } from "@/lib/places";
import {
  ChevronDownIcon,
  DropletIcon,
  MapPinIcon,
  RefreshIcon,
  WeatherIcon,
  WindIcon,
} from "@/components/icons";
import { LocationDialog } from "@/components/location-dialog";

type Unit = "C" | "F";

const PLACE_KEY = "weather-now:place:v1";
const UNIT_KEY = "weather-now:unit:v1";
const REFRESH_INTERVAL_MS = 60_000;

function isSavedPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<Place>;
  return (
    typeof place.label === "string" &&
    typeof place.latitude === "number" &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  );
}

/** The API's timestamps are already local wall-clock time for the place. */
function formatPlaceClock(isoLocal: string) {
  const date = new Date(isoLocal);
  if (Number.isNaN(date.getTime())) return isoLocal;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Render a real UTC instant in the viewer's own timezone. */
function formatBrowserClock(isoInstant: string) {
  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "America/New_York" -> "EST", falling back to the API's GMT offset. */
function timezoneLabel(timeZone: string, fallback: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDegrees(celsius: number, unit: Unit) {
  if (!Number.isFinite(celsius)) return "–";
  return String(Math.round(convertTemperature(celsius, unit)));
}

function HumidityRing({ value }: { value: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="ring-wrap"
      role="img"
      aria-label={`Relative humidity ${Math.round(clamped)} percent`}
    >
      <svg viewBox="0 0 128 128" className="ring" aria-hidden="true">
        <defs>
          <linearGradient id="humidity-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} className="ring-track" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="ring-progress"
          strokeDasharray={circumference.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="ring-label" aria-hidden="true">
        <span className="ring-value">
          {Math.round(clamped)}
          <span className="ring-unit">%</span>
        </span>
        <span className="ring-caption">humidity</span>
      </div>
    </div>
  );
}

export function WeatherDashboard() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [unit, setUnit] = useState<Unit>("F");
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Restore preferences after mount so the server-rendered HTML stays stable.
  useEffect(() => {
    try {
      const savedPlace = window.localStorage.getItem(PLACE_KEY);
      if (savedPlace) {
        const parsed: unknown = JSON.parse(savedPlace);
        if (isSavedPlace(parsed)) setPlace(parsed);
      }
      const savedUnit = window.localStorage.getItem(UNIT_KEY);
      if (savedUnit === "C" || savedUnit === "F") setUnit(savedUnit);
    } catch {
      // Private browsing or corrupt storage: keep the defaults.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;

    async function load() {
      if (inFlight) return;
      inFlight = true;
      setLoading(true);

      try {
        const params = new URLSearchParams({
          lat: place.latitude.toFixed(4),
          lon: place.longitude.toFixed(4),
        });
        const response = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response
          .json()
          .catch(() => null)) as (WeatherSnapshot & { error?: string }) | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? "Could not load the weather.");
        }

        // Reject payloads that are missing the fields the UI needs.
        if (!payload.current || !Array.isArray(payload.hourly)) {
          throw new Error("The weather service returned an unexpected payload.");
        }

        setData(payload);
        setError(null);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load the weather right now.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        inFlight = false;
      }
    }

    // Switching cities should not show the previous city's numbers.
    void load();

    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible") void load();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [place.latitude, place.longitude, reloadToken]);

  const choosePlace = useCallback((next: Place) => {
    setPlace(next);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      window.localStorage.setItem(PLACE_KEY, JSON.stringify(next));
    } catch {
      // Nothing to do; the choice still applies for this session.
    }
  }, []);

  const chooseUnit = useCallback((next: Unit) => {
    setUnit(next);
    try {
      window.localStorage.setItem(UNIT_KEY, next);
    } catch {
      // Nothing to do; the choice still applies for this session.
    }
  }, []);

  const hour12 = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()
        .hour12 ?? true,
    [],
  );

  const current = data?.current ?? null;
  const condition = current ? describeWeather(current.weatherCode) : null;
  const band = current ? temperatureBand(current.temperature) : "cool";
  const humidityNote = current ? describeHumidity(current.humidity) : "";

  return (
    <div className="page" data-band={band}>
      <div className="aurora" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <WeatherIcon kind="partly" size={22} />
          </span>
          <span className="brand-name">Weather Now</span>
        </div>

        <div className="controls">
          <button
            type="button"
            className="place-button"
            onClick={() => setDialogOpen(true)}
            aria-haspopup="dialog"
          >
            <MapPinIcon size={17} />
            <span className="place-button-label">{place.label}</span>
            <ChevronDownIcon size={16} />
          </button>

          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            <button
              type="button"
              onClick={() => chooseUnit("F")}
              aria-pressed={unit === "F"}
            >
              °F
            </button>
            <button
              type="button"
              onClick={() => chooseUnit("C")}
              aria-pressed={unit === "C"}
            >
              °C
            </button>
          </div>
        </div>
      </header>

      <main className="shell" aria-busy={loading}>
        {error && data ? (
          <p className="error-banner" role="status">
            Couldn’t refresh. Showing the last reading. {error}
          </p>
        ) : null}

        {!data && loading ? (
          <div className="hero-grid" aria-hidden="true">
            <div className="card skeleton hero-skeleton">
              <span className="skeleton-line short" />
              <span className="skeleton-temp" />
              <span className="skeleton-line" />
              <span className="skeleton-line shorter" />
            </div>
            <div className="card skeleton humidity-skeleton">
              <span className="skeleton-line short" />
              <span className="skeleton-circle" />
            </div>
          </div>
        ) : null}

        {!data && !loading ? (
          <div className="card state-card">
            <h1>Weather isn’t available right now</h1>
            <p>{error ?? "The weather service did not respond."}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              <RefreshIcon size={18} />
              Try again
            </button>
          </div>
        ) : null}

        {data && current && condition ? (
          <>
            <div className="hero-grid">
              <section className="card hero" aria-labelledby="current-heading">
                <div className="hero-copy">
                  <p className="eyebrow">
                    <span className="eyebrow-place">
                      <span className="live-dot" aria-hidden="true" />
                      <span className="eyebrow-place-name">{place.label}</span>
                    </span>
                  </p>

                  <h1 id="current-heading" className="temperature">
                    <span className="temperature-value">
                      {formatDegrees(current.temperature, unit)}
                    </span>
                    <span className="temperature-unit">°{unit}</span>
                  </h1>

                  <p className="condition">
                    {condition.label}
                    <span className="condition-sep" aria-hidden="true" />
                    Feels like {formatDegrees(current.apparentTemperature, unit)}°
                  </p>

                  <dl className="metrics">
                    <div className="metric">
                      <dt>High / low</dt>
                      <dd>
                        {formatDegrees(data.today.max, unit)}° /{" "}
                        {formatDegrees(data.today.min, unit)}°
                      </dd>
                    </div>
                    <div className="metric">
                      <dt>
                        <WindIcon size={15} /> Wind
                      </dt>
                      <dd>
                        {Number.isFinite(current.windSpeed)
                          ? `${Math.round(current.windSpeed)} km/h`
                          : "–"}
                      </dd>
                    </div>
                    <div className="metric">
                      <dt>Humidity</dt>
                      <dd>{Math.round(current.humidity)}%</dd>
                    </div>
                  </dl>
                </div>

                <div className="hero-art" aria-hidden="true">
                  <WeatherIcon
                    kind={condition.icon}
                    isDay={current.isDay}
                    size={200}
                    className="hero-icon"
                  />
                </div>
              </section>

              <section className="card humidity" aria-labelledby="humidity-heading">
                <div className="card-head">
                  <h2 id="humidity-heading">
                    <DropletIcon size={17} /> Humidity
                  </h2>
                  <span className="card-badge">{humidityNote}</span>
                </div>

                <HumidityRing value={current.humidity} />

                <div className="humidity-scale" aria-hidden="true">
                  <span>Dry</span>
                  <span>Comfortable</span>
                  <span>Humid</span>
                </div>
                <p className="humidity-footnote">
                  Relative humidity at 2&nbsp;m. Comfort is usually 30–60%.
                </p>
              </section>
            </div>

            <section className="card hourly" aria-labelledby="hourly-heading">
              <div className="hourly-head">
                <div>
                  <h2 id="hourly-heading">Next 12 hours</h2>
                  <p>Hourly temperature and humidity</p>
                </div>
                <span className="hourly-place">{place.label}</span>
              </div>

              <div className="hourly-track">
                {data.hourly.slice(0, 12).map((point, index) => {
                  const pointCondition = describeWeather(point.weatherCode);
                  return (
                    <div
                      className={`hour${index === 0 ? " hour-now" : ""}`}
                      key={point.time}
                    >
                      <span className="hour-time">
                        {index === 0 ? "Now" : formatHour(point.time, hour12)}
                      </span>
                      <WeatherIcon
                        kind={pointCondition.icon}
                        isDay={point.isDay}
                        size={28}
                        className="hour-icon"
                      />
                      <span className="hour-temp">
                        {formatDegrees(point.temperature, unit)}°
                      </span>
                      <span className="hour-humidity">
                        <DropletIcon size={12} />
                        {Math.round(point.humidity)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <footer className="footer">
              <p>
                Data from{" "}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Open-Meteo
                </a>
                <span aria-hidden="true"> · </span>
                Observed {formatPlaceClock(current.time)}{" "}
                {timezoneLabel(data.place.timezone, data.place.timezoneAbbreviation)}
                <span aria-hidden="true"> · </span>
                Updated {formatBrowserClock(data.fetchedAt)}
              </p>
              <button
                type="button"
                className="refresh-button"
                onClick={() => setReloadToken((token) => token + 1)}
                disabled={loading}
              >
                <RefreshIcon
                  size={16}
                  className={loading ? "spinning" : undefined}
                />
                {loading ? "Refreshing" : "Refresh"}
              </button>
            </footer>
          </>
        ) : null}
      </main>

      <LocationDialog
        open={dialogOpen}
        currentPlace={place}
        onClose={() => setDialogOpen(false)}
        onSelect={choosePlace}
      />
    </div>
  );
}
