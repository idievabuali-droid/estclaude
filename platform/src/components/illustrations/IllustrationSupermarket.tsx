import type { SVGProps } from 'react';

/**
 * Monoline shopping bag — universal "магазин / supermarket"
 * pictogram. Two handles, rectangular bag body, simple bottom.
 */
export function IllustrationSupermarket(props: SVGProps<SVGSVGElement>) {
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
      {/* handles */}
      <path d="M22 22 C22 14 26 10 32 10 C38 10 42 14 42 22" />
      {/* bag body */}
      <path d="M14 22 L50 22 L46 56 L18 56 Z" />
      {/* receipt-style horizontal lines inside (price tags hint) */}
      <path d="M22 32 L42 32" />
      <path d="M22 38 L36 38" />
      <path d="M22 44 L40 44" />
    </svg>
  );
}
