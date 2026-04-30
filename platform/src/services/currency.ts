/**
 * Currency service — supports diaspora segment (buyers in Russia,
 * Europe, US, etc.) by exposing TJS prices in their home currency.
 *
 * Source: open.er-api.com (free, no API key, daily-updated rates).
 * Cached at the fetch layer for 24h — property prices don't need
 * intraday precision and we don't want to hammer the upstream.
 *
 * TJS stays the source of truth — settlement is always in somoni.
 * Foreign-currency display is INDICATIVE and surfaced with a
 * "курс ориентировочный" disclaimer near every conversion.
 */

/**
 * Tight whitelist of currencies — only the ones diaspora buyers
 * actually think in. Kept short on purpose so the picker stays a
 * one-glance choice, not a scrollable list.
 *
 * RUB: Russia — by far the largest Tajik diaspora.
 * USD/EUR: universal benchmarks + EU residents.
 * GBP: UK residents.
 */
export type SupportedCurrency = 'TJS' | 'RUB' | 'USD' | 'EUR' | 'GBP';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = [
  'TJS',
  'RUB',
  'USD',
  'EUR',
  'GBP',
] as const;

export const CURRENCY_LABELS: Record<SupportedCurrency, { label: string; symbol: string; flag: string }> = {
  TJS: { label: 'Сомони', symbol: 'TJS', flag: '🇹🇯' },
  RUB: { label: 'Рубль', symbol: '₽', flag: '🇷🇺' },
  USD: { label: 'Доллар', symbol: '$', flag: '🇺🇸' },
  EUR: { label: 'Евро', symbol: '€', flag: '🇪🇺' },
  GBP: { label: 'Фунт', symbol: '£', flag: '🇬🇧' },
};

export type ExchangeRates = {
  /** Base is always TJS — values are "1 TJS = X target". */
  base: 'TJS';
  /** ISO date the rates were last updated upstream. */
  updatedAt: string;
  /** TJS → target multiplier. TJS itself is 1. */
  rates: Partial<Record<SupportedCurrency, number>>;
};

const FALLBACK: ExchangeRates = {
  base: 'TJS',
  updatedAt: new Date(0).toISOString(),
  rates: { TJS: 1 },
};

type ApiResponse = {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
};

/**
 * Fetches current TJS-base exchange rates. Cached for 24h via Next's
 * fetch revalidate. Returns a fallback (TJS-only) if the upstream
 * is unreachable so callers can still render — the conversion line
 * just won't appear.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/TJS', {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as ApiResponse;
    if (data.result !== 'success' || data.base_code !== 'TJS') return FALLBACK;

    const rates: ExchangeRates['rates'] = { TJS: 1 };
    for (const cur of SUPPORTED_CURRENCIES) {
      if (cur === 'TJS') continue;
      const r = data.rates[cur];
      if (typeof r === 'number' && r > 0) rates[cur] = r;
    }
    return {
      base: 'TJS',
      updatedAt: data.time_last_update_utc,
      rates,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * Convert a price expressed in dirams (1 TJS = 100 dirams) to the
 * target currency major unit. Returns null if the rate is missing
 * (e.g. TJS-only fallback) so callers can hide the line.
 */
export function convertDiramsTo(
  priceDirams: bigint | number,
  target: SupportedCurrency,
  rates: ExchangeRates,
): number | null {
  if (target === 'TJS') {
    const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
    return tjs;
  }
  const rate = rates.rates[target];
  if (rate == null) return null;
  const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
  return tjs * rate;
}

const FOREIGN_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

/**
 * Format a converted amount for display. We round to whole units
 * because property prices are large enough that decimals add noise.
 */
export function formatForeignAmount(amount: number, target: SupportedCurrency): string {
  const symbol = CURRENCY_LABELS[target].symbol;
  return `${FOREIGN_FORMATTER.format(Math.round(amount))} ${symbol}`;
}

/** Type-guard: narrows arbitrary string to SupportedCurrency. */
export function isSupportedCurrency(value: string | undefined | null): value is SupportedCurrency {
  return value != null && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
