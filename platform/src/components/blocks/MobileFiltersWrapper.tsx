'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AppBottomSheet, AppButton } from '@/components/primitives';

export interface MobileFiltersWrapperProps {
  children: ReactNode;
  /** Optional count of active filters; shown as a badge on the trigger button. */
  activeCount?: number;
}

/**
 * Hides the children inline on mobile and surfaces them via a bottom-sheet
 * triggered by the "Фильтры" button. On tablet+ the children render inline.
 *
 * Pages just wrap their existing chip rows with this — same chip rows work
 * for both presentations because chips use plain Link navigation.
 */
export function MobileFiltersWrapper({ children, activeCount = 0 }: MobileFiltersWrapperProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: trigger button only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-meta font-medium text-stone-900 hover:bg-stone-100 md:hidden"
      >
        <SlidersHorizontal className="size-4" />
        Фильтры
        {activeCount > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-terracotta-600 text-caption font-semibold tabular-nums text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {/* Tablet+: inline */}
      <div className="hidden flex-col gap-3 md:flex">{children}</div>

      {/* Mobile sheet */}
      <AppBottomSheet open={open} onClose={() => setOpen(false)} title="Фильтры">
        <div className="flex flex-col gap-5">
          {children}
          <AppButton variant="primary" size="lg" onClick={() => setOpen(false)}>
            Показать результаты
          </AppButton>
        </div>
      </AppBottomSheet>
    </>
  );
}
