/**
 * Listings service — Supabase queries with the trust-weighted ranking
 * applied client-side after fetch (we'll move to a SQL view in a later
 * iteration once we benchmark performance).
 *
 * V1 LAUNCH SCOPE: filtered to Vahdat only via the parent building's
 * city. See services/buildings.ts ACTIVE_CITY for the master switch.
 */
import { createClient } from '@/lib/supabase/server';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import { mapListing } from './buildings';
import { getDistrictBenchmark } from './benchmarks';
import type { FinishingType, SourceType } from '@/types/domain';

const ACTIVE_CITY = 'vahdat';

export type ListingFilters = {
  rooms?: number[];
  source?: SourceType[];
  finishing?: FinishingType[];
  /** Min total price in dirams (1 TJS = 100 dirams). */
  priceFrom?: bigint | null;
  /** Max total price in dirams. */
  priceTo?: bigint | null;
  /** Min apartment size in m² (decimal allowed). */
  sizeFrom?: number | null;
  /** Max apartment size in m². */
  sizeTo?: number | null;
  buildingId?: string;
};

const TIER_RANK: Record<string, number> = {
  listing_verified: 0,
  profile_verified: 1,
  phone_verified: 2,
};

export async function listListings(filters: ListingFilters = {}): Promise<MockListing[]> {
  const supabase = await createClient();
  // Inner-join to buildings so we can filter listings by parent city.
  // The selected `buildings(city)` field is just for the join; we don't
  // use it downstream (mapListing ignores it).
  let q = supabase
    .from('listings')
    .select('*, buildings!inner(city)')
    .eq('status', 'active')
    .eq('buildings.city', ACTIVE_CITY);
  if (filters.rooms?.length) q = q.in('rooms_count', filters.rooms);
  if (filters.source?.length) q = q.in('source_type', filters.source);
  if (filters.finishing?.length) q = q.in('finishing_type', filters.finishing);
  if (filters.priceFrom) q = q.gte('price_total_dirams', Number(filters.priceFrom));
  if (filters.priceTo) q = q.lte('price_total_dirams', Number(filters.priceTo));
  if (filters.sizeFrom != null) q = q.gte('size_m2', filters.sizeFrom);
  if (filters.sizeTo != null) q = q.lte('size_m2', filters.sizeTo);
  if (filters.buildingId) q = q.eq('building_id', filters.buildingId);

  const { data, error } = await q;
  if (error) throw error;
  const listings = (data ?? []).map(mapListing);

  // Effective trust tier needs the developer's verified status.
  // Fetch all referenced buildings + developers in one batch.
  const buildingIds = [...new Set(listings.map((l) => l.building_id))];
  if (buildingIds.length === 0) return listings;
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, developer_id')
    .in('id', buildingIds);
  const developerIds = [...new Set((buildings ?? []).map((b) => b.developer_id))];
  const { data: developers } = await supabase
    .from('developers')
    .select('id, status, verified_at')
    .in('id', developerIds);

  const buildingToDevId = new Map(
    (buildings ?? []).map((b) => [b.id, b.developer_id as string]),
  );
  const verifiedDevs = new Set(
    (developers ?? [])
      .filter((d) => d.status === 'active' && d.verified_at != null)
      .map((d) => d.id),
  );

  return [...listings].sort((a, b) => {
    const aDevVer =
      a.source_type === 'developer' && verifiedDevs.has(buildingToDevId.get(a.building_id) ?? '');
    const bDevVer =
      b.source_type === 'developer' && verifiedDevs.has(buildingToDevId.get(b.building_id) ?? '');
    const aRank = aDevVer ? -1 : (TIER_RANK[a.verification_tier] ?? 99);
    const bRank = bDevVer ? -1 : (TIER_RANK[b.verification_tier] ?? 99);
    if (aRank !== bRank) return aRank - bRank;
    return a.published_at < b.published_at ? 1 : -1;
  });
}

export async function getListing(slug: string): Promise<{
  listing: MockListing;
  building: MockBuilding;
  developer: MockDeveloper;
  district: MockDistrict;
  median: { median: number; sample: number } | null;
  similar: MockListing[];
  /** Seller's verified phone — drives all four contact channels
   *  (WhatsApp, Telegram, IMO, direct call). Single number for all. */
  sellerPhone: string;
} | null> {
  const supabase = await createClient();
  const { data: lRow, error } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!lRow) return null;
  const listing = mapListing(lRow);

  const { data: bRow, error: bErr } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', listing.building_id)
    .single();
  if (bErr) throw bErr;

  const [devRes, distRes, similarRes, sellerRes] = await Promise.all([
    supabase.from('developers').select('*').eq('id', bRow.developer_id).single(),
    supabase.from('districts').select('*').eq('id', bRow.district_id).single(),
    supabase
      .from('listings')
      .select('*')
      .eq('building_id', listing.building_id)
      .eq('status', 'active')
      .neq('id', listing.id)
      .limit(3),
    supabase.from('users').select('phone').eq('id', lRow.seller_user_id).maybeSingle(),
  ]);

  const building: MockBuilding = {
    id: bRow.id,
    slug: bRow.slug,
    developer_id: bRow.developer_id,
    district_id: bRow.district_id,
    city: bRow.city as 'dushanbe' | 'vahdat',
    name: bRow.name,
    address: bRow.address,
    latitude: Number(bRow.latitude),
    longitude: Number(bRow.longitude),
    status: bRow.status,
    handover_estimated_quarter: bRow.handover_estimated_quarter,
    total_units: bRow.total_units ?? 0,
    total_floors: bRow.total_floors ?? 0,
    amenities: bRow.amenities ?? [],
    cover_color: 'oklch(0.704 0.14 40)',
    price_from_dirams: bRow.price_from_dirams != null ? BigInt(bRow.price_from_dirams) : null,
    price_per_m2_from_dirams:
      bRow.price_per_m2_from_dirams != null ? BigInt(bRow.price_per_m2_from_dirams) : null,
    description: bRow.description ?? { ru: '', tg: '' },
  };

  const developer: MockDeveloper = {
    id: devRes.data!.id,
    name: devRes.data!.name,
    display_name: devRes.data!.display_name,
    is_verified: devRes.data!.status === 'active' && devRes.data!.verified_at != null,
    verified_at: devRes.data!.verified_at,
    has_female_agent: devRes.data!.has_female_agent,
    years_active: devRes.data!.years_active,
    projects_completed_count: devRes.data!.projects_completed_count,
  };

  const district: MockDistrict = {
    id: distRes.data!.id,
    city: distRes.data!.city as 'dushanbe' | 'vahdat',
    name: distRes.data!.name,
    slug: distRes.data!.slug,
  };

  const benchmark = await getDistrictBenchmark(district.id);
  const median = benchmark
    ? { median: Number(benchmark.median_per_m2_dirams), sample: benchmark.sample_size }
    : null;

  const similar = (similarRes.data ?? []).map(mapListing);
  // Seller phone — falls back to a placeholder only if the user row is
  // missing (which shouldn't happen in production but keeps the page
  // renderable in degraded states).
  const sellerPhone = sellerRes.data?.phone ?? '+992935563306';

  return { listing, building, developer, district, median, similar, sellerPhone };
}

/**
 * Batch fetch — for the compare page. Returns matching listings in
 * the same order as input IDs. Includes ALL statuses (active + sold +
 * expired + deleted) per Tech Spec §8.13 — compare renders grey-out
 * cards for sold/deleted so shared compare links never break.
 */
export async function getListingsByIds(ids: string[]): Promise<MockListing[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('listings').select('*').in('id', ids);
  if (error) throw error;
  const map = new Map<string, MockListing>();
  for (const r of data ?? []) {
    map.set(r.id, mapListing(r));
  }
  return ids.map((id) => map.get(id)).filter((l): l is MockListing => l != null);
}

/**
 * Server Action stub — submits a contact request.
 */
export async function submitContactRequest(input: {
  listingId: string;
  buyerName: string;
  buyerPhone: string;
  message?: string;
  preferFemaleAgent?: boolean;
  channel: 'visit' | 'whatsapp' | 'call';
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.buyerName || !input.buyerPhone) {
    return { ok: false, error: 'Имя и телефон обязательны' };
  }
  // TODO: wire to insert into contact_requests once we have auth context.
  return { ok: true, id: `pending-auth-${Date.now()}` };
}
