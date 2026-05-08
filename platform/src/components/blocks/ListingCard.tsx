'use client';

import { ChevronRight } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgo } from '@/lib/format';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import { CardPhotoCarousel } from './CardPhotoCarousel';
import { FEATURES } from '@/lib/feature-flags';
import { PriceConversion } from './PriceConversion';
import { track } from '@/lib/analytics/track';
import type { MockListing, MockBuilding } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

export interface ListingCardProps {
  listing: MockListing;
  /** NULL when the listing is standalone (no parent ЖК). The card
   *  swaps the ЖК-name italic line for "{district} · {address}" when
   *  building is null. */
  building: MockBuilding | null;
  developerVerified: boolean;
  districtMedianPerM2?: number | null;
  districtSampleSize?: number;
  hideBuildingName?: boolean;
  /** Diaspora currency (cookie-driven). When set + rates supplied,
   *  shows foreign-currency equivalent beneath TJS price. */
  currency?: SupportedCurrency | null;
  rates?: ExchangeRates | null;
  className?: string;
}

/**
 * ListingCard — Layer 7.7.
 * The most-used card on the platform. Renders one apartment listing with
 * source chip, verification badge, fairness signal, finishing chip, price,
 * and installment hint when available.
 *
 * AI_CONTRACT rule 3: SourceChip is mandatory. AI_CONTRACT rule 8: source
 * icons via Lucide (handled inside SourceChip).
 */
export function ListingCard({
  listing,
  building,
  // developerVerified currently unused — was driving the
  // VerificationBadge that's hidden in V1. Kept in the prop signature
  // so callers don't need to be touched when the badge returns.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  developerVerified,
  // districtMedianPerM2 + districtSampleSize previously drove the
  // FairnessIndicator on the card body. Per the design pass, fairness
  // moves to the apartment detail page so the card stays uncluttered.
  // Kept in the prop signature so callers don't break.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  districtMedianPerM2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  districtSampleSize = 0,
  hideBuildingName,
  currency,
  rates,
  className,
}: ListingCardProps) {
  const showConversion = currency && currency !== 'TJS' && rates != null;
  const router = useRouter();

  /** Building chevron-link sends the buyer to the project detail page —
   *  natural semantic for "this listing belongs to ЖК Vahdat Park,
   *  click to see the project." Was the map drilldown previously, but
   *  on a listing card "go to ЖК" is the higher-intent next step
   *  (Cian + Avito both wire it this way).
   *
   *  Standalone listings have no project page, so this handler is
   *  unused for them — the card renders an address line instead of
   *  the ЖК-link button. */
  function openZhk(e: React.MouseEvent) {
    if (!building) return;
    e.stopPropagation();
    e.preventDefault();
    router.push(`/zhk/${building.slug}`);
  }

  const hasInstallment =
    listing.installment_available && listing.installment_monthly_amount_dirams != null;

  return (
    <Link
      href={`/kvartira/${listing.slug}`}
      onClick={() =>
        track('listing_card_click', {
          listing_id: listing.id,
          listing_slug: listing.slug,
          building_id: building?.id ?? null,
        })
      }
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition-colors',
        'hover:border-stone-300 hover:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
        className,
      )}
    >
      {/* Cover. Per design pass: rooms·m² chip top-left as the visual
          anchor (was inline metadata that competed with price), heart
          top-right. Carousel keeps its dots. */}
      <CardPhotoCarousel
        photos={listing.photo_urls}
        aspect="4/3"
        alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
        className="bg-stone-100"
        style={listing.photo_urls.length === 0 ? { backgroundColor: listing.cover_color } : undefined}
        persistentOverlay={
          listing.photo_urls.length === 0 ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span
                  className="text-h1 font-semibold text-white drop-shadow-sm tabular-nums"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  {listing.rooms_count}-комн
                </span>
                <span className="text-meta font-medium text-white/85 tabular-nums">
                  {formatM2(listing.size_m2)}
                </span>
              </div>
            </>
          ) : null
        }
      >
        {/* Top-left: rooms · m² chip — the unit identity at a glance. */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-caption font-semibold text-stone-900 backdrop-blur tabular-nums">
          {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
        </div>
        {/* Top-right: heart + (V1-hidden) compare. */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="listing" id={listing.id} />
          {FEATURES.compare ? (
            <CompareToggle type="listings" id={listing.id} />
          ) : null}
        </div>
      </CardPhotoCarousel>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Three-line stack per the prescription: floor info (muted),
            price (large), per-m² (muted, smaller). */}
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-stone-500 tabular-nums">
            {formatFloor(listing.floor_number, listing.total_floors)} эт
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-h2 font-semibold tabular-nums text-stone-900">
              {formatPriceNumber(listing.price_total_dirams)} TJS
            </span>
            {showConversion ? (
              <PriceConversion
                priceDirams={listing.price_total_dirams}
                target={currency}
                rates={rates}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-caption text-stone-500 tabular-nums">
              {formatPriceNumber(listing.price_per_m2_dirams)} TJS / м²
            </span>
            {showConversion ? (
              <PriceConversion
                priceDirams={listing.price_per_m2_dirams}
                target={currency}
                rates={rates}
                perM2
              />
            ) : null}
          </div>
        </div>

        {/* Divider separating numerics from project context. */}
        <div className="h-px bg-stone-200" />

        {/* Project line — two visual variants:
              - In a ЖК: serif italic name + chevron-link to /zhk page.
              - Standalone: quiet "{address}" line with a small "Без ЖК"
                tag. No link (standalone has no project page).
            hideBuildingName suppresses both (used inside /zhk pages
            where the parent context is already obvious).
        */}
        {!hideBuildingName ? (
          building ? (
            <button
              type="button"
              onClick={openZhk}
              aria-label={`Открыть ${building.name.ru}`}
              className="group/zhk inline-flex w-fit max-w-full items-center gap-1 text-left text-meta italic text-stone-600 transition-colors hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              <span className="min-w-0 truncate">{building.name.ru}</span>
              <ChevronRight className="size-3.5 shrink-0 opacity-60 transition-opacity group-hover/zhk:opacity-100" />
            </button>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-meta text-stone-600">
                <span className="inline-flex items-center rounded-sm bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
                  Без ЖК
                </span>
                {listing.street_address ? (
                  <span className="min-w-0 truncate">{listing.street_address}</span>
                ) : null}
              </span>
            </div>
          )
        ) : null}

        {/* Bottom row — rassrochka pill (the decision number for many
            Tajik buyers, hence given visual weight as a soft terracotta
            pill) on the left, posted-ago in muted grey on the right.
            mt-auto keeps the row pinned to card bottom across varying
            content lengths. */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {hasInstallment ? (
            <span className="inline-flex items-center rounded-full bg-terracotta-50 px-2.5 py-1 text-caption font-semibold text-terracotta-800 tabular-nums">
              от {formatPriceNumber(listing.installment_monthly_amount_dirams!)} TJS / мес
            </span>
          ) : (
            <span aria-hidden />
          )}
          <span className="text-caption text-stone-400">
            {formatPostedAgo(listing.published_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
