import type { SVGProps } from 'react';

/**
 * Monoline clipboard with three checkmark items. Used for the
 * "Зададим 5 коротких вопросов" step on /post.
 */
export function IllustrationClipboard(props: SVGProps<SVGSVGElement>) {
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
      {/* clipboard body */}
      <path d="M14 14 L14 56 L50 56 L50 14" />
      {/* clip top */}
      <path d="M22 10 L26 10 L26 6 L38 6 L38 10 L42 10 L42 18 L22 18 Z" />
      {/* checkmarks (three rows) */}
      <path d="M22 28 L25 31 L31 25" strokeWidth={2} />
      <path d="M34 28 L42 28" />
      <path d="M22 38 L25 41 L31 35" strokeWidth={2} />
      <path d="M34 38 L42 38" />
      <path d="M22 48 L25 51 L31 45" strokeWidth={2} />
      <path d="M34 48 L42 48" />
    </svg>
  );
}
