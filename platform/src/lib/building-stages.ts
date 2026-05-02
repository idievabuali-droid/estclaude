/**
 * Single source of truth for building-stage labels, durations, and
 * descriptions. Used by BuildingCard (status chip), BuildingStageProgress
 * (timeline), filter UIs, and the StageInfoPopover help component so
 * the user never sees inconsistent wording.
 *
 * Note on the "announced" enum value: in Tajikistan you can't legally
 * sell before construction starts, so the earliest sellable stage is
 * the foundation pit ("Котлован"). The DB enum value stays as
 * `announced` to avoid migration churn — semantically it now means
 * "foundation phase, earliest sellable stage." Switch to a real
 * `foundation` enum value if/when we do a schema cleanup pass.
 */
import type { BuildingStatus } from '@/types/domain';

export type StageInfo = {
  /** Russian display label shown on chips, timeline, filter UI. */
  label: string;
  /** Typical duration range for this phase. Empty string for delivered. */
  durationLabel: string;
  /** Plain-language description of what's happening at this stage —
   *  shown in the help popover and the current-stage explainer. */
  description: string;
};

export const STAGE_INFO: Record<BuildingStatus, StageInfo> = {
  announced: {
    label: 'Котлован',
    durationLabel: '20 дней – 2 месяца',
    description:
      'Копают котлован, заливают фундамент. На участке работает техника, видна арматура и опалубка.',
  },
  under_construction: {
    label: 'Строится',
    durationLabel: '9 – 18 месяцев',
    description:
      'Возводятся этажи и стены, ставятся окна, монтируются вода, электричество и канализация. Здание растёт этаж за этажом.',
  },
  near_completion: {
    label: 'Почти готов',
    durationLabel: '8 – 12 месяцев',
    description:
      'Здание полностью построено. Делают фасад, благоустройство двора, отделку подъездов, ставят лифты.',
  },
  delivered: {
    label: 'Сдан',
    durationLabel: '',
    description:
      'Дом сдан в эксплуатацию, ключи выданы. Можно заезжать и делать ремонт в квартире.',
  },
};

/** Order used by the stage timeline. */
export const STAGE_ORDER: BuildingStatus[] = [
  'announced',
  'under_construction',
  'near_completion',
  'delivered',
];

/**
 * Months between now and the handover quarter (e.g. "2027-Q1").
 * Returns null when the building is delivered or has no handover set.
 * Negative values clamped to 0 — overdue projects show "до сдачи: 0".
 */
export function monthsToHandover(handoverQuarter: string | null): number | null {
  if (!handoverQuarter) return null;
  const match = /^(\d{4})-Q([1-4])$/.exec(handoverQuarter);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const quarter = parseInt(match[2]!, 10);
  // Quarter ends: Q1=Mar, Q2=Jun, Q3=Sep, Q4=Dec
  const endMonth = quarter * 3 - 1; // 0-indexed
  const handoverDate = new Date(year, endMonth, 30);
  const now = new Date();
  const months =
    (handoverDate.getFullYear() - now.getFullYear()) * 12 +
    (handoverDate.getMonth() - now.getMonth());
  return Math.max(0, months);
}
