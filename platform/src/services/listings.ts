/**
 * Listings service — Supabase queries with the trust-weighted ranking
 * applied client-side after fetch (we'll move to a SQL view in a later
 * iteration once we benchmark performance).
 *
 * V1 LAUNCH SCOPE: filtered to Vahdat only via the parent building's
 * city. See services/buildings.ts ACTIVE_CITY for the master switch.
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import {
  mapListing,
  rowToBuilding,
  type BuildingRowWithJoins,
  BUILDING_SELECT,
  LISTING_SELECT,
} from './buildings';
import { getDistrictBenchmark } from './benchmarks';
import { hydratePhotos } from './photos';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';
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
  /** Max monthly installment payment in dirams. Filters to listings
   *  with installment_available=true AND monthly_amount ≤ cap. Faridun
   *  thinks "I can pay 4 000 TJS/month" — that's the actual mental
   *  model for installment-decisive buyers. */
  maxMonthlyDirams?: bigint | null;
  buildingId?: string;
  /** Lat/lng + radius from LocationSearch. Resolved at the service
   *  by pre-filtering buildings, then scoping listings to those ids. */
  nearLat?: number | null;
  nearLng?: number | null;
  nearRadiusM?: number | null;
  /** Result ordering. Default 'recommended' = the existing trust-tier
   *  cascade. 'cheapest' / 'expensive' sort by price_total_dirams.
   *  'newest' sorts by published_at desc. */
  sort?: 'recommended' | 'cheapest' | 'expensive' | 'newest';
};

const TIER_RANK: Record<string, number> = {
  listing_verified: 0,
  profile_verified: 1,
  phone_verified: 2,
};

export async function listListings(filters: ListingFilters = {}): Promise<MockListing[]> {
  const supabase = await createClient();
  // V1.1 update: city filter now respects standalone listings (those
  // with `building_id IS NULL`). We resolve the city after the fetch
  // by inspecting either the parent building's city OR — for standalones
  // — the listing's own district's city. INNER JOIN no longer fits;
  // we LEFT JOIN both in the same select and filter in code.
  //
  // The PostgREST `!left` hint forces a LEFT JOIN even when the FK is
  // present on the listing. Result: standalone rows come back with
  // `buildings: null`, ЖК rows come back with `buildings: { city }`.
  let q = supabase
    .from('listings')
    .select(
      `*, buildings:buildings!left(city), district:districts!left(city), cover_photo:photos!listings_cover_photo_fk(storage_path)`,
    )
    .eq('status', 'active');
  if (filters.rooms?.length) q = q.in('rooms_count', filters.rooms);
  if (filters.source?.length) q = q.in('source_type', filters.source);
  if (filters.finishing?.length) q = q.in('finishing_type', filters.finishing);
  if (filters.priceFrom) q = q.gte('price_total_dirams', Number(filters.priceFrom));
  if (filters.priceTo) q = q.lte('price_total_dirams', Number(filters.priceTo));
  if (filters.sizeFrom != null) q = q.gte('size_m2', filters.sizeFrom);
  if (filters.sizeTo != null) q = q.lte('size_m2', filters.sizeTo);
  if (filters.maxMonthlyDirams != null) {
    q = q
      .eq('installment_available', true)
      .lte('installment_monthly_amount_dirams', Number(filters.maxMonthlyDirams));
  }
  if (filters.buildingId) q = q.eq('building_id', filters.buildingId);

  // Radius filter: pre-resolve which listings are within the radius.
  // For ЖК listings the coords come from the parent building; for
  // standalones they come from the listing itself. Two batched
  // pre-queries keep this off the main query path.
  if (filters.nearLat != null && filters.nearLng != null && filters.nearRadiusM != null) {
    const lat = filters.nearLat;
    const lng = filters.nearLng;
    const r = filters.nearRadiusM;
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const inRadius = (blat: number, blng: number) => {
      const dLat = toRad(blat - lat);
      const dLng = toRad(blng - lng);
      const aa =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(blat)) * Math.sin(dLng / 2) ** 2;
      const distM = 2 * R * Math.asin(Math.sqrt(aa));
      return distM <= r;
    };
    const [{ data: buildingsForRadius }, { data: standaloneListings }] =
      await Promise.all([
        supabase
          .from('buildings')
          .select('id, latitude, longitude')
          .eq('city', ACTIVE_CITY),
        supabase
          .from('listings')
          .select('id, latitude, longitude')
          .is('building_id', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null),
      ]);
    const buildingIdsInRadius = (buildingsForRadius ?? [])
      .filter((b) => inRadius(Number(b.latitude), Number(b.longitude)))
      .map((b) => b.id as string);
    const standaloneIdsInRadius = (standaloneListings ?? [])
      .filter((l) => inRadius(Number(l.latitude), Number(l.longitude)))
      .map((l) => l.id as string);
    // PostgREST `or` filter: listings.building_id IN (...) OR
    // listings.id IN (standalone_ids). Both arms can be empty —
    // empty in() degrades to "no rows" so we have to short-circuit.
    if (buildingIdsInRadius.length === 0 && standaloneIdsInRadius.length === 0) {
      return [];
    }
    const orParts: string[] = [];
    if (buildingIdsInRadius.length > 0) {
      orParts.push(`building_id.in.(${buildingIdsInRadius.join(',')})`);
    }
    if (standaloneIdsInRadius.length > 0) {
      orParts.push(`id.in.(${standaloneIdsInRadius.join(',')})`);
    }
    q = q.or(orParts.join(','));
  }

  const { data, error } = await q;
  if (error) throw error;

  // City filter applied in code so standalone listings can be kept
  // (their city comes from the joined district, not the missing
  // building). Drop rows that don't resolve to ACTIVE_CITY from
  // either source.
  const filtered = (data ?? []).filter((row: Record<string, unknown>) => {
    const buildingCity = (row.buildings as { city?: string } | null)?.city;
    const districtCity = (row.district as { city?: string } | null)?.city;
    return (buildingCity ?? districtCity) === ACTIVE_CITY;
  });
  const listings = filtered.map(mapListing);

  // Effective trust tier needs the developer's verified status — only
  // for listings inside a ЖК. Standalone listings inherit their own
  // verification_tier (no developer to vouch for them).
  const buildingIds = [
    ...new Set(listings.map((l) => l.building_id).filter((id): id is string => id != null)),
  ];
  let buildingToDevId = new Map<string, string>();
  let verifiedDevs = new Set<string>();
  if (buildingIds.length > 0) {
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, developer_id')
      .in('id', buildingIds);
    const developerIds = [...new Set((buildings ?? []).map((b) => b.developer_id))];
    const { data: developers } = await supabase
      .from('developers')
      .select('id, status, verified_at')
      .in('id', developerIds);
    buildingToDevId = new Map(
      (buildings ?? []).map((b) => [b.id, b.developer_id as string]),
    );
    verifiedDevs = new Set(
      (developers ?? [])
        .filter((d) => d.status === 'active' && d.verified_at != null)
        .map((d) => d.id),
    );
  }

  // Sort:
  //   - 'cheapest' / 'expensive' → strict price order (no trust tier)
  //   - 'newest' → published_at descending
  //   - default 'recommended' → trust tier first, then newest
  const sortMode = filters.sort ?? 'recommended';
  let sorted: MockListing[];
  if (sortMode === 'cheapest') {
    sorted = [...listings].sort((a, b) =>
      a.price_total_dirams < b.price_total_dirams ? -1 : 1,
    );
  } else if (sortMode === 'expensive') {
    sorted = [...listings].sort((a, b) =>
      a.price_total_dirams > b.price_total_dirams ? -1 : 1,
    );
  } else if (sortMode === 'newest') {
    sorted = [...listings].sort((a, b) =>
      a.published_at < b.published_at ? 1 : -1,
    );
  } else {
    sorted = [...listings].sort((a, b) => {
      // Standalone listings (no building) can't claim developer
      // verification — fall back to their own verification_tier.
      const aDevVer =
        a.building_id != null &&
        a.source_type === 'developer' &&
        verifiedDevs.has(buildingToDevId.get(a.building_id) ?? '');
      const bDevVer =
        b.building_id != null &&
        b.source_type === 'developer' &&
        verifiedDevs.has(buildingToDevId.get(b.building_id) ?? '');
      const aRank = aDevVer ? -1 : (TIER_RANK[a.verification_tier] ?? 99);
      const bRank = bDevVer ? -1 : (TIER_RANK[b.verification_tier] ?? 99);
      if (aRank !== bRank) return aRank - bRank;
      return a.published_at < b.published_at ? 1 : -1;
    });
  }

  // One batch query for all photos so the in-card carousel works
  // without N+1. Done after sort so we only hydrate the survivors.
  await hydratePhotos('listing', sorted);
  return sorted;
}

export async function getListing(slug: string): Promise<{
  listing: MockListing;
  /** NULL when the listing is standalone (no parent ЖК). Detail
   *  page branches accordingly. */
  building: MockBuilding | null;
  /** NULL when standalone (no developer to vouch for). */
  developer: MockDeveloper | null;
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
    .select(LISTING_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!lRow) return null;
  const listing = mapListing(lRow);

  // Resolve parent ЖК if any. For standalone listings we skip the
  // building fetch and rely on listing-level fields. The district
  // FK is always set (one or the other per the
  // listings_standalone_or_in_building check constraint).
  let building: MockBuilding | null = null;
  let developer: MockDeveloper | null = null;
  let districtId: string;

  if (listing.building_id) {
    const { data: bRow, error: bErr } = await supabase
      .from('buildings')
      .select(BUILDING_SELECT)
      .eq('id', listing.building_id)
      .single();
    if (bErr) throw bErr;
    building = rowToBuilding(bRow as BuildingRowWithJoins);
    districtId = bRow.district_id as string;

    const { data: devRow } = await supabase
      .from('developers')
      .select('*')
      .eq('id', bRow.developer_id)
      .single();
    if (devRow) {
      developer = {
        id: devRow.id,
        name: devRow.name,
        display_name: devRow.display_name,
        is_verified: devRow.status === 'active' && devRow.verified_at != null,
        verified_at: devRow.verified_at,
        has_female_agent: devRow.has_female_agent,
        years_active: devRow.years_active,
        projects_completed_count: devRow.projects_completed_count,
      };
    }
  } else {
    if (!listing.district_id) {
      // Should be unreachable per the check constraint, but if a
      // future migration relaxes it, fail loudly so the bug is
      // visible rather than silently 404-ing.
      throw new Error(
        `Standalone listing ${listing.id} has no district — db constraint violated`,
      );
    }
    districtId = listing.district_id;
  }

  // Sibling listings + seller phone fetched in parallel. Sibling
  // listings only meaningful for ЖК listings (apartments in same
  // building). Standalone has no siblings — empty array.
  const [distRes, similarRes, sellerRes] = await Promise.all([
    supabase.from('districts').select('*').eq('id', districtId).single(),
    listing.building_id
      ? supabase
          .from('listings')
          .select(LISTING_SELECT)
          .eq('building_id', listing.building_id)
          .eq('status', 'active')
          .neq('id', listing.id)
          .limit(3)
      : Promise.resolve({ data: null }),
    supabase.from('users').select('phone').eq('id', lRow.seller_user_id).maybeSingle(),
  ]);

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
  // Hydrate photos so similar-listing cards on /kvartira detail also
  // show the swipeable carousel.
  await hydratePhotos('listing', similar);
  // Seller phone — when the user row is missing (transferred listings,
  // deleted users, mock data), fall back to the founder's number from
  // founder-contacts.ts. The buyer reaches the founder, who then
  // routes the conversation to the actual seller. We LOG when this
  // fires so production data drift is visible — silently routing every
  // contact attempt to the founder hides the underlying broken FK.
  const sellerPhone = sellerRes.data?.phone ?? FOUNDER_CONTACTS.phone;
  if (!sellerRes.data?.phone) {
    console.warn(
      `[getListing] listing ${listing.slug} (${listing.id}) has no seller phone — falling back to founder. seller_user_id=${lRow.seller_user_id}`,
    );
  }

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
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).in('id', ids);
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

// ─── Listing creation (V1 founder + moderation flow) ────────

export interface CreateListingInput {
  /** Set when the listing belongs to a known ЖК. Mutually exclusive
   *  with `standalone`. */
  buildingId?: string;
  /** Set when the listing is standalone (no parent ЖК). Carries
   *  address + district + structural facts that would otherwise live
   *  on the parent building. Migration 0019. */
  standalone?: {
    streetAddress: string;
    districtId: string;
    latitude?: number;
    longitude?: number;
    totalFloors?: number;
    hasElevator?: boolean;
    yearBuilt?: number;
  };
  /** UUID of the user creating the listing — set seller_user_id. */
  sellerUserId: string;
  /** Drives the source_type column. Founder posting on behalf of a
   *  developer → 'developer'; phone-verified user → 'owner' default. */
  sourceType: SourceType;
  roomsCount: number;
  /** Square meters, allows decimals (e.g. 45.5). */
  sizeM2: number;
  floorNumber: number;
  /** Total floors of the parent building — optional, populated from
   *  building when not specified. */
  totalFloors?: number;
  /** Total price in dirams (1 TJS = 100 dirams). */
  priceTotalDirams: bigint;
  finishingType: FinishingType;
  /**
   * Russian RE convention: true = раздельный (toilet separate from
   * bath), false = совмещённый (combined). Most Tajik apartments
   * have a single bathroom; capturing the type alone is enough.
   * Undefined = seller didn't specify.
   */
  bathroomSeparate?: boolean;
  /**
   * Tech-passport (техпаспорт) presence. True/false/undefined map
   * to есть/нет/не указано — column is nullable (migration 0018).
   */
  hasTechnicalPassport?: boolean;
  /** Russian description. */
  description?: string;
  installment?: {
    monthlyDirams: bigint;
    firstPaymentPercent: number;
    termMonths: number;
  };
  /**
   * Determines the listing's initial status:
   * - 'active'         → visible immediately (founder flow)
   * - 'pending_review' → hidden until founder approves (public flow)
   */
  initialStatus: 'active' | 'pending_review';
}

/**
 * Creates a listing and returns its slug + id.
 *
 * Slug is built from the parent building's slug + apartment specs so
 * it's both human-readable in URLs and unlikely to collide. On collision
 * we suffix with a 4-char random string and retry.
 *
 * Uses admin client so RLS doesn't block (cookie-session auth doesn't
 * set auth.uid()).
 */
export async function createListing(
  input: CreateListingInput,
): Promise<{ id: string; slug: string }> {
  const supabase = createAdminClient();

  if (!input.buildingId && !input.standalone) {
    throw new Error('createListing requires either buildingId or standalone');
  }

  // Slug derivation differs by mode:
  //   in-ЖК:      <building.slug>-<rooms>k-<floor>f-<sizeM2>m2
  //   standalone: vahdat-<rooms>k-<floor>f-<sizeM2>m2-<rand>
  // Building lookup only happens for in-ЖК mode (saves a round-trip
  // for standalone listings; we have everything we need on the input).
  let buildingSlug: string | null = null;
  let buildingDefaultFloors: number | null = null;
  if (input.buildingId) {
    const { data: building, error: bErr } = await supabase
      .from('buildings')
      .select('slug, total_floors')
      .eq('id', input.buildingId)
      .single();
    if (bErr || !building) {
      throw bErr ?? new Error(`Building ${input.buildingId} not found`);
    }
    buildingSlug = building.slug as string;
    buildingDefaultFloors = building.total_floors as number;
  }

  const baseSlug = buildingSlug
    ? `${buildingSlug}-${input.roomsCount}k-${input.floorNumber}f-${Math.round(input.sizeM2)}m2`
    : `vahdat-${input.roomsCount}k-${input.floorNumber}f-${Math.round(input.sizeM2)}m2`;
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from('listings')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  const installmentEnabled = input.installment != null;

  const { data, error } = await supabase
    .from('listings')
    .insert({
      slug,
      // building_id is null for standalone listings; the standalone
      // fields below carry the equivalent location information.
      building_id: input.buildingId ?? null,
      seller_user_id: input.sellerUserId,
      source_type: input.sourceType,
      status: input.initialStatus,
      rooms_count: input.roomsCount,
      size_m2: input.sizeM2,
      floor_number: input.floorNumber,
      total_floors:
        input.totalFloors ?? buildingDefaultFloors ?? input.standalone?.totalFloors ?? null,
      price_total_dirams: input.priceTotalDirams.toString(),
      // price_per_m2_dirams is generated-always-as in the schema, so
      // we never set it explicitly.
      finishing_type: input.finishingType,
      installment_available: installmentEnabled,
      installment_monthly_amount_dirams: installmentEnabled
        ? input.installment!.monthlyDirams.toString()
        : null,
      installment_first_payment_percent: installmentEnabled
        ? input.installment!.firstPaymentPercent
        : null,
      installment_term_months: installmentEnabled ? input.installment!.termMonths : null,
      bathroom_separate: input.bathroomSeparate ?? null,
      has_technical_passport: input.hasTechnicalPassport ?? null,
      // Standalone-listing columns (migration 0019). NULL for in-ЖК
      // listings — those fields live on the parent building. Setting
      // them only when input.standalone is provided keeps the
      // listings_standalone_or_in_building check happy.
      street_address: input.standalone?.streetAddress ?? null,
      district_id: input.standalone?.districtId ?? null,
      latitude: input.standalone?.latitude ?? null,
      longitude: input.standalone?.longitude ?? null,
      has_elevator: input.standalone?.hasElevator ?? null,
      year_built: input.standalone?.yearBuilt ?? null,
      unit_description: input.description
        ? { ru: input.description, tg: input.description }
        : null,
      // verification_tier defaults to phone_verified per schema.
      // published_at set when status moves to 'active' (now or after
      // moderation approval).
      published_at: input.initialStatus === 'active' ? new Date().toISOString() : null,
    })
    .select('id, slug')
    .single();

  if (error || !data) throw error ?? new Error('Failed to create listing');
  return { id: data.id as string, slug: data.slug as string };
}

// ─── Listing lifecycle (V1) ──────────────────────────────────

/**
 * Returns true if the user owns this listing (created it). Used by
 * the lifecycle endpoints to gate actions: only the owner (or a
 * founder) can edit / hide / mark sold / delete.
 */
export async function listingOwnedBy(listingId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('listings')
    .select('seller_user_id')
    .eq('id', listingId)
    .maybeSingle();
  return data?.seller_user_id === userId;
}

/**
 * Sets a listing's status. Used for hide / show / mark-sold actions.
 *
 * Allowed transitions (V1):
 *   active        → hidden | sold
 *   hidden        → active
 *   pending_review → cannot change here (use moderation endpoint)
 *   sold | rejected → active (republish)
 *
 * Caller is responsible for permission checks (founder OR listing owner).
 */
export type ListingLifecycleStatus = 'active' | 'hidden' | 'sold';

export async function setListingStatus(
  listingId: string,
  newStatus: ListingLifecycleStatus,
): Promise<void> {
  const supabase = createAdminClient();
  // When activating, refresh published_at so the listing shows up at
  // the top of newest-first sorts again. When hiding / marking sold,
  // we leave published_at alone — that's the original publish moment.
  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'active') {
    patch.published_at = new Date().toISOString();
  }
  const { error } = await supabase.from('listings').update(patch).eq('id', listingId);
  if (error) throw error;
}

/**
 * Soft-delete: sets `deleted_at`. Listings filtered by
 * `is('deleted_at', null)` everywhere we read so this hides them
 * without losing the row (referential integrity for any orphan
 * contact_requests / saves).
 */
export async function softDeleteListing(listingId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', listingId);
  if (error) throw error;
}

/**
 * Patch fields on an existing listing. Returns whether the change
 * triggered re-moderation — the caller surfaces a different toast
 * for "edited & live" vs "sent back for review".
 *
 * Re-moderation policy (only for non-founders editing previously-
 * approved listings):
 *   - Price drop ≥ 10% → re-moderate
 *   - Rooms count change → re-moderate
 *   - Size change > 5 m² → re-moderate
 *   - Building change → re-moderate
 *   - Description / installment / bathroom / finishing → instant
 *
 * Founders' edits never re-moderate.
 */
export interface UpdateListingInput {
  roomsCount?: number;
  sizeM2?: number;
  floorNumber?: number;
  priceTotalDirams?: bigint;
  finishingType?: FinishingType;
  bathroomSeparate?: boolean | null;
  hasTechnicalPassport?: boolean | null;
  description?: string | null;
  installment?: {
    monthlyDirams: bigint;
    firstPaymentPercent: number;
    termMonths: number;
  } | null;
}

export async function updateListing(
  listingId: string,
  input: UpdateListingInput,
  options: { editorIsFounder: boolean },
): Promise<{ reModerated: boolean }> {
  const supabase = createAdminClient();

  // Read the existing row so we can detect significant changes.
  const { data: existing, error: readErr } = await supabase
    .from('listings')
    .select(
      'rooms_count, size_m2, price_total_dirams, building_id, status',
    )
    .eq('id', listingId)
    .single();
  if (readErr || !existing) throw readErr ?? new Error('Listing not found');

  const wasActive = existing.status === 'active';
  let reModerate = false;

  if (!options.editorIsFounder && wasActive) {
    if (
      input.roomsCount != null &&
      input.roomsCount !== (existing.rooms_count as number)
    ) {
      reModerate = true;
    }
    if (
      input.sizeM2 != null &&
      Math.abs(input.sizeM2 - Number(existing.size_m2)) > 5
    ) {
      reModerate = true;
    }
    if (input.priceTotalDirams != null) {
      const oldPrice = Number(existing.price_total_dirams);
      const newPrice = Number(input.priceTotalDirams);
      if (oldPrice > 0 && (oldPrice - newPrice) / oldPrice >= 0.1) {
        // Price dropped ≥ 10% — typical anti-fraud trigger; cheap
        // listings get extra attention to spot bait-and-switch.
        reModerate = true;
      }
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.roomsCount != null) patch.rooms_count = input.roomsCount;
  if (input.sizeM2 != null) patch.size_m2 = input.sizeM2;
  if (input.floorNumber != null) patch.floor_number = input.floorNumber;
  if (input.priceTotalDirams != null) {
    patch.price_total_dirams = input.priceTotalDirams.toString();
  }
  if (input.finishingType != null) patch.finishing_type = input.finishingType;
  if (input.bathroomSeparate !== undefined) {
    patch.bathroom_separate = input.bathroomSeparate;
  }
  if (input.hasTechnicalPassport !== undefined) {
    patch.has_technical_passport = input.hasTechnicalPassport;
  }
  if (input.description !== undefined) {
    patch.unit_description = input.description
      ? { ru: input.description, tg: input.description }
      : null;
  }
  if (input.installment !== undefined) {
    if (input.installment === null) {
      patch.installment_available = false;
      patch.installment_monthly_amount_dirams = null;
      patch.installment_first_payment_percent = null;
      patch.installment_term_months = null;
    } else {
      patch.installment_available = true;
      patch.installment_monthly_amount_dirams = input.installment.monthlyDirams.toString();
      patch.installment_first_payment_percent = input.installment.firstPaymentPercent;
      patch.installment_term_months = input.installment.termMonths;
    }
  }
  if (reModerate) patch.status = 'pending_review';

  const { error: updateErr } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', listingId);
  if (updateErr) throw updateErr;

  // Fire a price-history event whenever the price changed by ANY
  // amount. This powers the "Цена снижена на 200 000 TJS · 8 апреля"
  // line on /kvartira detail (Cian-style transparency, our biggest
  // missing trust signal). We only persist the price-change delta —
  // other field changes don't get a history line in V1.
  if (input.priceTotalDirams != null) {
    const oldPrice = Number(existing.price_total_dirams);
    const newPrice = Number(input.priceTotalDirams);
    if (oldPrice !== newPrice) {
      const deltaPct = oldPrice > 0 ? Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10 : 0;
      // Fire-and-forget: a missed price-history event is not worth
      // failing the update. Errors are logged for visibility.
      void supabase
        .from('events')
        .insert({
          event_type: 'listing_price_changed',
          anon_id: 'system',
          properties: {
            listing_id: listingId,
            from_dirams: String(oldPrice),
            to_dirams: String(newPrice),
            delta_pct: deltaPct,
            editor: options.editorIsFounder ? 'founder' : 'owner',
          },
        })
        .then(({ error }) => {
          if (error) console.error('listing_price_changed event failed:', error);
        });
    }
  }

  return { reModerated: reModerate };
}
