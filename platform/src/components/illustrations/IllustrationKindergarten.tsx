import type { SVGProps } from 'react';

/**
 * Monoline kindergarten silhouette — small house with a heart in the
 * window. Differentiates from "school" (which uses the larger flag-
 * roofed building) by reading as warm + small-scale.
 */
export function IllustrationKindergarten(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 30 L32 14 L52 30" />
      {/* facade */}
      <path d="M16 30 L16 56 L48 56 L48 30" />
      {/* chimney */}
      <path d="M40 22 L40 14 L44 14 L44 26" />
      {/* heart-window */}
      <path d="M32 38 C30 36 26 36 26 32 C26 30 28 28 30 30 C30 28 32 28 32 30 C32 28 34 28 34 30 C36 28 38 30 38 32 C38 36 34 36 32 38 Z" />
      {/* door */}
      <path d="M28 56 L28 46 L36 46 L36 56" />
      <circle cx="34" cy="51" r="0.8" fill="currentColor" />
    </svg>
  );
}
