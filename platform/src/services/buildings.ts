/**
 * Buildings service — queries Supabase directly via the server SDK.
 * Returns the same shape as the old mock so consumer pages don't change.
 *
 * V1 LAUNCH SCOPE: filtered to Vahdat only. The `ACTIVE_CITY` constant
 * is the single switch — flip to 'dushanbe' or remove entirely when we
 * expand. Every public-facing query passes through this filter so a
 * stray Dushanbe row in Supabase can never leak into the UI.
 */
import { createClient } from '@/lib/supabase/server';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import type { BuildingStatus } from '@/types/domain';
import { getNearbyPOIs, type PoiCategory } from './poi';

/** A building is considered "near" a POI category when the closest
 *  result of that category is within this many metres. ~12 minute walk
 *  at the 80 m/min average we use elsewhere. Generous on purpose so
 *  buyers don't filter to zero results. */
const NEARBY_THRESHOLD_M = 1000;

const ACTIVE_CITY = 'vahdat';

export type BuildingFilters = {
  district?: string[];
  status?: BuildingStatus[];
  /** Total-price ceiling in dirams. Legacy filter, still respected. */
  priceTo?: bigint | null;
  /** Per-m² price floor in dirams. New in V1 filter pass. */
  pricePerM2From?: bigint | null;
  /** Per-m² price ceiling in dirams. */
  pricePerM2To?: bigint | null;
  /** Handover years to include — e.g. ['2026', '2027']. The literal
   *  '2028+' includes any year >= 2028. The literal 'delivered' includes
   *  buildings with status='delivered' (no handover quarter set). */
  handoverYears?: string[];
  /** Required amenities — building must have ALL of these in its
   *  amenities array (intersection, not union). */
  amenities?: string[];
  /** Required nearby POI categories — building must have at least one
   *  POI of EACH category within NEARBY_THRESHOLD_M. Uses the live
   *  Overpass data (same source as the "Что рядом" section). */
  nearbyCategories?: PoiCategory[];
  city?: 'dushanbe' | 'vahdat';
  q?: string;
};

const BUILDING_COVER: Record<BuildingStatus, string> = {
  announced: 'oklch(0.525 0.145 145)',
  under_construction: 'oklch(0.704 0.14 40)',
  near_completion: 'oklch(0.554 0.135 240)',
  delivered: 'oklch(0.595 0.14 85)',
};

function rowToBuilding(row: BuildingRowWithJoins): MockBuilding {
  return {
    id: row.id,
    slug: row.slug,
    developer_id: row.developer_id,
    district_id: row.district_id,
    city: row.city as 'dushanbe' | 'vahdat',
    name: row.name,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
    handover_estimated_quarter: row.handover_estimated_quarter,
    total_units: row.total_units ?? 0,
    total_floors: row.total_floors ?? 0,
    amenities: row.amenities ?? [],
    cover_color: BUILDING_COVER[row.status],
    price_from_dirams: row.price_from_dirams != null ? BigInt(row.price_from_dirams) : null,
    price_per_m2_from_dirams:
      row.price_per_m2_from_dirams != null ? BigInt(row.price_per_m2_from_dirams) : null,
    description: row.description ?? { ru: '', tg: '' },
  };
}

type BuildingRowWithJoins = {
  id: string;
  slug: string;
  developer_id: string;
  district_id: string;
  city: string;
  name: { ru: string; tg?: string };
  address: { ru: string; tg?: string };
  latitude: number;
  longitude: number;
  description: { ru: string; tg?: string } | null;
  status: BuildingStatus;
  handover_estimated_quarter: string | null;
  total_units: number | null;
  total_floors: number | null;
  amenities: string[] | null;
  is_featured: boolean;
  featured_rank: number | null;
  price_from_dirams: number | null;
  price_per_m2_from_dirams: number | null;
};

export async function listBuildings(filters: BuildingFilters = {}): Promise<MockBuilding[]> {
  const supabase = await createClient();
  // ACTIVE_CITY is enforced on every query — caller-supplied `city`
  // filter is ignored to keep the V1 launch lane pure.
  let q = supabase.from('buildings').select('*').eq('is_published', true).eq('city', ACTIVE_CITY);
  if (filters.status?.length) q = q.in('status', filters.status);
  if (filters.q) q = q.ilike('name->>ru', `%${filters.q}%`);

  if (filters.district?.length) {
    const { data: dRows } = await supabase
      .from('districts')
      .select('id,slug')
      .in('slug', filters.district);
    const ids = (dRows ?? []).map((d) => d.id);
    if (ids.length === 0) return [];
    q = q.in('district_id', ids);
  }

  const { data, error } = await q.order('featured_rank', {
    ascending: true,
    nullsFirst: false,
  });
  if (error) throw error;
  let buildings = (data ?? []).map((r) => rowToBuilding(r as BuildingRowWithJoins));

  // BUG-7: compute price_from_dirams at read time from active listings.
  // The denormalised column is nullable until a Postgres trigger is added.
  await fillPriceFrom(supabase, buildings);

  // Total-price ceiling (legacy)
  if (filters.priceTo) {
    const cap = filters.priceTo;
    buildings = buildings.filter((b) => b.price_from_dirams != null && b.price_from_dirams <= cap);
  }

  // Per-m² price range — applied in JS because the denorm column may be
  // null and we want predictable behaviour ("show only buildings whose
  // computed per-m² fits the range").
  if (filters.pricePerM2From) {
    const floor = filters.pricePerM2From;
    buildings = buildings.filter(
      (b) => b.price_per_m2_from_dirams != null && b.price_per_m2_from_dirams >= floor,
    );
  }
  if (filters.pricePerM2To) {
    const ceil = filters.pricePerM2To;
    buildings = buildings.filter(
      (b) => b.price_per_m2_from_dirams != null && b.price_per_m2_from_dirams <= ceil,
    );
  }

  // Handover year — chip values are years like '2026' and special
  // literals '2028+' (year >= 2028) and 'delivered' (status delivered).
  if (filters.handoverYears?.length) {
    const wanted = new Set(filters.handoverYears);
    buildings = buildings.filter((b) => {
      if (wanted.has('delivered') && b.status === 'delivered') return true;
      if (!b.handover_estimated_quarter) return false;
      const year = parseInt(b.handover_estimated_quarter.slice(0, 4), 10);
      if (wanted.has(String(year))) return true;
      if (wanted.has('2028+') && year >= 2028) return true;
      return false;
    });
  }

  // Amenities — building must include ALL requested amenities
  if (filters.amenities?.length) {
    const required = filters.amenities;
    buildings = buildings.filter((b) =>
      required.every((a) => (b.amenities ?? []).includes(a)),
    );
  }

  // Nearby POI categories — applied last (and only when needed) because
  // each building requires a separate Overpass call. Calls are cached
  // for 24h via the fetch revalidate, so warm-cache filtering is fast;
  // first-load on a fresh deploy will be slower for the buildings that
  // pass all earlier filters. Building must have AT LEAST ONE POI of
  // each requested category within NEARBY_THRESHOLD_M.
  if (filters.nearbyCategories?.length) {
    const wantedCats = filters.nearbyCategories;
    const poiResults = await Promise.all(
      buildings.map((b) => getNearbyPOIs(b.latitude, b.longitude)),
    );
    buildings = buildings.filter((_b, i) => {
      const pois = poiResults[i]!;
      return wantedCats.every((cat) => {
        const nearest = pois[cat][0];
        return nearest != null && nearest.distanceM <= NEARBY_THRESHOLD_M;
      });
    });
  }

  return buildings;
}

export async function listFeaturedBuildings(limit = 3): Promise<MockBuilding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('is_published', true)
    .eq('city', ACTIVE_CITY)
    .eq('is_featured', true)
    .order('featured_rank', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const buildings = (data ?? []).map((r) => rowToBuilding(r as BuildingRowWithJoins));
  await fillPriceFrom(supabase, buildings);
  return buildings;
}

/**
 * Mutates the buildings array in place — sets price_from_dirams + price_per_m2_from_dirams
 * by querying active listings. One round-trip per call.
 */
async function fillPriceFrom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buildings: MockBuilding[],
): Promise<void> {
  if (buildings.length === 0) return;
  const ids = buildings.map((b) => b.id);
  const { data: rows } = await supabase
    .from('listings')
    .select('building_id, price_total_dirams, price_per_m2_dirams')
    .in('building_id', ids)
    .eq('status', 'active');
  const minPrice = new Map<string, bigint>();
  const minPerM2 = new Map<string, bigint>();
  for (const r of rows ?? []) {
    const total = BigInt(r.price_total_dirams);
    const perM2 = BigInt(r.price_per_m2_dirams);
    const cur = minPrice.get(r.building_id);
    if (cur == null || total < cur) minPrice.set(r.building_id, total);
    const curM = minPerM2.get(r.building_id);
    if (curM == null || perM2 < curM) minPerM2.set(r.building_id, perM2);
  }
  for (const b of buildings) {
    if (b.price_from_dirams == null) b.price_from_dirams = minPrice.get(b.id) ?? null;
    if (b.price_per_m2_from_dirams == null)
      b.price_per_m2_from_dirams = minPerM2.get(b.id) ?? null;
  }
}

export async function getBuilding(slug: string): Promise<{
  building: MockBuilding;
  developer: MockDeveloper;
  district: MockDistrict;
  listings: MockListing[];
} | null> {
  const supabase = await createClient();
  const { data: bRow, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!bRow) return null;
  const building = rowToBuilding(bRow as BuildingRowWithJoins);

  const [developerRes, districtRes, listingsRes] = await Promise.all([
    supabase.from('developers').select('*').eq('id', building.developer_id).single(),
    supabase.from('districts').select('*').eq('id', building.district_id).single(),
    supabase
      .from('listings')
      .select('*')
      .eq('building_id', building.id)
      .eq('status', 'active')
      .order('rooms_count', { ascending: true }),
  ]);

  if (developerRes.error || districtRes.error || listingsRes.error) {
    throw developerRes.error ?? districtRes.error ?? listingsRes.error;
  }

  const developer = mapDeveloper(developerRes.data);
  const district = mapDistrict(districtRes.data);
  const listings = (listingsRes.data ?? []).map(mapListing);

  return { building, developer, district, listings };
}

export type DeveloperStats = {
  total: number;
  delivered: number;
  underConstruction: number;
  announced: number;
};

/**
 * Counts the developer's published buildings by status. Drives the
 * "structured stats" card on the building detail page so buyers can
 * judge the developer at a glance (track record vs. current pipeline).
 */
export async function getDeveloperStats(developerId: string): Promise<DeveloperStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buildings')
    .select('status')
    .eq('developer_id', developerId)
    .eq('is_published', true);
  if (error) throw error;
  const stats: DeveloperStats = {
    total: 0,
    delivered: 0,
    underConstruction: 0,
    announced: 0,
  };
  for (const row of data ?? []) {
    stats.total++;
    const s = (row as { status: BuildingStatus }).status;
    if (s === 'delivered') stats.delivered++;
    else if (s === 'under_construction' || s === 'near_completion') stats.underConstruction++;
    else if (s === 'announced') stats.announced++;
  }
  return stats;
}

export async function getDeveloperById(id: string): Promise<MockDeveloper | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('developers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapDeveloper(data) : null;
}

export async function getDistrictById(id: string): Promise<MockDistrict | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('districts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapDistrict(data) : null;
}

export async function listDistricts(): Promise<MockDistrict[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('districts')
    .select('*')
    .eq('city', ACTIVE_CITY)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDistrict);
}

/**
 * Batch fetch — for the compare page. Returns matching buildings in
 * the same order as the input IDs. Includes ALL statuses (active +
 * sold + expired) per Tech Spec §8.13 — compare must render
 * grey-out cards for sold/deleted items.
 */
export async function getBuildingsByIds(ids: string[]): Promise<MockBuilding[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('buildings').select('*').in('id', ids);
  if (error) throw error;
  const map = new Map<string, MockBuilding>();
  for (const r of (data ?? []) as BuildingRowWithJoins[]) {
    map.set(r.id, rowToBuilding(r));
  }
  // Preserve input order
  return ids.map((id) => map.get(id)).filter((b): b is MockBuilding => b != null);
}

export async function getListingsForBuildingId(buildingId: string): Promise<MockListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('building_id', buildingId)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

// ─── Internal mappers ────────────────────────────────────────
function mapDeveloper(r: {
  id: string;
  name: string;
  display_name: { ru: string; tg?: string };
  has_female_agent: boolean;
  status: string;
  verified_at: string | null;
  years_active: number | null;
  projects_completed_count: number | null;
}): MockDeveloper {
  return {
    id: r.id,
    name: r.name,
    display_name: r.display_name,
    is_verified: r.status === 'active' && r.verified_at != null,
    verified_at: r.verified_at,
    has_female_agent: r.has_female_agent,
    years_active: r.years_active,
    projects_completed_count: r.projects_completed_count,
  };
}

function mapDistrict(r: {
  id: string;
  city: string;
  name: { ru: string; tg?: string };
  slug: string;
}): MockDistrict {
  return {
    id: r.id,
    city: r.city as 'dushanbe' | 'vahdat',
    name: r.name,
    slug: r.slug,
  };
}

const LISTING_COVER_BY_SOURCE: Record<string, string> = {
  developer: 'oklch(0.704 0.14 40)',
  owner: 'oklch(0.525 0.145 145)',
  intermediary: 'oklch(0.595 0.14 85)',
};

function mapListing(r: {
  id: string;
  slug: string;
  building_id: string;
  source_type: string;
  status: string;
  rooms_count: number;
  size_m2: number | string;
  floor_number: number;
  total_floors: number | null;
  price_total_dirams: number | string;
  price_per_m2_dirams: number | string;
  finishing_type: string;
  installment_available: boolean;
  installment_first_payment_percent: number | null;
  installment_monthly_amount_dirams: number | string | null;
  installment_term_months: number | null;
  verification_tier: string;
  unit_description: { ru: string; tg?: string } | null;
  view_count: number;
  published_at: string | null;
  bathroom_count: number | null;
  balcony: boolean | null;
  ceiling_height_cm: number | null;
}): MockListing {
  return {
    id: r.id,
    slug: r.slug,
    building_id: r.building_id,
    source_type: r.source_type as MockListing['source_type'],
    status: r.status as MockListing['status'],
    rooms_count: r.rooms_count,
    size_m2: Number(r.size_m2),
    floor_number: r.floor_number,
    total_floors: r.total_floors,
    price_total_dirams: BigInt(r.price_total_dirams),
    price_per_m2_dirams: BigInt(r.price_per_m2_dirams),
    finishing_type: r.finishing_type as MockListing['finishing_type'],
    installment_available: r.installment_available,
    installment_first_payment_percent: r.installment_first_payment_percent,
    installment_monthly_amount_dirams:
      r.installment_monthly_amount_dirams != null
        ? BigInt(r.installment_monthly_amount_dirams)
        : null,
    installment_term_months: r.installment_term_months,
    verification_tier: r.verification_tier as MockListing['verification_tier'],
    cover_color: LISTING_COVER_BY_SOURCE[r.source_type] ?? 'oklch(0.704 0.14 40)',
    unit_description: r.unit_description ?? { ru: '', tg: '' },
    view_count: r.view_count,
    published_at: r.published_at ?? new Date().toISOString(),
    bathroom_count: r.bathroom_count,
    balcony: r.balcony,
    ceiling_height_cm: r.ceiling_height_cm,
  };
}

// Re-export listing mapper for use by listings service
export { mapListing };
