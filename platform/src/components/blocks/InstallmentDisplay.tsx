import { useTranslations } from 'next-intl';
import { formatPriceNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PriceConversion } from './PriceConversion';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

export interface InstallmentDisplayProps {
  monthlyDirams: bigint;
  firstPaymentPercent: number;
  termMonths: number;
  totalPriceDirams: bigint;
  className?: string;
  variant?: 'card' | 'inline';
  /**
   * Diaspora currency (cookie-driven). When set + rates supplied,
   * the card variant pairs each TJS amount (monthly, first payment)
   * with its foreign-currency equivalent inline. The inline variant
   * deliberately omits conversions — it's already a long single-line
   * summary, and adding more makes it noisy. The buyer sees the full
   * conversion when they open the apartment detail page.
   */
  currency?: SupportedCurrency | null;
  rates?: ExchangeRates | null;
}

/**
 * InstallmentDisplay — Layer 7.5.
 * AI_CONTRACT rule 4: NO interest rate ("% годовых"), NO calculator.
 * Shows monthly amount + first payment + duration only.
 *
 * Why inline conversions matter HERE: a diaspora buyer saving from
 * Russia thinks in rubles per month. The single most actionable
 * number on this card is "how many ₽ do I send each month" — pairing
 * TJS with ≈ ₽ on the same line makes that arithmetic immediate.
 */
export function InstallmentDisplay({
  monthlyDirams,
  firstPaymentPercent,
  termMonths,
  totalPriceDirams,
  className,
  variant = 'card',
  currency,
  rates,
}: InstallmentDisplayProps) {
  const t = useTranslations('Common');
  const firstPaymentDirams = (totalPriceDirams * BigInt(firstPaymentPercent)) / 100n;
  const showConversion = currency != null && currency !== 'TJS' && rates != null;

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
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-h2 font-semibold tabular-nums text-stone-900">
          {formatPriceNumber(monthlyDirams)} TJS
        </span>
        {showConversion ? (
          <PriceConversion priceDirams={monthlyDirams} target={currency} rates={rates} />
        ) : null}
        <span className="text-meta text-stone-500">в месяц</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-3">
        <div>
          <dt className="text-caption text-stone-500">Первый взнос</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2 text-meta font-medium tabular-nums text-stone-900">
            <span>
              {firstPaymentPercent}% · {formatPriceNumber(firstPaymentDirams)} TJS
            </span>
            {showConversion ? (
              <PriceConversion priceDirams={firstPaymentDirams} target={currency} rates={rates} />
            ) : null}
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
