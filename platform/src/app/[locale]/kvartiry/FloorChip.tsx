'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import type { KvartiryFilterParams } from './PriceChip';

export interface FloorChipProps {
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

/**
 * Floor-range chip ("Этаж"). Integer-only — floor_number is an int on
 * `listings`. Same UX shape as SizeChip (two-input grid, FilterChipSheet
 * shell), but with `step={1}` and no decimal validation.
 *
 * Why this filter exists: buyers in Vahdat care about which floor an
 * apartment is on. Some want a high floor for view + breeze + less
 * street noise; some want low floors for elderly parents or strollers
 * + no waiting for the elevator; some avoid the top floor because of
 * summer heat under the roof. Without a floor filter the buyer has to
 * scan every card's "X/Y эт" line manually — slow and easy to miss.
 *
 * No presets (unlike MonthlyChip's 5 preset payments) because there's
 * no natural "popular floor range" — the band depends on the building's
 * total floors, which varies project to project. Two free-form inputs
 * keeps the chip flexible.
 */
export function FloorChip({ current }: FloorChipProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.floor_from ?? '');
  const [to, setTo] = useState(current.floor_to ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(current.floor_from ?? '');
    setTo(current.floor_to ?? '');
  }, [current.floor_from, current.floor_to]);

  function commit(nextFrom: string, nextTo: string) {
    router.push(
      buildHref(current, {
        floor_from: nextFrom.trim() ? nextFrom.trim() : undefined,
        floor_to: nextTo.trim() ? nextTo.trim() : undefined,
      }),
    );
  }

  let valueSummary: string | undefined;
  if (current.floor_from && current.floor_to) {
    valueSummary = `${current.floor_from} – ${current.floor_to} эт`;
  } else if (current.floor_from) {
    valueSummary = `от ${current.floor_from} эт`;
  } else if (current.floor_to) {
    valueSummary = `до ${current.floor_to} эт`;
  }

  const hasPending =
    from !== (current.floor_from ?? '') || to !== (current.floor_to ?? '');

  return (
    <FilterChipSheet
      label="Этаж"
      valueSummary={valueSummary}
      sheetTitle="Этаж"
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
          <label htmlFor="kv-floor-from" className="text-caption text-stone-500">
            от
          </label>
          <input
            id="kv-floor-from"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="3"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kv-floor-to" className="text-caption text-stone-500">
            до
          </label>
          <input
            id="kv-floor-to"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="10"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
      </div>
    </FilterChipSheet>
  );
}
