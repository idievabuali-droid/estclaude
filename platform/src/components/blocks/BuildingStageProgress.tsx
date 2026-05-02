import { Check } from 'lucide-react';
import { STAGE_INFO, STAGE_ORDER } from '@/lib/building-stages';
import type { BuildingStatus } from '@/types/domain';
import { StageInfoPopover } from './StageInfoPopover';

export interface BuildingStageProgressProps {
  status: BuildingStatus;
}

/** Mobile-only short labels — avoids wrapping in narrow viewports. */
const SHORT_LABELS: Record<BuildingStatus, string> = {
  announced: 'Котлован',
  under_construction: 'Стройка',
  near_completion: 'Финал',
  delivered: 'Сдан',
};

/**
 * Visual 4-stage progress indicator for a building. Compact: just the
 * timeline + per-stage help popover (the "?" next to each label opens
 * a small dialog with the description and typical duration). All
 * stages — including the current one — get a popover, so the
 * interaction is uniform.
 *
 * No prominent in-page explainer block: that was too heavy and
 * duplicated info that's also in the stats grid (handover quarter)
 * and inside the popover itself. The popover is the single source of
 * "what does this stage mean?" — buyers tap it on demand.
 *
 * The first stage is "Котлован" (foundation pit), not "Анонс", because
 * in Tajikistan you can't legally sell before construction starts.
 */
export function BuildingStageProgress({ status }: BuildingStageProgressProps) {
  const activeIndex = STAGE_ORDER.indexOf(status);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
        Стадия проекта
      </span>

      {/* 4-segment bar with labels + per-stage help popover. Every stage
          (including current) has the "?" so the interaction is uniform
          and buyers always have one place to learn what a stage means. */}
      <ol className="flex items-start gap-1.5">
        {STAGE_ORDER.map((stageKey, idx) => {
          const done = idx < activeIndex;
          const active = idx === activeIndex;
          const info = STAGE_INFO[stageKey];
          return (
            <li key={stageKey} className="flex flex-1 flex-col gap-1.5">
              <div
                className={
                  'h-1.5 w-full rounded-full ' +
                  (done || active ? 'bg-terracotta-600' : 'bg-stone-200')
                }
                aria-hidden
              />
              <div className="flex items-start gap-1">
                {done ? (
                  <Check className="mt-0.5 size-3 shrink-0 text-terracotta-600" aria-hidden />
                ) : active ? (
                  <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-terracotta-600" aria-hidden />
                ) : (
                  <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-stone-300" aria-hidden />
                )}
                <div className="flex min-w-0 flex-1 items-center gap-1">
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
                    <span className="hidden sm:inline">{info.label}</span>
                    <span className="sm:hidden">{SHORT_LABELS[stageKey]}</span>
                  </span>
                  <StageInfoPopover status={stageKey} size="sm" />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
