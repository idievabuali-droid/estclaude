import type { SVGProps } from 'react';

/**
 * Monoline pharmacy pictogram — a pill bottle with a medical cross.
 * Distinct from the hospital icon (building + cross) by using the
 * bottle silhouette, which scans as "аптека" specifically.
 */
export function IllustrationPharmacy(props: SVGProps<SVGSVGElement>) {
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
      {/* bottle cap */}
      <rect x="22" y="10" width="20" height="8" rx="1" />
      {/* bottle neck */}
      <path d="M24 18 L40 18" />
      {/* bottle body */}
      <path d="M18 22 L46 22 L46 56 L18 56 Z" />
      <path d="M18 22 C18 20 20 18 22 18" />
      <path d="M46 22 C46 20 44 18 42 18" />
      {/* medical cross inside bottle */}
      <path d="M30 32 L34 32 L34 36 L38 36 L38 40 L34 40 L34 44 L30 44 L30 40 L26 40 L26 36 L30 36 Z" fill="currentColor" />
    </svg>
  );
}
