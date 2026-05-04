/**
 * Listing-level aggregates surfaced on /kvartira detail. Both queries
 * read the `events` table — same source the founder dashboard uses, so
 * the numbers stay consistent across the operator and buyer surfaces.
 *
 * Volume sanity: at V1 scale (<10k events) these full-table scans are
 * fine. If event volume grows past ~100k we'll add a small materialised
 * count table or a partial index on `properties->>listing_id`.
 *
 * Trust signals at the buyer level (per Cian / Avito convention):
 *   - View count gives a "yes other people are looking too" social proof
 *   - Price history gives the "this isn't a bait-and-switch" transparency
 */
import { createAdminClient } from '@/lib/supabase/admin';

export interface PriceHistoryEntry {
  /** ISO timestamp the price was changed. */
  changedAt: string;
  fromDirams: bigint;
  toDirams: bigint;
  /** Signed percent change (negative = price drop). One decimal place. */
  deltaPct: number;
}

export interface ListingStats {
  /** Total page_view events for this listing's detail URL. */
  viewsTotal: number;
  /** page_view events fired today (UTC). Cheap "still active" signal. */
  viewsToday: number;
  /** Most recent price-change first. Empty when the price has never changed. */
  priceHistory: PriceHistoryEntry[];
}

export async function getListingStats(
  listingId: string,
  listingSlug: string,
): Promise<ListingStats> {
  const supabase = createAdminClient();

  // Page views — match by URL pathname so we count both /ru and /tg
  // visits in one bucket. The detail URL is unique to the slug so
  // there's no cross-listing collision risk.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const slugSuffix = `/kvartira/${listingSlug}`;
  // PostgREST: filter on JSONB scalar with `like`. Using ILIKE pattern
  // because pathname is stored as the full /<locale>/kvartira/<slug>.
  const [
    { count: viewsTotal },
    { count: viewsToday },
    { data: priceEvents, error: priceErr },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'page_view')
      .ilike('properties->>pathname', `%${slugSuffix}`),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'page_view')
      .ilike('properties->>pathname', `%${slugSuffix}`)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('events')
      .select('created_at, properties')
      .eq('event_type', 'listing_price_changed')
      .eq('properties->>listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (priceErr) console.error('getListingStats priceEvents:', priceErr);

  const priceHistory: PriceHistoryEntry[] = (priceEvents ?? [])
    .map((row) => {
      const props = row.properties as {
        from_dirams?: string;
        to_dirams?: string;
        delta_pct?: number;
      };
      if (!props.from_dirams || !props.to_dirams) return null;
      try {
        return {
          changedAt: row.created_at as string,
          fromDirams: BigInt(props.from_dirams),
          toDirams: BigInt(props.to_dirams),
          deltaPct: typeof props.delta_pct === 'number' ? props.delta_pct : 0,
        };
      } catch {
        // Malformed event row — skip, don't fail the whole detail page.
        return null;
      }
    })
    .filter((x): x is PriceHistoryEntry => x !== null);

  return {
    viewsTotal: viewsTotal ?? 0,
    viewsToday: viewsToday ?? 0,
    priceHistory,
  };
}
