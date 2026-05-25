'use client';

import { MapPin, Building, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, pluralRu, formatHandoverQuarter, locationLabel } from '@/lib/format';
import { STAGE_INFO } from '@/lib/building-stages';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import { CardPhotoCarousel } from './CardPhotoCarousel';
import { FEATURES } from '@/lib/feature-flags';
import { PriceConversion } from './PriceConversion';
import { track } from '@/lib/analytics/track';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

export interface BuildingCardProps {
  building: MockBuilding;
  developer: MockDeveloper;
  district: MockDistrict;
  matchingUnits?: MockListing[];
  /** Total active listings in this building. When passed, shown inline
   *  with the handover date so buyers can scan-spot which projects
   *  have lots of options vs which have one unit left. Distinct from
   *  matchingUnits.length because matchingUnits is only a slice for
   *  preview rendering. */
  activeListingsCount?: number;
  /** Diaspora currency (cookie-driven). When set + rates supplied,
   *  shows foreign-currency equivalent beneath TJS. */
  currency?: SupportedCurrency | null;
  rates?: ExchangeRates | null;
  /**
   * Apartment-criteria filter params (rooms / size_from / size_to /
   * floor_from / floor_to) — when /novostroyki has these in its URL,
   * we forward them to the /zhk detail page so the inline "Доступные
   * квартиры" preview shows only the units matching the buyer's
   * filter, not random ones. Optional + back-compat — home / diaspora
   * / izbrannoe etc don't pass it and the link stays `/zhk/<slug>`.
   *
   * Each entry: the URL param key + its value (CSV for rooms, plain
   * number for ranges). Empty / undefined values are stripped.
   */
  forwardFilterParams?: Partial<{
    rooms: string;
    size_from: string;
    size_to: string;
    floor_from: string;
    floor_to: string;
  }>;
  className?: string;
}

/**
 * BuildingCard — Layer 7.8.
 * Per Blueprint §8.6 Row 5: when filters are active, shows 2-3 unit previews
 * underneath the main card body.
 */
export function BuildingCard({
  building,
  developer,
  district,
  // `matchingUnits` was rendered as an inline 3-row unit table inside
  // the card; replaced by a single count line driven by
  // `activeListingsCount` (universal mobile pattern: list cards
  // summarise, the detail page carries the unit table). Prop kept on
  // the interface so the 4 callers (home / novostroyki / izbrannoe /
  // diaspora) don't break — accepted-and-ignored. Removable in a
  // follow-up cleanup commit.
  activeListingsCount,
  currency,
  rates,
  forwardFilterParams,
  className,
}: BuildingCardProps) {
  const showConversion = currency && currency !== 'TJS' && rates != null;
  const router = useRouter();

  /** Address row navigates to the map with this building's pin selected. */
  function openMap(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/novostroyki?view=karta&focus=${building.slug}`);
  }
  const tCommon = useTranslations('Common');

  // Build the /zhk URL — when the caller forwards apartment-criteria
  // filter params, append them so the detail page can narrow its
  // inline preview to matching units. Strips empty values so an
  // unfiltered link stays clean (no trailing `?`).
  const detailHref = (() => {
    if (!forwardFilterParams) return `/zhk/${building.slug}`;
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(forwardFilterParams)) {
      if (v && v.length > 0) search.set(k, v);
    }
    const s = search.toString();
    return s ? `/zhk/${building.slug}?${s}` : `/zhk/${building.slug}`;
  })();

  return (
    <Link
      href={detailHref}
      onClick={() =>
        track('building_card_click', {
          building_id: building.id,
          building_slug: building.slug,
        })
      }
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition-colors',
        'hover:border-stone-300 hover:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
        className,
      )}
    >
      {/* Cover area. CardPhotoCarousel takes over photo rendering and
          lets the buyer swipe through every uploaded photo of the
          building inline. When `photo_urls` is empty we still mount it
          so the coloured placeholder + Building glyph show through. */}
      <CardPhotoCarousel
        photos={building.photo_urls}
        aspect="16/10"
        alt={building.name.ru}
        className="bg-stone-100"
        style={building.photo_urls.length === 0 ? { backgroundColor: building.cover_color } : undefined}
        persistentOverlay={
          <>
            {/* Soft inner gradient for legibility (kept across all
                slides so the white chip text stays readable on bright
                photos too). */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
            {/* Centered building glyph + name — only on the placeholder
                (when there are no photos), so we don't cover real
                photos with text. */}
            {building.photo_urls.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <Building className="size-8 text-white/70" aria-hidden />
                <span
                  className="text-h3 font-semibold text-white drop-shadow-sm"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  {building.name.ru}
                </span>
              </div>
            ) : null}
          </>
        }
      >
        {/* Combined stage + handover pill — Farrukh-the-buyer's spec:
            ONE status pill with stage and handover quarter merged into
            a single readable chip ("Строится · 2026-Q4"). White bg +
            stone-200 border + green dot reads as accent without
            competing with the photo. Sits below the carousel's "1/N"
            counter when multiple photos exist. */}
        <div
          className={cn(
            'absolute left-3 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-2.5 py-1 text-caption font-medium text-stone-700 backdrop-blur',
            building.photo_urls.length > 1 ? 'top-12' : 'top-3',
          )}
        >
          <span
            className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
            aria-hidden
          />
          {STAGE_INFO[building.status].label}
          {building.handover_estimated_quarter ? (
            <>
              <span className="text-stone-400" aria-hidden>·</span>
              <span className="tabular-nums">
                {formatHandoverQuarter(building.handover_estimated_quarter)}
              </span>
            </>
          ) : null}
          {/* StageInfoPopover removed from the card cover (founder
              critique 2026-05-09: opening it covered the photo).
              The same "what does Строится mean?" explainer still
              lives on the building detail page via BuildingStageProgress
              — buyers who want the deeper read tap the card to get
              there. Card-level scanning just needs the label. */}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="building" id={building.id} />
          {/* Compare hidden in V1 — see lib/feature-flags.ts. */}
          {FEATURES.compare ? (
            <CompareToggle type="buildings" id={building.id} />
          ) : null}
          {/* Связаться moved off the photo overlay into the card body
              footer — buyers see the listing first (photo, name, price,
              units), then the contact affordance. Founder critique
              2026-05-09: an icon button on the photo competed with the
              listing's primary content. */}
        </div>
      </CardPhotoCarousel>

      <div className="flex flex-col gap-4 p-5">
        {/* Identity block. Project name set in Lora serif — building
            names read editorial-distinct, the way premium real-estate
            platforms (Knight Frank, The Modern House) treat property
            titles. Address demoted to a smaller muted line (the
            interactive map chip pattern was visually competing with
            the name + price). Verified pill matches home's hero pill
            shape: white bg + stone-200 border + green dot. */}
        <div className="flex flex-col gap-2">
          <h3
            className="text-h2 font-semibold text-stone-900"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            {building.name.ru}
          </h3>
          <button
            type="button"
            onClick={openMap}
            aria-label={`Показать на карте: ${locationLabel(district.name.ru, building.address.ru, building.name.ru)}`}
            className="group inline-flex w-fit max-w-full items-center gap-1 text-left text-meta text-stone-500 transition-colors hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <MapPin className="size-3.5 shrink-0 text-stone-400" aria-hidden />
            <span className="min-w-0 truncate">{locationLabel(district.name.ru, building.address.ru, building.name.ru)}</span>
            <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
          </button>
          {developer.is_verified ? (
            // Click-through to the FAQ entry. Rendered as a button (not
            // Link) because the parent card is already an anchor and
            // nested anchors break hydration + mobile carousel swipe.
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push('/tsentr-pomoshchi#verified-developer');
              }}
              className="inline-flex w-fit items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-caption font-medium text-stone-700 hover:border-stone-300"
              title="Что значит «Проверенный»?"
            >
              <span
                className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                aria-hidden
              />
              Проверенный застройщик
            </button>
          ) : null}
        </div>

        {/* Price — singular, confident. Per Farrukh's prescription: ONE
            number on the card surface. Per-m² moved off the card (lives
            on the project detail page where comparison-savvy buyers
            land). Removes the arithmetic-on-the-card cognitive load. */}
        <div className="flex flex-col gap-0.5 border-t border-stone-200 pt-3">
          {building.price_from_dirams ? (
            <>
              <span className="text-caption text-stone-500">{tCommon('from')}</span>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-h2 font-semibold tabular-nums text-stone-900">
                  {formatPriceNumber(building.price_from_dirams)} TJS
                </span>
                {showConversion ? (
                  <PriceConversion
                    priceDirams={building.price_from_dirams}
                    target={currency}
                    rates={rates}
                  />
                ) : null}
              </div>
            </>
          ) : building.price_per_m2_from_dirams ? (
            // Edge case fallback: only per-m² known.
            <>
              <span className="text-caption text-stone-500">{tCommon('from')}</span>
              <span className="text-h3 font-semibold tabular-nums text-stone-900">
                {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
              </span>
            </>
          ) : (
            <span className="text-meta text-stone-500">Цены уточняйте</span>
          )}
        </div>

        {/* Available-units summary. Replaces a 3-row inline unit list +
            "+ ещё N" link that ate ~140px per card on mobile — across
            12 buildings on /novostroyki that's ~2 mobile screens of
            duplicated content (the full unit list lives on /zhk/[slug]
            which the parent card-link already targets). Universal
            mobile pattern: Cian / Avito / Bayut / Yandex Недвижимость
            list cards show a count summary; the unit detail lives on
            the project page. The trailing ChevronRight reads as an
            inline tap affordance even though the whole card is
            tappable — buyers register the "→" as "there's more here."
            Hidden when count is 0 or undefined (an unsold-out project
            with no active listings shouldn't show "0 квартир"). */}
        {activeListingsCount != null && activeListingsCount > 0 ? (
          <div className="flex items-center justify-between gap-2 border-t border-stone-200 pt-3 text-meta font-medium text-stone-700">
            <span className="tabular-nums">
              {activeListingsCount}{' '}
              {pluralRu(activeListingsCount, [
                'квартира',
                'квартиры',
                'квартир',
              ])}{' '}
              в продаже
            </span>
            <ChevronRight className="size-4 text-stone-400" aria-hidden />
          </div>
        ) : null}

        {/* No contact CTA on the card. Cards are for SEEING — photo,
            name, price, available units. Contact happens after the
            buyer taps into the project detail page (/zhk/<slug>),
            which has the price-card popover + mobile sticky bar.
            Founder critique 2026-05-09 (second pass): an in-card
            contact button still puts contact on a list surface where
            the buyer hasn't yet decided which project they want to
            ask about. Mature platforms (Cian, Avito, Rightmove) all
            keep contact OFF cards and IN detail pages for the same
            reason. */}
      </div>
    </Link>
  );
}
