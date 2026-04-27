import { Phone, BadgeCheck, ShieldCheck, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppBadge } from '@/components/primitives';
import type { VerificationTier } from '@/types/domain';

type BadgeConfig = {
  variant: 'tier-1' | 'tier-2' | 'tier-3' | 'tier-developer';
  Icon: typeof Phone;
  labelKey: 'tier1' | 'tier2' | 'tier3' | 'developer';
};

const TIER_CONFIG: Record<VerificationTier, BadgeConfig> = {
  phone_verified: { variant: 'tier-1', Icon: Phone, labelKey: 'tier1' },
  profile_verified: { variant: 'tier-2', Icon: BadgeCheck, labelKey: 'tier2' },
  listing_verified: { variant: 'tier-3', Icon: ShieldCheck, labelKey: 'tier3' },
};

const DEVELOPER_CONFIG: BadgeConfig = {
  variant: 'tier-developer',
  Icon: Award,
  labelKey: 'developer',
};

export interface VerificationBadgeProps {
  tier: VerificationTier;
  /** When true, replaces tier 1/2/3 with the verified-developer badge per Blueprint §2.3. */
  developerVerified?: boolean;
  className?: string;
}

/**
 * VerificationBadge — Layer 7.3.
 * Renders the listing's trust tier honestly. Per Blueprint §2.3, developer
 * listings show the developer badge instead of the per-listing tier when the
 * developer is verified.
 */
export function VerificationBadge({ tier, developerVerified, className }: VerificationBadgeProps) {
  const t = useTranslations('Verification');
  const config = developerVerified ? DEVELOPER_CONFIG : TIER_CONFIG[tier];
  const { variant, Icon, labelKey } = config;
  return (
    <AppBadge variant={variant} icon={<Icon className="size-3.5" aria-hidden />} className={className}>
      {t(labelKey)}
    </AppBadge>
  );
}
