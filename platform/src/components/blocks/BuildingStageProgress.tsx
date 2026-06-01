import { Check } from 'lucide-react';
import { STAGE_INFO, STAGE_ORDER } from '@/lib/building-stages';
import type { BuildingStatus } from '@/types/domain';
import { StageInfoPopover } from './StageInfoPopover';

export interface BuildingStageProgressProps {
  status: BuildingStatus;
  /** ISO date string of the most recent update (typically
   *  building.updated_at). Renders a "Данные по стадии обновлены: май 2026" line
   *  below the timeline so buyers know the stage data is fresh. */
  lastUpdatedISO?: string | null;
}

/** Mobile-only short labels — avoids wrapping in narrow viewports. */
const SHORT_LABELS: Record<BuildingStatus, string> = {
  announced: 'Котлован',
  under_construction: 'Стройка',
  near_completion: 'Финал',
  delivered: 'Сдан',
};

/** Russian month names (ru-RU genitive form for the "Обновлено" line). */
const MONTHS_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function formatUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * 4-stage progress tracker with proper visual nodes connected by bar
 * segments — the senior-design-pass treatment. Per the prescription:
 *
 *   - Completed stages: filled green node with white checkmark; the
 *     connecting bar to the next node is also green. Reads as
 *     "this is done."
 *   - Current stage: filled terracotta node with a centered white
 *     dot, drawing the eye. Connecting bar AFTER the node is grey
 *     (not done yet).
 *   - Future stages: outlined grey node, grey bar.
 *
 * Three colour states (green / terracotta / grey) instead of the
 * previous two-state (terracotta done+active / grey future) makes
 * the timeline genuinely scannable: a buyer sees at a glance how
 * much of the journey is behind vs ahead.
 *
 * "Данные по стадии обновлены: <месяц год>" line below the timeline pulls from the
 * building's updated_at so the data feels live, not stale.
 *
 * The first stage is "Котлован" (foundation pit), not "Анонс" —
 * Tajik construction law forbids selling pre-construction.
 */
export function BuildingStageProgress({
  status,
  lastUpdatedISO,
}: BuildingStageProgressProps) {
  const activeIndex = STAGE_ORDER.indexOf(status);
  const updatedLabel = formatUpdatedAt(lastUpdatedISO);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
        Стадия проекта
      </span>

      {/* Timeline row — 4 nodes connected by bar segments. Each cell
          owns its own node + the LEFT-side bar segment, so segment
          colour reflects "is the previous step done." First cell
          hides its bar via invisibility. */}
      <ol className="flex items-start">
        {STAGE_ORDER.map((stageKey, idx) => {
          const done = idx < activeIndex;
          const active = idx === activeIndex;
          const info = STAGE_INFO[stageKey];

          // Bar between this node and the previous one. Coloured
          // green when the PREVIOUS node was completed.
          const barCompleted = idx > 0 && idx <= activeIndex;
          const barClass = barCompleted
            ? 'bg-[color:var(--color-fairness-great)]'
            : 'bg-stone-200';

          // Node colour states.
          const nodeClass = done
            ? 'bg-[color:var(--color-fairness-great)] text-white'
            : active
            ? 'bg-terracotta-600 text-white'
            : 'border border-stone-300 bg-white text-stone-400';

          return (
            <li key={stageKey} className="flex flex-1 flex-col gap-2">
              <div className="flex items-center">
                {/* Left bar segment — invisible on the first node so
                    the timeline starts cleanly. */}
                <div
                  aria-hidden
                  className={`h-0.5 flex-1 ${idx === 0 ? 'invisible' : barClass}`}
                />
                {/* Node */}
                <div
                  className={`relative flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${nodeClass}`}
                  aria-hidden
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : active ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : (
                    <span className="text-caption font-semibold tabular-nums">
                      {idx + 1}
                    </span>
                  )}
                </div>
                {/* Right bar segment — green when the CURRENT node
                    is completed (which means we're past it), grey
                    otherwise. Hidden on the last node. */}
                <div
                  aria-hidden
                  className={`h-0.5 flex-1 ${
                    idx === STAGE_ORDER.length - 1
                      ? 'invisible'
                      : idx < activeIndex
                      ? 'bg-[color:var(--color-fairness-great)]'
                      : 'bg-stone-200'
                  }`}
                />
              </div>
              {/* Stage label + per-stage help popover under the node.
                  Centered so it visually anchors to the node above. */}
              <div className="flex items-center justify-center gap-1 text-center">
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
            </li>
          );
        })}
      </ol>

      {/* Stage freshness line — only renders when we have a
          real updated_at on the building. Caption-sized, muted, no
          fanfare; quietly answers "how recent is this data?" */}
      {updatedLabel ? (
        <span className="text-caption text-stone-500">
          Данные по стадии обновлены:{' '}
          <span className="tabular-nums">{updatedLabel}</span>
        </span>
      ) : null}
    </div>
  );
}
