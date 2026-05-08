/**
 * Helpers that resolve "where is this listing?" for the two cases:
 *
 *   - In a ЖК (building set): inherit district / coords / address
 *     from the parent building. Existing listings work this way.
 *   - Standalone (building null): read directly from listing's own
 *     columns (added in migration 0019).
 *
 * Display code, filter predicates, map render, and analytics should
 * route every "where" question through these helpers so adding
 * a future location source (e.g. user-supplied GPS) is a one-file
 * change rather than a grep-the-codebase change.
 */
import type { MockBuilding, MockListing } from '@/lib/mock';

/** Returns the listing's effective district id. Null only when both
 *  building and listing.district_id are unset — should not happen at
 *  rest because of the listings_standalone_or_in_building check
 *  constraint, but the type is `string | null` for safety. */
export function getEffectiveDistrictId(
  listing: Pick<MockListing, 'building_id' | 'district_id'>,
  building: Pick<MockBuilding, 'district_id'> | null | undefined,
): string | null {
  if (listing.building_id && building) {
    return building.district_id;
  }
  return listing.district_id;
}

/** Returns the listing's lat/lng for map rendering and radius
 *  filters. Null when neither building nor listing has coords (a
 *  standalone seller skipped the pin step). */
export function getEffectiveCoords(
  listing: Pick<MockListing, 'building_id' | 'latitude' | 'longitude'>,
  building: Pick<MockBuilding, 'latitude' | 'longitude'> | null | undefined,
): { latitude: number; longitude: number } | null {
  if (listing.building_id && building) {
    if (building.latitude == null || building.longitude == null) return null;
    return {
      latitude: Number(building.latitude),
      longitude: Number(building.longitude),
    };
  }
  if (listing.latitude == null || listing.longitude == null) return null;
  return {
    latitude: Number(listing.latitude),
    longitude: Number(listing.longitude),
  };
}

/** Returns a human-readable address line for cards / detail hero.
 *  When in a ЖК: building's `address.ru`. When standalone: listing's
 *  `street_address`. Empty string when neither has one filled. */
export function getEffectiveAddress(
  listing: Pick<MockListing, 'building_id' | 'street_address'>,
  building: { address?: { ru?: string } | null } | null | undefined,
): string {
  if (listing.building_id && building?.address?.ru) {
    return building.address.ru;
  }
  return listing.street_address ?? '';
}

/** Convenience: true when the listing belongs to a ЖК (display code
 *  branches on this name everywhere). */
export function isInBuilding(
  listing: Pick<MockListing, 'building_id'>,
  building: { id?: string } | null | undefined,
): building is { id: string } {
  return listing.building_id != null && building != null;
}
