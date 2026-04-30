import { Check } from 'lucide-react';
import type { BuildingStatus } from '@/types/domain';

const STAGES: { key: BuildingStatus; label: string; short: string }[] = [
  { key: 'announced', label: 'Анонсирован', short: 'Анонс' },
  { key: 'under_construction', label: 'Строится', short: 'Стройка' },
  { key: 'near_completion', label: 'Почти готов', short: 'Финал' },
  { key: 'delivered', label: 'Сдан', short: 'Сдан' },
];

export interface BuildingStageProgressProps {
  status: BuildingStatus;
  /** Optional handover quarter, e.g. "Q4 2026". Shown beside the active stage. */
  handoverQuarter?: string | null;
}

/**
 * Visual 4-stage progress indicator for a building. Replaces the vague
 * single status chip — buyers can see exactly where the project stands
 * relative to handover (and how much of the journey is left) without
 * having to interpret jargon.
 */
export function BuildingStageProgress({ status, handoverQuarter }: BuildingStageProgressProps) {
  const activeIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
          Стадия проекта
        </span>
        {handoverQuarter && status !== 'delivered' ? (
          <span className="text-caption text-stone-500 tabular-nums">
            Сдача {handoverQuarter}
          </span>
        ) : null}
      </div>

      {/* Bar with 4 segments */}
      <ol className="flex items-center gap-1.5">
        {STAGES.map((stage, idx) => {
          const done = idx < activeIndex;
          const active = idx === activeIndex;
          return (
            <li key={stage.key} className="flex flex-1 flex-col gap-1.5">
              <div
                className={
                  'h-1.5 w-full rounded-full ' +
                  (done || active ? 'bg-terracotta-600' : 'bg-stone-200')
                }
                aria-hidden
              />
              <div className="flex items-center gap-1">
                {done ? (
                  <Check className="size-3 text-terracotta-600" aria-hidden />
                ) : active ? (
                  <span className="inline-block size-2 rounded-full bg-terracotta-600" aria-hidden />
                ) : (
                  <span className="inline-block size-2 rounded-full bg-stone-300" aria-hidden />
                )}
                <span
                  className={
                    'text-caption font-medium ' +
                    (active
                      ? 'text-stone-900'
                      : done
                      ? 'text-stone-700'
                      : 'text-stone-400')
                  }
                >
                  <span className="hidden sm:inline">{stage.label}</span>
                  <span className="sm:hidden">{stage.short}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
