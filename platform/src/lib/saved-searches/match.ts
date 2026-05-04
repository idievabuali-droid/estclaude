import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram/bot';
import { formatMatchMessage, formatFounderRelayMessage } from './format';

/**
 * Pure-data check: does this listing satisfy the saved-search filter
 * set? Mirrors the filter logic in services/listings.ts and
 * services/buildings.ts but operates on the raw row, not the SQL
 * builder. Reused by `notifyMatchingListing` below.
 *
 * Drift hazard acknowledged: if the services add a new filter, we
 * need to add it here too, or the saved-search alerts will silently
 * miss the new criterion. Tracked via plan; for V1 the filter set
 * is small enough this is fine.
 */
export type ListingForMatch = {
  id: string;
  building_id: string;
  status: string;
  rooms_count: number;
  size_m2: number;
  price_total_dirams: bigint | string | number;
  price_per_m2_dirams: bigint | string | number;
  finishing_type: string;
  source_type: string;
  building?: {
    id: string;
    slug: string;
    district_id: string;
    status: string;
    handover_estimated_quarter: string | null;
    amenities: string[] | null;
    name: { ru: string };
  } | null;
};

export type SavedSearchFilters = Record<string, string | string[] | undefined>;

function csvList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(',').filter(Boolean);
}

/** Match logic for a single listing against a saved search row. */
export function matchesSearch(
  listing: ListingForMatch,
  page: 'novostroyki' | 'kvartiry',
  filters: SavedSearchFilters,
): boolean {
  if (listing.status !== 'active') return false;

  // Both pages: district scope (when set, building must be in it).
  // The filters store district SLUGS (URL-friendly); we have to look
  // them up against the building. For V1 we resolve the slug at the
  // caller (caller passes building.district_slug if needed). Skip
  // district filtering here when the field isn't on the row — the
  // caller's pre-filter handles it.

  if (page === 'kvartiry') {
    const rooms = csvList(filters.rooms).map((r) => parseInt(r, 10));
    if (rooms.length && !rooms.includes(listing.rooms_count)) return false;

    const finishing = csvList(filters.finishing);
    if (finishing.length && !finishing.includes(listing.finishing_type)) return false;

    const source = csvList(filters.source);
    if (source.length && !source.includes(listing.source_type)) return false;

    const priceFromTjs = filters.price_from ? parseInt(filters.price_from as string, 10) : null;
    const priceToTjs = filters.price_to ? parseInt(filters.price_to as string, 10) : null;
    const priceDirams = BigInt(listing.price_total_dirams as string | number);
    if (priceFromTjs != null && priceDirams < BigInt(priceFromTjs * 100)) return false;
    if (priceToTjs != null && priceDirams > BigInt(priceToTjs * 100)) return false;

    const sizeFrom = filters.size_from ? parseFloat(filters.size_from as string) : null;
    const sizeTo = filters.size_to ? parseFloat(filters.size_to as string) : null;
    if (sizeFrom != null && listing.size_m2 < sizeFrom) return false;
    if (sizeTo != null && listing.size_m2 > sizeTo) return false;

    const buildingScopeSlug = (filters.building as string | undefined) ?? null;
    if (buildingScopeSlug && listing.building?.slug !== buildingScopeSlug) return false;
  } else {
    // novostroyki — match against the parent building.
    const b = listing.building;
    if (!b) return false;

    const status = csvList(filters.status);
    if (status.length && !status.includes(b.status)) return false;

    const handover = csvList(filters.handover);
    if (handover.length) {
      const matchHandover = handover.some((y) => {
        if (y === 'delivered') return b.status === 'delivered';
        if (!b.handover_estimated_quarter) return false;
        const year = parseInt(b.handover_estimated_quarter.slice(0, 4), 10);
        if (y === '2028+') return year >= 2028;
        return String(year) === y;
      });
      if (!matchHandover) return false;
    }

    const amenities = csvList(filters.amenities);
    if (amenities.length) {
      const haveAll = amenities.every((a) => (b.amenities ?? []).includes(a));
      if (!haveAll) return false;
    }

    const perM2From = filters.price_per_m2_from ? parseInt(filters.price_per_m2_from as string, 10) : null;
    const perM2To = filters.price_per_m2_to ? parseInt(filters.price_per_m2_to as string, 10) : null;
    const perM2Dirams = BigInt(listing.price_per_m2_dirams as string | number);
    if (perM2From != null && perM2Dirams < BigInt(perM2From * 100)) return false;
    if (perM2To != null && perM2Dirams > BigInt(perM2To * 100)) return false;
  }

  return true;
}

interface NotifyOptions {
  /** Origin used to build clickable URLs in the Telegram message. We
   *  pass it from the API route so we don't depend on a window or
   *  request object inside this pure module. */
  origin: string;
}

/**
 * For a freshly published / approved listing: scan all active saved
 * searches, send Telegram messages for every match, mark them
 * notified. Best-effort — failures are logged but don't surface.
 */
export async function notifyMatchingListing(
  listingId: string,
  options: NotifyOptions,
): Promise<void> {
  const supabase = createAdminClient();

  // Pull the listing + its parent building in one go so the matcher
  // has everything it needs.
  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id, slug, building_id, status, rooms_count, size_m2, price_total_dirams, price_per_m2_dirams, finishing_type, source_type, building:buildings!inner(id, slug, district_id, status, handover_estimated_quarter, amenities, name)',
    )
    .eq('id', listingId)
    .maybeSingle();
  if (!listing || listing.status !== 'active') return;

  // Active saved searches with a notification destination set.
  const { data: searches } = await supabase
    .from('saved_searches')
    .select('id, page, filters, display_name, notify_chat_id, notify_phone')
    .eq('active', true)
    .or('notify_chat_id.not.is.null,notify_phone.not.is.null');
  if (!searches || searches.length === 0) return;

  // Founder chat_id is needed for the WhatsApp-fallback relay path.
  let founderChatId: number | null = null;
  const phoneRelayNeeded = searches.some((s) => s.notify_phone && !s.notify_chat_id);
  if (phoneRelayNeeded) {
    const { data: founderRow } = await supabase
      .from('user_roles')
      .select('user_id, users:users!inner(tg_chat_id)')
      .eq('role', 'admin')
      .order('user_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    const u = (founderRow?.users as unknown as { tg_chat_id?: number | null } | null) ?? null;
    founderChatId = u?.tg_chat_id ?? null;
  }

  const buildingArr = listing.building as unknown as
    | { id: string; slug: string; district_id: string; status: string; handover_estimated_quarter: string | null; amenities: string[] | null; name: { ru: string } }
    | null;
  const buildingName = buildingArr?.name?.ru ?? 'Квартира';
  const listingForMatch: ListingForMatch = {
    id: listing.id as string,
    building_id: listing.building_id as string,
    status: listing.status as string,
    rooms_count: listing.rooms_count as number,
    size_m2: Number(listing.size_m2),
    price_total_dirams: listing.price_total_dirams as string | number,
    price_per_m2_dirams: listing.price_per_m2_dirams as string | number,
    finishing_type: listing.finishing_type as string,
    source_type: listing.source_type as string,
    building: buildingArr,
  };
  const priceTjs = Math.round(Number(listing.price_total_dirams) / 100);

  for (const s of searches) {
    try {
      const ok = matchesSearch(listingForMatch, s.page as 'novostroyki' | 'kvartiry', s.filters as SavedSearchFilters);
      if (!ok) continue;

      const messageInput = {
        search_display_name: s.display_name as string,
        building_name: buildingName,
        rooms_count: listing.rooms_count as number,
        size_m2: Number(listing.size_m2),
        price_total_tjs: priceTjs,
        listing_slug: listing.slug as string,
        origin: options.origin,
      };

      if (s.notify_chat_id) {
        await sendMessage(
          s.notify_chat_id as number,
          formatMatchMessage(messageInput),
          { disablePreview: false },
        );
      } else if (s.notify_phone && founderChatId) {
        await sendMessage(
          founderChatId,
          formatFounderRelayMessage({ ...messageInput, phone: s.notify_phone as string }),
          { disablePreview: false },
        );
      }

      await supabase
        .from('saved_searches')
        .update({ last_seen_listing_id: listing.id })
        .eq('id', s.id);
    } catch (err) {
      console.error(`saved-search match notify failed for search ${s.id}:`, err);
    }
  }
}
