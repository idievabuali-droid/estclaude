'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FilterChipSheet } from '@/components/blocks';
import type { KvartiryFilterParams } from './PriceChip';

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectChipProps {
  /** Plain label shown when nothing is selected, e.g. "Комнат". */
  label: string;
  /** Options shown as toggle chips inside the sheet. */
  options: MultiSelectOption[];
  /** Which CSV-encoded URL param this chip drives. */
  paramKey: 'rooms' | 'finishing';
  /** Full current URL filter state — preserved across navigation. */
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

function csvSet(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(value.split(',').filter(Boolean));
}

/**
 * Generic multi-select category chip for /kvartiry. Mirrors the
 * /novostroyki version but bound to the apartment-list URL shape.
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
    const nextValue = pending.size === 0 ? undefined : Array.from(pending).join(',');
    router.push(buildHref(current, { [paramKey]: nextValue }));
  }

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
        router.push(buildHref(current, { [paramKey]: undefined }));
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
                'inline-flex h-10 items-center rounded-sm border px-3 text-meta font-medium transition-colors ' +
                (active
                  ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800 hover:bg-terracotta-100'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100')
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </FilterChipSheet>
  );
}
