import type { SVGProps } from 'react';

/**
 * Monoline house-with-heart illustration — for /izbrannoe empty
 * state ("Сохраняйте понравившиеся квартиры здесь") and any
 * favourites / saved-items signal.
 */
export function IllustrationHouseHeart(props: SVGProps<SVGSVGElement>) {
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
      {/* house silhouette */}
      <path d="M10 32 L32 12 L54 32" />
      <path d="M16 28 L16 54 L48 54 L48 28" />
      <path d="M6 54 L58 54" />
      {/* heart inside the house */}
      <path d="M32 46 C28 42 22 42 22 36 C22 32 26 30 28 32 C30 30 32 32 32 34 C32 32 34 30 36 32 C38 30 42 32 42 36 C42 42 36 42 32 46 Z" />
    </svg>
  );
}
