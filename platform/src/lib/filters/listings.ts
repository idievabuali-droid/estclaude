/**
 * Pure predicate: does a single listing row satisfy the
 * /kvartiry filter set?
 *
 * Lives here (not inside services or matcher) because TWO callers
 * need exactly the same logic:
 *
 *   1. `services/listings.ts` `listListings` does the bulk SQL query
 *      (efficient at row volume); the SQL filters MUST agree with
 *      this function or saved-search alerts will silently miss
 *      matches the buyer expects.
 *
 *   2. `lib/saved-searches/match.ts` `matchesSearch` runs this
 *      predicate against a single freshly-published listing to
 *      decide whether to notify any subscribed search.
 *
 * Drift hazard: when adding a new filter to `listListings`, also add
 * the corresponding check here OR the alerts pipeline will go quiet
 * for the new filter. Tests in `lib/filters/listings.test.ts` (TBD)
 * should cover both paths via shared fixtures.
 */

export interface ListingForFilter {
  status: string;
  rooms_count: number;
  size_m2: number;
  price_total_dirams: bigint | string | number;
  finishing_type: string;
  source_type: string;
  building?: { slug: string } | null;
}

export type ListingFilters = Record<string, string | string[] | undefined>;

function csvList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(',').filter(Boolean);
}

export function matchesListingFilters(
  listing: ListingForFilter,
  filters: ListingFilters,
): boolean {
  if (listing.status !== 'active') return false;

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

  return true;
}
