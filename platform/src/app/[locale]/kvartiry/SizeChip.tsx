'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import type { KvartiryFilterParams } from './PriceChip';

export interface SizeChipProps {
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

const formatM2 = (v?: string) => {
  if (!v) return '';
  // Show whole-number values without trailing zeros ("45" not "45.0"),
  // but preserve a single decimal when set ("45.5").
  const n = parseFloat(v);
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
};

/**
 * Apartment-size range chip ("Площадь, м²"). Both "от" and "до" inputs
 * — buyers usually shop for a size band ("45-65 м² for a 2-bedroom"),
 * not just a ceiling. Decimals allowed because Tajik listings often
 * state half-meters (45.5 m²).
 */
export function SizeChip({ current }: SizeChipProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.size_from ?? '');
  const [to, setTo] = useState(current.size_to ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrom(current.size_from ?? '');
    setTo(current.size_to ?? '');
  }, [current.size_from, current.size_to]);

  function commit(nextFrom: string, nextTo: string) {
    router.push(
      buildHref(current, {
        size_from: nextFrom.trim() ? nextFrom.trim() : undefined,
        size_to: nextTo.trim() ? nextTo.trim() : undefined,
      }),
    );
  }

  let valueSummary: string | undefined;
  if (current.size_from && current.size_to) {
    valueSummary = `${formatM2(current.size_from)} – ${formatM2(current.size_to)} м²`;
  } else if (current.size_from) {
    valueSummary = `от ${formatM2(current.size_from)} м²`;
  } else if (current.size_to) {
    valueSummary = `до ${formatM2(current.size_to)} м²`;
  }

  const hasPending =
    from !== (current.size_from ?? '') || to !== (current.size_to ?? '');

  return (
    <FilterChipSheet
      label="Площадь"
      valueSummary={valueSummary}
      sheetTitle="Площадь, м²"
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
          <label htmlFor="kv-size-from" className="text-caption text-stone-500">
            от, м²
          </label>
          <input
            id="kv-size-from"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kv-size-to" className="text-caption text-stone-500">
            до, м²
          </label>
          <input
            id="kv-size-to"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="80"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
      </div>
    </FilterChipSheet>
  );
}
