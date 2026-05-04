'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';

interface SearchParams {
  rooms?: string;
  source?: string;
  finishing?: string;
  price_from?: string;
  price_to?: string;
  size_from?: string;
  size_to?: string;
  building?: string;
  near_lat?: string;
  near_lng?: string;
  near_label?: string;
  radius?: string;
  monthly_to?: string;
  sort?: string;
}

export interface MonthlyChipProps {
  current: SearchParams;
}

const formatNum = (v?: string) =>
  v ? new Intl.NumberFormat('ru-RU').format(parseInt(v, 10)) : '';

function buildQuery(params: Partial<SearchParams>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/**
 * Monthly-payment ceiling chip on /kvartiry. Faridun thinks "I can
 * pay 4 000 TJS / месяц" — that's the actual mental model for any
 * installment-decisive buyer. The platform shows monthly numbers
 * inline on cards but didn't expose a filter; this fixes that.
 *
 * Filters listings to installment_available=true AND monthly amount
 * ≤ ceiling. Quick-pick presets cover the typical Vahdat range.
 */
export function MonthlyChip({ current }: MonthlyChipProps) {
  const router = useRouter();
  const [to, setTo] = useState(current.monthly_to ?? '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTo(current.monthly_to ?? '');
  }, [current.monthly_to]);

  function commit(nextTo: string) {
    const next: Partial<SearchParams> = { ...current };
    if (nextTo.trim()) next.monthly_to = nextTo.trim();
    else delete (next as Record<string, unknown>).monthly_to;
    router.push(`/kvartiry${buildQuery(next)}`);
  }

  const valueSummary = current.monthly_to
    ? `до ${formatNum(current.monthly_to)} TJS / мес`
    : undefined;

  const hasPending = to !== (current.monthly_to ?? '');

  return (
    <FilterChipSheet
      label="В рассрочку"
      valueSummary={valueSummary}
      sheetTitle="Платёж в месяц"
      hasPending={hasPending}
      onApply={() => commit(to)}
      onReset={() => setTo('')}
      onClear={() => {
        setTo('');
        commit('');
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="kv-monthly-to" className="text-caption text-stone-500">
            до, TJS / мес
          </label>
          <input
            id="kv-monthly-to"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="4 000"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
          <p className="text-caption text-stone-500">
            Покажем только квартиры с рассрочкой и платежом не выше указанного.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[2_000, 3_000, 4_000, 5_000, 7_000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setTo(String(preset));
                commit(String(preset));
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
