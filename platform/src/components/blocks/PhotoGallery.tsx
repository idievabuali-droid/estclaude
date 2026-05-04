'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

export interface PhotoGalleryProps {
  /** Photos in display order. The first entry is treated as the cover
   *  for desktop's hero slot. */
  photos: Array<{ id: string; url: string }>;
  /** Alt text base — index appended automatically. */
  alt: string;
  /** Aspect ratio for the desktop hero — the page passes `21/9` for
   *  /kvartira and `2/1` for /zhk to match the existing hero shape. */
  heroAspect?: '21/9' | '2/1' | '16/9';
}

/**
 * Photo carousel + fullscreen lightbox. Replaces the static grid that
 * rendered the cover hero plus a 2/3-column tile of every other photo
 * laid out at once — looked broken next to Cian/Bayut and pushed the
 * price below the fold on mobile.
 *
 * Mobile: full-width scroll-snap carousel with a "1/N" counter pill.
 *         Swipe to change photo (CSS scroll-snap). Tap any photo →
 *         fullscreen lightbox.
 * Desktop: hero + 4-thumb strip below. Click hero or any thumb →
 *          fullscreen lightbox at that index.
 *
 * Fullscreen lightbox: native <dialog> in modal mode. Black bg,
 * close button top-right, prev/next arrows, keyboard arrows + Esc.
 * No 3rd-party library — keeps the bundle clean.
 */
export function PhotoGallery({ photos, alt, heroAspect = '21/9' }: PhotoGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Mobile carousel sync — read scrollLeft → derive active index
  // for the 1/N counter. IntersectionObserver would be cleaner but
  // costs a hook per slide; on a list of ~10 photos a simple scroll
  // listener is enough.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIdx(Math.max(0, Math.min(idx, photos.length - 1)));
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [photos.length]);

  function openLightbox(idx: number) {
    setLightboxIdx(idx);
    dialogRef.current?.showModal();
  }
  function closeLightbox() {
    dialogRef.current?.close();
  }
  function nextLightbox() {
    setLightboxIdx((i) => (i + 1) % photos.length);
  }
  function prevLightbox() {
    setLightboxIdx((i) => (i - 1 + photos.length) % photos.length);
  }

  // Keyboard navigation while lightbox is open. Functional setState
  // forms inline so the effect doesn't depend on next/prev callbacks
  // (lint exhaustive-deps), keeping the listener stable across re-renders.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dlg = dialogRef.current;
      if (!dlg?.open) return;
      if (e.key === 'ArrowRight') {
        setLightboxIdx((i) => (i + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx((i) => (i - 1 + photos.length) % photos.length);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [photos.length]);

  if (photos.length === 0) return null;

  const aspectClass =
    heroAspect === '21/9'
      ? 'aspect-[21/9]'
      : heroAspect === '2/1'
        ? 'aspect-[2/1]'
        : 'aspect-[16/9]';

  return (
    <>
      {/* ─── MOBILE: full-width scroll-snap carousel ─────────────── */}
      <div
        ref={carouselRef}
        className="relative flex snap-x snap-mandatory overflow-x-auto md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // aspect-[16/9] mobile, matches the existing hero ratio so the
        // page layout doesn't shift between this and a no-photo
        // fallback hero.
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openLightbox(i)}
            className="relative aspect-[16/9] w-full shrink-0 snap-center"
            aria-label={`${alt} — фото ${i + 1} из ${photos.length}, открыть на весь экран`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`${alt} — фото ${i + 1}`}
              className="absolute inset-0 size-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </button>
        ))}
        {photos.length > 1 ? (
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900/65 px-3 py-1 text-caption font-medium text-white tabular-nums">
            {activeIdx + 1} / {photos.length}
          </span>
        ) : null}
      </div>

      {/* ─── DESKTOP: hero + thumb strip ─────────────────────────── */}
      <div className="hidden md:block">
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className={`relative ${aspectClass} group w-full overflow-hidden bg-stone-100`}
          aria-label={`${alt} — открыть на весь экран`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[0]!.url}
            alt={`${alt} — фото 1`}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            loading="eager"
          />
          {photos.length > 1 ? (
            <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-stone-900/70 px-2.5 py-1 text-caption font-medium text-white">
              <Maximize2 className="size-3.5" aria-hidden /> Все фото · {photos.length}
            </span>
          ) : null}
        </button>
        {photos.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 bg-white px-4 py-3 md:px-5 lg:px-6">
            {photos.slice(1, 5).map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openLightbox(i + 1)}
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-stone-100"
                aria-label={`${alt} — фото ${i + 2}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`${alt} — фото ${i + 2}`}
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
                {/* On the 4th thumbnail when there are more, overlay
                    "+ ещё N" so the buyer knows there's a deeper set. */}
                {i === 3 && photos.length > 5 ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/55 text-h3 font-semibold text-white">
                    + ещё {photos.length - 5}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ─── FULLSCREEN LIGHTBOX (native dialog) ─────────────────── */}
      <dialog
        ref={dialogRef}
        className="m-0 size-full max-h-none max-w-none bg-stone-950 text-white backdrop:bg-stone-950/95"
        onClick={(e) => {
          // Click on the backdrop (event target IS the dialog itself,
          // not a child) closes the lightbox — same gesture iOS users
          // expect from photo viewers.
          if (e.target === e.currentTarget) closeLightbox();
        }}
      >
        <div className="relative flex size-full items-center justify-center">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-stone-800/80 text-white hover:bg-stone-700"
            aria-label="Закрыть"
          >
            <X className="size-5" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prevLightbox}
                className="absolute left-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-stone-800/80 text-white hover:bg-stone-700"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={nextLightbox}
                className="absolute right-3 top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-stone-800/80 text-white hover:bg-stone-700"
                aria-label="Следующее фото"
              >
                <ChevronRight className="size-6" />
              </button>
              <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-stone-800/80 px-3 py-1 text-meta tabular-nums">
                {lightboxIdx + 1} / {photos.length}
              </span>
            </>
          ) : null}
          {photos[lightboxIdx] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[lightboxIdx].url}
              alt={`${alt} — фото ${lightboxIdx + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
