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
  building?: {
    slug: string;
    /** Required for the LocationSearch radius filter (near_lat/near_lng).
     *  The matcher passes them through from the parent building row. */
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

/** Haversine distance in metres — duplicated from the service-layer
 *  helper because this module is intentionally dependency-free. */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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

  // LocationSearch radius filter — when the saved search was created
  // with a POI selected, only listings whose parent building falls
  // within the radius pass. Defaults to 1500m when radius is missing
  // (matches the page-side default in /novostroyki + /kvartiry).
  const nearLat = filters.near_lat ? parseFloat(filters.near_lat as string) : null;
  const nearLng = filters.near_lng ? parseFloat(filters.near_lng as string) : null;
  if (nearLat != null && nearLng != null) {
    const radius = filters.radius ? parseInt(filters.radius as string, 10) : 1500;
    const blat = listing.building?.latitude;
    const blng = listing.building?.longitude;
    if (blat == null || blng == null) return false;
    if (distanceMeters(nearLat, nearLng, Number(blat), Number(blng)) > radius) return false;
  }

  return true;
}
