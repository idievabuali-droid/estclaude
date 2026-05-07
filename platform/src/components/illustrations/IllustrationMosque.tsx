import type { SVGProps } from 'react';

/**
 * Monoline mosque silhouette — central dome with two minarets.
 * Mosque is first in the Tajik POI category list per market relevance.
 * Used in the "Что рядом" filter row + nearby-POI card grids.
 */
export function IllustrationMosque(props: SVGProps<SVGSVGElement>) {
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
      {/* left minaret */}
      <path d="M14 56 L14 24" />
      <path d="M12 24 L16 24" />
      <path d="M14 24 C12 22 12 18 14 16 C16 18 16 22 14 24" />
      <path d="M14 16 L14 12" />
      {/* right minaret */}
      <path d="M50 56 L50 24" />
      <path d="M48 24 L52 24" />
      <path d="M50 24 C48 22 48 18 50 16 C52 18 52 22 50 24" />
      <path d="M50 16 L50 12" />
      {/* main building */}
      <path d="M20 56 L20 36 L44 36 L44 56" />
      {/* dome */}
      <path d="M20 36 C20 26 26 22 32 22 C38 22 44 26 44 36" />
      {/* dome top finial */}
      <path d="M32 22 L32 16" />
      <circle cx="32" cy="14" r="1.5" fill="currentColor" />
      {/* doorway */}
      <path d="M28 56 L28 46 C28 44 30 42 32 42 C34 42 36 44 36 46 L36 56" />
    </svg>
  );
}
