# Weather Now

A small, fast Next.js app that shows the **current temperature and humidity** for
your location, plus the next 12 hours at a glance. Built to deploy on Vercel
with zero configuration and no API keys.

![Weather Now](https://img.shields.io/badge/Next.js-16-black) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Features

- Current temperature, humidity, feels-like, wind and today's high/low
- Humidity ring with a comfort scale
- Next 12 hours of temperature, humidity and conditions
- City search (Open-Meteo geocoding) and "use my current location"
- °F / °C toggle and location remembered in `localStorage`
- Auto-refresh every 60 seconds, plus manual refresh and refresh-on-focus
- Temperature-aware accent colour, responsive layout, reduced-motion support

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Open-Meteo](https://open-meteo.com/) for forecasts and geocoding — free,
  no API key, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) data
- Hand-written CSS (no UI framework)

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The default location is Medford, MA (Tufts / Nolop). Use the location pill in the
top right to search for another city or to use your browser's location.

## Deploy to Vercel

The repository is a standard Next.js app, so no `vercel.json` is needed.

```bash
npm i -g vercel   # if you don't have it
vercel            # preview deployment
vercel --prod     # production deployment
```

Or import the repo at <https://vercel.com/new>. Vercel detects Next.js and uses
`npm run build` automatically. There are no environment variables to set.

## Project layout

```
app/
  layout.tsx             Root layout + metadata
  page.tsx               Renders the dashboard
  globals.css            Theme, layout, components, weather glyphs
  api/weather/route.ts   Server proxy for Open-Meteo current conditions
  api/geocode/route.ts   Server proxy for city search
components/
  weather-dashboard.tsx  Client dashboard (data fetching, refresh, unit toggle)
  location-dialog.tsx    City search dialog + geolocation
  icons.tsx              Weather and UI icons
lib/
  weather.ts             Types, WMO code labels, formatting helpers
  places.ts              Default location and quick picks
```

## How the data flows

1. The browser requests `/api/weather?lat=…&lon=…` on the same origin.
2. The route validates the coordinates, calls Open-Meteo's `/v1/forecast`
   endpoint, and caches the upstream response for 60 seconds.
3. The dashboard renders the snapshot and refreshes it every minute (and when
   the tab becomes visible again).

City search goes through `/api/geocode`, which proxies Open-Meteo's geocoding
API and de-duplicates results.

## Notes

- Geolocation requires a secure context: it works on `localhost` and on Vercel's
  HTTPS domain, but not on a plain-HTTP LAN address.
- Units are fetched in Celsius and converted in the browser, so the toggle is
  instant and works offline from the last snapshot.
- Attribution to Open-Meteo is kept in the footer, as their licence requires.
