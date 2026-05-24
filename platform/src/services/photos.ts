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
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PHOTO_BUCKET = 'listing-photos';

/**
 * Builds the public Storage URL for a photo's storage_path. Used by
 * the building/listing mappers to expose `cover_photo_url` to the UI
 * without having to spin up a Supabase client per row.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL — same env var the browser SDK uses,
 * so dev/staging/prod all get the right host automatically.
 *
 * Pass-through for full external URLs: if the value already starts
 * with `http`, return as-is. This lets the demo seed script populate
 * mock listings with Unsplash URLs without round-tripping through
 * Supabase Storage. Real uploads (via /api/storage/upload) always
 * write a relative path — they hit the SUPABASE_URL branch.
 */
export function supabasePublicUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
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
  /** ISO timestamp the photo was taken. Set for construction-progress
   *  photos so the timeline groups by real shoot date; null for every
   *  other kind. */
  taken_at?: string | null;
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
): Promise<
  { id: string; storage_path: string; is_cover: boolean; kind: string }[]
> {
  if (photos.length === 0) return [];
  const supabase = createAdminClient();

  const rows = photos.map((p, i) => ({
    storage_path: p.storage_path,
    [parentKind === 'building' ? 'building_id' : 'listing_id']: parentId,
    kind: p.kind,
    width: p.width || 0,
    height: p.height || 0,
    file_size_bytes: p.file_size_bytes || 0,
    taken_at: p.taken_at ?? null,
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

  // `kind` is carried through so setCoverPhoto can exclude progress
  // photos from cover candidacy.
  return data.map((row, i) => ({
    id: row.id as string,
    storage_path: row.storage_path as string,
    is_cover: photos[i]?.is_cover ?? false,
    kind: photos[i]?.kind ?? 'other',
  }));
}

/** Photo kinds suitable for the in-card carousel.
 *
 *  Buildings: the carousel is for buyers scanning what the place looks
 *  like — exterior, interior, amenity shots only. The `progress` kind
 *  is for the /zhk/[slug]/progress timeline (monthly construction
 *  snapshots) and the seed inserts six placeholder rows per under-
 *  construction building whose storage files were never uploaded; if
 *  we let them into the carousel, slides 2..7 render as broken images.
 *  `unit_floor_plan` is for the listing detail's floor-plan slot, not
 *  the building card.
 *
 *  Listings: keep all unit-level kinds plus `other`. Floor-plan stays
 *  excluded so the card carousel is photos only — a technical drawing
 *  inline with bedroom shots breaks the browsing rhythm. */
const CARD_PHOTO_KINDS = {
  building: ['building_exterior', 'building_interior', 'building_amenity'],
  listing: ['unit_living', 'unit_bedroom', 'unit_kitchen', 'unit_bathroom', 'unit_view', 'other'],
} as const;

/**
 * Hydrates `photo_urls` on a list of buildings or listings. Single
 * batch query so the caller never N+1s — costs one extra round-trip
 * per list page (negligible at V1 scale).
 *
 * Photo selection is scoped via CARD_PHOTO_KINDS — see that constant
 * for why progress + floor-plan kinds are excluded.
 *
 * Order: cover photo first (if set), then remaining photos by
 * display_order. The cover is materialised separately on the parent
 * row so we always honour the founder's chosen cover even if its
 * display_order isn't 0.
 *
 * Mutates each item in place.
 */
export async function hydratePhotos<
  T extends { id: string; cover_photo_url: string | null; photo_urls: string[] },
>(parentKind: 'building' | 'listing', items: T[]): Promise<void> {
  if (items.length === 0) return;
  const supabase = await createClient();
  const ids = items.map((i) => i.id);
  const fkColumn = parentKind === 'building' ? 'building_id' : 'listing_id';
  const allowedKinds = CARD_PHOTO_KINDS[parentKind];

  const { data: rows, error } = await supabase
    .from('photos')
    .select(`${fkColumn}, storage_path, display_order, kind`)
    .in(fkColumn, ids)
    .in('kind', allowedKinds)
    .order('display_order', { ascending: true });
  if (error) {
    console.error(`[hydratePhotos] failed for ${parentKind}:`, error);
    return;
  }

  const byParent = new Map<string, string[]>();
  for (const r of rows ?? []) {
    const parentId = (r as Record<string, unknown>)[fkColumn] as string;
    const url = supabasePublicUrl((r as { storage_path: string }).storage_path);
    if (!url) continue;
    const arr = byParent.get(parentId) ?? [];
    arr.push(url);
    byParent.set(parentId, arr);
  }

  for (const item of items) {
    const allUrls = byParent.get(item.id) ?? [];
    if (item.cover_photo_url) {
      // Cover stays at index 0; drop any duplicate of it from the rest.
      item.photo_urls = [
        item.cover_photo_url,
        ...allUrls.filter((u) => u !== item.cover_photo_url),
      ];
    } else {
      item.photo_urls = allUrls;
    }
  }
}

/**
 * Sets `cover_photo_id` on the parent (building or listing) given a
 * list of just-inserted photo rows.
 *
 * Rules (so a routine edit doesn't silently swap the card image):
 *   - `progress` photos are never cover candidates — they're the
 *     construction-timeline shots, not the card image. A monthly
 *     progress-photo upload must not touch the cover.
 *   - An explicitly is_cover=true photo always wins (deliberate
 *     founder pick), even over an existing cover.
 *   - Otherwise a cover is set ONLY when the parent has none yet —
 *     adding more photos to a building/listing that already has a
 *     cover leaves that cover alone.
 */
export async function setCoverPhoto(
  parentKind: 'building' | 'listing',
  parentId: string,
  attached: { id: string; is_cover: boolean; kind: string }[],
): Promise<void> {
  if (attached.length === 0) return;
  const table = parentKind === 'building' ? 'buildings' : 'listings';
  const supabase = createAdminClient();

  // Progress photos can never become a cover.
  const candidates = attached.filter((a) => a.kind !== 'progress');
  if (candidates.length === 0) return;

  // Explicit founder pick — honour it unconditionally.
  const explicit = candidates.find((a) => a.is_cover);
  if (explicit) {
    await supabase
      .from(table)
      .update({ cover_photo_id: explicit.id })
      .eq('id', parentId);
    return;
  }

  // No explicit pick — only set a cover if there isn't one already.
  const { data: existing } = await supabase
    .from(table)
    .select('cover_photo_id')
    .eq('id', parentId)
    .maybeSingle();
  if (existing?.cover_photo_id) return;

  await supabase
    .from(table)
    .update({ cover_photo_id: candidates[0]!.id })
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
 * Patches `taken_at` on existing photos. Used by the building edit
 * form so the founder can fix or backfill a wrong/missing date on a
 * progress photo without re-uploading. One UPDATE per row — fine at
 * V1 scale (handful of edits per save). Per-row failures are swallowed
 * so a single bad id doesn't sink the whole save; the caller logs the
 * batch and reports a generic warning toast.
 */
export async function updatePhotoDates(
  updates: { id: string; taken_at: string | null }[],
): Promise<void> {
  if (updates.length === 0) return;
  const supabase = createAdminClient();
  await Promise.all(
    updates.map(({ id, taken_at }) =>
      supabase.from('photos').update({ taken_at }).eq('id', id),
    ),
  );
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
