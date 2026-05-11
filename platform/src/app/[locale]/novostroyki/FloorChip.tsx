'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import type { FilterParams } from './filter-state';

export interface FloorChipProps {
  current: FilterParams;
}

function buildHref(current: FilterParams, override: Partial<FilterParams>): string {
  const next = { ...current, ...override };
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return `/novostroyki${s ? `?${s}` : ''}`;
}

/**
 * Floor-range chip on /novostroyki. Gates the building list by "has
 * at least one active listing on a floor in this range." Mirrors
 * `kvartiry/FloorChip.tsx` (same UX, integer-only, two free inputs)
 * but is route-local because each filter rail owns its destination
 * path + URL-state type. Same precedent as PriceChip and SizeChip.
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
          <label htmlFor="nv-floor-from" className="text-caption text-stone-500">
            от
          </label>
          <input
            id="nv-floor-from"
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
          <label htmlFor="nv-floor-to" className="text-caption text-stone-500">
            до
          </label>
          <input
            id="nv-floor-to"
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
