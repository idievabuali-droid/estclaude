'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';

export type KvartiryFilterParams = {
  rooms?: string;
  source?: string;
  finishing?: string;
  price_from?: string;
  price_to?: string;
  size_from?: string;
  size_to?: string;
  /** Floor range — integer, no decimals. Some buyers want a high floor
   *  for the view + breeze; some want low floors for elderly parents
   *  or strollers; some avoid the top floor due to summer heat.
   *  Driven by FloorChip. */
  floor_from?: string;
  floor_to?: string;
  building?: string;
};

export interface PriceChipProps {
  /** Current full filter param state — passed in so applying preserves
   *  the building scope and any other active filters. */
  current: KvartiryFilterParams;
}

function buildHref(
  current: KvartiryFilterParams,
  override: Partial<KvartiryFilterParams>,
): string {
  const next = { ...current, ...override };
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return `/kvartiry${s ? `?${s}` : ''}`;
}

const formatNum = (v?: string) =>
  v ? new Intl.NumberFormat('ru-RU').format(parseInt(v, 10)) : '';

/**
 * Total-price range chip for the apartment list. Both "от" and "до"
 * inputs — buyers shop with a budget range, not just a ceiling, and
 * having a min lets them exclude listings that are suspiciously cheap
 * for the area (often half-completed or with hidden problems).
 */
export function PriceChip({ current }: PriceChipProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.price_from ?? '');
  const [to, setTo] = useState(current.price_to ?? '');

  // External-system sync: URL is the source of truth.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(current.price_from ?? '');
    setTo(current.price_to ?? '');
  }, [current.price_from, current.price_to]);

  function commit(nextFrom: string, nextTo: string) {
    router.push(
      buildHref(current, {
        price_from: nextFrom.trim() ? nextFrom.trim() : undefined,
        price_to: nextTo.trim() ? nextTo.trim() : undefined,
      }),
    );
  }

  let valueSummary: string | undefined;
  if (current.price_from && current.price_to) {
    valueSummary = `${formatNum(current.price_from)} – ${formatNum(current.price_to)} TJS`;
  } else if (current.price_from) {
    valueSummary = `от ${formatNum(current.price_from)} TJS`;
  } else if (current.price_to) {
    valueSummary = `до ${formatNum(current.price_to)} TJS`;
  }

  const hasPending =
    from !== (current.price_from ?? '') || to !== (current.price_to ?? '');

  return (
    <FilterChipSheet
      label="Цена"
      valueSummary={valueSummary}
      sheetTitle="Цена, TJS"
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
            <label htmlFor="kv-price-from" className="text-caption text-stone-500">
              от, TJS
            </label>
            <input
              id="kv-price-from"
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
            <label htmlFor="kv-price-to" className="text-caption text-stone-500">
              до, TJS
            </label>
            <input
              id="kv-price-to"
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
        {/* Quick-pick presets — same set as /novostroyki/PriceChip and
            the home hero PriceChipHero, so the same buyer sees the same
            affordances on every surface. Preset taps zero `от` and set
            `до` to the preset value, then commit immediately. */}
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
              className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-white px-3 text-caption font-medium tabular-nums text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              до {new Intl.NumberFormat('ru-RU').format(preset)} TJS
            </button>
          ))}
        </div>
      </div>
    </FilterChipSheet>
  );
}
