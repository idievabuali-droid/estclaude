/**
 * One-shot Overpass pull of POIs for Vahdat (Tajikistan) into the
 * `pois` table. Re-run annually or when a buyer reports a missing
 * landmark.
 *
 * Pulls the kinds we care about for buyer-facing search:
 *   amenity=mosque, school, kindergarten, hospital, pharmacy,
 *     marketplace, bus_station
 *   shop=supermarket, mall
 *   leisure=park
 *   place=square
 *   highway=primary,secondary,tertiary,residential (named only)
 *
 * Usage: node scripts/seed-vahdat-pois.mjs
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

// Vahdat town bounding box (rough): south, west, north, east.
// Vahdat sits ~38.50–38.60 N, 68.95–69.10 E.
const BBOX = '38.48,68.93,38.62,69.12';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Map raw Overpass tags → our `kind` enum. Any new kind added here
// also needs an entry in LocationSearch.tsx's KIND_ICON + KIND_LABEL
// maps so the autocomplete dropdown renders it correctly.
function classify(tags) {
  if (tags.amenity === 'mosque') return { kind: 'mosque' };
  if (tags.amenity === 'school') return { kind: 'school', subkind: tags.isced_level };
  if (tags.amenity === 'kindergarten') return { kind: 'kindergarten' };
  if (tags.amenity === 'university' || tags.amenity === 'college') return { kind: 'school', subkind: tags.amenity };
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'doctors') return { kind: 'hospital', subkind: tags.amenity };
  if (tags.amenity === 'pharmacy') return { kind: 'pharmacy' };
  if (tags.amenity === 'marketplace') return { kind: 'supermarket', subkind: 'market' };
  if (tags.amenity === 'bus_station') return { kind: 'transit', subkind: 'bus_station' };
  if (tags.amenity === 'taxi') return { kind: 'transit', subkind: 'taxi' };
  if (tags.amenity === 'fuel') return { kind: 'fuel' };
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return { kind: 'bank', subkind: tags.amenity };
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') {
    return { kind: 'restaurant', subkind: tags.amenity };
  }
  if (tags.amenity === 'cinema' || tags.amenity === 'theatre') return { kind: 'culture', subkind: tags.amenity };
  if (tags.shop === 'supermarket' || tags.shop === 'mall' || tags.shop === 'convenience') {
    return { kind: 'supermarket', subkind: tags.shop };
  }
  if (tags.shop === 'bakery') return { kind: 'restaurant', subkind: 'bakery' };
  if (tags.leisure === 'park') return { kind: 'park' };
  if (tags.leisure === 'stadium' || tags.leisure === 'sports_centre' || tags.leisure === 'fitness_centre') {
    return { kind: 'sport', subkind: tags.leisure };
  }
  // Monuments + memorials. The Модар (Mother) statue and other
  // landmarks live under tourism=monument / tourism=artwork or
  // historic=monument / historic=memorial in OSM.
  if (
    tags.tourism === 'monument' ||
    tags.tourism === 'artwork' ||
    tags.tourism === 'attraction' ||
    tags.historic === 'monument' ||
    tags.historic === 'memorial' ||
    tags.historic === 'statue'
  ) {
    return { kind: 'landmark', subkind: tags.tourism || tags.historic };
  }
  // Government / civic offices — buyers search "акимат" / "хукумат".
  if (tags.amenity === 'townhall' || tags.office === 'government' || tags.amenity === 'community_centre') {
    return { kind: 'government', subkind: tags.amenity || tags.office };
  }
  if (tags.place === 'square') return { kind: 'square' };
  if (tags.railway === 'station' || tags.railway === 'halt') return { kind: 'transit', subkind: 'railway' };
  if (tags.public_transport === 'station') return { kind: 'transit', subkind: 'station' };
  if (tags.highway && ['primary', 'secondary', 'tertiary', 'residential'].includes(tags.highway) && tags.name) {
    return { kind: 'street', subkind: tags.highway };
  }
  return null;
}

// Curated popularity boost for well-known Vahdat landmarks. Helps the
// autocomplete bubble these to the top when the buyer's query is
// ambiguous. Add to this list whenever a buyer reports a missing
// well-known landmark.
function popularityBoost(name, kind) {
  if (!name) return 0;
  const known = [
    // Districts + streets buyers anchor on
    'Дусти', 'Гулистон', 'Истиқлол', 'Сомони', 'Айни', 'Бухоро',
    // Notable Vahdat / Tajik landmarks
    'Модар', 'Мать-героиня', 'Ваҳдат', 'Вахдат',
    // Common civic anchors
    'Президент', 'Хукумат', 'Маркази', 'Дусти',
  ];
  let score = 0;
  for (const k of known) if (name.toLowerCase().includes(k.toLowerCase())) score += 50;
  // Landmark kinds rank higher than streets in ambiguous queries —
  // a buyer typing "Модар" wants the statue, not "улица Модар".
  if (kind === 'landmark') score += 30;
  if (kind === 'mosque' || kind === 'square') score += 10;
  if (kind === 'government' || kind === 'culture') score += 5;
  return score;
}

async function fetchOverpass() {
  // Single query: union of every kind we care about, then `out tags
  // center` collapses ways/relations to a single coord. ~5-10s
  // typical response time.
  // Union of every kind we care about. Every match needs a `name` tag
  // upstream — we filter unnamed ways/nodes after fetch (keeps the
  // payload small without losing the long-tail). `out tags center`
  // collapses ways/relations to a single coord.
  const amenityRe = 'mosque|school|kindergarten|university|college|hospital|clinic|doctors|pharmacy|marketplace|bus_station|taxi|fuel|bank|atm|restaurant|cafe|fast_food|cinema|theatre|townhall|community_centre';
  const shopRe = 'supermarket|mall|convenience|bakery';
  const leisureRe = 'park|stadium|sports_centre|fitness_centre';
  const tourismRe = 'monument|artwork|attraction';
  const historicRe = 'monument|memorial|statue';
  const query = `[out:json][timeout:60];
(
  node["amenity"~"${amenityRe}"](${BBOX});
  way["amenity"~"${amenityRe}"](${BBOX});
  node["shop"~"${shopRe}"](${BBOX});
  way["shop"~"${shopRe}"](${BBOX});
  way["leisure"~"${leisureRe}"](${BBOX});
  node["leisure"~"${leisureRe}"](${BBOX});
  node["tourism"~"${tourismRe}"](${BBOX});
  way["tourism"~"${tourismRe}"](${BBOX});
  node["historic"~"${historicRe}"](${BBOX});
  way["historic"~"${historicRe}"](${BBOX});
  node["office"="government"](${BBOX});
  node["place"="square"](${BBOX});
  node["railway"~"station|halt"](${BBOX});
  node["public_transport"="station"](${BBOX});
  way["highway"~"primary|secondary|tertiary|residential"]["name"](${BBOX});
);
out tags center 1200;`;
  console.log('Querying Overpass...');
  // Overpass requires a User-Agent identifying the caller — anonymous
  // fetches get 406 Not Acceptable on the public endpoint.
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'zhk.tj-poi-seed/1.0 (+https://zhk.tj)',
      accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const overpass = await fetchOverpass();
  const elements = overpass.elements ?? [];
  console.log(`Overpass returned ${elements.length} elements.`);

  const rows = [];
  const seenOsmIds = new Set();
  for (const el of elements) {
    const tags = el.tags ?? {};
    // Prefer Russian name, fall back to default name, skip if neither
    const nameRu = tags['name:ru'] || tags['name'];
    const nameTg = tags['name:tg'] || tags['name'];
    if (!nameRu) continue;
    const cls = classify(tags);
    if (!cls) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const osmId = `${el.type}/${el.id}`;
    // Streets often have multiple OSM segments — dedupe by name+kind
    // for "street" so we don't list the same street 5 times.
    const dedupeKey = cls.kind === 'street' ? `street:${nameRu}` : osmId;
    if (seenOsmIds.has(dedupeKey)) continue;
    seenOsmIds.add(dedupeKey);
    rows.push({
      osm_id: osmId,
      name: { ru: nameRu, tg: nameTg },
      kind: cls.kind,
      subkind: cls.subkind ?? null,
      city: 'vahdat',
      latitude: lat,
      longitude: lon,
      popularity: popularityBoost(nameRu, cls.kind),
    });
  }

  console.log(`Prepared ${rows.length} POI rows. Upserting…`);

  // Upsert chunked so a single bad row doesn't sink the batch and we
  // stay under PostgREST's request size cap.
  const CHUNK = 100;
  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('pois')
      .upsert(slice, { onConflict: 'osm_id' });
    if (error) {
      console.error(`Chunk ${i / CHUNK} failed:`, error.message);
      continue;
    }
    inserted += slice.length;
    process.stdout.write('.');
  }
  console.log(`\nUpserted ${inserted} POIs (${updated} updates).`);

  // Quick stats
  const byKind = {};
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  console.log('\nBy kind:');
  for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${n}`);
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
