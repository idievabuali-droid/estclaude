import type { SVGProps } from 'react';

/**
 * Monoline compass illustration — for "Подбор за 2 минуты" (home
 * trust block) and any "we'll find the right one for you" signal.
 * The compass needle metaphor reads as guidance, not navigation.
 */
export function IllustrationCompass(props: SVGProps<SVGSVGElement>) {
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
      {/* outer circle */}
      <circle cx="32" cy="32" r="22" />
      {/* needle (rhombus) */}
      <path d="M32 16 L38 32 L32 48 L26 32 Z" />
      {/* needle highlight (top half filled) */}
      <path d="M32 16 L38 32 L26 32 Z" fill="currentColor" />
      {/* center pin */}
      <circle cx="32" cy="32" r="1.5" fill="white" />
      {/* tick marks at cardinal points */}
      <path d="M32 8 L32 12" />
      <path d="M32 52 L32 56" />
      <path d="M8 32 L12 32" />
      <path d="M52 32 L56 32" />
    </svg>
  );
}
