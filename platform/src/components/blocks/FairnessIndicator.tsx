import { Check, ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type FairnessLevel = 'great' | 'fair' | 'high' | 'alert';

/**
 * Compute fairness from a listing's price-per-m² vs district benchmark.
 * Returns null when sample is too small (per Data Model §5.14 — hidden when sample_size < 5).
 */
export function computeFairness(
  pricePerM2: number,
  districtMedian: number | null,
  sampleSize: number,
): { level: FairnessLevel; deltaPercent: number } | null {
  if (!districtMedian || sampleSize < 5) return null;
  const delta = ((pricePerM2 - districtMedian) / districtMedian) * 100;
  let level: FairnessLevel;
  if (delta <= -10) level = 'great';
  else if (delta <= 10) level = 'fair';
  else if (delta <= 25) level = 'high';
  else level = 'alert';
  return { level, deltaPercent: Math.round(Math.abs(delta)) };
}

// BUG-10: render as a colored chip, not gray text. Each level gets a tinted
// background so the signal pops without using red anywhere.
const LEVEL_STYLE: Record<FairnessLevel, { chip: string; Icon: typeof Check }> = {
  great: {
    chip: 'bg-green-50 text-[color:var(--color-fairness-great)]',
    Icon: Check,
  },
  fair: {
    chip: 'bg-stone-100 text-[color:var(--color-fairness-fair)]',
    Icon: ArrowDown,
  },
  high: {
    chip: 'bg-amber-50 text-[color:var(--color-fairness-high)]',
    Icon: ArrowUp,
  },
  alert: {
    chip: 'bg-orange-50 text-[color:var(--color-fairness-alert)]',
    Icon: AlertCircle,
  },
};

export interface FairnessIndicatorProps {
  level: FairnessLevel;
  deltaPercent: number;
  className?: string;
}

/**
 * FairnessIndicator — Layer 7.4.
 * Calm informational signal. Never red. Hidden by parent when computeFairness returns null.
 */
export function FairnessIndicator({ level, deltaPercent, className }: FairnessIndicatorProps) {
  const t = useTranslations('Fairness');
  const { chip, Icon } = LEVEL_STYLE[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium tabular-nums',
        chip,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {level === 'fair' ? t('fair') : t(level, { percent: deltaPercent })}
    </span>
  );
}
