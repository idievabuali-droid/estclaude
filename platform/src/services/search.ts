/**
 * Unified autocomplete search across the four entity kinds buyers
 * actually search by. Was POI-only before — typing "Гулистон" found
 * "Рынок Гулистон" but missed the district AND the building "ЖК
 * Гулистон Резиденс". Saidakbar typing "Vahdat Park" got nothing.
 *
 * Kinds + navigation target on pick:
 *   - district   → /novostroyki?district=<slug>
 *   - building   → /zhk/<slug>
 *   - developer  → /novostroyki?developer=<id>
 *   - poi        → /<page>?near_lat=&near_lng=&near_label=&radius=
 *
 * Ranking: district > building > developer > poi. Within each kind
 * we keep server-side ordering (alphabetical for districts/devs,
 * popularity for POIs).
 *
 * Each query runs in parallel; the merged result is sliced to `limit`
 * (default 10) so the autocomplete dropdown stays usable on mobile.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { searchPois, type PoiSearchHit } from './pois-search';

const ACTIVE_CITY = 'vahdat';

export type SearchHit =
  | {
      sourceKind: 'district';
      id: string;
      name: string;
      slug: string;
      /** Centroid lat/lng. Used by /post AddressAutocomplete to drop
       *  the map pin when the seller picks a district from the
       *  dropdown. Null when the seed row didn't carry centroid coords. */
      latitude: number | null;
      longitude: number | null;
    }
  | {
      sourceKind: 'building';
      id: string;
      name: string;
      slug: string;
      /** District name for the secondary line in the dropdown row. */
      districtName: string | null;
      /** District id — surfaced so /post can auto-set the listing's
       *  district to match the picked building's district. */
      districtId: string | null;
      /** Building lat/lng. Drives the auto-pin behaviour on /post when
       *  the seller picks an existing ЖК from the autocomplete. */
      latitude: number | null;
      longitude: number | null;
    }
  | {
      sourceKind: 'developer';
      id: string;
      name: string;
      /** Whether the developer is verified — drives a small badge in the row. */
      isVerified: boolean;
    }
  | (PoiSearchHit & { sourceKind: 'poi' });

export interface SearchResults {
  hits: SearchHit[];
}

export async function searchAll(query: string, limit = 10): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { hits: [] };

  const supabase = createAdminClient();

  // Run all four searches in parallel. Per-kind limits are small
  // because we want the dropdown to be readable on mobile (10 rows
  // total max). Districts: 4 (we only have 5 in Vahdat). Buildings:
  // 4 (the inventory is small in V1). Developers: 4. POIs: rest.
  const [districtsRes, buildingsRes, developersRes, pois] = await Promise.all([
    supabase
      .from('districts')
      .select('id, slug, name, center_latitude, center_longitude')
      .eq('city', ACTIVE_CITY)
      .ilike('name->>ru', `%${q}%`)
      .order('name->>ru')
      .limit(4),
    supabase
      .from('buildings')
      .select(
        'id, slug, name, district_id, latitude, longitude, districts(id, name)',
      )
      .eq('city', ACTIVE_CITY)
      .eq('is_published', true)
      .ilike('name->>ru', `%${q}%`)
      .limit(4),
    supabase
      .from('developers')
      .select('id, display_name, status, verified_at')
      .ilike('display_name->>ru', `%${q}%`)
      .limit(4),
    searchPois(q, 8),
  ]);

  const hits: SearchHit[] = [];

  // 1. Districts first — strongest match for buyers thinking "I want
  //    to live in <neighborhood>".
  for (const d of districtsRes.data ?? []) {
    hits.push({
      sourceKind: 'district',
      id: d.id as string,
      name: (d.name as { ru: string }).ru,
      slug: d.slug as string,
      latitude: (d.center_latitude as number | null) ?? null,
      longitude: (d.center_longitude as number | null) ?? null,
    });
  }

  // 2. Buildings — typing "Гулистон Резиденс" lands here, "Vahdat
  //    Park" lands here. The building name carries the brand the
  //    buyer is looking for.
  for (const b of buildingsRes.data ?? []) {
    const district = (b.districts as unknown as { name?: { ru?: string } } | null) ?? null;
    hits.push({
      sourceKind: 'building',
      id: b.id as string,
      name: (b.name as { ru: string }).ru,
      slug: b.slug as string,
      districtName: district?.name?.ru ?? null,
      districtId: (b.district_id as string | null) ?? null,
      latitude: (b.latitude as number | null) ?? null,
      longitude: (b.longitude as number | null) ?? null,
    });
  }

  // 3. Developers — "Кофарнихон Девелопмент", "Ситора" lands here.
  for (const d of developersRes.data ?? []) {
    hits.push({
      sourceKind: 'developer',
      id: d.id as string,
      name: (d.display_name as { ru: string }).ru,
      isVerified: d.status === 'active' && d.verified_at != null,
    });
  }

  // 4. POIs — the existing pg_trgm-indexed search. Already capped
  //    at 8 by searchPois.
  for (const p of pois) {
    hits.push({ ...p, sourceKind: 'poi' });
  }

  return { hits: hits.slice(0, limit) };
}
