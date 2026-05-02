'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { buildQuery, type FilterParams } from './filter-state';

export interface PriceRangeFilterProps {
  /** Current full filter param state, so submitting preserves the
   *  district/status/etc. that are already selected. */
  current: FilterParams;
}

/**
 * Two number inputs ("от X — до Y, TJS / м²") that update the URL on
 * submit. Inputs are deliberately uncontrolled-ish: local state mirrors
 * the URL but only commits on form submit (Enter key or the small
 * "Применить" button). This avoids spamming history on every keystroke.
 *
 * Empty input means "no bound" — submitting a blank "до" clears the
 * upper bound and keeps the lower one.
 */
export function PriceRangeFilter({ current }: PriceRangeFilterProps) {
  const router = useRouter();
  const [from, setFrom] = useState(current.price_per_m2_from ?? '');
  const [to, setTo] = useState(current.price_per_m2_to ?? '');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Partial<FilterParams> = { ...current };
    if (from.trim()) next.price_per_m2_from = from.trim();
    else delete (next as Record<string, unknown>).price_per_m2_from;
    if (to.trim()) next.price_per_m2_to = to.trim();
    else delete (next as Record<string, unknown>).price_per_m2_to;
    router.push(`/novostroyki${buildQuery(next)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="price-from" className="text-caption text-stone-500">
          от, TJS / м²
        </label>
        <input
          id="price-from"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="3 000"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 w-28 rounded-md border border-stone-300 bg-white px-2 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="price-to" className="text-caption text-stone-500">
          до, TJS / м²
        </label>
        <input
          id="price-to"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="6 000"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 w-28 rounded-md border border-stone-300 bg-white px-2 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="h-9 rounded-md border border-stone-300 bg-stone-50 px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
      >
        Применить
      </button>
    </form>
  );
}
