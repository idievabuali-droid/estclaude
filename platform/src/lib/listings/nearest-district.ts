/**
 * Helper used by /post: when the seller drops a pin OR picks an
 * autocomplete suggestion, we infer which district the listing is in
 * by finding the closest district centroid. The seller still sees the
 * resolved district as a dropdown they can override — auto-pick is
 * optimistic, override is the safety net.
 *
 * Why centroid-based and not polygon-membership: Vahdat's districts
 * are small (~5 of them) and our `districts` table only stores a
 * centroid pair (no polygon column). For our data shape this is
 * accurate enough — the closest centroid is almost always the right
 * district except for buildings literally on a boundary.
 */

interface DistrictWithCentroid {
  id: string;
  center_lat: number;
  center_lng: number;
}

/** Vahdat town-centre fallback applied by post/page.tsx when a district
 *  row has NULL centroid columns. Districts whose centroid matches this
 *  fallback are skipped by the auto-derive — otherwise EVERY pin would
 *  haversine to identical (fallback) coords and "the closest" would
 *  always be the first district in the list (Центр), regardless of
 *  where the seller actually dropped the pin. Better to no-op than to
 *  silently misroute the listing. */
const VAHDAT_CENTER_FALLBACK = { lat: 38.5511, lng: 69.0214 };
const FALLBACK_EPSILON = 1e-4; // ~11 m — tight enough that a real centroid won't collide.

function isFallbackCentroid(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - VAHDAT_CENTER_FALLBACK.lat) < FALLBACK_EPSILON &&
    Math.abs(lng - VAHDAT_CENTER_FALLBACK.lng) < FALLBACK_EPSILON
  );
}

/**
 * Returns the id of the district whose centroid is closest to
 * (lat, lng). Null when no district has a real (non-fallback) centroid
 * to compare against — the seller's existing district choice wins.
 *
 * Haversine math — small inline copy so this module is dependency-
 * free and cheap to import server-side.
 */
export function nearestDistrictId(
  lat: number,
  lng: number,
  districts: ReadonlyArray<DistrictWithCentroid>,
): string | null {
  if (districts.length === 0) return null;
  // Filter out districts that are using the Vahdat-fallback centroid —
  // their lat/lng is not informative.
  const real = districts.filter((d) => !isFallbackCentroid(d.center_lat, d.center_lng));
  if (real.length === 0) return null;

  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const d of real) {
    const dLat = toRad(d.center_lat - lat);
    const dLng = toRad(d.center_lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(d.center_lat)) * Math.sin(dLng / 2) ** 2;
    const distM = 2 * R * Math.asin(Math.sqrt(a));
    if (distM < bestDist) {
      bestDist = distM;
      bestId = d.id;
    }
  }
  return bestId;
}
