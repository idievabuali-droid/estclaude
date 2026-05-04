'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import { buildQuery, type FilterParams } from './filter-state';

export interface PriceChipProps {
  /** Current full filter param state — passed in so applying preserves
   *  every other active filter rather than wiping them on each navigate. */
  current: FilterParams;
}

const formatNum = (v?: string) =>
  v ? new Intl.NumberFormat('ru-RU').format(parseInt(v, 10)) : '';

/**
 * Total-price range chip for /novostroyki. Was per-m² but Faridun-the-
 * buyer thinks "до 220k" not "до 4 000 TJS/м²" — per-m² is a comparison
 * metric, not a budget metric. The chip now filters by the building's
 * cheapest-unit total price (price_from_dirams). Per-m² lives in the
 * service layer for future advanced UI.
 */
export function PriceChip({ current }: PriceChipProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.price_from ?? '');
  const [to, setTo] = useState(current.price_to ?? '');

  // Mirror URL → local state when it changes from outside (e.g. global
  // "Сбросить всё" or browser back/forward). Without this the sheet
  // would still show the stale typed-in value next time it opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(current.price_from ?? '');
    setTo(current.price_to ?? '');
  }, [current.price_from, current.price_to]);

  function commit(nextFrom: string, nextTo: string) {
    const next: Partial<FilterParams> = { ...current };
    if (nextFrom.trim()) next.price_from = nextFrom.trim();
    else delete (next as Record<string, unknown>).price_from;
    if (nextTo.trim()) next.price_to = nextTo.trim();
    else delete (next as Record<string, unknown>).price_to;
    router.push(`/novostroyki${buildQuery(next)}`);
  }

  let valueSummary: string | undefined;
  if (current.price_from && current.price_to) {
    valueSummary = `${formatNum(current.price_from)} – ${formatNum(current.price_to)} TJS`;
  } else if (current.price_from) {
    valueSummary = `от ${formatNum(current.price_from)} TJS`;
  } else if (current.price_to) {
    valueSummary = `до ${formatNum(current.price_to)} TJS`;
  }

  // hasPending = local input differs from currently-applied URL state.
  // Drives the "Применить" button colour so tapping a no-op apply
  // doesn't look like the primary action.
  const hasPending =
    from !== (current.price_from ?? '') ||
    to !== (current.price_to ?? '');

  return (
    <FilterChipSheet
      label="Цена"
      valueSummary={valueSummary}
      sheetTitle="Общая цена"
      hasPending={hasPending}
      onApply={() => commit(from, to)}
      onReset={() => {
        setFrom('');
        setTo('');
      }}
      onClear={() => {
        setFrom('');
        setTo('');
        commit('', '');
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="np-price-from" className="text-caption text-stone-500">
              от, TJS
            </label>
            <input
              id="np-price-from"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="100 000"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="np-price-to" className="text-caption text-stone-500">
              до, TJS
            </label>
            <input
              id="np-price-to"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="500 000"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
            />
          </div>
        </div>
        {/* Quick-pick presets — Krisha pattern, one tap to a common
            ceiling. Faridun's budget = 220k; "до 250к" is his bracket. */}
        <div className="flex flex-wrap gap-2">
          {[150_000, 200_000, 250_000, 300_000, 400_000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setFrom('');
                setTo(String(preset));
                commit('', String(preset));
              }}
              className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-white px-3 text-caption font-medium text-stone-700 hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              до {new Intl.NumberFormat('ru-RU').format(preset)} TJS
            </button>
          ))}
        </div>
      </div>
    </FilterChipSheet>
  );
}
