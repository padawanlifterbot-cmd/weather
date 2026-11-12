"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GeocodeResult, Place } from "@/lib/weather";
import { SUGGESTED_PLACES } from "@/lib/places";
import { CloseIcon, LocateIcon, MapPinIcon, SearchIcon } from "@/components/icons";

type LocationDialogProps = {
  open: boolean;
  currentPlace: Place;
  onClose: () => void;
  onSelect: (place: Place) => void;
};

function formatCoordinates(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

function describeResult(result: GeocodeResult) {
  return [result.admin1, result.country].filter(Boolean).join(", ");
}

export function LocationDialog({
  open,
  currentPlace,
  onClose,
  onSelect,
}: LocationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Keep the native dialog in sync with the React `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
      setResults([]);
      setSearchError(null);
      setLocationError(null);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Debounced city search.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          results?: GeocodeResult[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Search failed.");
        setResults(payload.results ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : "Could not search for that place.",
        );
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function choose(place: Place) {
    onSelect(place);
    onClose();
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not support geolocation.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        choose({
          label: "My location",
          detail: formatCoordinates(position.coords.latitude, position.coords.longitude),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Pick a city instead."
            : "Could not get your location. Pick a city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const showSuggestions = query.trim().length < 2;

  return (
    <dialog
      ref={dialogRef}
      className="location-dialog"
      aria-labelledby="location-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialog-panel">
        <div className="dialog-head">
          <div>
            <h2 id="location-dialog-title">Choose a location</h2>
            <p className="dialog-sub">Showing weather for {currentPlace.label}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <label className="search-field" htmlFor={inputId}>
          <SearchIcon className="search-field-icon" />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city or town"
            aria-label="Search for a city or town"
            autoComplete="off"
            spellCheck={false}
          />
          {searching ? <span className="search-spinner" aria-hidden="true" /> : null}
        </label>

        <button
          type="button"
          className="locate-button"
          onClick={useMyLocation}
          disabled={locating}
        >
          <LocateIcon />
          {locating ? "Finding you…" : "Use my current location"}
        </button>

        {locationError ? (
          <p className="dialog-error" role="status">
            {locationError}
          </p>
        ) : null}

        <div className="dialog-results">
          {showSuggestions ? (
            <p className="results-label">Popular places</p>
          ) : searching && results.length === 0 ? (
            <p className="results-empty">Searching…</p>
          ) : results.length > 0 ? (
            <p className="results-label">Search results</p>
          ) : null}

          {searchError ? (
            <p className="dialog-error" role="status">
              {searchError}
            </p>
          ) : null}

          {!searchError && !searching && !showSuggestions && results.length === 0 ? (
            <p className="results-empty">No places found. Try a different spelling.</p>
          ) : null}

          <ul className="result-list">
            {(showSuggestions
              ? SUGGESTED_PLACES.map((place, index) => ({
                  key: `suggested-${index}`,
                  label: place.label,
                  detail: place.detail ?? "",
                  place,
                }))
              : results.map((result) => ({
                  key: `result-${result.id}`,
                  label: result.name,
                  detail: describeResult(result),
                  place: {
                    label: `${result.name}${result.admin1 ? `, ${result.admin1}` : ""}`,
                    detail: describeResult(result),
                    latitude: result.latitude,
                    longitude: result.longitude,
                  } satisfies Place,
                }))
            ).map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="result-button"
                  onClick={() => choose(item.place)}
                >
                  <MapPinIcon className="result-pin" />
                  <span className="result-text">
                    <span className="result-name">{item.label}</span>
                    {item.detail ? <span className="result-detail">{item.detail}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </dialog>
  );
}
