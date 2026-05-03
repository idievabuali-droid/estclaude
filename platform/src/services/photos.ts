/**
 * Photos service — wraps inserts to the `photos` table after files
 * have been uploaded to Supabase Storage via /api/storage/upload.
 *
 * The storage upload (/api/storage/upload) is decoupled from the DB
 * insert — when the user picks photos in the form, we upload them
 * immediately to storage, then collect their metadata and submit it
 * with the rest of the form. Only at submit time do we know the
 * parent listing/building id, which is when these helpers fire to
 * link the storage objects to actual photos rows.
 */
import { createAdminClient } from '@/lib/supabase/admin';

const PHOTO_BUCKET = 'listing-photos';

/**
 * Builds the public Storage URL for a photo's storage_path. Used by
 * the building/listing mappers to expose `cover_photo_url` to the UI
 * without having to spin up a Supabase client per row.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL — same env var the browser SDK uses,
 * so dev/staging/prod all get the right host automatically.
 */
export function supabasePublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`;
}

/** Per-file metadata returned by /api/storage/upload, then carried
 *  through the form's pending state, then submitted. */
export interface PendingPhoto {
  storage_path: string;
  public_url: string;
  width: number;
  height: number;
  file_size_bytes: number;
  kind: string;
  /** When true, this photo becomes the parent's cover_photo_id.
   *  Exactly one is_cover=true expected per group; if zero, we use
   *  the first photo as cover automatically. */
  is_cover?: boolean;
}

interface AttachOptions {
  uploaderId: string;
}

/**
 * Inserts photos rows for an array of pending uploads, scoped to a
 * single parent (building or listing). Returns the inserted rows so
 * the caller can pick the cover and update `cover_photo_id`.
 *
 * Empty array is a no-op (returns []).
 */
export async function attachPhotos(
  parentKind: 'building' | 'listing',
  parentId: string,
  photos: PendingPhoto[],
  options: AttachOptions,
): Promise<{ id: string; storage_path: string; is_cover: boolean }[]> {
  if (photos.length === 0) return [];
  const supabase = createAdminClient();

  const rows = photos.map((p, i) => ({
    storage_path: p.storage_path,
    [parentKind === 'building' ? 'building_id' : 'listing_id']: parentId,
    kind: p.kind,
    width: p.width || 0,
    height: p.height || 0,
    file_size_bytes: p.file_size_bytes || 0,
    display_order: i,
    uploaded_by: options.uploaderId,
  }));

  const { data, error } = await supabase
    .from('photos')
    .insert(rows)
    .select('id, storage_path');
  if (error || !data) {
    throw error ?? new Error('Failed to insert photos');
  }

  return data.map((row, i) => ({
    id: row.id as string,
    storage_path: row.storage_path as string,
    is_cover: photos[i]?.is_cover ?? false,
  }));
}

/**
 * Sets `cover_photo_id` on the parent (building or listing) given a
 * list of just-inserted photo rows. Picks the first row flagged
 * is_cover=true; if none, picks the first row in the array.
 */
export async function setCoverPhoto(
  parentKind: 'building' | 'listing',
  parentId: string,
  attached: { id: string; is_cover: boolean }[],
): Promise<void> {
  if (attached.length === 0) return;
  const cover = attached.find((a) => a.is_cover) ?? attached[0]!;
  const table = parentKind === 'building' ? 'buildings' : 'listings';
  const supabase = createAdminClient();
  await supabase
    .from(table)
    .update({ cover_photo_id: cover.id })
    .eq('id', parentId);
}

/** Convenience: attach + set cover in one call. Used by both the
 *  inventory create endpoint and the listing update endpoint. */
export async function attachAndSetCover(
  parentKind: 'building' | 'listing',
  parentId: string,
  photos: PendingPhoto[],
  options: AttachOptions,
): Promise<void> {
  const attached = await attachPhotos(parentKind, parentId, photos, options);
  await setCoverPhoto(parentKind, parentId, attached);
}

/**
 * Deletes a set of photo rows by id. Also removes the underlying
 * objects from Storage so we don't accumulate orphan files. If the
 * deleted set includes the parent's cover_photo_id, the parent's
 * cover_photo_id is cleared (caller can pick a new one).
 */
export async function deletePhotos(photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  const supabase = createAdminClient();

  // Read storage paths first so we can clean them up after the row
  // delete cascades any cover_photo_id references.
  const { data: rows } = await supabase
    .from('photos')
    .select('id, storage_path')
    .in('id', photoIds);
  const paths = (rows ?? []).map((r) => r.storage_path as string);

  // null out any building/listing referencing these as cover, so the
  // delete doesn't violate the FK constraint.
  await supabase
    .from('buildings')
    .update({ cover_photo_id: null })
    .in('cover_photo_id', photoIds);
  await supabase
    .from('listings')
    .update({ cover_photo_id: null })
    .in('cover_photo_id', photoIds);

  await supabase.from('photos').delete().in('id', photoIds);

  if (paths.length > 0) {
    // Storage delete is best-effort — DB is the source of truth.
    void supabase.storage.from('listing-photos').remove(paths);
  }
}
