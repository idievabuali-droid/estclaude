/**
 * Filter-URL utilities for /novostroyki.
 *
 * The page is server-rendered and reads filters from `searchParams`.
 * Every filter chip is a Link whose href is computed by toggling the
 * relevant value in/out of the comma-separated query parameter — so
 * tapping "Гулистон" while "Центр" is already selected sends the user
 * to ?district=center,gulistan rather than replacing.
 *
 * Pure functions, no React — both server and client safe.
 */

export type FilterParams = {
  district?: string;
  status?: string;
  price_per_m2_from?: string;
  price_per_m2_to?: string;
  handover?: string;
  amenities?: string;
  /** Nearby POI categories — comma-separated, e.g. "school,supermarket". */
  nearby?: string;
  view?: string;
  /** Focus mode — when set with view=karta, the map renders only this
   *  one building's pin plus its nearby POI markers. Set by the "На
   *  карте" links on apartment / building / card pages so buyers
   *  arriving from inside a listing don't see all 50 buildings. */
  focus?: string;
  /** Where the buyer came from when opening focus mode. Drives the
   *  "← Назад" link in the focus-mode header so we send them back to
   *  the surface they tapped from (apartment vs. building) rather
   *  than always to the building card.
   *
   *  Values: 'kvartira' (apartment detail or apartment card) — paired
   *  with fromSlug=<apartment-slug>. Anything else (or unset) →
   *  default back-link goes to the building itself. */
  from?: string;
  fromSlug?: string;
};

/** Read a CSV param as a Set for membership checks + toggling. */
export function csvSet(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(value.split(',').filter(Boolean));
}

/** Build a query string from a partial param object, dropping empties. */
export function buildQuery(params: Partial<FilterParams>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/**
 * Toggle a value in/out of one CSV param while preserving every other
 * filter the user has set. Returns a query string ready to drop into
 * an href.
 */
export function toggleHref(
  current: FilterParams,
  paramKey: keyof FilterParams,
  value: string,
): string {
  const set = csvSet(current[paramKey] as string | undefined);
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  const next: Partial<FilterParams> = { ...current };
  if (set.size === 0) {
    delete (next as Record<string, unknown>)[paramKey];
  } else {
    next[paramKey] = Array.from(set).join(',') as never;
  }
  return `/novostroyki${buildQuery(next)}`;
}

/**
 * Remove one value from a CSV param (used by active-filter pills with X).
 * If removing the last value, the param itself is dropped from the URL.
 */
export function removeHref(
  current: FilterParams,
  paramKey: keyof FilterParams,
  value: string,
): string {
  const set = csvSet(current[paramKey] as string | undefined);
  set.delete(value);
  const next: Partial<FilterParams> = { ...current };
  if (set.size === 0) {
    delete (next as Record<string, unknown>)[paramKey];
  } else {
    next[paramKey] = Array.from(set).join(',') as never;
  }
  return `/novostroyki${buildQuery(next)}`;
}

/** Drop a single param entirely (used for price range, view, etc.). */
export function clearParamHref(current: FilterParams, paramKey: keyof FilterParams): string {
  const next: Partial<FilterParams> = { ...current };
  delete (next as Record<string, unknown>)[paramKey];
  return `/novostroyki${buildQuery(next)}`;
}

/** Count active filters across all param types — used for the mobile
 *  badge on the "Фильтры" button. District is excluded because the V1
 *  Vahdat scope hides that filter UI (Vahdat is small enough that
 *  filtering by microdistrict narrows results too aggressively). */
export function countActive(current: FilterParams): number {
  return (
    csvSet(current.status).size +
    csvSet(current.handover).size +
    csvSet(current.amenities).size +
    csvSet(current.nearby).size +
    (current.price_per_m2_from || current.price_per_m2_to ? 1 : 0)
  );
}

/** True when any "advanced" filter is active — used by the page to
 *  auto-expand the advanced section so users can see what's filtering. */
export function hasAdvancedActive(current: FilterParams): boolean {
  return csvSet(current.amenities).size > 0 || csvSet(current.nearby).size > 0;
}
