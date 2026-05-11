import { Check, Wallet } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FilterGroup } from '@/components/blocks';
import type { FinishingType } from '@/types/domain';
import { PriceChip } from './PriceChip';
import { SizeChip } from './SizeChip';
import { FloorChip } from './FloorChip';
import { MonthlyChip } from './MonthlyChip';

export type KvartiryFilterParams = {
  rooms?: string;
  finishing?: string;
  price_from?: string;
  price_to?: string;
  size_from?: string;
  size_to?: string;
  /** Apartment floor range (integer). Lives alongside size + price as
   *  another apartment-level dimension buyers shop by. */
  floor_from?: string;
  floor_to?: string;
  monthly_to?: string;
  building?: string;
  near_lat?: string;
  near_lng?: string;
  near_label?: string;
  radius?: string;
  sort?: string;
  wizard?: string;
  source?: string;
};

const FINISHING_FILTERS: Array<{ value: FinishingType; label: string }> = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

const ROOM_FILTERS = ['1', '2', '3', '4'];

function csvSet(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(value.split(',').filter(Boolean));
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

function toggleHref(
  current: KvartiryFilterParams,
  paramKey: 'rooms' | 'finishing',
  value: string,
): string {
  const set = csvSet(current[paramKey]);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  const next: Record<string, string | undefined> = { ...current };
  if (set.size === 0) delete next[paramKey];
  else next[paramKey] = Array.from(set).join(',');
  return `/kvartiry${buildQuery(next)}`;
}

function hasAnyFilter(sp: KvartiryFilterParams): boolean {
  return Boolean(
    sp.rooms ||
      sp.finishing ||
      sp.price_from ||
      sp.price_to ||
      sp.size_from ||
      sp.size_to ||
      sp.floor_from ||
      sp.floor_to ||
      sp.monthly_to ||
      sp.near_label,
  );
}

/**
 * Desktop filter rail for /kvartiry. Mirrors NovostroykiFilterRail's
 * eyebrow-grouped layout but with apartment-specific facets:
 * Комнат / Цена / В рассрочку / Площадь / Отделка.
 *
 * Per the senior-design prescription:
 *
 *   "The 'В рассрочку' filter deserves special treatment — it's one
 *    of your differentiators because Tajik buyers care deeply about
 *    monthly payments. Give it its own visual treatment: a small
 *    terracotta icon, slightly more prominent than the other filters,
 *    with a clear 'от X TJS / мес' preview."
 *
 * Implemented by giving the В рассрочку group a small terracotta
 * Wallet icon next to its eyebrow + a soft-terracotta tint background
 * so the section stands out from the otherwise-neutral rail.
 *
 * Mobile (<md) keeps the existing horizontal chip bar; this rail is
 * hidden via the `hidden md:flex` wrapper.
 */
export function KvartiryFilterRail({
  current,
  basePath,
}: {
  current: KvartiryFilterParams;
  /** Reset link target — preserves building scope when present so a
   *  buyer browsing inside one ЖК isn't kicked back to the global
   *  /kvartiry list when they hit "Сбросить всё". */
  basePath: string;
}) {
  const anyActive = hasAnyFilter(current);

  return (
    <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:gap-7 md:pr-7">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-stone-900">Фильтры</h2>
        {anyActive ? (
          <Link
            href={basePath}
            className="text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
          >
            Сбросить всё
          </Link>
        ) : null}
      </div>

      {/* КОМНАТ — pill multi-select. 1/2/3/4 buttons, square-ish since
          they're single digits. Active = stone-900 filled. */}
      <FilterGroup label="Комнат">
        <div className="flex flex-wrap gap-2">
          {ROOM_FILTERS.map((r) => {
            const active = csvSet(current.rooms).has(r);
            return (
              <Link
                key={r}
                href={toggleHref(current, 'rooms', r)}
                className={cn(
                  'inline-flex h-9 min-w-[44px] items-center justify-center rounded-full px-3 text-meta font-semibold transition-colors tabular-nums',
                  active
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                )}
              >
                {r}
              </Link>
            );
          })}
        </div>
      </FilterGroup>

      {/* ЦЕНА — popover chip (range). */}
      <FilterGroup label="Цена">
        <PriceChip current={current} />
      </FilterGroup>

      {/* В РАССРОЧКУ — emphasized per the prescription. Soft-terracotta
          tinted card around the group with a small Wallet icon next to
          the eyebrow. The MonthlyChip popover renders inside; when a
          monthly cap is set its summary ("до 3 000 TJS / мес") shows
          on the chip face — that's the "от X TJS / мес preview" the
          prescription asks for. */}
      <div className="-mx-3 flex flex-col gap-2.5 rounded-md border border-terracotta-100 bg-terracotta-50/50 p-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-terracotta-700" aria-hidden />
          <span className="text-caption font-medium uppercase tracking-widest text-terracotta-800">
            В рассрочку
          </span>
        </div>
        <MonthlyChip current={current} />
        <p className="text-caption text-stone-600">
          Многим покупателям удобнее думать в ежемесячных платежах.
        </p>
      </div>

      {/* ПЛОЩАДЬ — popover chip (range). */}
      <FilterGroup label="Площадь">
        <SizeChip current={current} />
      </FilterGroup>

      {/* ЭТАЖ — popover chip (range). Sits next to Площадь since both
          are apartment dimensions the buyer narrows on. Integer-only;
          common Vahdat buildings are 5–10 floors so the realistic
          range is small. */}
      <FilterGroup label="Этаж">
        <FloorChip current={current} />
      </FilterGroup>

      {/* ОТДЕЛКА — pill multi-select. 4 options, soft pills. */}
      <FilterGroup label="Отделка">
        <div className="flex flex-col gap-0.5">
          {FINISHING_FILTERS.map((f) => {
            const active = csvSet(current.finishing).has(f.value);
            return (
              <Link
                key={f.value}
                href={toggleHref(current, 'finishing', f.value)}
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
