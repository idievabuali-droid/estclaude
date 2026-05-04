'use client';

import { Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppCard, AppCardContent } from '@/components/primitives';

export interface FilterRelaxSuggestionProps {
  /** Page the user is on — drives the link prefix when we propose a
   *  relaxed-filter href. */
  pagePath: '/novostroyki' | '/kvartiry';
  /** All current URL search params, including the one we'll relax. */
  currentParams: Record<string, string | string[] | undefined>;
  /** Map of relax-able param key → human label. The user is offered
   *  one click per entry that drops that param entirely. */
  relaxOptions: Array<{ paramKey: string; label: string }>;
  /** Used in copy: "{count} результат" — caller renders the surrounding
   *  context, this just nudges. */
  resultCount: number;
}

/**
 * "Расширить «Сдача» → больше вариантов" nudge that appears when a
 * filtered list returns 0 or 1 results AND there are at least 2
 * active filters. Cian / Avito do this — a stuck user with too-tight
 * filters should be one tap away from a wider net rather than typing
 * the search from scratch.
 *
 * Pure presentation: the parent decides when to mount it. The parent
 * is responsible for computing `relaxOptions` based on which filters
 * are actually set.
 */
export function FilterRelaxSuggestion({
  pagePath,
  currentParams,
  relaxOptions,
  resultCount,
}: FilterRelaxSuggestionProps) {
  if (relaxOptions.length === 0) return null;
  return (
    <AppCard className="border-stone-300 bg-stone-50">
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Sparkles className="size-5 shrink-0 text-stone-500" aria-hidden />
            <div className="flex flex-col gap-1">
              <h3 className="text-h3 font-semibold text-stone-900">
                {resultCount === 0 ? 'Расширить поиск?' : 'Хотите больше вариантов?'}
              </h3>
              <p className="text-meta text-stone-700">
                Снимите один из фильтров — и мы покажем близкие совпадения.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {relaxOptions.map((opt) => {
              const next = { ...currentParams };
              delete next[opt.paramKey];
              const qs = new URLSearchParams();
              for (const [k, v] of Object.entries(next)) {
                if (v == null) continue;
                if (Array.isArray(v)) qs.set(k, v.join(','));
                else qs.set(k, String(v));
              }
              const href = qs.toString() ? `${pagePath}?${qs.toString()}` : pagePath;
              return (
                <Link
                  key={opt.paramKey}
                  href={href}
                  className="inline-flex h-9 items-center gap-1 rounded-sm border border-stone-300 bg-white px-3 text-meta font-medium text-stone-800 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
                >
                  Снять «{opt.label}»
                </Link>
              );
            })}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
