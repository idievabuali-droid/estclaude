import type { SVGProps } from 'react';

/**
 * Monoline house silhouette with a sparkle/star above. Used for the
 * "Опубликуем с фото" step on /post — the sparkle reads as "now it's
 * out there, polished" rather than just a neutral house.
 */
export function IllustrationHouseSparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {/* ground */}
      <path d="M6 56 L58 56" />
      {/* roof */}
      <path d="M10 30 L26 14 L42 30" />
      {/* facade */}
      <path d="M14 30 L14 56 L38 56 L38 30" />
      {/* door */}
      <path d="M22 56 L22 44 L30 44 L30 56" />
      <circle cx="28" cy="50" r="0.8" fill="currentColor" />
      {/* window */}
      <rect x="32" y="35" width="4" height="5" />
      {/* sparkle (top-right) — 4-pointed star */}
      <path
        d="M48 16 L48 22 M44 19 L52 19 M48 11 L48 13 M48 25 L48 27 M44 14 L46 16 M50 22 L52 24 M44 24 L46 22 M50 16 L52 14"
        strokeWidth={1.5}
      />
      <path d="M48 16 L51 19 L48 22 L45 19 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
