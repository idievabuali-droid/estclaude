'use client';

import { useState } from 'react';

/**
 * <img> that swaps to a fallback node when the source is missing or
 * fails to load (404, network error, decode failure).
 *
 * Used for Supabase Storage photos whose object may not exist — seed
 * placeholder rows whose files were never uploaded, or a transient
 * Storage glitch — so a broken-image icon never reaches the buyer.
 * The colored placeholder is shown instead.
 */
export interface ImageWithFallbackProps {
  /** Resolved public URL. Null/empty → the fallback renders directly. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Rendered instead of the image when src is missing or load fails. */
  fallback: React.ReactNode;
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallback,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
