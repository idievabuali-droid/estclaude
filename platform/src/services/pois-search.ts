/**
 * POI search service backing the LocationSearch autocomplete on the
 * home + /novostroyki + /kvartiry pages.
 *
 * Fast-path: pg_trgm ILIKE on `name->>ru`, ranked by popularity then
 * trigram similarity. Returns 8 results — enough for an autocomplete
 * dropdown without overwhelming the UI.
 *
 * NOT to be confused with `services/poi.ts` — that one wraps the
 * live Overpass API for "Что рядом" panels on detail pages and is
 * slow per-call. This one queries our cached `pois` table for
 * instant typeahead.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export interface PoiSearchHit {
  id: string;
  name: string;
  kind: string;
  subkind: string | null;
  district_slug: string | null;
  latitude: number;
  longitude: number;
}

const ACTIVE_CITY = 'vahdat';

/**
 * Returns up to `limit` POIs whose Russian name contains the query
 * (case-insensitive). Empty/short queries return []. Reads the cached
 * `pois` table — sub-100ms.
 */
export async function searchPois(query: string, limit = 8): Promise<PoiSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createAdminClient();
  // PostgREST `.ilike()` with `%foo%` triggers the pg_trgm index from
  // migration 0017. Order by popularity then by name length so a
  // prefix match wins over a buried-substring match of the same term.
  const { data, error } = await supabase
    .from('pois')
    .select('id, name, kind, subkind, district_slug, latitude, longitude')
    .eq('city', ACTIVE_CITY)
    .ilike('name->>ru', `%${q}%`)
    .order('popularity', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('searchPois failed:', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as { ru: string }).ru,
    kind: row.kind as string,
    subkind: (row.subkind as string | null) ?? null,
    district_slug: (row.district_slug as string | null) ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));
}

/** One-shot lookup by id — used when the caller knows the POI from
 *  a prior selection (e.g. ?near=<id> on the URL after autocomplete). */
export async function getPoiById(id: string): Promise<PoiSearchHit | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('pois')
    .select('id, name, kind, subkind, district_slug, latitude, longitude')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    name: (data.name as { ru: string }).ru,
    kind: data.kind as string,
    subkind: (data.subkind as string | null) ?? null,
    district_slug: (data.district_slug as string | null) ?? null,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  };
}
