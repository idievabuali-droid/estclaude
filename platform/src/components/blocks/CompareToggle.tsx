'use client';

import { useEffect, useState } from 'react';
import { Scale, Check } from 'lucide-react';
import { useCompareStore, type CompareType } from '@/lib/compare-store';
import { cn } from '@/lib/utils';

export interface CompareToggleProps {
  type: CompareType;
  id: string;
  className?: string;
}

/**
 * Small icon button that adds/removes an item from the compare set.
 * Lives over a card cover image, matching the bookmark button style.
 */
export function CompareToggle({ type, id, className }: CompareToggleProps) {
  const [hydrated, setHydrated] = useState(false);
  const { toggle, hasItem } = useCompareStore();

  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  const active = hydrated && hasItem(type, id);

  return (
    <button
      type="button"
      aria-label={active ? 'Убрать из сравнения' : 'Добавить к сравнению'}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(type, id);
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        // REMOVE-3: secondary action — smaller and quieter than save until used
        active
          ? 'size-9 bg-terracotta-600 text-white hover:bg-terracotta-700'
          : 'size-7 bg-white/70 text-stone-600 hover:size-9 hover:bg-white hover:text-stone-900',
        className,
      )}
    >
      {active ? <Check className="size-4" /> : <Scale className="size-3.5" />}
    </button>
  );
}
