import type { SVGProps } from 'react';

/**
 * Monoline camera illustration — for "Реальные фото, не рендеры"
 * (home trust block) and any photography-related signal.
 */
export function IllustrationCamera(props: SVGProps<SVGSVGElement>) {
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
      {/* viewfinder bump */}
      <path d="M22 16 L26 12 L38 12 L42 16" />
      {/* body */}
      <rect x="8" y="16" width="48" height="36" rx="3" />
      {/* lens */}
      <circle cx="32" cy="34" r="10" />
      <circle cx="32" cy="34" r="5" />
      {/* indicator dot */}
      <circle cx="48" cy="22" r="1.5" fill="currentColor" />
    </svg>
  );
}
