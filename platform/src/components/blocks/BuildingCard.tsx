'use client';

import { MapPin, Building, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, pluralRu, formatHandoverQuarter } from '@/lib/format';
import { STAGE_INFO } from '@/lib/building-stages';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import { CardPhotoCarousel } from './CardPhotoCarousel';
import { BuildingContactButton } from './BuildingContactButton';
import { FEATURES } from '@/lib/feature-flags';
import { PriceConversion } from './PriceConversion';
import { StageInfoPopover } from './StageInfoPopover';
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
  matchingUnits = [],
  activeListingsCount,
  currency,
  rates,
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

  return (
    <Link
      href={`/zhk/${building.slug}`}
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
          <StageInfoPopover status={building.status} stopParentClick />
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="building" id={building.id} />
          {/* Связаться: WhatsApp tap with prefilled context. The pill
              funnels to the founder (no per-developer phone in V1) but
              the WhatsApp message carries the building name so context
              lands in chat. */}
          <BuildingContactButton
            buildingName={building.name.ru}
            buildingAddress={`${district.name.ru} · ${building.address.ru}`}
          />
          {/* Compare hidden in V1 — see lib/feature-flags.ts. */}
          {FEATURES.compare ? (
            <CompareToggle type="buildings" id={building.id} />
          ) : null}
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
            aria-label={`Показать на карте: ${district.name.ru}, ${building.address.ru}`}
            className="group inline-flex w-fit max-w-full items-center gap-1 text-left text-meta text-stone-500 transition-colors hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <MapPin className="size-3.5 shrink-0 text-stone-400" aria-hidden />
            <span className="min-w-0 truncate">{district.name.ru} · {building.address.ru}</span>
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

        {/* Available units preview. Header shows the total count
            ("Доступные квартиры · 8") so buyers can see project size
            at a glance. Up to 3 unit previews follow. If more exist,
            "+ ещё N" hints there's more inside (the parent card link
            already takes them to the building detail). */}
        {matchingUnits.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-stone-200 pt-3">
            <span className="text-caption font-medium text-stone-500">
              Доступные квартиры
              {activeListingsCount != null ? (
                <span className="tabular-nums"> · {activeListingsCount}</span>
              ) : null}
            </span>
            {matchingUnits.slice(0, 3).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 text-meta text-stone-700 tabular-nums"
              >
                <span>
                  {u.rooms_count}-комн · {u.size_m2} м² · {u.floor_number} эт
                </span>
                <span className="font-semibold text-stone-900">
                  {formatPriceNumber(u.price_total_dirams)} TJS
                </span>
              </div>
            ))}
            {activeListingsCount != null && activeListingsCount > matchingUnits.slice(0, 3).length ? (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-terracotta-700">
                + ещё {activeListingsCount - matchingUnits.slice(0, 3).length}{' '}
                {pluralRu(
                  activeListingsCount - matchingUnits.slice(0, 3).length,
                  ['квартира', 'квартиры', 'квартир'],
                )}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
