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
}

export interface ListingForBuildingFilter {
  price_per_m2_dirams: bigint | string | number;
  building: BuildingForFilter | null;
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

  const perM2From = filters.price_per_m2_from ? parseInt(filters.price_per_m2_from as string, 10) : null;
  const perM2To = filters.price_per_m2_to ? parseInt(filters.price_per_m2_to as string, 10) : null;
  const perM2Dirams = BigInt(listing.price_per_m2_dirams as string | number);
  if (perM2From != null && perM2Dirams < BigInt(perM2From * 100)) return false;
  if (perM2To != null && perM2Dirams > BigInt(perM2To * 100)) return false;

  return true;
}
