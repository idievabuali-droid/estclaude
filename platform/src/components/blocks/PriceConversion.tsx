import { convertDiramsTo, formatForeignAmount, type ExchangeRates, type SupportedCurrency } from '@/services/currency';

export interface PriceConversionProps {
  priceDirams: bigint | number;
  target: SupportedCurrency;
  rates: ExchangeRates;
  /** Visual size — `inline` for cards, `block` for detail pages. */
  variant?: 'inline' | 'block';
  /** When true, appends " / м²" to the converted amount. */
  perM2?: boolean;
  className?: string;
}

/**
 * Foreign-currency equivalent shown beneath a TJS price. Renders nothing
 * when the target equals TJS (no conversion needed) or the rate is
 * missing (fail-soft from the rates service).
 *
 * Always paired with a "курс ориентировочный" disclaimer somewhere on
 * the page so we don't mislead — settlement is in TJS only.
 */
export function PriceConversion({
  priceDirams,
  target,
  rates,
  variant = 'inline',
  perM2,
  className,
}: PriceConversionProps) {
  if (target === 'TJS') return null;
  const converted = convertDiramsTo(priceDirams, target, rates);
  if (converted == null) return null;

  const sizeClass = variant === 'block' ? 'text-meta' : 'text-caption';
  return (
    <span
      className={
        'inline-flex items-center gap-1 tabular-nums text-stone-500 ' +
        sizeClass +
        (className ? ' ' + className : '')
      }
      title="Курс ориентировочный. Расчёт в сомони."
    >
      ≈ {formatForeignAmount(converted, target)}{perM2 ? ' / м²' : ''}
    </span>
  );
}
