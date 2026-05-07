import type { SVGProps } from 'react';

/**
 * Monoline building illustration — 3-floor residential silhouette.
 * Used for "Каждый ЖК посетили лично" (home trust block) and any
 * "we walked the neighbourhood" trust signal.
 *
 * stroke="currentColor" so colour is controlled by the parent's
 * text-* utility. Defaults to text-terracotta-700 when used in
 * trust blocks.
 */
export function IllustrationBuilding(props: SVGProps<SVGSVGElement>) {
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
      {/* roof */}
      <path d="M10 22 L32 8 L54 22" />
      {/* facade */}
      <path d="M14 22 L14 56 L50 56 L50 22" />
      {/* ground line */}
      <path d="M6 56 L58 56" />
      {/* windows row 1 */}
      <rect x="19" y="28" width="6" height="6" />
      <rect x="29" y="28" width="6" height="6" />
      <rect x="39" y="28" width="6" height="6" />
      {/* windows row 2 */}
      <rect x="19" y="40" width="6" height="6" />
      <rect x="29" y="40" width="6" height="6" />
      <rect x="39" y="40" width="6" height="6" />
    </svg>
  );
}
