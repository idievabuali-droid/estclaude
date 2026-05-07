import type { SVGProps } from 'react';

/**
 * Monoline hospital silhouette — building with a medical cross on
 * top. Universal pictogram for clinic / поликлиника.
 */
export function IllustrationHospital(props: SVGProps<SVGSVGElement>) {
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
      {/* facade */}
      <path d="M12 56 L12 22 L52 22 L52 56" />
      {/* roof signage block */}
      <path d="M26 22 L26 12 L38 12 L38 22" />
      {/* medical cross */}
      <path d="M30 14 L34 14 L34 16 L36 16 L36 18 L34 18 L34 20 L30 20 L30 18 L28 18 L28 16 L30 16 Z" fill="currentColor" />
      {/* windows */}
      <rect x="18" y="28" width="6" height="6" />
      <rect x="40" y="28" width="6" height="6" />
      <rect x="18" y="40" width="6" height="6" />
      <rect x="40" y="40" width="6" height="6" />
      {/* main entrance */}
      <path d="M28 56 L28 42 L36 42 L36 56" />
    </svg>
  );
}
