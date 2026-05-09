import { Link } from '@/i18n/navigation';
import { AppContainer } from '@/components/primitives';
import { ListingCard } from './ListingCard';
import { cn } from '@/lib/utils';
import type { MockBuilding, MockListing } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

/**
 * One pre-resolved row for `FeaturedListingsRow`. The caller does the
 * building/developer/benchmark joins in their server component (where
 * the data clients live) and hands a flat shape to the card so this
 * component stays presentation-only.
 *
 * `building` may be null for standalone listings — `ListingCard`
 * handles both shapes (in-ЖК vs standalone) internally.
 */
export type FeaturedListingsRowItem = {
  listing: MockListing;
  building: MockBuilding | null;
  developerVerified: boolean;
  districtMedianPerM2: number | null;
  districtSampleSize: number;
};

export interface FeaturedListingsRowProps {
  /** Section heading — rendered in Lora serif, matches the
   *  "Рекомендуемые проекты" / "Свежие квартиры" pattern used elsewhere. */
  title: string;
  /** Right-aligned section link (e.g. "/kvartiry"). */
  linkHref: string;
  /** Right-aligned link label, including any chevron (e.g. "Все квартиры →"). */
  linkLabel: string;
  /** Listings to render — caller pre-slices to the desired count
   *  (typically 3). When `items` is empty the section renders nothing
   *  so we never show an orphan header above empty space. */
  items: FeaturedListingsRowItem[];
  /** Diaspora currency (cookie-driven). When set + rates supplied,
   *  each card shows the foreign-currency equivalent beneath TJS. */
  currency?: SupportedCurrency | null;
  rates?: ExchangeRates | null;
  /** Extra classes on the outer `<section>` so each surface controls
   *  its own background + vertical rhythm (home wants no extra bg,
   *  /diaspora wants `border-t border-stone-200 bg-stone-50`). */
  sectionClassName?: string;
}

/**
 * `FeaturedListingsRow` — a 3-up apartments rail used on both the home
 * page (under "Рекомендуемые проекты") and on `/diaspora` (under the
 * featured projects rail). Same component, same visual rhythm — the
 * intent is "diaspora is home + overlays, not a parallel platform."
 *
 * Why this exists: home was missing an apartments rail entirely
 * (Cian / Avito / Bayut all have one) while `/diaspora` had its own
 * inline copy. Single source of truth here removes the drift risk and
 * keeps the card grammar identical across both surfaces.
 */
export function FeaturedListingsRow({
  title,
  linkHref,
  linkLabel,
  items,
  currency,
  rates,
  sectionClassName,
}: FeaturedListingsRowProps) {
  if (items.length === 0) return null;
  return (
    <section className={cn('py-16 md:py-24', sectionClassName)}>
      <AppContainer className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3">
          <h2
            className="text-h2 font-semibold text-stone-900"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            {title}
          </h2>
          <Link
            href={linkHref}
            className="shrink-0 text-meta font-medium text-stone-700 hover:text-terracotta-700"
          >
            {linkLabel}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {items.map(
            ({
              listing,
              building,
              developerVerified,
              districtMedianPerM2,
              districtSampleSize,
            }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                building={building}
                developerVerified={developerVerified}
                districtMedianPerM2={districtMedianPerM2}
                districtSampleSize={districtSampleSize}
                currency={currency}
                rates={rates}
              />
            ),
          )}
        </div>
      </AppContainer>
    </section>
  );
}
