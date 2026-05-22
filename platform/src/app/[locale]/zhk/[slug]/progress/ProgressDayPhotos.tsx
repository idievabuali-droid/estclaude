'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ImageWithFallback } from '@/components/blocks';
import { cn } from '@/lib/utils';

export interface ProgressPhotoItem {
  id: string;
  /** Resolved public URL — null when the storage path can't resolve. */
  url: string | null;
}

/**
 * One construction-progress day on the /zhk/[slug]/progress album: a
 * horizontal photo strip the buyer swipes through, plus a full-screen
 * viewer opened by tapping a photo.
 *
 * The strip keeps every day to a single compact row no matter how many
 * photos it holds, so the album stays a scannable timeline as months
 * accumulate. The viewer is where the buyer actually inspects a shot.
 */
export function ProgressDayPhotos({
  photos,
  coverColor,
}: {
  photos: ProgressPhotoItem[];
  /** Placeholder background when a photo URL is missing or 404s. */
  coverColor: string;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <div
        className={cn(
          'flex gap-3 overflow-x-auto overscroll-x-contain snap-x',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setViewerIndex(i)}
            aria-label="Открыть фото на весь экран"
            className="group relative aspect-[4/3] w-60 shrink-0 snap-start overflow-hidden rounded-md bg-stone-100"
          >
            <ImageWithFallback
              src={p.url}
              alt="Фото хода строительства"
              className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-105"
              fallback={<PhotoPlaceholder coverColor={coverColor} />}
            />
          </button>
        ))}
      </div>

      {viewerIndex !== null ? (
        <PhotoViewer
          photos={photos}
          startIndex={viewerIndex}
          coverColor={coverColor}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}

/** Colored placeholder + camera glyph for a photo that can't load. */
function PhotoPlaceholder({ coverColor }: { coverColor: string }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: coverColor }}
        aria-hidden
      />
      <Camera
        className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-white/40"
        aria-hidden
      />
    </>
  );
}

/**
 * Full-screen photo viewer — a horizontal scroll-snap carousel of the
 * day's photos at object-contain, opened on the tapped index. Native
 * swipe on touch; ← → keys + on-screen arrows on desktop; closes on
 * ✕, the dark backdrop, or Escape. Body scroll is locked while open.
 */
function PhotoViewer({
  photos,
  startIndex,
  coverColor,
  onClose,
}: {
  photos: ProgressPhotoItem[];
  startIndex: number;
  coverColor: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [current, setCurrent] = useState(startIndex);

  // Jump to the tapped photo before paint so the viewer never flashes
  // photo 0 first. Safe as a layout effect — the viewer only mounts
  // client-side (it renders behind a click), never on the server.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [startIndex]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const step = useCallback(
    (delta: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const width = el.clientWidth;
      const at = Math.round(el.scrollLeft / width);
      const next = Math.max(0, Math.min(at + delta, photos.length - 1));
      // Instant, not smooth: a smooth scrollTo is silently a no-op on
      // this scroll-snap-mandatory container — instant lands cleanly.
      el.scrollTo({ left: next * width });
    },
    [photos.length],
  );

  // Escape closes; ← → step between photos.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      className="fixed inset-0 z-50 flex flex-col bg-stone-950/95"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-meta font-medium tabular-nums text-white/80">
          {current + 1} / {photos.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            setCurrent(Math.max(0, Math.min(idx, photos.length - 1)));
          }}
          className={cn(
            'flex size-full snap-x snap-mandatory overflow-x-auto overscroll-contain',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative flex size-full shrink-0 snap-start items-center justify-center p-4"
            >
              {/* The dark area around the photo closes the viewer. */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                tabIndex={-1}
                className="absolute inset-0"
              />
              <ImageWithFallback
                src={p.url}
                alt="Фото хода строительства"
                className="relative z-10 max-h-full max-w-full object-contain"
                fallback={<PhotoPlaceholder coverColor={coverColor} />}
              />
            </div>
          ))}
        </div>

        {current > 0 ? (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Предыдущее фото"
            className="absolute left-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:inline-flex"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        {current < photos.length - 1 ? (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Следующее фото"
            className="absolute right-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:inline-flex"
          >
            <ChevronRight className="size-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
