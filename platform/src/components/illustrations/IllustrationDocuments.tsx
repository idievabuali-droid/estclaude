import type { SVGProps } from 'react';

/**
 * Monoline documents-with-checkmark illustration — for "Проверка
 * документов" (diaspora trust block) and any "we vet on your behalf"
 * signal. The big check reads as approval, not a generic checkbox.
 */
export function IllustrationDocuments(props: SVGProps<SVGSVGElement>) {
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
      {/* back document (offset slightly) */}
      <path d="M16 12 L36 12 L44 20 L44 50 L16 50 Z" />
      {/* front document */}
      <path d="M22 18 L42 18 L50 26 L50 56 L22 56 Z" fill="white" />
      {/* folded corner on front */}
      <path d="M42 18 L42 26 L50 26" />
      {/* big check */}
      <path d="M28 38 L34 44 L46 32" strokeWidth={2} />
    </svg>
  );
}
