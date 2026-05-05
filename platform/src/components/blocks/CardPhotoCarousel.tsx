'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardPhotoCarouselProps {
  /** All photo URLs in display order, cover first. */
  photos: string[];
  /** Aspect ratio of the cover area, e.g. "4/3" for ListingCard,
   *  "16/9" for BuildingCard. Pass as a Tailwind aspect literal string. */
  aspect: '4/3' | '16/9';
  /** Alt-text base — index appended automatically. */
  alt: string;
  /** Optional className passed to the root container so each card can
   *  add background colour for the no-photos placeholder. */
  className?: string;
  /** Optional inline style for the root — used when the parent renders
   *  a coloured placeholder while the carousel falls back to a single
   *  empty frame. */
  style?: React.CSSProperties;
  /** Children render on top of the first slide (overlays: counter chip,
   *  save toggle, status chip etc). They receive the active index so
   *  consumers can render context-aware overlays if needed; in practice
   *  most overlays are static so the prop is rarely used. */
  children?: React.ReactNode;
  /** Slot for content that should sit ON the first slide AND remain
   *  visible while the user swipes (e.g. the rooms+m² label that lives
   *  bottom-right on every photo, not just the cover). Optional. */
  persistentOverlay?: React.ReactNode;
}

/**
 * In-card photo carousel. Swipe (mobile) or arrow buttons (desktop)
 * cycle through all photos without leaving the list. Tap on a photo
 * still bubbles up to the parent `<Link>` and navigates to the detail
 * page — native scroll-snap means a touch-drag scrolls instead of
 * triggering click, so swipe vs tap separates cleanly.
 *
 * Cian / Avito card pattern: counter "1/N" chip top-left, dots at the
 * bottom showing position, arrow buttons on hover at desktop. Aspect
 * matches the parent card so swap-in is layout-preserving.
 *
 * Empty / single-photo cases:
 *   - 0 photos → renders one empty slide so the parent's coloured
 *     placeholder shows through. No counter, no arrows, no dots.
 *   - 1 photo  → renders that photo. No counter, no arrows, no dots.
 *   - ≥ 2     → full carousel UI.
 */
export function CardPhotoCarousel({
  photos,
  aspect,
  alt,
  className,
  style,
  children,
  persistentOverlay,
}: CardPhotoCarouselProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMany = photos.length > 1;

  // Track scroll position → derive active index for the counter + dots.
  // We use the simple scrollLeft / clientWidth math (same as
  // PhotoGallery) since cards have at most ~10 photos and a scroll
  // listener is cheaper than IntersectionObserver per-slide.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || !hasMany) return;
    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(Math.max(0, Math.min(idx, photos.length - 1)));
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [photos.length, hasMany]);

  // Arrow click handlers — defined inline at usage so the lint rule
  // (`react-hooks/refs`) doesn't flag passing a ref-closing function
  // through a wrapper. preventDefault + stopPropagation on the click
  // is what stops the parent <Link> from intercepting and navigating
  // to the detail page when the buyer just wants the next photo.

  const aspectClass = aspect === '4/3' ? 'aspect-[4/3]' : 'aspect-[16/9]';

  // No photos → render one empty slide so the coloured placeholder set
  // by the parent (style/className) shows through, plus the children
  // overlays (rooms label etc) still position correctly.
  if (photos.length === 0) {
    return (
      <div className={cn('relative w-full', aspectClass, className)} style={style}>
        {persistentOverlay}
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', aspectClass, className)} style={style}>
      <div
        ref={carouselRef}
        className={cn(
          'flex size-full snap-x snap-mandatory overflow-x-auto select-none',
          // Hide scrollbar — Tailwind v4 lacks a first-class utility
          // for this; the bracketed properties work on Firefox + WebKit.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // iOS Safari: kill the long-press context menu (Save image,
          // Open in new tab) — its chooser pops up mid-swipe when the
          // touch lingers, blocking the scroll. Same reason real-estate
          // apps disable it on photo carousels.
          '[-webkit-touch-callout:none]',
        )}
      >
        {photos.map((url, i) => (
          <div key={`${url}-${i}`} className="relative size-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} — фото ${i + 1}`}
              className="absolute inset-0 size-full object-cover"
              // First photo eager (it's the visible cover); rest lazy
              // so a scroll-stopped buyer doesn't pay the bytes for
              // photos they never see.
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Persistent overlays (rooms label etc) — sit above every slide
          so they don't disappear once the user swipes past the cover. */}
      {persistentOverlay}

      {/* Counter chip — top-left, only when more than one photo. */}
      {hasMany ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-sm bg-stone-900/70 px-2 py-1 text-caption font-medium text-white tabular-nums"
        >
          {activeIdx + 1} / {photos.length}
        </span>
      ) : null}

      {/* Desktop arrow controls — hidden on touch devices via group-
          hover (parent card sets `group`). On mobile the swipe gesture
          already covers navigation. */}
      {hasMany ? (
        <>
          {activeIdx > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const el = carouselRef.current;
                if (!el) return;
                el.scrollTo({ left: el.clientWidth * (activeIdx - 1), behavior: 'smooth' });
              }}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-900 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 md:inline-flex"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          {activeIdx < photos.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const el = carouselRef.current;
                if (!el) return;
                el.scrollTo({ left: el.clientWidth * (activeIdx + 1), behavior: 'smooth' });
              }}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-900 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 md:inline-flex"
            >
              <ChevronRight className="size-4" />
            </button>
          ) : null}
        </>
      ) : null}

      {/* Dot indicators — bottom centre. Cap at 8 dots so a 20-photo
          listing doesn't render a row of pinpricks; past the cap we
          show a "·· N+" pill so the buyer knows there are more. */}
      {hasMany ? (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1"
        >
          {photos.length <= 8 ? (
            photos.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'block size-1.5 rounded-full transition-colors',
                  i === activeIdx ? 'bg-white' : 'bg-white/50',
                )}
              />
            ))
          ) : (
            <span className="rounded-full bg-stone-900/65 px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
              {activeIdx + 1} / {photos.length}
            </span>
          )}
        </div>
      ) : null}

      {/* Card-specific overlay slot — Save/Compare toggles, status chips */}
      {children}
    </div>
  );
}
