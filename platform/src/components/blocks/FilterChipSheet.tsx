'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { AppBottomSheet } from '@/components/primitives';

export interface FilterChipSheetProps {
  /** Plain label shown when the filter has no active value (e.g. "Стадия"). */
  label: string;
  /**
   * Compact summary of the active value, shown inside the chip when set
   * (e.g. "Стадия: 2" or "до 800 000 TJS"). When provided, the chip
   * switches to active styling. When undefined, only `label` is shown.
   */
  valueSummary?: string;
  /** Sheet title — defaults to `label` if not provided. */
  sheetTitle?: ReactNode;
  /** Sheet content — typically the category's filter inputs/chips. */
  children: ReactNode;
  /** Called when the user taps "Применить" — navigates with the new URL. */
  onApply: () => void;
  /** Called when the user taps "Сбросить" inside the sheet — clears
   *  the local pending state but does NOT navigate. Buyer must still
   *  tap "Применить" to commit. */
  onReset: () => void;
  /**
   * Called when the user taps the X on the chip itself (outside the
   * sheet). Must clear pending state AND navigate to a URL with this
   * filter removed in one step — the chip's X is a single-tap clear,
   * unlike the sheet's "Сбросить" which is paired with "Применить".
   *
   * If we tried to use onReset+onApply here, the apply would read the
   * stale pending state from the React closure (state setters are
   * batched and asynchronous), so it would commit the OLD value.
   * That's why this is a separate prop.
   */
  onClear: () => void;
  /**
   * Whether the user has any pending change relative to the URL state.
   * When true, "Применить" is the primary action; when false, the user
   * is just looking and can dismiss without committing.
   */
  hasPending?: boolean;
}

/**
 * Cian / Avito mobile filter pattern. The chip in the top bar is just
 * an entry point — tap it and a bottom sheet slides up with the actual
 * filter controls + a sticky "Применить" button. We use this instead of
 * inline popovers because:
 *
 *  - Touch targets are larger inside a sheet (cleaner on mobile).
 *  - Selecting multiple options inside doesn't keep navigating one
 *    chip at a time, which on a slow connection feels broken — you
 *    pick everything you want, THEN apply.
 *  - The sheet has room for sub-categories the chip itself can't show.
 *
 * Sheet content is rendered as children. Pending state lives in the
 * parent (the per-category client component) so apply/reset can clear
 * or commit it. This component is just the chrome.
 */
export function FilterChipSheet({
  label,
  valueSummary,
  sheetTitle,
  children,
  onApply,
  onReset,
  onClear,
  hasPending = false,
}: FilterChipSheetProps) {
  const [open, setOpen] = useState(false);
  const isActive = valueSummary != null && valueSummary.length > 0;

  function handleApply() {
    onApply();
    setOpen(false);
  }

  function handleReset() {
    onReset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border px-3 text-meta font-medium transition-colors ' +
          (isActive
            ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800 hover:bg-terracotta-100'
            : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100')
        }
      >
        <span className="whitespace-nowrap tabular-nums">
          {isActive ? valueSummary : label}
        </span>
        {isActive ? (
          <span
            role="button"
            aria-label={`Сбросить фильтр: ${label}`}
            onClick={(e) => {
              // Inline X clears + navigates atomically. Stop propagation
              // so the parent button's click handler (which opens the
              // sheet) doesn't also fire.
              e.stopPropagation();
              onClear();
            }}
            className="-mr-1 inline-flex size-4 items-center justify-center rounded-full text-terracotta-700 hover:bg-terracotta-200"
          >
            <X className="size-3" />
          </span>
        ) : (
          <ChevronDown className="size-3.5 opacity-60" />
        )}
      </button>

      <AppBottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <div className="flex flex-col gap-5">
          {children}
          {/* Sticky-ish footer — sits at the end of the sheet content
              (which is itself scrollable up to 85vh). The reset button
              is muted text; primary action is "Применить". */}
          <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="text-meta font-medium text-stone-600 hover:text-stone-900"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={
                'inline-flex h-11 flex-1 items-center justify-center rounded-md px-4 text-meta font-semibold transition-colors ' +
                (hasPending
                  ? 'bg-terracotta-600 text-white hover:bg-terracotta-700'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300')
              }
            >
              Применить
            </button>
          </div>
        </div>
      </AppBottomSheet>
    </>
  );
}
