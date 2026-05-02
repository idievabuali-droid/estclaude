'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdvancedFiltersToggleProps {
  /** Pre-render with the section open if any advanced filter is already
   *  active (so users see what's filtering instead of "where did my
   *  selection go"). The page passes hasAdvancedActive(sp) here. */
  defaultOpen?: boolean;
  /** Optional total count of advanced filters currently active —
   *  shown as a badge on the toggle button. */
  activeCount?: number;
  children: ReactNode;
}

/**
 * "Ещё фильтры" expander. Default-collapsed so the primary filter sheet
 * stays short; opens when tapped. Pre-opens automatically when the page
 * loads with an advanced filter already active so users always see the
 * controls for what's filtering them.
 */
export function AdvancedFiltersToggle({
  defaultOpen = false,
  activeCount = 0,
  children,
}: AdvancedFiltersToggleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-meta font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100"
      >
        <SlidersHorizontal className="size-4 text-stone-500" />
        <span>Ещё фильтры</span>
        {activeCount > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-terracotta-600 text-caption font-semibold tabular-nums text-white">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown
          className={cn('size-4 text-stone-500 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? <div className="flex flex-col gap-4">{children}</div> : null}
    </div>
  );
}
