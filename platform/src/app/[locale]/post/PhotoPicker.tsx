'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Star, Loader2 } from 'lucide-react';
import { toast } from '@/components/primitives/AppToast';

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
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);

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
          const data = (await res.json()) as Omit<PendingPhoto, 'is_cover'>;
          newPhotos.push({ ...data });
        } catch (err) {
          toast.error(`Не загрузилось: ${file.name}`);
          console.error(err);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );

    if (newPhotos.length > 0) {
      // First photo across the picker becomes cover by default.
      const next = [...photos, ...newPhotos];
      if (!next.some((p) => p.is_cover)) {
        next[0]!.is_cover = true;
      }
      onChange(next);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(storagePath: string) {
    const next = photos.filter((p) => p.storage_path !== storagePath);
    // If we removed the cover, promote the new first photo.
    if (!next.some((p) => p.is_cover) && next.length > 0) {
      next[0]!.is_cover = true;
    }
    onChange(next);
  }

  function setCover(storagePath: string) {
    onChange(
      photos.map((p) => ({
        ...p,
        is_cover: p.storage_path === storagePath,
      })),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-meta font-medium text-stone-700">{label}</span>
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
        {photos.map((p) => (
          <div
            key={p.storage_path}
            className="group relative aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100"
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
            {p.is_cover ? (
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm bg-terracotta-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Star className="size-3" /> Обложка
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setCover(p.storage_path)}
                aria-label="Сделать обложкой"
                className="absolute left-1 top-1 hidden size-6 items-center justify-center rounded-sm bg-white/80 text-stone-700 hover:bg-white hover:text-terracotta-600 group-hover:inline-flex"
              >
                <Star className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(p.storage_path)}
              aria-label="Удалить фото"
              className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-sm bg-white/80 text-stone-700 hover:bg-white hover:text-rose-600"
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
        Максимум {max} фото · до 10 МБ каждое · jpg, png, webp · первое — обложка
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
