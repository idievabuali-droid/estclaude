'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import { buildQuery, csvSet, type FilterParams } from './filter-state';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional emoji prefix — used by the "Что рядом" category. */
  emoji?: string;
}

export interface MultiSelectChipProps {
  /** Plain label shown when nothing is selected, e.g. "Стадия". */
  label: string;
  /** Options shown as toggle chips inside the sheet. */
  options: MultiSelectOption[];
  /** Which CSV-encoded URL param this chip drives, e.g. "status". */
  paramKey: 'status' | 'handover' | 'amenities' | 'nearby';
  /** Full current URL filter state — preserved across navigation so
   *  applying this chip doesn't wipe other filters. */
  current: FilterParams;
}

/**
 * Generic multi-select category chip for /novostroyki. Drives one CSV
 * URL param (status / handover / amenities / nearby). The chip's value
 * summary is either the joined labels (when ≤ 2 selected, fits inline)
 * or "Стадия: 3" (when more — keeps the chip from sprawling).
 *
 * Sheet content: a wrap-grid of toggle chips. Selection is local until
 * the user taps Применить. Reset clears local state but doesn't
 * navigate — they have to confirm.
 */
export function MultiSelectChip({
  label,
  options,
  paramKey,
  current,
}: MultiSelectChipProps) {
  const router = useRouter();
  const currentValues = csvSet(current[paramKey] as string | undefined);
  const [pending, setPending] = useState<Set<string>>(new Set(currentValues));

  // External-system sync: URL is the source of truth, mirror it into
  // pending state so the sheet shows what's currently applied (e.g.
  // after browser back/forward or a "Сбросить всё" elsewhere).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(new Set(csvSet(current[paramKey] as string | undefined)));
  }, [current, paramKey]);

  function toggle(value: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function apply() {
    const next: Partial<FilterParams> = { ...current };
    if (pending.size === 0) {
      delete (next as Record<string, unknown>)[paramKey];
    } else {
      (next as Record<string, string>)[paramKey] = Array.from(pending).join(',');
    }
    router.push(`/novostroyki${buildQuery(next)}`);
  }

  // Summary text for the chip when something is selected. ≤2 → inline
  // labels (most filters have 4-8 options, so 2 max keeps the chip
  // narrow); >2 → numeric summary "Стадия: 3".
  const selectedLabels = options
    .filter((o) => currentValues.has(o.value))
    .map((o) => o.label);
  let valueSummary: string | undefined;
  if (selectedLabels.length === 1) {
    valueSummary = `${label}: ${selectedLabels[0]}`;
  } else if (selectedLabels.length === 2) {
    valueSummary = `${label}: ${selectedLabels[0]}, ${selectedLabels[1]}`;
  } else if (selectedLabels.length > 2) {
    valueSummary = `${label}: ${selectedLabels.length}`;
  }

  // hasPending: local toggle state differs from currently-applied URL.
  const hasPending =
    pending.size !== currentValues.size ||
    [...pending].some((v) => !currentValues.has(v));

  return (
    <FilterChipSheet
      label={label}
      valueSummary={valueSummary}
      sheetTitle={label}
      hasPending={hasPending}
      onApply={apply}
      onReset={() => setPending(new Set())}
      onClear={() => {
        setPending(new Set());
        // Navigate immediately with this param dropped — bypassing
        // pending state so the X is one tap, not two.
        const next: Partial<FilterParams> = { ...current };
        delete (next as Record<string, unknown>)[paramKey];
        router.push(`/novostroyki${buildQuery(next)}`);
      }}
    >
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = pending.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={
                'inline-flex h-10 items-center gap-1 rounded-sm border px-3 text-meta font-medium transition-colors ' +
                (active
                  ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800 hover:bg-terracotta-100'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100')
              }
            >
              {opt.emoji ? (
                <span className="mr-1" aria-hidden>
                  {opt.emoji}
                </span>
              ) : null}
              {opt.label}
            </button>
          );
        })}
      </div>
    </FilterChipSheet>
  );
}
