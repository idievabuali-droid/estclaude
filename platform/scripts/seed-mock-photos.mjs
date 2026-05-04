/**
 * Seeds demo photos onto the existing mock buildings + listings so
 * the V1 catalogue stops showing colored placeholders. NOT real
 * photos — generic Unsplash apartment shots, intentionally captioned
 * "(демо-фото)" in the UI so a careful buyer doesn't think two
 * different ЖК share a building.
 *
 * Idempotent-ish: skips buildings/listings that already have a
 * cover_photo_id set. Re-run safely after partial failures or after
 * adding new mock buildings.
 *
 * Usage: node scripts/seed-mock-photos.mjs
 *
 * Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Curated Unsplash photo IDs. Generic modern apartment buildings +
// interiors. URL format below appends ?w=1200&q=80 for reasonable
// transfer size while keeping the cards crisp.
const BUILDING_PHOTOS = [
  // Exteriors — modern/mid-rise
  'photo-1545324418-cc1a3fa10c00', // mid-rise residential
  'photo-1493809842364-78817add7ffb', // urban modern
  'photo-1582407947304-fd86f028f716', // mid-rise glass
  'photo-1460317442991-0ec209397118', // residential complex
  'photo-1572120360610-d971b9d7767c', // modern residential
  'photo-1486325212027-8081e485255e', // contemporary mid-rise
  'photo-1567496898669-ee935f5f647a', // residential mid-rise
  'photo-1556909212-d5b604d0c90d', // urban building
];

const INTERIOR_PHOTOS = [
  // Living rooms / bedrooms — bright, neutral
  'photo-1502672260266-1c1ef2d93688', // bright living room
  'photo-1484154218962-a197022b5858', // modern kitchen
  'photo-1493809842364-78817add7ffb', // bedroom
  'photo-1505691938895-1758d7feb511', // open-plan living
  'photo-1556228453-efd6c1ff04f6', // bright open kitchen
  'photo-1560448204-e02f11c3d0e2', // minimalist bedroom
  'photo-1583847268964-b28dc8f51f92', // dining area
  'photo-1556909114-f6e7ad7d3136', // sofa + tv area
  'photo-1540518614846-7eded433c457', // empty room daylight
  'photo-1554995207-c18c203602cb', // modern apartment
  'photo-1513694203232-719a280e022f', // empty unit
  'photo-1494526585095-c41746248156', // lounge
];

const unsplashUrl = (id) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

// Pick deterministic photos per building/listing slug so re-runs
// produce the same visuals. Hash slug → index.
function pickIndex(slug, max) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 1000003;
  return Math.abs(h) % max;
}

async function ensureFounderUserId() {
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .order('user_id', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function attachBuildingCovers(founderId) {
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, slug, cover_photo_id')
    .eq('city', 'vahdat');
  if (!buildings || buildings.length === 0) {
    console.log('No buildings to seed.');
    return;
  }
  console.log(`Found ${buildings.length} buildings.`);
  for (const b of buildings) {
    if (b.cover_photo_id) {
      console.log(`  · ${b.slug}: already has cover, skipping.`);
      continue;
    }
    const photoId = BUILDING_PHOTOS[pickIndex(b.slug, BUILDING_PHOTOS.length)];
    const url = unsplashUrl(photoId);
    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        storage_path: url, // pass-through URL (see lib/services/photos.ts)
        building_id: b.id,
        kind: 'building_exterior',
        width: 1200,
        height: 800,
        file_size_bytes: 0,
        display_order: 0,
        uploaded_by: founderId,
        caption: { ru: 'демо-фото', tg: 'демо-фото' },
      })
      .select('id')
      .single();
    if (error) {
      console.error(`  ✗ ${b.slug}: photo insert failed:`, error.message);
      continue;
    }
    await supabase.from('buildings').update({ cover_photo_id: photo.id }).eq('id', b.id);
    console.log(`  ✓ ${b.slug}: attached + set cover`);
  }
}

async function attachListingCovers(founderId) {
  const { data: listings } = await supabase
    .from('listings')
    .select('id, slug, cover_photo_id, status')
    .is('deleted_at', null);
  if (!listings || listings.length === 0) {
    console.log('No listings to seed.');
    return;
  }
  console.log(`Found ${listings.length} listings.`);
  for (const l of listings) {
    if (l.cover_photo_id) {
      console.log(`  · ${l.slug}: already has cover, skipping.`);
      continue;
    }
    // Insert 3 photos per listing — first becomes cover. Picks them
    // deterministically by slug + offset so the same listing always
    // gets the same trio across re-runs.
    const baseIdx = pickIndex(l.slug, INTERIOR_PHOTOS.length);
    const inserted = [];
    for (let i = 0; i < 3; i++) {
      const photoId = INTERIOR_PHOTOS[(baseIdx + i) % INTERIOR_PHOTOS.length];
      const url = unsplashUrl(photoId);
      const { data: photo, error } = await supabase
        .from('photos')
        .insert({
          storage_path: url,
          listing_id: l.id,
          kind: 'unit_living',
          width: 1200,
          height: 800,
          file_size_bytes: 0,
          display_order: i,
          uploaded_by: founderId,
          caption: { ru: 'демо-фото', tg: 'демо-фото' },
        })
        .select('id')
        .single();
      if (error) {
        console.error(`  ✗ ${l.slug} #${i}: insert failed:`, error.message);
        break;
      }
      inserted.push(photo.id);
    }
    if (inserted.length > 0) {
      await supabase.from('listings').update({ cover_photo_id: inserted[0] }).eq('id', l.id);
      console.log(`  ✓ ${l.slug}: attached ${inserted.length} photos`);
    }
  }
}

async function main() {
  const founderId = await ensureFounderUserId();
  if (!founderId) {
    console.error('No admin user found in user_roles — cannot set uploaded_by.');
    process.exit(1);
  }
  console.log(`Founder user_id: ${founderId}`);
  console.log('\n=== Buildings ===');
  await attachBuildingCovers(founderId);
  console.log('\n=== Listings ===');
  await attachListingCovers(founderId);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
