import type { SVGProps } from 'react';

/**
 * Monoline video call illustration — phone with person silhouette on
 * screen + recording dot. Used on /diaspora trust block ("Видеотур
 * по WhatsApp") and any remote-help signal.
 */
export function IllustrationVideoCall(props: SVGProps<SVGSVGElement>) {
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
      {/* phone body */}
      <rect x="14" y="6" width="36" height="52" rx="4" />
      {/* speaker slit */}
      <path d="M28 12 L36 12" />
      {/* screen window */}
      <rect x="18" y="16" width="28" height="32" />
      {/* person head */}
      <circle cx="32" cy="28" r="4" />
      {/* person shoulders */}
      <path d="M24 42 Q24 36 32 36 Q40 36 40 42" />
      {/* recording dot */}
      <circle cx="44" cy="20" r="1.5" fill="currentColor" />
      {/* home indicator */}
      <path d="M28 53 L36 53" />
    </svg>
  );
}
