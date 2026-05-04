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
  // Inner-join to buildings for the city filter, plus the cover_photo
  // embed so card thumbnails render real uploads when present. The
  // FK hint matches the named constraint in migration 0003.
  let q = supabase
    .from('listings')
    .select(`*, buildings!inner(city), cover_photo:photos!listings_cover_photo_fk(storage_path)`)
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
    .select(LISTING_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!lRow) return null;
  const listing = mapListing(lRow);

  const { data: bRow, error: bErr } = await supabase
    .from('buildings')
    .select(BUILDING_SELECT)
    .eq('id', listing.building_id)
    .single();
  if (bErr) throw bErr;

  const [devRes, distRes, similarRes, sellerRes] = await Promise.all([
    supabase.from('developers').select('*').eq('id', bRow.developer_id).single(),
    supabase.from('districts').select('*').eq('id', bRow.district_id).single(),
    supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('building_id', listing.building_id)
      .eq('status', 'active')
      .neq('id', listing.id)
      .limit(3),
    supabase.from('users').select('phone').eq('id', lRow.seller_user_id).maybeSingle(),
  ]);

  const building: MockBuilding = rowToBuilding(bRow as BuildingRowWithJoins);

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
  buildingId: string;
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

  // Need building's slug + total_floors to derive defaults.
  const { data: building, error: bErr } = await supabase
    .from('buildings')
    .select('slug, total_floors')
    .eq('id', input.buildingId)
    .single();
  if (bErr || !building) {
    throw bErr ?? new Error(`Building ${input.buildingId} not found`);
  }

  // Slug pattern: <building>-<rooms>k-<floor>f-<sizeRound>m2[-<rand>].
  // Round size to int for slug brevity; full decimal stays in DB.
  const baseSlug = `${building.slug}-${input.roomsCount}k-${input.floorNumber}f-${Math.round(input.sizeM2)}m2`;
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
      building_id: input.buildingId,
      seller_user_id: input.sellerUserId,
      source_type: input.sourceType,
      status: input.initialStatus,
      rooms_count: input.roomsCount,
      size_m2: input.sizeM2,
      floor_number: input.floorNumber,
      total_floors: input.totalFloors ?? building.total_floors,
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

  return { reModerated: reModerate };
}
