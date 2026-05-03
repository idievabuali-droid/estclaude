'use client';

import { useEffect, useState } from 'react';
import { GitCompare, Check } from 'lucide-react';
import { useCompareStore, type CompareType } from '@/lib/compare-store';
import { toast } from '@/components/primitives/AppToast';
import { cn } from '@/lib/utils';

export interface CompareToggleProps {
  type: CompareType;
  id: string;
  className?: string;
}

/**
 * Compare toggle button on cards. Lives next to SaveToggle.
 *
 * V1 polish over the prior version:
 *
 *   - Icon: GitCompare (two-bar split-view glyph) instead of Scale (⚖️).
 *     The scale read as "weight / fairness", not "compare side-by-side".
 *     GitCompare's two divergent arrows visually suggest "compare these".
 *
 *   - Size: fixed at size-9 in both states (matching SaveToggle). The
 *     previous size-7 → hover:size-9 grow trick made the idle state too
 *     small to notice next to the bookmark — buyers missed the affordance
 *     entirely.
 *
 *   - Type-swap toast: when adding an item of a different type than
 *     what's already in the compare set, the store wipes the old set
 *     to start fresh. Previously this happened silently; now we surface
 *     a toast so the buyer understands their selection just changed.
 *
 *   - Active state: terracotta fill + Check overlay + count of total
 *     items in the compare set, so a buyer with 3 in the bar can see
 *     at a glance "yes, this one is one of the 3".
 */
export function CompareToggle({ type, id, className }: CompareToggleProps) {
  const [hydrated, setHydrated] = useState(false);
  const { toggle, hasItem, ids } = useCompareStore();

  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  const active = hydrated && hasItem(type, id);
  const count = hydrated ? ids.length : 0;

  // Title text shown on hover (tooltip) AND read by screen readers.
  // Clarifies what the icon means since it's not labeled visually.
  const label = active
    ? `В сравнении (${count}) — нажмите чтобы убрать`
    : count > 0
      ? `Добавить к сравнению (сейчас ${count})`
      : 'Добавить к сравнению';

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggle(type, id);
    // Type-swap previously cleared silently — buyers wondered where their
    // earlier selections went. Toast spells it out.
    if (result.kind === 'type-swapped') {
      const wipedLabel =
        result.previousType === 'buildings' ? 'ЖК' : 'квартир';
      toast.info(
        `Сравнение ${wipedLabel} очищено — нельзя сравнивать ЖК и квартиры вместе.`,
      );
    } else if (result.kind === 'capped') {
      toast.info('В сравнении максимум 4 — уберите один, чтобы добавить новый.');
    }
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full transition-colors',
        active
          ? 'bg-terracotta-600 text-white hover:bg-terracotta-700'
          : 'bg-white/90 text-stone-700 hover:bg-white hover:text-terracotta-600',
        className,
      )}
    >
      {active ? <Check className="size-4" /> : <GitCompare className="size-4" />}
    </button>
  );
}
