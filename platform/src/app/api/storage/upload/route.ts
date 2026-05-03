/**
 * POST /api/storage/upload  (multipart/form-data)
 *
 * Uploads a single image to the `listing-photos` bucket and returns
 * its public URL + metadata. We DON'T insert into the `photos` table
 * here — that happens at submit time when we know the parent
 * listing/building id. Until then the file just lives in storage.
 *
 * Form fields:
 *   file    — the image File
 *   width   — natural width in px (client-computed via Image API)
 *   height  — natural height in px
 *   kind    — photo_kind enum: 'building_exterior' | 'unit_living' |
 *             etc. Defaults to 'unit_living' if missing.
 *
 * Auth: requires getCurrentUser(); orphan files from a misbehaving
 * client get cleaned up by the cron sweeper (out of V1 scope).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'listing-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB matches Zillow's per-image cap
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad form' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'empty file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'file too large (max 10 MB)' },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'unsupported type — use jpg, png, or webp' },
      { status: 415 },
    );
  }

  const widthRaw = form.get('width');
  const heightRaw = form.get('height');
  const width = widthRaw ? parseInt(String(widthRaw), 10) : 0;
  const height = heightRaw ? parseInt(String(heightRaw), 10) : 0;

  const kindRaw = form.get('kind');
  const kind = typeof kindRaw === 'string' ? kindRaw : 'unit_living';

  // Random per-file storage path: ${userId}/${random}.${ext}. Random
  // suffix prevents clashes if the user uploads the same filename
  // twice; userId prefix gives us a built-in audit + soft "namespace".
  const ext =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : 'webp';
  const storagePath = `${user.id}/${randomBytes(12).toString('hex')}.${ext}`;

  const supabase = createAdminClient();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadErr) {
    console.error('storage upload failed:', uploadErr);
    return NextResponse.json(
      { error: 'upload failed', detail: uploadErr.message },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    storage_path: storagePath,
    public_url: pub.publicUrl,
    width,
    height,
    file_size_bytes: file.size,
    kind,
  });
}
