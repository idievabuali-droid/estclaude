'use client';

import { MapPin, Building, Calendar, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, pluralRu } from '@/lib/format';
import { VerificationBadge } from './VerificationBadge';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import { PriceConversion } from './PriceConversion';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

const STATUS_LABEL: Record<MockBuilding['status'], string> = {
  announced: 'Анонсирован',
  under_construction: 'Строится',
  near_completion: 'Почти готов',
  delivered: 'Сдан',
};

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
    router.push(`/novostroyki?view=karta&selected=${building.slug}`);
  }
  const tCommon = useTranslations('Common');

  return (
    <Link
      href={`/zhk/${building.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition-colors',
        'hover:border-stone-300 hover:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
        className,
      )}
    >
      {/* Cover with building-name overlay so it doesn't look like a wireframe */}
      <div
        className="relative aspect-[16/9] w-full"
        style={{ backgroundColor: building.cover_color }}
      >
        {/* Soft inner gradient for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        {/* Centered building glyph + name */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <Building className="size-8 text-white/70" aria-hidden />
          <span className="text-h3 font-semibold text-white drop-shadow-sm">{building.name.ru}</span>
        </div>
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-caption font-medium text-stone-900">
          {STATUS_LABEL[building.status]}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="building" id={building.id} />
          <CompareToggle type="buildings" id={building.id} />
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
            className="group inline-flex w-fit items-center gap-1.5 rounded-sm border border-stone-200 bg-stone-50 px-2 py-1 text-left text-meta text-stone-700 transition-colors hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <MapPin className="size-3.5 shrink-0 text-terracotta-600" />
            <span className="truncate">{district.name.ru} · {building.address.ru}</span>
            <ArrowUpRight className="size-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
          </button>
          {developer.is_verified ? (
            <span className="inline-flex w-fit">
              <VerificationBadge tier="phone_verified" developerVerified />
            </span>
          ) : null}
        </div>

        {/* Price + handover. Per-m² is the headline because total
            price varies wildly with apartment size — per-m² is the
            real fair-comparison metric (and matches our fairness
            indicator). Smallest total stays as a secondary line. */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
          {building.price_per_m2_from_dirams ? (
            <div className="flex flex-col">
              <span className="text-caption text-stone-500">{tCommon('from')}</span>
              <span className="text-h2 font-semibold tabular-nums text-stone-900">
                {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
              </span>
              {showConversion ? (
                <PriceConversion
                  priceDirams={building.price_per_m2_from_dirams}
                  target={currency}
                  rates={rates}
                  perM2
                />
              ) : null}
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

        {/* Available units preview — show up to 3 unit previews. If more
            apartments are available than shown, append "+ ещё N квартир"
            so buyers see at a glance there's more inside without
            duplicating a count up in the header. */}
        {matchingUnits.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-stone-200 pt-3">
            <span className="text-caption font-medium text-stone-500">
              Доступные квартиры
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
