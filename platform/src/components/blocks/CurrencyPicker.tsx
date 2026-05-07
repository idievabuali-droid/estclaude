'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  type SupportedCurrency,
} from '@/services/currency';
import { writeCurrencyCookie, clearCurrencyCookie } from '@/lib/currency-cookie';

export interface CurrencyPickerProps {
  /** Server-read initial value so the first paint matches the cookie. */
  initial: SupportedCurrency | null;
  /** Optional rate sample shown beneath each option in the picker
   *  (e.g. "1 TJS ≈ 0.13 RUB"). Not currently used in the segmented
   *  layout — kept on the prop signature so callers don't break. */
  sampleRates?: Partial<Record<SupportedCurrency, number>>;
}

/**
 * Segmented control for the diaspora currency choice. Per the senior-
 * design prescription:
 *
 *   "The currency toggle is currently a plain row. Make it a proper
 *    segmented control with country flags + currency codes — TJS /
 *    RUB / AED / USD as horizontal pills, the active one in terracotta.
 *    Add a small italic disclaimer below in serif: 'Курс ориентировочный.
 *    Расчёт в TJS.'"
 *
 * Replaces the prior compact dropdown (globe + chevron) on /diaspora.
 * Segmented pills make the choice visible at a glance — diaspora
 * buyers see the supported currencies without having to discover the
 * dropdown — and the active currency reads as a deliberate brand
 * moment in terracotta filled.
 *
 * The dropdown variant is gone; this is the single canonical
 * CurrencyPicker. Mobile: pills wrap to a second row when needed.
 *
 * Choice persists in a cookie so foreign-currency display follows
 * the visitor across pages. Selecting "TJS" clears the cookie. After
 * change, refreshes server-rendered prices so every BuildingCard /
 * ListingCard on the page picks up the new currency without a hard
 * reload.
 */
export function CurrencyPicker({ initial }: CurrencyPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SupportedCurrency>(initial ?? 'TJS');
  const [pending, startTransition] = useTransition();

  function pick(cur: SupportedCurrency) {
    if (cur === selected) return;
    setSelected(cur);
    if (cur === 'TJS') clearCurrencyCookie();
    else writeCurrencyCookie(cur);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
        Валюта
      </span>
      {/* Segmented pills row. role="tablist" is the closest semantic
          (tablist of mutually-exclusive options); each pill is a tab. */}
      <div
        role="tablist"
        aria-label="Валюта"
        className="flex flex-wrap items-center gap-1.5 rounded-full border border-stone-200 bg-white p-1"
      >
        {SUPPORTED_CURRENCIES.map((cur) => {
          const active = selected === cur;
          const meta = CURRENCY_LABELS[cur];
          return (
            <button
              key={cur}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pick(cur)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-meta font-semibold tabular-nums transition-colors',
                active
                  ? 'bg-terracotta-600 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-50',
              )}
            >
              <span aria-hidden>{meta.flag}</span>
              <span>{cur}</span>
            </button>
          );
        })}
      </div>
      {/* Italic serif disclaimer per prescription — quietly editorial,
          reads as honest fine print rather than alarmist legalese. */}
      <p
        className="text-caption italic text-stone-500"
        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
      >
        {pending ? (
          <span>обновление…</span>
        ) : (
          <span>Курс ориентировочный. Расчёт в TJS.</span>
        )}
      </p>
    </div>
  );
}
