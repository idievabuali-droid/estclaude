import { useTranslations } from 'next-intl';
import { formatPriceNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface InstallmentDisplayProps {
  monthlyDirams: bigint;
  firstPaymentPercent: number;
  termMonths: number;
  totalPriceDirams: bigint;
  className?: string;
  variant?: 'card' | 'inline';
}

/**
 * InstallmentDisplay — Layer 7.5.
 * AI_CONTRACT rule 4: NO interest rate ("% годовых"), NO calculator.
 * Shows monthly amount + first payment + duration only.
 */
export function InstallmentDisplay({
  monthlyDirams,
  firstPaymentPercent,
  termMonths,
  totalPriceDirams,
  className,
  variant = 'card',
}: InstallmentDisplayProps) {
  const t = useTranslations('Common');
  const firstPaymentDirams = (totalPriceDirams * BigInt(firstPaymentPercent)) / 100n;

  if (variant === 'inline') {
    return (
      <span className={cn('text-meta text-stone-700 tabular-nums', className)}>
        {t('from')} {formatPriceNumber(monthlyDirams)} TJS / мес · {firstPaymentPercent}% первый
        взнос · {termMonths} мес
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-stone-200 bg-stone-50 p-4',
        className,
      )}
    >
      <span className="text-meta font-medium text-stone-500">Рассрочка</span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-h2 font-semibold tabular-nums text-stone-900">
          {formatPriceNumber(monthlyDirams)} TJS
        </span>
        <span className="text-meta text-stone-500">в месяц</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-3">
        <div>
          <dt className="text-caption text-stone-500">Первый взнос</dt>
          <dd className="text-meta font-medium tabular-nums text-stone-900">
            {firstPaymentPercent}% · {formatPriceNumber(firstPaymentDirams)} TJS
          </dd>
        </div>
        <div>
          <dt className="text-caption text-stone-500">Срок</dt>
          <dd className="text-meta font-medium tabular-nums text-stone-900">{termMonths} месяцев</dd>
        </div>
      </dl>
    </div>
  );
}
