'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, X, Scale } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { useCompareStore, COMPARE_MAX_ITEMS } from '@/lib/compare-store';

/**
 * CompareBar — Layer 7.13.
 * Sticky bottom bar that appears when 1+ items are in the compare set.
 * Compare set lives in sessionStorage (Architecture decision).
 */
export function CompareBar() {
  const [hydrated, setHydrated] = useState(false);
  const { type, ids, clear, remove } = useCompareStore();

  // Manual hydration so server render doesn't mismatch (skipHydration: true).
  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  if (!hydrated || ids.length === 0 || !type) return null;

  const targetHref = `/sravnenie?type=${type}&ids=${ids.join(',')}`;
  const labelType = type === 'buildings' ? 'ЖК' : 'квартир';

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 border-t border-stone-200 bg-white shadow-md md:bottom-0"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex max-w-[var(--container-max)] items-center gap-3 px-4 py-3 md:px-5 lg:px-6">
        <Scale className="size-5 shrink-0 text-terracotta-600" aria-hidden />
        <div className="flex flex-1 flex-col">
          <span className="text-meta font-semibold text-stone-900 tabular-nums">
            Сравнение: {ids.length} {labelType}
          </span>
          <span className="text-caption text-stone-500 tabular-nums">
            ещё до {COMPARE_MAX_ITEMS - ids.length} можно добавить
          </span>
        </div>
        <div className="hidden flex-wrap gap-1 md:flex">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => remove(id)}
              aria-label="Убрать из сравнения"
              className="inline-flex items-center gap-1 rounded-sm bg-stone-100 px-2 py-1 text-caption font-medium text-stone-700 hover:bg-stone-200"
            >
              <span className="font-mono">{id.slice(0, 6)}</span>
              <X className="size-3" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-meta font-medium text-stone-500 hover:text-stone-900"
        >
          Очистить
        </button>
        <Link href={targetHref}>
          <AppButton variant="primary" size="md" disabled={ids.length < 2}>
            Сравнить
            <ArrowRight className="size-4" />
          </AppButton>
        </Link>
      </div>
    </div>
  );
}
