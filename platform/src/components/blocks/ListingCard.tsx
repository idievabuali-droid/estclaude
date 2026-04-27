'use client';

import { Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';
import { AppChip } from '@/components/primitives';
import { SourceChip } from './SourceChip';
import { VerificationBadge } from './VerificationBadge';
import { FairnessIndicator, computeFairness, type FairnessLevel } from './FairnessIndicator';
import { InstallmentDisplay } from './InstallmentDisplay';
import { CompareToggle } from './CompareToggle';
import { SaveToggle } from './SaveToggle';
import type { MockListing, MockBuilding } from '@/lib/mock';

const FINISHING_TONE = {
  no_finish: 'finishing-no-finish',
  pre_finish: 'finishing-pre-finish',
  full_finish: 'finishing-full-finish',
  owner_renovated: 'finishing-owner-renovated',
} as const;

export interface ListingCardProps {
  listing: MockListing;
  building: MockBuilding;
  developerVerified: boolean;
  districtMedianPerM2?: number | null;
  districtSampleSize?: number;
  hideBuildingName?: boolean;
  className?: string;
}

/**
 * ListingCard — Layer 7.7.
 * The most-used card on the platform. Renders one apartment listing with
 * source chip, verification badge, fairness signal, finishing chip, price,
 * and installment hint when available.
 *
 * AI_CONTRACT rule 3: SourceChip is mandatory. AI_CONTRACT rule 8: source
 * icons via Lucide (handled inside SourceChip).
 */
export function ListingCard({
  listing,
  building,
  developerVerified,
  districtMedianPerM2,
  districtSampleSize = 0,
  hideBuildingName,
  className,
}: ListingCardProps) {
  const tCommon = useTranslations('Common');
  const tFinishing = useTranslations('Finishing');

  const fairness =
    districtMedianPerM2 != null
      ? computeFairness(Number(listing.price_per_m2_dirams), districtMedianPerM2, districtSampleSize)
      : null;

  return (
    <Link
      href={`/kvartira/${listing.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-md border border-stone-200 bg-white transition-colors',
        'hover:border-stone-300 hover:shadow-sm',
        'focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
        className,
      )}
    >
      {/* Cover photo placeholder — colored block with overlay so it doesn't look like a wireframe */}
      <div
        className="relative aspect-[4/3] w-full"
        style={{ backgroundColor: listing.cover_color }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
        {/* Big rooms+m² overlay so empty placeholder feels intentional */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-h1 font-semibold text-white drop-shadow-sm tabular-nums">
            {listing.rooms_count}-комн
          </span>
          <span className="text-meta font-medium text-white/85 tabular-nums">
            {formatM2(listing.size_m2)}
          </span>
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <SourceChip source={listing.source_type} />
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <SaveToggle type="listing" id={listing.id} />
          <CompareToggle type="listings" id={listing.id} />
        </div>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-sm bg-stone-900/70 px-2 py-1 text-caption font-medium text-white tabular-nums">
          <Layers className="size-3" /> {formatFloor(listing.floor_number, listing.total_floors)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Row 1: verification badge above price so long "Проверенный застройщик" doesn't squeeze price */}
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge
            tier={listing.verification_tier}
            developerVerified={listing.source_type === 'developer' && developerVerified}
          />
        </div>

        {/* Row 2: price (full width, no competing badge) */}
        <div className="flex flex-col">
          <span className="text-h2 font-semibold tabular-nums text-stone-900">
            {formatPriceNumber(listing.price_total_dirams)} TJS
          </span>
          <span className="text-caption text-stone-500 tabular-nums">
            {formatPriceNumber(listing.price_per_m2_dirams)} TJS / м²
          </span>
        </div>

        {/* Row 2: rooms + size + finishing */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta font-medium text-stone-700 tabular-nums">
            {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
          </span>
          <AppChip
            asStatic
            tone={FINISHING_TONE[listing.finishing_type]}
          >
            {tFinishing(listing.finishing_type)}
          </AppChip>
        </div>

        {/* Row 3: building name (linked context) */}
        {!hideBuildingName ? (
          <span className="text-meta text-stone-500">
            {building.name.ru} · {building.address.ru}
          </span>
        ) : null}

        {/* Row 4: fairness */}
        {fairness ? (
          <FairnessIndicator level={fairness.level as FairnessLevel} deltaPercent={fairness.deltaPercent} />
        ) : null}

        {/* Row 5: installment */}
        {listing.installment_available && listing.installment_monthly_amount_dirams ? (
          <InstallmentDisplay
            variant="inline"
            monthlyDirams={listing.installment_monthly_amount_dirams}
            firstPaymentPercent={listing.installment_first_payment_percent ?? 30}
            termMonths={listing.installment_term_months ?? 84}
            totalPriceDirams={listing.price_total_dirams}
          />
        ) : (
          <span className="text-meta text-stone-400">{tCommon('save')}</span>
        )}
      </div>
    </Link>
  );
}
