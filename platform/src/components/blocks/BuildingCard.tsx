'use client';

import { MapPin, Building, Calendar, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, pluralRu } from '@/lib/format';
import { STAGE_INFO } from '@/lib/building-stages';
import { VerificationBadge } from './VerificationBadge';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
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
      {/* Cover area. When the building has an uploaded cover photo we
          render it edge-to-edge; otherwise we fall back to the colored
          placeholder + glyph + name overlay so empty inventory still
          looks intentional rather than broken. The chip + save buttons
          on top stay positioned the same way in both modes. */}
      <div
        className="relative aspect-[16/9] w-full bg-stone-100"
        style={building.cover_photo_url ? undefined : { backgroundColor: building.cover_color }}
      >
        {building.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={building.cover_photo_url}
            alt={building.name.ru}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : null}
        {/* Soft inner gradient for legibility (kept in both modes so
            the white chip text stays readable on bright photos too). */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        {/* Centered building glyph + name — only on the placeholder, so
            we don't cover real photos with text. */}
        {building.cover_photo_url ? null : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <Building className="size-8 text-white/70" aria-hidden />
            <span className="text-h3 font-semibold text-white drop-shadow-sm">{building.name.ru}</span>
          </div>
        )}
        {/* Stage chip + help popover. The "?" lets buyers learn what
            the stage means and how long it usually takes without
            leaving the card. stopParentClick prevents the help-button
            click from also triggering the parent card Link. */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-caption font-medium text-stone-900">
          {STAGE_INFO[building.status].label}
          <StageInfoPopover status={building.status} stopParentClick />
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="building" id={building.id} />
          {/* Compare hidden in V1 — see lib/feature-flags.ts. With ~6
              buildings the icon adds visual weight for marginal value.
              Re-enable when inventory crosses ~20 active buildings. */}
          {FEATURES.compare ? (
            <CompareToggle type="buildings" id={building.id} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Identity row + verified badge stacked vertically so long badge text doesn't squeeze */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <h3 className="flex-1 text-h3 font-semibold text-stone-900">{building.name.ru}</h3>
          </div>
          {/* Address as a clearly-interactive chip that opens the map
              with this building's pin pre-selected. Border + arrow icon
              make the affordance obvious — distinct from the surrounding
              card text so users understand it's a separate action. */}
          <button
            type="button"
            onClick={openMap}
            aria-label={`Показать на карте: ${district.name.ru}, ${building.address.ru}`}
            // max-w-full caps the chip at the card width on mobile so
            // the truncated address has something to truncate against.
            className="group inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm border border-stone-200 bg-stone-50 px-2 py-1 text-left text-meta text-stone-700 transition-colors hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <MapPin className="size-3.5 shrink-0 text-terracotta-600" />
            <span className="min-w-0 truncate">{district.name.ru} · {building.address.ru}</span>
            <ArrowUpRight className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
          </button>
          {developer.is_verified ? (
            // Click-through to the FAQ entry that explains what
            // "Проверенный застройщик" actually means — closes the
            // most-asked first-time-buyer question without forcing them
            // to dig through /tsentr-pomoshchi.
            <Link
              href="/tsentr-pomoshchi#verified-developer"
              className="inline-flex w-fit"
              onClick={(e) => e.stopPropagation()}
              title="Что значит «Проверенный»?"
            >
              <VerificationBadge tier="phone_verified" developerVerified />
            </Link>
          ) : null}
        </div>

        {/* Price + handover. Total price is the headline (what shoppers
            actually think in); per-m² stays as a smaller secondary
            line for the comparison-savvy. Reversed from the earlier
            per-m²-first layout because Madina-the-buyer was doing
            arithmetic on the card to figure out what a 60m² unit
            actually costs. */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
          {building.price_from_dirams ? (
            <div className="flex flex-col">
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
              {building.price_per_m2_from_dirams ? (
                <span className="text-caption tabular-nums text-stone-500">
                  {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
                </span>
              ) : null}
            </div>
          ) : building.price_per_m2_from_dirams ? (
            // Edge case: have per-m² but not total. Shouldn't happen
            // in practice (price_from is computed at read time too)
            // but keep a sane fallback.
            <div className="flex flex-col">
              <span className="text-caption text-stone-500">{tCommon('from')}</span>
              <span className="text-h3 font-semibold tabular-nums text-stone-900">
                {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
              </span>
            </div>
          ) : (
            <span className="text-meta text-stone-500">Цены уточняйте</span>
          )}
          {building.handover_estimated_quarter ? (
            <span className="inline-flex items-center gap-1 text-meta text-stone-700 tabular-nums">
              <Calendar className="size-3.5" />
              Сдача {building.handover_estimated_quarter}
            </span>
          ) : null}
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
