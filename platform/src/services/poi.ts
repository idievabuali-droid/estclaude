/**
 * POI ("Что рядом") service. Backs WEDGE-2 — distance to mosque / school /
 * hospital / supermarket / transit / park / pharmacy / kindergarten near
 * each building. Uses OpenStreetMap Overpass API (free, no key, real data).
 *
 * Mosque is a first-class category — no Russian platform offers it, but
 * culturally load-bearing in Tajikistan.
 *
 * Caching: the underlying Overpass call is a POST, which Next.js fetch
 * cache won't honor. We wrap getNearbyPOIs in unstable_cache instead
 * (24h TTL, keyed by rounded lat/lng so two buildings on the same
 * block share the cache entry). Without this every /kvartira and /zhk
 * page render hits Overpass live (~1-3s) — the biggest single
 * slowdown on Tajik mobile networks.
 */
import { unstable_cache } from 'next/cache';

export type PoiCategory =
  | 'mosque'
  | 'school'
  | 'kindergarten'
  | 'hospital'
  | 'supermarket'
  | 'transit'
  | 'park'
  | 'pharmacy';

export type PoiItem = {
  name: string;
  lat: number;
  lng: number;
  /** Walking distance in meters (Haversine, straight-line). */
  distanceM: number;
  /** Walking minutes — assumes 80 m/min average walking speed. */
  walkingMin: number;
};

export type PoiResult = Record<PoiCategory, PoiItem[]>;

export const POI_LABELS: Record<PoiCategory, { ru: string; emoji: string }> = {
  mosque: { ru: 'Мечети', emoji: '🕌' },
  school: { ru: 'Школы', emoji: '🏫' },
  kindergarten: { ru: 'Детсады', emoji: '👶' },
  hospital: { ru: 'Поликлиники', emoji: '🏥' },
  supermarket: { ru: 'Магазины', emoji: '🛒' },
  transit: { ru: 'Транспорт', emoji: '🚌' },
  park: { ru: 'Парки', emoji: '🌳' },
  pharmacy: { ru: 'Аптеки', emoji: '💊' },
};

const QUERIES: Record<PoiCategory, string> = {
  mosque: 'nwr["amenity"="place_of_worship"]["religion"="muslim"]',
  school: 'nwr["amenity"="school"]',
  kindergarten: 'nwr["amenity"="kindergarten"]',
  hospital: 'nwr["amenity"~"hospital|clinic|doctors"]',
  supermarket: 'nwr["shop"~"supermarket|convenience"]',
  transit: 'nwr["highway"="bus_stop"]',
  park: 'nwr["leisure"="park"]',
  pharmacy: 'nwr["amenity"="pharmacy"]',
};

const RADIUS_M = 2500; // 2.5km — wider for less-densely-mapped Dushanbe / Vahdat
const PER_CATEGORY_LIMIT = 3;

/** Haversine distance in meters between two lat/lng pairs. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

function elementToCoord(el: OverpassElement): { lat: number; lng: number } | null {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function elementName(el: OverpassElement, fallback: string): string {
  return el.tags?.['name:ru'] ?? el.tags?.['name'] ?? el.tags?.['name:en'] ?? fallback;
}

/**
 * Public entry point. Rounds the coords to ~3 decimals (≈100m
 * granularity) so two buildings on the same block share the cache
 * entry, then delegates to the cached implementation. Cache is
 * server-side via unstable_cache — re-validates every 24h or on
 * tag invalidation.
 */
export async function getNearbyPOIs(
  lat: number,
  lng: number,
): Promise<PoiResult> {
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return getNearbyPOIsCached(roundedLat, roundedLng);
}

const getNearbyPOIsCached = unstable_cache(
  async (lat: number, lng: number): Promise<PoiResult> => {
    return fetchNearbyPOIsFresh(lat, lng);
  },
  ['nearby-pois-v1'],
  {
    revalidate: 86_400, // 24h
    tags: ['overpass-poi'],
  },
);

/**
 * Underlying Overpass fetch. Was the public function before; now
 * private behind getNearbyPOIs + unstable_cache.
 */
async function fetchNearbyPOIsFresh(
  lat: number,
  lng: number,
): Promise<PoiResult> {
  // Build a single Overpass query for all 8 categories at once
  const queryBody = (Object.keys(QUERIES) as PoiCategory[])
    .map((cat) => `${QUERIES[cat]}(around:${RADIUS_M},${lat},${lng});`)
    .join('\n');
  const query = `
    [out:json][timeout:25];
    (
      ${queryBody}
    );
    out center tags;
  `;

  let data: OverpassResponse;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        // Overpass returns 406 without a real UA; identify the platform politely.
        'user-agent': 'estclaude-platform/0.1 (real-estate platform for Dushanbe)',
        accept: 'application/json',
      },
      body: 'data=' + encodeURIComponent(query),
      // No `next: revalidate` here — Next.js fetch cache doesn't
      // honor it for POST requests. Caching happens one level up
      // via unstable_cache around getNearbyPOIs.
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    data = (await res.json()) as OverpassResponse;
  } catch {
    // Fail soft — return empty so the section just doesn't render
    return emptyResult();
  }

  const result = emptyResult();
  for (const el of data.elements) {
    const coord = elementToCoord(el);
    if (!coord) continue;
    const distanceM = haversineM(lat, lng, coord.lat, coord.lng);
    if (distanceM > RADIUS_M) continue;
    const walkingMin = Math.max(1, Math.round(distanceM / 80));

    const cat = classifyElement(el);
    if (!cat) continue;
    const item: PoiItem = {
      name: elementName(el, POI_LABELS[cat].ru.slice(0, -1)),
      lat: coord.lat,
      lng: coord.lng,
      distanceM: Math.round(distanceM),
      walkingMin,
    };
    result[cat].push(item);
  }

  // Sort each category by distance and trim to LIMIT
  for (const cat of Object.keys(result) as PoiCategory[]) {
    result[cat].sort((a, b) => a.distanceM - b.distanceM);
    result[cat] = result[cat].slice(0, PER_CATEGORY_LIMIT);
  }
  return result;
}

function classifyElement(el: OverpassElement): PoiCategory | null {
  const t = el.tags ?? {};
  if (t.amenity === 'place_of_worship' && t.religion === 'muslim') return 'mosque';
  if (t.amenity === 'school') return 'school';
  if (t.amenity === 'kindergarten') return 'kindergarten';
  if (t.amenity === 'hospital' || t.amenity === 'clinic' || t.amenity === 'doctors') {
    return 'hospital';
  }
  if (t.shop === 'supermarket' || t.shop === 'convenience') return 'supermarket';
  if (t.highway === 'bus_stop') return 'transit';
  if (t.leisure === 'park') return 'park';
  if (t.amenity === 'pharmacy') return 'pharmacy';
  return null;
}

function emptyResult(): PoiResult {
  return {
    mosque: [],
    school: [],
    kindergarten: [],
    hospital: [],
    supermarket: [],
    transit: [],
    park: [],
    pharmacy: [],
  };
}
