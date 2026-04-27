import { Building2, User, Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppChip } from '@/components/primitives';
import type { SourceType } from '@/types/domain';

const SOURCE_CONFIG: Record<
  SourceType,
  {
    tone: 'source-developer' | 'source-owner' | 'source-intermediary';
    Icon: typeof Building2;
    labelKey: 'developer' | 'owner' | 'intermediary';
  }
> = {
  developer: { tone: 'source-developer', Icon: Building2, labelKey: 'developer' },
  owner: { tone: 'source-owner', Icon: User, labelKey: 'owner' },
  intermediary: { tone: 'source-intermediary', Icon: Handshake, labelKey: 'intermediary' },
};

export interface SourceChipProps {
  source: SourceType;
  className?: string;
}

/**
 * SourceChip — Layer 7.2.
 * Mandatory on every listing representation per AI_CONTRACT rule 3.
 * Icon is Lucide (locked in Design System §7.16). Color reinforces meaning;
 * text label always present for accessibility (Layer 2 rule 4).
 */
export function SourceChip({ source, className }: SourceChipProps) {
  const t = useTranslations('Source');
  const { tone, Icon, labelKey } = SOURCE_CONFIG[source];
  return (
    <AppChip
      asStatic
      tone={tone}
      icon={<Icon className="size-3.5" aria-hidden />}
      className={className}
    >
      {t(labelKey)}
    </AppChip>
  );
}
