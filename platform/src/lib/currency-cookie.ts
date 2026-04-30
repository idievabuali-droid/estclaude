/**
 * Currency cookie — client-safe helpers (constants + browser write/clear).
 *
 * The server-side reader lives in `currency-cookie-server.ts` to keep the
 * `next/headers` import out of client bundles. Importing this file from
 * either a server or a client component is safe.
 */
import type { SupportedCurrency } from '@/services/currency';

export const CURRENCY_COOKIE = 'currency';
export const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Client-side write. Used by the picker. */
export function writeCurrencyCookie(value: SupportedCurrency): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CURRENCY_COOKIE}=${value}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}; samesite=lax`;
}

/** Client-side clear (back to TJS-only display). */
export function clearCurrencyCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CURRENCY_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
