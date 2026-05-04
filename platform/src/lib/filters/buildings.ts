/**
 * Pure predicate: does a single building row satisfy the
 * /novostroyki filter set?
 *
 * Same drift-hazard story as `listings.ts` in this folder — both the
 * SQL bulk query (`services/buildings.ts` `listBuildings`) and the
 * single-row matcher (`lib/saved-searches/match.ts`) need to agree.
 *
 * For matching against a freshly published LISTING (the
 * notifyMatchingListing flow), we look at the listing's PARENT
 * building — that's the unit a /novostroyki filter is judged against,
 * even though the trigger event was a listing publish.
 */

export interface BuildingForFilter {
  status: string;
  handover_estimated_quarter: string | null;
  amenities: string[] | null;
  /** Required by the LocationSearch radius filter (near_lat/near_lng). */
  latitude?: number | null;
  longitude?: number | null;
}

export interface ListingForBuildingFilter {
  price_per_m2_dirams: bigint | string | number;
  /** Total price in dirams — needed by the new total-price filter so a
   *  saved search like price_to=200000 matches against the unit total. */
  price_total_dirams: bigint | string | number;
  building: BuildingForFilter | null;
}

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

export type BuildingFilters = Record<string, string | string[] | undefined>;

function csvList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return v.split(',').filter(Boolean);
}

export function matchesBuildingFilters(
  listing: ListingForBuildingFilter,
  filters: BuildingFilters,
): boolean {
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

  // Total-price range — the chip on /novostroyki now uses this. The
  // unit's total price has to fit inside the saved range for the
  // listing to be a valid match for a "Цена" subscription.
  const priceFrom = filters.price_from ? parseInt(filters.price_from as string, 10) : null;
  const priceTo = filters.price_to ? parseInt(filters.price_to as string, 10) : null;
  const totalDirams = BigInt(listing.price_total_dirams as string | number);
  if (priceFrom != null && totalDirams < BigInt(priceFrom * 100)) return false;
  if (priceTo != null && totalDirams > BigInt(priceTo * 100)) return false;

  const perM2From = filters.price_per_m2_from ? parseInt(filters.price_per_m2_from as string, 10) : null;
  const perM2To = filters.price_per_m2_to ? parseInt(filters.price_per_m2_to as string, 10) : null;
  const perM2Dirams = BigInt(listing.price_per_m2_dirams as string | number);
  if (perM2From != null && perM2Dirams < BigInt(perM2From * 100)) return false;
  if (perM2To != null && perM2Dirams > BigInt(perM2To * 100)) return false;

  const nearLat = filters.near_lat ? parseFloat(filters.near_lat as string) : null;
  const nearLng = filters.near_lng ? parseFloat(filters.near_lng as string) : null;
  if (nearLat != null && nearLng != null) {
    const radius = filters.radius ? parseInt(filters.radius as string, 10) : 1500;
    if (b.latitude == null || b.longitude == null) return false;
    if (distanceMeters(nearLat, nearLng, Number(b.latitude), Number(b.longitude)) > radius) {
      return false;
    }
  }

  return true;
}
