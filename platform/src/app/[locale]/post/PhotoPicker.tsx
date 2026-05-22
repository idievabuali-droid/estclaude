'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Star, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/primitives/AppToast';
import { AppInput } from '@/components/primitives';

/** Per-file metadata kept in the form's local state. Mirrors the
 *  shape returned by /api/storage/upload + the server's PendingPhoto
 *  in services/photos.ts. */
export interface PendingPhoto {
  storage_path: string;
  public_url: string;
  width: number;
  height: number;
  file_size_bytes: number;
  kind: string;
  is_cover?: boolean;
  /** ISO timestamp the photo was taken — set in date mode (progress
   *  photos). Mirrors PendingPhoto.taken_at in services/photos.ts. */
  taken_at?: string | null;
}

export interface PhotoPickerProps {
  /** Photos already in this picker's state (controlled). */
  photos: PendingPhoto[];
  /** Called when the user adds, removes, or sets a new cover. */
  onChange: (photos: PendingPhoto[]) => void;
  /**
   * Used as the photo_kind enum stored in the DB. Defaults to
   * 'unit_living' for apartment galleries; pass 'building_exterior'
   * for the building cover picker.
   */
  kind?: string;
  /** Maximum photos in this picker (Zillow uses 15). */
  max?: number;
  /** Optional caption shown above the picker. */
  label?: string;
  /** When true, renders a "shot on" date field above the grid. Each new
   *  photo is tagged with the selected date (taken_at) and shows a date
   *  badge instead of the cover star — for construction-progress photos,
   *  which are dated and never covers. */
  withDate?: boolean;
}

const DEFAULT_MAX = 15;

/**
 * Multi-file image picker with inline upload.
 *
 * Picks files via a hidden <input type=file multiple>. For each file
 * we read its dimensions in the browser via the Image API (so we can
 * pass width/height to the upload endpoint, which writes them to the
 * `photos` table). The actual upload happens immediately on pick —
 * by submit time the file is already in Storage and we just attach
 * the storage_path to the new row.
 *
 * Cover photo: first picked photo is the cover by default. Tapping
 * the star icon on any thumbnail makes it the cover instead.
 */
export function PhotoPicker({
  photos,
  onChange,
  kind = 'unit_living',
  max = DEFAULT_MAX,
  label,
  withDate = false,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);
  // YYYY-MM-DD applied as taken_at to newly-added photos (date mode).
  const [takenDate, setTakenDate] = useState(localDateISO);

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - photos.length;
    if (remaining <= 0) {
      toast.error(`Можно загрузить максимум ${max} фото`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading((n) => n + toUpload.length);
    const newPhotos: PendingPhoto[] = [];

    await Promise.all(
      toUpload.map(async (file) => {
        try {
          const dims = await readImageDimensions(file);
          const form = new FormData();
          form.set('file', file);
          form.set('width', String(dims.width));
          form.set('height', String(dims.height));
          form.set('kind', kind);
          const res = await fetch('/api/storage/upload', {
            method: 'POST',
            body: form,
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          const data = (await res.json()) as Omit<
            PendingPhoto,
            'is_cover' | 'taken_at'
          >;
          newPhotos.push({
            ...data,
            taken_at: withDate ? `${takenDate}T12:00:00.000Z` : null,
          });
        } catch (err) {
          toast.error(`Не загрузилось: ${file.name}`);
          console.error(err);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );

    if (newPhotos.length > 0) {
      // First photo across the picker becomes cover by default — never
      // in date mode, where photos are dated progress shots, not covers.
      const next = [...photos, ...newPhotos];
      if (!withDate && !next.some((p) => p.is_cover)) {
        next[0]!.is_cover = true;
      }
      onChange(next);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(storagePath: string) {
    const next = photos.filter((p) => p.storage_path !== storagePath);
    // If we removed the cover, promote the new first photo (not in date
    // mode — progress photos have no cover).
    if (!withDate && !next.some((p) => p.is_cover) && next.length > 0) {
      next[0]!.is_cover = true;
    }
    onChange(next);
  }

  /**
   * Sets the cover AND moves the chosen photo to position 0. The
   * server's `attachPhotos` writes `display_order` from the array
   * index, and the in-card carousel renders cover first → so a
   * cover-only flag without reordering would leave the second photo
   * still appearing right after the cover in the carousel ordering.
   * Reordering on cover-set keeps the seller's intent consistent
   * across all three surfaces (form thumbnail row, listing card,
   * detail page).
   */
  function setCover(storagePath: string) {
    const target = photos.find((p) => p.storage_path === storagePath);
    if (!target) return;
    const others = photos.filter((p) => p.storage_path !== storagePath);
    onChange([
      { ...target, is_cover: true },
      ...others.map((p) => ({ ...p, is_cover: false })),
    ]);
  }

  /** Reorder helper — moves the photo at `index` by `delta` positions
   *  (negative = earlier / left, positive = later / right). Clamps at
   *  the array bounds. Used by the per-thumbnail ◀ ▶ buttons so the
   *  seller can fine-tune order without dragging (touch-friendly). */
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    // Reordering away from position 0 should NOT silently lose the
    // cover. If the user moved photo[0] off the front, promote the new
    // photo[0] to cover — matches the buyer's expectation that "first
    // photo = cover". They can still manually re-pick the cover via
    // the star button.
    if (!withDate) {
      if (!next.some((p) => p.is_cover)) {
        next[0]!.is_cover = true;
      } else if (target === 0 && delta < 0) {
        // Just-moved photo is now first → it becomes cover.
        next.forEach((p, i) => {
          p.is_cover = i === 0;
        });
      }
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-meta font-medium text-stone-700">{label}</span>
      ) : null}

      {withDate ? (
        <div className="flex flex-col gap-1.5">
          <div className="max-w-xs">
            <AppInput
              type="date"
              label="Дата съёмки"
              value={takenDate}
              onChange={(e) => setTakenDate(e.target.value)}
            />
          </div>
          <span className="text-caption text-stone-500">
            Новые фото получат выбранную дату. Для фото за другой день —
            поменяйте дату и добавьте ещё.
          </span>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {photos.map((p, idx) => (
          <div
            key={p.storage_path}
            className="relative aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100"
          >
            {/* Plain <img> not next/image — these are runtime-uploaded
                photos served directly from Supabase Storage; the
                next/image optimisation pipeline doesn't apply to
                arbitrary external storage URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.public_url}
              alt=""
              className="size-full object-cover"
            />
            {withDate ? (
              // Progress photos are dated, never covers — the cover star
              // is replaced by a read-only date badge.
              p.taken_at ? (
                <span className="absolute left-1 top-1 inline-flex items-center rounded-sm bg-stone-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                  {shortDate(p.taken_at)}
                </span>
              ) : null
            ) : p.is_cover ? (
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm bg-terracotta-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Star className="size-3" /> Обложка
              </span>
            ) : (
              // Always visible (was hidden+group-hover, which made it
              // unreachable on touch devices — the only place sellers
              // actually post from). 28px hit target keeps it tappable
              // without dominating the thumbnail.
              <button
                type="button"
                onClick={() => setCover(p.storage_path)}
                aria-label="Сделать обложкой"
                className="absolute left-1 top-1 inline-flex size-7 items-center justify-center rounded-sm bg-white/85 text-stone-700 shadow-sm hover:bg-white hover:text-terracotta-600 active:bg-stone-100"
              >
                <Star className="size-3.5" />
              </button>
            )}

            {/* ◀ ▶ reorder controls — bottom-row, touch-friendly. Up
                arrow disabled at index 0; down arrow disabled at the
                end. Reordering away from index 0 auto-promotes the new
                first photo to cover (see move()), so sellers don't end
                up with a phantom cover offscreen. */}
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Сдвинуть влево"
                className="inline-flex size-7 items-center justify-center rounded-sm bg-white/85 text-stone-700 shadow-sm hover:bg-white hover:text-terracotta-600 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/85"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === photos.length - 1}
                aria-label="Сдвинуть вправо"
                className="inline-flex size-7 items-center justify-center rounded-sm bg-white/85 text-stone-700 shadow-sm hover:bg-white hover:text-terracotta-600 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/85"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => remove(p.storage_path)}
              aria-label="Удалить фото"
              className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-sm bg-white/85 text-stone-700 shadow-sm hover:bg-white hover:text-rose-600 active:bg-stone-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {photos.length < max ? (
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading > 0}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-stone-300 bg-stone-50 text-stone-500 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-600 disabled:opacity-60"
          >
            {uploading > 0 ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span className="text-caption">Загрузка…</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-5" />
                <span className="text-caption">Добавить фото</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      <span className="text-caption text-stone-500">
        Максимум {max} фото · до 10 МБ каждое · jpg, png, webp
        {withDate ? ' · ◀ ▶ — порядок' : ' · ⭐ — обложка · ◀ ▶ — порядок'}
      </span>
    </div>
  );
}

/**
 * Reads natural width/height from a File via objectURL + Image. We
 * need these dimensions BEFORE the upload so the photos table's NOT
 * NULL width/height columns get real values. Falls back to (0, 0)
 * if the image fails to load (rare, e.g. SVG / corrupted file).
 */
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Today's date as YYYY-MM-DD in the *local* timezone — the default
 * "shot on" date. Plain toISOString() is UTC, so a late-evening upload
 * in Tajikistan (UTC+5) could otherwise default to the wrong day.
 */
function localDateISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** ISO timestamp → short Russian date ("22 мая") for the thumbnail badge. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}
