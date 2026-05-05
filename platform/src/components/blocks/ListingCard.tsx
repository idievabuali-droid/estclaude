'use client';

import { Layers, MapPin, ArrowUpRight, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgo } from '@/lib/format';
import { AppChip } from '@/components/primitives';
import { FairnessIndicator, computeFairness, type FairnessLevel } from './FairnessIndicator';
import { InstallmentDisplay } from './InstallmentDisplay';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import { CardPhotoCarousel } from './CardPhotoCarousel';
import { FEATURES } from '@/lib/feature-flags';
import { PriceConversion } from './PriceConversion';
import { track } from '@/lib/analytics/track';
import type { MockListing, MockBuilding } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

const FINISHING_TONE = {
  no_finish: 'finishing-no-finish',
  pre_finish: 'finishing-pre-finish',
  full_finish: 'finishing-full-finish',
  owner_renovated: 'finishing-owner-renovated',
} as const;

export interface ListingCardProps {
  listing: MockListing;
  building: MockBuilding;
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
  districtMedianPerM2,
  districtSampleSize = 0,
  hideBuildingName,
  currency,
  rates,
  className,
}: ListingCardProps) {
  const showConversion = currency && currency !== 'TJS' && rates != null;
  const tFinishing = useTranslations('Finishing');
  const router = useRouter();

  /** Address row navigates to the map with this building's pin pre-selected,
   *  so users can see where the place actually is and pivot to nearby
   *  buildings without losing their browse position. stopPropagation
   *  prevents the parent card-Link from also firing. */
  function openMap(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${listing.slug}`);
  }

  const fairness =
    districtMedianPerM2 != null
      ? computeFairness(Number(listing.price_per_m2_dirams), districtMedianPerM2, districtSampleSize)
      : null;

  return (
    <Link
      href={`/kvartira/${listing.slug}`}
      onClick={() =>
        track('listing_card_click', {
          listing_id: listing.id,
          listing_slug: listing.slug,
          building_id: building.id,
        })
      }
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition-colors',
        'hover:border-stone-300 hover:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
        className,
      )}
    >
      {/* Cover area. CardPhotoCarousel takes over photo rendering when
          we have any uploaded photos and lets the buyer swipe through
          all of them inline (no need to drill into the detail page just
          to check if the place looks decent). When `photo_urls` is
          empty we still render the carousel container so the coloured
          placeholder + giant rooms label show through — keeps no-photo
          listings visually intentional. */}
      <CardPhotoCarousel
        photos={listing.photo_urls}
        aspect="4/3"
        alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
        className="bg-stone-100"
        style={listing.photo_urls.length === 0 ? { backgroundColor: listing.cover_color } : undefined}
        persistentOverlay={
          <>
            {/* Bottom gradient — keeps the white chip text readable on
                bright photos (and the placeholder gets a subtle vignette). */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
            {listing.photo_urls.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-h1 font-semibold text-white drop-shadow-sm tabular-nums">
                  {listing.rooms_count}-комн
                </span>
                <span className="text-meta font-medium text-white/85 tabular-nums">
                  {formatM2(listing.size_m2)}
                </span>
              </div>
            ) : (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-sm bg-stone-900/70 px-2 py-1 text-caption font-medium text-white tabular-nums">
                {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
              </span>
            )}
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-sm bg-stone-900/70 px-2 py-1 text-caption font-medium text-white tabular-nums">
              <Layers className="size-3" /> {formatFloor(listing.floor_number, listing.total_floors)}
            </span>
          </>
        }
      >
        {/* Installment badge — only for listings that offer financing.
            Sits below the carousel's "1/N" counter so they don't fight
            for the same corner. For listings without installment the
            counter top-left has the corner to itself. */}
        {listing.installment_available ? (
          <span
            className={cn(
              'absolute left-3 inline-flex items-center gap-1 rounded-sm bg-white/95 px-2 py-1 text-caption font-medium text-[color:var(--color-fairness-great)] shadow-sm',
              // When the counter is present (multiple photos) push the
              // installment chip below it; otherwise it can take the
              // top corner.
              listing.photo_urls.length > 1 ? 'top-12' : 'top-3',
            )}
          >
            <CreditCard className="size-3" />
            Рассрочка
          </span>
        ) : null}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="listing" id={listing.id} />
          {/* Compare hidden in V1 — see lib/feature-flags.ts. */}
          {FEATURES.compare ? (
            <CompareToggle type="listings" id={listing.id} />
          ) : null}
        </div>
      </CardPhotoCarousel>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* VerificationBadge hidden in V1 — tier claims are hollow when
            the founder is the one verifying every listing. The
            "Проверенный застройщик" badge stays on building cards
            (BuildingCard), where it's a real, defensible claim. */}

        {/* Row 1: price (full width, no competing badge). When the
            visitor has set a foreign currency, each TJS amount is
            paired with its ≈ equivalent INLINE on the same baseline,
            so the buyer reads "180 000 TJS  ≈ 1 800 000 ₽" as one
            unit. flex-wrap means narrow cards (mobile) drop the
            conversion to the next line rather than overflow — but
            the pair stays semantically grouped either way. */}
        <div className="flex flex-col gap-0.5">
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

        {/* Row 2: rooms + size + finishing */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta font-medium text-stone-700 tabular-nums">
            {listing.rooms_count}-комн · {formatM2(listing.size_m2)} · {formatFloor(listing.floor_number, listing.total_floors)} эт
          </span>
          <AppChip
            asStatic
            tone={FINISHING_TONE[listing.finishing_type]}
          >
            {tFinishing(listing.finishing_type)}
          </AppChip>
        </div>

        {/* Row 3: building name + address as a clearly-interactive chip
            that opens the map with this building's pin pre-selected.
            Border + arrow icon make the affordance obvious — without
            them, users read it as static gray label and miss the map. */}
        {!hideBuildingName ? (
          <button
            type="button"
            onClick={openMap}
            aria-label={`Показать на карте: ${building.name.ru}, ${building.address.ru}`}
            // max-w-full caps the chip at the parent's width on
            // mobile so the truncated address actually has something
            // to truncate against. With only w-fit the chip grew to
            // content width and pushed past 375px, causing internal
            // horizontal scroll inside the card on mobile.
            className="group inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm border border-stone-200 bg-stone-50 px-2 py-1 text-left text-meta text-stone-700 transition-colors hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <MapPin className="size-3.5 shrink-0 text-terracotta-600" />
            <span className="min-w-0 truncate">{building.name.ru} · {building.address.ru}</span>
            <ArrowUpRight className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
          </button>
        ) : null}

        {/* Row 4: fairness */}
        {fairness ? (
          <FairnessIndicator level={fairness.level as FairnessLevel} deltaPercent={fairness.deltaPercent} />
        ) : null}

        {/* Installment terms — shown only when the seller offers
            financing. Listings without installment simply omit the
            row (was previously rendering the 'save' translation key
            as a stub, which displayed as an out-of-context "Сохранить"). */}
        {listing.installment_available && listing.installment_monthly_amount_dirams ? (
          <InstallmentDisplay
            variant="inline"
            monthlyDirams={listing.installment_monthly_amount_dirams}
            firstPaymentPercent={listing.installment_first_payment_percent ?? 30}
            termMonths={listing.installment_term_months ?? 84}
            totalPriceDirams={listing.price_total_dirams}
          />
        ) : null}

        {/* Posted-ago — fresh-vs-stale signal buyers care about. Caption
            size + muted colour so it doesn't compete with the price. */}
        <span className="text-caption text-stone-400">
          Опубликовано {formatPostedAgo(listing.published_at)}
        </span>
      </div>
    </Link>
  );
}
