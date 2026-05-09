/**
 * One-shot script to apply migration 0020 (district centroid backfill)
 * via the Supabase REST API using the service-role key. Direct DB
 * connections via `db.<project-ref>.supabase.co` are deprecated for
 * newer Supabase projects, so we go through PostgREST instead — same
 * service-role key the app uses server-side.
 *
 * Migration 0020 only needs UPDATE statements, no DDL, so this works
 * cleanly through the REST API. Each row is updated only if its
 * centroid is currently null — re-running is a no-op against rows
 * that already have values, matching the SQL file's idempotency.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(__dirname, '..');

const ENV_PATH = path.join(PLATFORM_DIR, '.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k, rest.join('=')];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Centroid backfill — same values as 0020_district_centroids.sql.
// Best-effort approximations; tighten via Studio when better data exists.
const CENTROIDS = [
  { slug: 'vahdat-center', center_latitude: 38.5511, center_longitude: 69.0214 },
  { slug: 'gulistan',      center_latitude: 38.5610, center_longitude: 69.0290 },
  { slug: 'sharora',       center_latitude: 38.5680, center_longitude: 69.0150 },
  { slug: 'istiqlol',      center_latitude: 38.5440, center_longitude: 68.9920 },
  { slug: 'sarbozor',      center_latitude: 38.5380, center_longitude: 69.0080 },
];

async function main() {
  // ─── Pre-state ─────────────────────────────
  const { data: before, error: beforeErr } = await supabase
    .from('districts')
    .select('slug, center_latitude, center_longitude')
    .eq('city', 'vahdat')
    .order('slug');
  if (beforeErr) throw beforeErr;
  console.log('— before --------------------------------');
  for (const r of before ?? []) {
    console.log(
      `  ${String(r.slug).padEnd(16)} ${r.center_latitude ?? 'NULL'}  ${r.center_longitude ?? 'NULL'}`,
    );
  }

  // ─── Apply, only when both centroid columns are null ──
  // Mirrors the SQL guard `where center_latitude is null or center_longitude is null`
  // — we re-check the row's current state before issuing each UPDATE so
  // re-running this script preserves any manually-edited centroids.
  console.log('applying 0020 centroid backfill...');
  let updated = 0;
  let skipped = 0;
  for (const c of CENTROIDS) {
    const row = (before ?? []).find((r) => r.slug === c.slug);
    if (!row) {
      console.log(`  ⚠ ${c.slug}: row not found, skipping`);
      continue;
    }
    if (row.center_latitude != null && row.center_longitude != null) {
      console.log(`  ${c.slug}: already has centroid, skipping`);
      skipped++;
      continue;
    }
    const { error: updErr } = await supabase
      .from('districts')
      .update({
        center_latitude: c.center_latitude,
        center_longitude: c.center_longitude,
      })
      .eq('slug', c.slug);
    if (updErr) {
      console.error(`  ✗ ${c.slug}: ${updErr.message}`);
      continue;
    }
    console.log(`  ✓ ${c.slug}: ${c.center_latitude}, ${c.center_longitude}`);
    updated++;
  }

  // ─── Post-state ───────────────────────────
  const { data: after } = await supabase
    .from('districts')
    .select('slug, center_latitude, center_longitude')
    .eq('city', 'vahdat')
    .order('slug');
  console.log('— after ---------------------------------');
  for (const r of after ?? []) {
    console.log(
      `  ${String(r.slug).padEnd(16)} ${r.center_latitude ?? 'NULL'}  ${r.center_longitude ?? 'NULL'}`,
    );
  }
  console.log(`— done ✓  (updated ${updated}, skipped ${skipped})`);
}

main().catch((err) => {
  console.error('migration failed:', err);
  process.exit(1);
});
