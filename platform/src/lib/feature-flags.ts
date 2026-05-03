/**
 * V1 feature toggles. Centralised so we can flip features on or off
 * without hunting through component imports.
 */
export const FEATURES = {
  /**
   * Compare feature (CompareToggle on cards, floating CompareBar,
   * dynamic 'Сравнение (N)' mobile nav slot, /sravnenie page).
   *
   * Hidden in V1 because inventory is too small to make compare
   * useful: with ~6 buildings + ~60 listings, buyers can scan the
   * whole catalogue in seconds without needing side-by-side
   * comparison. The icon on every card, the floating bar, and the
   * extra mobile nav slot add visual weight for marginal value.
   *
   * Re-enable threshold: ~20+ active buildings. At that point catalog
   * browsing stops being mental-cache-friendly and side-by-side
   * becomes genuinely useful. Flip to true and everything wires back
   * up — the underlying code (compare-store, /sravnenie page,
   * ShareButton, /api/compare/preview) all stay in place under the
   * flag.
   */
  compare: false,
} as const;
