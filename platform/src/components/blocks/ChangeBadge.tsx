import { ArrowDown, AlertCircle, Image as ImageIcon, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChangeEventType } from '@/types/domain';

const CHANGE_CONFIG: Record<
  ChangeEventType,
  { tone: string; Icon: typeof ArrowDown; defaultLabel: string }
> = {
  price_changed: {
    tone: 'bg-green-50 text-[color:var(--color-fairness-great)]',
    Icon: ArrowDown,
    defaultLabel: 'Цена изменилась',
  },
  status_changed: {
    // amber per Design System §7.12 — never red, halal-by-design
    tone: 'bg-amber-50 text-[color:var(--color-semantic-warning)]',
    Icon: AlertCircle,
    defaultLabel: 'Статус изменился',
  },
  new_unit_added: {
    tone: 'bg-blue-50 text-[color:var(--color-semantic-info)]',
    Icon: Plus,
    defaultLabel: 'Новые квартиры',
  },
  construction_photo_added: {
    tone: 'bg-stone-100 text-stone-700',
    Icon: ImageIcon,
    defaultLabel: 'Новые фото стройки',
  },
  seller_slow_response: {
    tone: 'bg-amber-50 text-[color:var(--color-semantic-warning)]',
    Icon: Clock,
    defaultLabel: 'Продавец отвечает медленно',
  },
};

export interface ChangeBadgeProps {
  type: ChangeEventType;
  label?: string;
  className?: string;
}

/**
 * ChangeBadge — Layer 7.12.
 * Renders a single change event on the Saved page card.
 * Per Design System §7.12 + AI_CONTRACT rule 5: amber for status, NEVER red.
 */
export function ChangeBadge({ type, label, className }: ChangeBadgeProps) {
  const cfg = CHANGE_CONFIG[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium',
        cfg.tone,
        className,
      )}
    >
      <cfg.Icon className="size-3" aria-hidden />
      {label ?? cfg.defaultLabel}
    </span>
  );
}
