'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardPhotoCarouselProps {
  /** All photo URLs in display order, cover first. */
  photos: string[];
  /** Aspect ratio of the cover area, e.g. "4/3" for ListingCard,
   *  "16/10" for BuildingCard (cinematic crop, premium real-estate
   *  pattern). "16/9" kept for back-compat with any legacy callers. */
  aspect: '4/3' | '16/9' | '16/10';
  /** Alt-text base — index appended automatically. */
  alt: string;
  /** Optional className passed to the root container so each card can
   *  add background colour for the no-photos placeholder. */
  className?: string;
  /** Optional inline style for the root — used when the parent renders
   *  a coloured placeholder while the carousel falls back to a single
   *  empty frame. */
  style?: React.CSSProperties;
  /** Children render on top of every slide (overlays: counter chip,
   *  save toggle, status chip etc). They're absolutely positioned by
   *  the consumer, so this slot just lays them on top of the photo. */
  children?: React.ReactNode;
  /** Slot for content that should sit ON every slide AND remain visible
   *  while the user swipes (e.g. a label that lives bottom-right on
   *  every photo, not just the cover). Optional. */
  persistentOverlay?: React.ReactNode;
}

/**
 * In-card photo carousel. Three modes determined by photos.length:
 *
 *   0 photos  → static placeholder div (parent paints cover_color +
 *               glyph). No scroll, no overlay controls.
 *   1 photo   → static <img>. No scroll, no rubber-band, no counter,
 *               no dots. iOS Safari otherwise lets the user pull-bounce
 *               an `overflow-x: auto` container even when there's
 *               nothing to scroll, which feels broken.
 *   2+ photos → real carousel. Native CSS scroll-snap drives the swipe
 *               on touch devices; arrow buttons appear on desktop hover.
 *               Counter top-left, dots bottom centre, both reflect
 *               the live scroll position.
 *
 * Tap on a photo bubbles up to the parent <Link> and navigates to the
 * detail page. Touch-drag is a scroll, never a click — the browser's
 * own gesture detection separates them, no JS needed.
 *
 * Edge protections:
 *   - `overscroll-x-contain` keeps the carousel rubber-band from
 *     chaining into the parent page scroll.
 *   - `select-none` + `-webkit-touch-callout: none` stop iOS from
 *     popping the "Save image" sheet during a long swipe.
 *   - `draggable={false}` on every <img> stops desktop drag-and-drop.
 *   - First two photos load eagerly so the first swipe doesn't reveal
 *     a blank slide while the network catches up.
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
  const aspectClass =
    aspect === '4/3' ? 'aspect-[4/3]' : aspect === '16/10' ? 'aspect-[16/10]' : 'aspect-[16/9]';

  // Scroll listener wires the counter + dots to the live scroll position.
  // Only attached when there's actual scroll to listen to.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || photos.length < 2) return;
    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(Math.max(0, Math.min(idx, photos.length - 1)));
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [photos.length]);

  // ─── Mode 1: empty (no photos) ─────────────────────────────────
  if (photos.length === 0) {
    return (
      <div
        className={cn('relative w-full overflow-hidden', aspectClass, className)}
        style={style}
      >
        {persistentOverlay}
        {children}
      </div>
    );
  }

  // ─── Mode 2: single photo (no scroll, no rubber-band) ──────────
  if (photos.length === 1) {
    return (
      <div
        className={cn('relative w-full overflow-hidden bg-stone-100', aspectClass, className)}
        style={style}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[0]}
          alt={`${alt} — фото 1`}
          className="absolute inset-0 size-full object-cover"
          loading="eager"
          draggable={false}
        />
        {persistentOverlay}
        {children}
      </div>
    );
  }

  // ─── Mode 3: real carousel (2+ photos) ─────────────────────────
  return (
    <div className={cn('relative w-full overflow-hidden', aspectClass, className)} style={style}>
      <div
        ref={carouselRef}
        className={cn(
          'flex size-full snap-x snap-mandatory overflow-x-auto select-none',
          // Stop the carousel rubber-band from chaining into the page
          // scroll — without this, an aggressive horizontal swipe can
          // start scrolling the underlying page horizontally.
          'overscroll-x-contain',
          // Hide scrollbar — Tailwind v4 lacks a first-class utility
          // for this; the bracketed properties work in WebKit + Firefox.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // iOS Safari: kill the long-press context menu (Save image,
          // Open in new tab) which otherwise pops up mid-swipe.
          '[-webkit-touch-callout:none]',
        )}
      >
        {photos.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative size-full shrink-0 snap-start bg-stone-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} — фото ${i + 1}`}
              className="absolute inset-0 size-full object-cover"
              // First two photos eager (the cover + likely-next swipe);
              // the rest stay lazy so the list page doesn't pay for
              // photos buyers may never see.
              loading={i < 2 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Persistent overlays (gradient, placeholder labels) sit above
          every slide so they don't disappear once the user swipes. */}
      {persistentOverlay}

      {/* Counter chip — top-left, only when more than one photo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-sm bg-stone-900/70 px-2 py-1 text-caption font-medium text-white tabular-nums"
      >
        {activeIdx + 1} / {photos.length}
      </span>

      {/* Desktop arrow controls — hover-revealed via the parent card's
          `group` class. On touch devices the swipe gesture covers
          navigation, so the arrows stay hidden (md:inline-flex only). */}
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

      {/* Dot indicators — bottom centre. Cap at 8 dots so a 20-photo
          listing doesn't render a row of pinpricks; past the cap we
          fall back to a small "X / N" pill (counter is also top-left
          but the bottom hint helps once the user starts swiping and
          their attention is at the bottom of the photo). */}
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
                // Subtle white shadow so dots stay visible on light photos.
                i === activeIdx ? 'bg-white shadow-[0_0_2px_rgba(0,0,0,0.6)]' : 'bg-white/55',
              )}
            />
          ))
        ) : (
          <span className="rounded-full bg-stone-900/65 px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
            {activeIdx + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* Card-specific overlay slot — Save / Compare toggles, status chip */}
      {children}
    </div>
  );
}
