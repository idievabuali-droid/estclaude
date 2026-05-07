import type { SVGProps } from 'react';

/**
 * Monoline chat bubble with three typing dots inside. Used for the
 * "Напишите нам" step on /post (non-founder seller pitch).
 */
export function IllustrationChatBubble(props: SVGProps<SVGSVGElement>) {
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
      {/* bubble body with tail */}
      <path d="M10 16 Q10 10 16 10 L48 10 Q54 10 54 16 L54 38 Q54 44 48 44 L26 44 L18 52 L18 44 Q10 44 10 38 Z" />
      {/* three dots */}
      <circle cx="22" cy="27" r="2" fill="currentColor" />
      <circle cx="32" cy="27" r="2" fill="currentColor" />
      <circle cx="42" cy="27" r="2" fill="currentColor" />
    </svg>
  );
}
