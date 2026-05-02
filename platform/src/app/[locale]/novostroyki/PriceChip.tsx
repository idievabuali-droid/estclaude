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
 * Per-m² price range chip for /novostroyki. Cian-style: chip in the top
 * filter bar with the value summary inline; tap → bottom sheet with
 * "от … до" inputs and an Apply button. Pending input state lives in
 * the chip; only commits to the URL when the user taps Применить.
 */
export function PriceChip({ current }: PriceChipProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.price_per_m2_from ?? '');
  const [to, setTo] = useState(current.price_per_m2_to ?? '');

  // Mirror URL → local state when it changes from outside (e.g. global
  // "Сбросить всё" or browser back/forward). Without this the sheet
  // would still show the stale typed-in value next time it opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(current.price_per_m2_from ?? '');
    setTo(current.price_per_m2_to ?? '');
  }, [current.price_per_m2_from, current.price_per_m2_to]);

  function commit(nextFrom: string, nextTo: string) {
    const next: Partial<FilterParams> = { ...current };
    if (nextFrom.trim()) next.price_per_m2_from = nextFrom.trim();
    else delete (next as Record<string, unknown>).price_per_m2_from;
    if (nextTo.trim()) next.price_per_m2_to = nextTo.trim();
    else delete (next as Record<string, unknown>).price_per_m2_to;
    router.push(`/novostroyki${buildQuery(next)}`);
  }

  let valueSummary: string | undefined;
  if (current.price_per_m2_from && current.price_per_m2_to) {
    valueSummary = `${formatNum(current.price_per_m2_from)} – ${formatNum(current.price_per_m2_to)} TJS/м²`;
  } else if (current.price_per_m2_from) {
    valueSummary = `от ${formatNum(current.price_per_m2_from)} TJS/м²`;
  } else if (current.price_per_m2_to) {
    valueSummary = `до ${formatNum(current.price_per_m2_to)} TJS/м²`;
  }

  // hasPending = local input differs from currently-applied URL state.
  // Drives the "Применить" button colour so tapping a no-op apply
  // doesn't look like the primary action.
  const hasPending =
    from !== (current.price_per_m2_from ?? '') ||
    to !== (current.price_per_m2_to ?? '');

  return (
    <FilterChipSheet
      label="Цена за м²"
      valueSummary={valueSummary}
      sheetTitle="Цена за м²"
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="np-price-from" className="text-caption text-stone-500">
            от, TJS / м²
          </label>
          <input
            id="np-price-from"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="3 000"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="np-price-to" className="text-caption text-stone-500">
            до, TJS / м²
          </label>
          <input
            id="np-price-to"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="6 000"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
      </div>
    </FilterChipSheet>
  );
}
