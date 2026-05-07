import type { SVGProps } from 'react';

/**
 * Monoline school silhouette — a building with a flag on the roof.
 * Universal "school" pictogram across cultures, distinct from a
 * generic apartment block.
 */
export function IllustrationSchool(props: SVGProps<SVGSVGElement>) {
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
      {/* main facade */}
      <path d="M10 56 L10 22 L54 22 L54 56" />
      {/* roof line */}
      <path d="M8 22 L32 10 L56 22" />
      {/* flag pole */}
      <path d="M32 10 L32 4" />
      {/* flag */}
      <path d="M32 4 L40 6 L32 8 Z" fill="currentColor" />
      {/* central door */}
      <path d="M27 56 L27 42 L37 42 L37 56" />
      <circle cx="35" cy="49" r="0.8" fill="currentColor" />
      {/* windows row */}
      <rect x="14" y="28" width="6" height="6" />
      <rect x="44" y="28" width="6" height="6" />
      <rect x="14" y="40" width="6" height="6" />
      <rect x="44" y="40" width="6" height="6" />
    </svg>
  );
}
