import type { SVGProps } from 'react';

/**
 * Monoline park silhouette — a leafy tree with a bench underneath.
 * Differentiates from generic Lucide "trees" by adding the bench,
 * which signals "park" rather than just "vegetation."
 */
export function IllustrationPark(props: SVGProps<SVGSVGElement>) {
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
      {/* tree foliage — three overlapping cloud-like circles */}
      <path d="M22 24 C18 24 14 20 16 16 C14 12 18 8 22 10 C24 6 30 6 32 10 C36 6 42 8 42 14 C46 14 48 18 46 22 C48 26 44 30 40 28 C38 32 32 32 30 28 C26 30 22 28 22 24 Z" />
      {/* trunk */}
      <path d="M30 28 L30 46" />
      <path d="M34 28 L34 46" />
      <path d="M30 46 L34 46" />
      {/* bench seat */}
      <path d="M14 50 L50 50" />
      <path d="M14 53 L50 53" />
      {/* bench legs */}
      <path d="M18 53 L18 56" />
      <path d="M46 53 L46 56" />
    </svg>
  );
}
