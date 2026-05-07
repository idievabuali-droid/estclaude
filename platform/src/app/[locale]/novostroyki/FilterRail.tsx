import { Check } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FilterGroup } from '@/components/blocks';
import {
  IllustrationMosque,
  IllustrationSchool,
  IllustrationKindergarten,
  IllustrationHospital,
  IllustrationSupermarket,
  IllustrationTransit,
  IllustrationPark,
  IllustrationPharmacy,
} from '@/components/illustrations';
import type { BuildingStatus } from '@/types/domain';
import type { PoiCategory } from '@/services/poi';
import { csvSet, toggleHref, type FilterParams } from './filter-state';
import { PriceChip } from './PriceChip';

/**
 * Desktop filter rail for /novostroyki — 260px column on the left of
 * the page, replaces the horizontal chip bar at md+ widths. Per the
 * senior-design prescription:
 *
 *   - One global "Сбросить всё" at the top in terracotta (renders only
 *     when at least one filter is active).
 *   - Each filter group is a section with an uppercase eyebrow label
 *     ("ЦЕНА", "СТАДИЯ", "СДАЧА", "ЧТО РЯДОМ", "УДОБСТВА").
 *   - Pill buttons for stage / handover (multi-select), checkbox-row
 *     for nearby + amenities, popover chip for price.
 *   - No per-filter Apply buttons — filters apply live as you click
 *     (each control is a Link that updates the URL; server re-renders).
 *
 * Mobile (<md) keeps the existing horizontal chip bar pattern; this
 * rail is hidden via the `hidden md:flex` wrapper. The mobile
 * full-screen "Фильтры" sheet is deferred to the next polish pass.
 */
const STATUS_FILTERS: Array<{ value: BuildingStatus; label: string }> = [
  { value: 'announced', label: 'Котлован' },
  { value: 'under_construction', label: 'Строится' },
  { value: 'near_completion', label: 'Почти готов' },
  { value: 'delivered', label: 'Сдан' },
];

const HANDOVER_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'delivered', label: 'Сдан' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028+', label: '2028+' },
];

const AMENITIES_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'parking', label: 'Парковка' },
  { value: 'security', label: 'Охрана' },
  { value: 'elevator', label: 'Лифт' },
  { value: 'playground', label: 'Детская площадка' },
  { value: 'gym', label: 'Фитнес' },
  { value: 'commercial-floor', label: 'Коммерческий этаж' },
];

const NEARBY_FILTERS: Array<{
  value: PoiCategory;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'mosque', label: 'Мечеть', Icon: IllustrationMosque },
  { value: 'school', label: 'Школа', Icon: IllustrationSchool },
  { value: 'kindergarten', label: 'Детский сад', Icon: IllustrationKindergarten },
  { value: 'supermarket', label: 'Магазин', Icon: IllustrationSupermarket },
  { value: 'hospital', label: 'Поликлиника', Icon: IllustrationHospital },
  { value: 'pharmacy', label: 'Аптека', Icon: IllustrationPharmacy },
  { value: 'transit', label: 'Транспорт', Icon: IllustrationTransit },
  { value: 'park', label: 'Парк', Icon: IllustrationPark },
];

function hasAnyFilter(sp: FilterParams): boolean {
  return Boolean(
    sp.status ||
      sp.handover ||
      sp.amenities ||
      sp.nearby ||
      sp.price_from ||
      sp.price_to ||
      sp.price_per_m2_from ||
      sp.price_per_m2_to ||
      sp.developer ||
      sp.near_label,
  );
}

export function NovostroykiFilterRail({ current }: { current: FilterParams }) {
  const anyActive = hasAnyFilter(current);

  return (
    <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:gap-7 md:pr-7">
      {/* Header row: "Фильтры" + global reset link. The reset is in
          terracotta accent, the only colour in the rail's chrome —
          it's the highest-impact link in the rail and earns the
          accent. */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-stone-900">Фильтры</h2>
        {anyActive ? (
          <Link
            href="/novostroyki"
            className="text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
          >
            Сбросить всё
          </Link>
        ) : null}
      </div>

      {/* PRICE — keep PriceChip popover; rail-friendly width via
          parent flex full-width container. */}
      <FilterGroup label="Цена">
        <PriceChip current={current} />
      </FilterGroup>

      {/* СТАДИЯ — pill multi-select. Active = stone-900 filled. */}
      <FilterGroup label="Стадия">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = csvSet(current.status).has(f.value);
            return (
              <Link
                key={f.value}
                href={toggleHref(current, 'status', f.value)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-3 text-meta font-medium transition-colors',
                  active
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </FilterGroup>

      {/* СДАЧА — pill multi-select. */}
      <FilterGroup label="Сдача">
        <div className="flex flex-wrap gap-2">
          {HANDOVER_FILTERS.map((f) => {
            const active = csvSet(current.handover).has(f.value);
            return (
              <Link
                key={f.value}
                href={toggleHref(current, 'handover', f.value)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-3 text-meta font-medium transition-colors',
                  active
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </FilterGroup>

      {/* ЧТО РЯДОМ — checkbox-style rows with monoline POI illustrations
          replacing the previous emoji glyphs. Active row tints in soft
          terracotta with a check on the right; inactive rows are quiet
          stone with the illustration in stone-500. */}
      <FilterGroup label="Что рядом">
        <div className="flex flex-col gap-0.5">
          {NEARBY_FILTERS.map((f) => {
            const active = csvSet(current.nearby).has(f.value);
            const Icon = f.Icon;
            return (
              <Link
                key={f.value}
                href={toggleHref(current, 'nearby', f.value)}
                className={cn(
                  '-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                  active
                    ? 'bg-terracotta-50 text-terracotta-900'
                    : 'text-stone-700 hover:bg-stone-50',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center',
                    active ? 'text-terracotta-700' : 'text-stone-500',
                  )}
                >
                  <Icon className="size-7" />
                </span>
                <span className="flex-1 text-meta">{f.label}</span>
                {active ? (
                  <Check className="size-4 shrink-0 text-terracotta-700" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </div>
      </FilterGroup>

      {/* УДОБСТВА — checkbox-style rows, no icon (these are abstract
          features, not visual locations). */}
      <FilterGroup label="Удобства">
        <div className="flex flex-col gap-0.5">
          {AMENITIES_FILTERS.map((f) => {
            const active = csvSet(current.amenities).has(f.value);
            return (
              <Link
                key={f.value}
                href={toggleHref(current, 'amenities', f.value)}
                className={cn(
                  '-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                  active
                    ? 'bg-terracotta-50 text-terracotta-900'
                    : 'text-stone-700 hover:bg-stone-50',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                    active
                      ? 'border-terracotta-700 bg-terracotta-700 text-white'
                      : 'border-stone-300 bg-white',
                  )}
                  aria-hidden
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="flex-1 text-meta">{f.label}</span>
              </Link>
            );
          })}
        </div>
      </FilterGroup>
    </aside>
  );
}
