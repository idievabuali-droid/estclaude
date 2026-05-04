'use client';

import { useRouter } from 'next/navigation';
import { FilterChipSheet } from './FilterChipSheet';

export type SortMode = 'recommended' | 'cheapest' | 'expensive' | 'newest';

export interface SortChipProps {
  pagePath: '/novostroyki' | '/kvartiry';
  /** Full current URL params; spread into the new query so the sort
   *  change preserves every other active filter. */
  current: Record<string, string | string[] | undefined>;
}

const OPTIONS: Array<{ value: SortMode; label: string; summary: string }> = [
  { value: 'recommended', label: 'По умолчанию', summary: '' },
  { value: 'cheapest', label: 'Сначала дешёвые', summary: 'дешёвые сначала' },
  { value: 'expensive', label: 'Сначала дорогие', summary: 'дорогие сначала' },
  { value: 'newest', label: 'Сначала новые', summary: 'новые сначала' },
];

/**
 * Sort dropdown chip for /novostroyki and /kvartiry. Was missing —
 * the page just used the implicit trust-tier order, leaving Faridun
 * (whose budget makes "Сначала дешёвые" the obvious first move) with
 * no way to sort. Krisha + Cian both have this as a top-level chip.
 *
 * Sets `?sort=…` in the URL (cleared when 'recommended' = default).
 */
export function SortChip({ pagePath, current }: SortChipProps) {
  const router = useRouter();
  const active = (current.sort as SortMode | undefined) ?? 'recommended';
  const activeOption = OPTIONS.find((o) => o.value === active);

  function pick(next: SortMode) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) {
      if (v == null) continue;
      if (Array.isArray(v)) params.set(k, v.join(','));
      else params.set(k, String(v));
    }
    if (next === 'recommended') params.delete('sort');
    else params.set('sort', next);
    const qs = params.toString();
    router.push(qs ? `${pagePath}?${qs}` : pagePath);
  }

  return (
    <FilterChipSheet
      label="Сортировка"
      valueSummary={activeOption?.summary || undefined}
      sheetTitle="Сортировка"
      hasPending={false}
      onApply={() => {}}
      onReset={() => {}}
      onClear={() => pick('recommended')}
    >
      <div className="flex flex-col gap-1">
        {OPTIONS.map((o) => {
          const isActive = active === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={
                'flex h-11 items-center justify-between rounded-md px-3 text-meta transition-colors ' +
                (isActive
                  ? 'bg-terracotta-50 font-semibold text-terracotta-800'
                  : 'text-stone-800 hover:bg-stone-50')
              }
            >
              <span>{o.label}</span>
              {isActive ? (
                <span className="text-caption font-medium text-terracotta-600">✓</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </FilterChipSheet>
  );
}
