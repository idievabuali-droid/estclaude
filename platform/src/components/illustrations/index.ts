/**
 * Custom monoline illustration system.
 *
 * Each illustration is an inline SVG React component using
 * stroke="currentColor" + fill="none", so callers control colour with
 * standard text-* utilities (e.g. text-terracotta-700 wraps the trust
 * block icons in the brand accent).
 *
 * Sizing convention — pass a Tailwind size utility on the parent:
 *   <span className="text-terracotta-700">
 *     <IllustrationBuilding className="size-10" />
 *   </span>
 *
 * Designed at viewBox 64x64. Stroke-width 1.5 reads as confidently
 * thin at 40-64px, still legible at 24px.
 *
 * This set is what makes the brand memorable — Linear / Stripe /
 * Notion all use a tight bespoke icon system. Lucide is functional
 * but generic. We keep Lucide for utility UI (close, chevron, share);
 * illustrations live here for trust signals + section anchors +
 * empty states.
 */
export { IllustrationBuilding } from './IllustrationBuilding';
export { IllustrationCamera } from './IllustrationCamera';
export { IllustrationCompass } from './IllustrationCompass';
export { IllustrationVideoCall } from './IllustrationVideoCall';
export { IllustrationDocuments } from './IllustrationDocuments';
export { IllustrationWorldClock } from './IllustrationWorldClock';
export { IllustrationHouseHeart } from './IllustrationHouseHeart';
