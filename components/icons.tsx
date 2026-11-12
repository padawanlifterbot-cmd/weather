import type { ReactNode } from "react";
import type { IconKind } from "@/lib/weather";

type IconProps = {
  size?: number;
  className?: string;
};

const CLOUD_PATH =
  "M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z";

function Sun({ cx = 16, cy = 16, radius = 5 }: { cx?: number; cy?: number; radius?: number }) {
  return (
    <g className="wi-sun">
      <circle cx={cx} cy={cy} r={radius} className="wi-sun-core" />
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        const inner = radius + 2.6;
        const outer = radius + 5.2;
        return (
          <line
            key={index}
            x1={cx + Math.cos(angle) * inner}
            y1={cy + Math.sin(angle) * inner}
            x2={cx + Math.cos(angle) * outer}
            y2={cy + Math.sin(angle) * outer}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Cloud({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d={CLOUD_PATH} className="wi-cloud-fill" />
      <path d={CLOUD_PATH} className="wi-cloud-line" />
    </g>
  );
}

function Drops({
  lines,
  className = "wi-rain",
}: {
  lines: Array<[number, number, number, number]>;
  className?: string;
}) {
  return (
    <g className={className}>
      {lines.map(([x1, y1, x2, y2], index) => (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" />
      ))}
    </g>
  );
}

/**
 * One illustrated glyph per WMO condition group. Drawn on a 32×32 grid so the
 * rain and snow marks have room below the cloud.
 */
export function WeatherIcon({
  kind,
  isDay = true,
  size = 32,
  className,
}: IconProps & { kind: IconKind; isDay?: boolean }) {
  let content: ReactNode;

  switch (kind) {
    case "clear":
      content = isDay ? (
        <Sun />
      ) : (
        <path
          d="M25.5 18.8A10.6 10.6 0 0 1 11.9 5.2a10.6 10.6 0 1 0 13.6 13.6z"
          className="wi-moon"
        />
      );
      break;
    case "partly":
      content = (
        <>
          <Sun cx={13} cy={12} radius={4.4} />
          <Cloud transform="translate(9 10) scale(0.92)" />
        </>
      );
      break;
    case "cloudy":
      content = <Cloud transform="translate(4 4)" />;
      break;
    case "fog":
      content = (
        <>
          <Cloud transform="translate(4 2)" />
          <g className="wi-fog">
            <line x1="6" y1="25" x2="21" y2="25" strokeLinecap="round" />
            <line x1="10" y1="29" x2="26" y2="29" strokeLinecap="round" />
          </g>
        </>
      );
      break;
    case "drizzle":
      content = (
        <>
          <Cloud transform="translate(4 1) scale(0.95)" />
          <Drops
            lines={[
              [10, 22.5, 9.4, 25],
              [16, 23, 15.4, 25.5],
              [22, 22.5, 21.4, 25],
            ]}
          />
        </>
      );
      break;
    case "rain":
      content = (
        <>
          <Cloud transform="translate(4 1) scale(0.95)" />
          <Drops
            lines={[
              [9, 22.5, 8, 27],
              [16, 23, 15, 27.5],
              [23, 22.5, 22, 27],
            ]}
          />
        </>
      );
      break;
    case "snow":
      content = (
        <>
          <Cloud transform="translate(4 1) scale(0.95)" />
          <g className="wi-snow">
            <circle cx="9.5" cy="25" r="1.3" />
            <circle cx="16" cy="27.5" r="1.3" />
            <circle cx="22.5" cy="25" r="1.3" />
          </g>
        </>
      );
      break;
    case "thunder":
      content = (
        <>
          <Cloud transform="translate(4 1) scale(0.95)" />
          <path d="M17.6 20.5 12 27.4h3.6L14 32l6.4-7.2h-3.8z" className="wi-bolt" />
        </>
      );
      break;
    default:
      content = <Cloud transform="translate(4 4)" />;
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
      strokeWidth={1.7}
      strokeLinejoin="round"
    >
      {content}
    </svg>
  );
}

export function DropletIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M12 3.2c3.2 4 5.6 6.7 5.6 9.6a5.6 5.6 0 0 1-11.2 0c0-2.9 2.4-5.6 5.6-9.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WindIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M3 8h11a3 3 0 1 0-3-3" />
        <path d="M3 12.5h15.5a3 3 0 1 1-3 3" />
        <path d="M3 17h8" />
      </g>
    </svg>
  );
}

export function MapPinIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.6" />
      </g>
    </svg>
  );
}

export function SearchIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4.5 4.5" />
      </g>
    </svg>
  );
}

export function RefreshIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a8 8 0 1 1-2.6-5.9" />
        <path d="M20 3.5V8h-4.5" />
      </g>
    </svg>
  );
}

export function CloseIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="m6 6 12 12M18 6 6 18" />
      </g>
    </svg>
  );
}

export function ChevronDownIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="m6 9.5 6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LocateIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2" />
      </g>
    </svg>
  );
}
