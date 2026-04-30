'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Globe2, Check } from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  type SupportedCurrency,
} from '@/services/currency';
import { writeCurrencyCookie, clearCurrencyCookie } from '@/lib/currency-cookie';

export interface CurrencyPickerProps {
  /** Server-read initial value so the first paint matches the cookie. */
  initial: SupportedCurrency | null;
  /** Optional rate sample shown beside the picker, e.g. "1 RUB = 0.13 TJS". */
  sampleRates?: Partial<Record<SupportedCurrency, number>>;
}

/**
 * Currency picker for the diaspora segment. Persists choice in a cookie
 * so foreign-currency display follows the visitor across the platform.
 *
 * Selecting "TJS" clears the cookie (revert to default behaviour).
 * Refreshes server-rendered prices via router.refresh() after change.
 */
export function CurrencyPicker({ initial, sampleRates }: CurrencyPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SupportedCurrency>(initial ?? 'TJS');
  const [pending, startTransition] = useTransition();

  function pick(cur: SupportedCurrency) {
    setSelected(cur);
    if (cur === 'TJS') clearCurrencyCookie();
    else writeCurrencyCookie(cur);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Globe2 className="size-4 text-stone-500" />
        <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
          Показать цены в
        </span>
        {pending ? (
          <span className="text-caption text-stone-400">обновление…</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_CURRENCIES.map((cur) => {
          const active = selected === cur;
          const meta = CURRENCY_LABELS[cur];
          const rate = sampleRates?.[cur];
          return (
            <button
              key={cur}
              type="button"
              onClick={() => pick(cur)}
              aria-pressed={active}
              className={
                'inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 text-meta font-medium transition-colors ' +
                (active
                  ? 'border-terracotta-300 bg-terracotta-50 text-terracotta-800'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50')
              }
            >
              <span aria-hidden>{meta.flag}</span>
              <span>{cur}</span>
              {rate && cur !== 'TJS' ? (
                <span className="text-caption text-stone-400 tabular-nums">
                  ·&nbsp;1&nbsp;TJS&nbsp;≈&nbsp;{rate.toFixed(rate < 1 ? 4 : 2)}
                </span>
              ) : null}
              {active ? <Check className="size-3.5" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <p className="text-caption text-stone-500">
        Курс ориентировочный. Все сделки рассчитываются в сомони (TJS).
      </p>
    </div>
  );
}
