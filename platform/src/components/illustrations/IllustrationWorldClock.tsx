import type { SVGProps } from 'react';

/**
 * Monoline globe-with-clock-arrow illustration — for "Часовой пояс"
 * (diaspora trust block) and any "we work in your timezone" signal.
 * The arrow looping around the globe reads as "we adapt," not just
 * a clock face.
 */
export function IllustrationWorldClock(props: SVGProps<SVGSVGElement>) {
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
      {/* globe */}
      <circle cx="28" cy="34" r="16" />
      {/* longitude line */}
      <ellipse cx="28" cy="34" rx="6" ry="16" />
      {/* equator */}
      <path d="M12 34 L44 34" />
      {/* clock hands centered on globe */}
      <path d="M28 26 L28 34 L34 38" strokeWidth={2} />
      {/* curved arrow looping around (timezone shift metaphor) */}
      <path d="M48 22 Q56 30 50 42" />
      <path d="M50 42 L46 40 M50 42 L52 38" />
    </svg>
  );
}
