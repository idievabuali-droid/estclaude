'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * <img> that swaps to a fallback node when the source is missing or
 * fails to load (404, network error, decode failure).
 *
 * Used for Supabase Storage photos whose object may not exist — seed
 * placeholder rows whose files were never uploaded, or a transient
 * Storage glitch — so a broken-image icon never reaches the buyer.
 * The colored placeholder is shown instead.
 *
 * Two ways the failure is caught:
 *   - `onError` — for a load that fails AFTER React has hydrated.
 *   - an on-mount check — the image is server-rendered, so it often
 *     finishes loading (and failing) BEFORE React hydrates and the
 *     onError handler is attached; that error event is missed. On
 *     mount we inspect the element directly (`complete` + zero
 *     `naturalWidth` = a load that already failed) and fall back.
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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    // `complete && naturalWidth === 0` = the load already finished and
    // failed (404 etc.) before hydration — the missed-onError case.
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
