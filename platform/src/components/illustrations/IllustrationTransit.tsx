import type { SVGProps } from 'react';

/**
 * Monoline bus silhouette — front-three-quarter view. Vahdat market
 * "transit" almost always means bus stops / маршрутка stops, not
 * subway, so a bus glyph is more accurate than the generic transit
 * icons in icon libraries.
 */
export function IllustrationTransit(props: SVGProps<SVGSVGElement>) {
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
      <path d="M6 50 L58 50" />
      {/* bus body */}
      <rect x="10" y="18" width="44" height="32" rx="3" />
      {/* roof beltline */}
      <path d="M10 26 L54 26" />
      {/* windows row (5 small windows) */}
      <rect x="14" y="28" width="6" height="8" />
      <rect x="22" y="28" width="6" height="8" />
      <rect x="30" y="28" width="6" height="8" />
      <rect x="38" y="28" width="6" height="8" />
      {/* destination/door panel on right */}
      <rect x="46" y="28" width="4" height="14" />
      {/* wheels */}
      <circle cx="20" cy="50" r="4" />
      <circle cx="44" cy="50" r="4" />
      {/* headlight */}
      <circle cx="50" cy="22" r="0.8" fill="currentColor" />
    </svg>
  );
}
