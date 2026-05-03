'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X, GitCompare } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { useCompareStore, COMPARE_MAX_ITEMS } from '@/lib/compare-store';

interface PreviewItem {
  id: string;
  name: string;
}

/**
 * CompareBar — sticky bottom bar shown when 1+ items are in the
 * compare set.
 *
 * V1 polish over the prior version:
 *
 *   - Real names instead of UUID stubs. Buyers couldn't tell what they
 *     had selected without going to /sravnenie. Now we fetch the names
 *     via /api/compare/preview, cached per id-set in component state so
 *     we don't re-fetch on every navigation.
 *
 *   - Chips visible on mobile too. Previously `hidden md:flex` made the
 *     bar a count-only box on phones — the very devices buyers use most.
 *     Now horizontal-scroll chip row, matching the Cian-style filter
 *     pattern we use elsewhere.
 *
 *   - "Очистить" two-tap confirm on mobile. A misplaced tap previously
 *     wiped the entire compare set with no recovery. First tap now
 *     swaps the label to "Точно очистить?" for 3 seconds; second tap
 *     within that window actually clears.
 *
 *   - Helper caption shortened. "ещё до X можно добавить" was noise
 *     once the chips show real names; now we only surface "максимум 4"
 *     when the buyer is at cap.
 */
export function CompareBar() {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { type, ids, clear, remove } = useCompareStore();

  // Manual hydration so server render doesn't mismatch (skipHydration: true).
  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  // Fetch real names whenever the id-set changes. The store IS our
  // external system here — items state is purely derived from (type,
  // ids), but we cache the fetched names locally so we don't re-fetch
  // on every render.
  useEffect(() => {
    if (!hydrated || !type || ids.length === 0) return;
    let cancelled = false;
    fetch('/api/compare/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, ids }),
    })
      .then((r) => r.json())
      .then((data: { items: PreviewItem[] }) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        // Network blip — fall back to id-stub display so the bar still
        // shows something rather than going blank.
        if (!cancelled) {
          setItems(ids.map((id) => ({ id, name: id.slice(0, 6) })));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, type, ids]);

  // Filter the cached items to only those still in `ids` — handles
  // remove() between renders without showing stale chips. Reordered
  // to match `ids` order so chips stay in add-order.
  const visibleItems: PreviewItem[] = ids.map(
    (id) => items.find((it) => it.id === id) ?? { id, name: id.slice(0, 6) },
  );

  // Cleanup the confirm timer if the component unmounts mid-confirm.
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  if (!hydrated || ids.length === 0 || !type) return null;

  const targetHref = `/sravnenie?type=${type}&ids=${ids.join(',')}`;
  const labelType = type === 'buildings' ? 'ЖК' : 'квартир';
  const atCap = ids.length >= COMPARE_MAX_ITEMS;

  function handleClearTap() {
    if (confirmingClear) {
      // Second tap within the 3s window — really clear.
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmingClear(false);
      clear();
      return;
    }
    setConfirmingClear(true);
    confirmTimer.current = setTimeout(() => setConfirmingClear(false), 3_000);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 border-t border-stone-200 bg-white shadow-md md:bottom-0"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-3 md:px-5 lg:px-6">
        {/* Header row — icon + count + helper */}
        <div className="flex items-center gap-2">
          <GitCompare className="size-5 shrink-0 text-terracotta-600" aria-hidden />
          <span className="text-meta font-semibold text-stone-900 tabular-nums">
            Сравнение: {ids.length} {labelType}
          </span>
          {atCap ? (
            <span className="text-caption text-stone-500">· максимум 4</span>
          ) : null}
        </div>

        {/* Chip row — visible on every viewport. Horizontal-scrolls
            when chips overflow the available width. */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Убрать из сравнения: ${item.name}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-stone-100 px-2 py-1 text-caption font-medium text-stone-700 transition-colors hover:bg-stone-200"
            >
              <span className="whitespace-nowrap">{item.name}</span>
              <X className="size-3" aria-hidden />
            </button>
          ))}
        </div>

        {/* Action row — clear + compare. On mobile sits below the
            chip row (parent flex-col); on tablet+ sits inline. */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClearTap}
            className={
              'text-meta font-medium transition-colors ' +
              (confirmingClear
                ? 'text-rose-600 hover:text-rose-700'
                : 'text-stone-500 hover:text-stone-900')
            }
          >
            {confirmingClear ? 'Точно очистить?' : 'Очистить'}
          </button>
          <Link href={targetHref}>
            <AppButton variant="primary" size="md" disabled={ids.length < 2}>
              Сравнить
              <ArrowRight className="size-4" />
            </AppButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
