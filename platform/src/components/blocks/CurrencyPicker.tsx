'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Globe2, ChevronDown, Check } from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_LABELS,
  type SupportedCurrency,
} from '@/services/currency';
import { writeCurrencyCookie, clearCurrencyCookie } from '@/lib/currency-cookie';

export interface CurrencyPickerProps {
  /** Server-read initial value so the first paint matches the cookie. */
  initial: SupportedCurrency | null;
  /** Optional rate sample shown next to each option in the dropdown,
   *  e.g. "1 TJS ≈ 0.13 RUB". Helps diaspora visitors trust the
   *  conversion they're about to apply. */
  sampleRates?: Partial<Record<SupportedCurrency, number>>;
}

/**
 * Compact currency dropdown for the diaspora segment. Closed state is
 * a single 36px-tall pill: globe icon + flag + currency code + chevron.
 * Tapping opens a small menu with all supported currencies + their
 * sample rate against TJS.
 *
 * Choice persists in a cookie so foreign-currency display follows the
 * visitor across pages. Selecting "TJS" clears the cookie (revert to
 * default behaviour). After change, refreshes server-rendered prices
 * via router.refresh() so every BuildingCard / ListingCard on the
 * page picks up the new currency without a hard reload.
 *
 * Why a dropdown rather than a chip row: the previous chip-row variant
 * took ~150px of vertical space just to expose 6 currencies. Most
 * visitors only set their currency once per session — that decision
 * doesn't deserve a permanent banner. Compact button + popover honors
 * how rarely it's used.
 */
export function CurrencyPicker({ initial, sampleRates }: CurrencyPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SupportedCurrency>(initial ?? 'TJS');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Outside-click close — matches every other dropdown / popover on
  // the platform (PriceChip, MultiSelectChip, etc.).
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function pick(cur: SupportedCurrency) {
    setSelected(cur);
    setOpen(false);
    if (cur === 'TJS') clearCurrencyCookie();
    else writeCurrencyCookie(cur);
    startTransition(() => router.refresh());
  }

  const selectedMeta = CURRENCY_LABELS[selected];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-meta text-stone-700">Показать цены в:</span>
      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-50"
        >
          <Globe2 className="size-4 text-stone-500" />
          <span aria-hidden>{selectedMeta.flag}</span>
          <span>{selected}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>

        {open ? (
          <ul
            role="listbox"
            aria-label="Валюта"
            className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
          >
            {SUPPORTED_CURRENCIES.map((cur) => {
              const active = selected === cur;
              const meta = CURRENCY_LABELS[cur];
              const rate = sampleRates?.[cur];
              return (
                <li key={cur}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(cur)}
                    className={
                      'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-meta font-medium transition-colors ' +
                      (active
                        ? 'bg-terracotta-50 text-terracotta-800'
                        : 'text-stone-900 hover:bg-stone-50')
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden>{meta.flag}</span>
                      <span className="tabular-nums">{cur}</span>
                      <span className="text-caption font-normal text-stone-500">
                        {meta.label}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      {rate && cur !== 'TJS' ? (
                        <span className="text-caption text-stone-400 tabular-nums">
                          1≈{rate.toFixed(rate < 1 ? 4 : 2)}
                        </span>
                      ) : null}
                      {active ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {pending ? (
        <span className="text-caption text-stone-400">обновление…</span>
      ) : (
        <span className="text-caption text-stone-500">
          Курс ориентировочный. Расчёт в TJS.
        </span>
      )}
    </div>
  );
}
