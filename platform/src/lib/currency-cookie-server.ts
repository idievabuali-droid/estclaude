/**
 * Server-only cookie reader for the diaspora currency preference.
 * Kept separate from `currency-cookie.ts` so `next/headers` doesn't
 * leak into client bundles via the picker's writer import.
 */
import { cookies } from 'next/headers';
import { isSupportedCurrency, type SupportedCurrency } from '@/services/currency';
import { CURRENCY_COOKIE } from './currency-cookie';

/** Returns null when no preference is set so callers can decide
 *  whether to render the conversion line. */
export async function readCurrencyCookie(): Promise<SupportedCurrency | null> {
  const store = await cookies();
  const raw = store.get(CURRENCY_COOKIE)?.value;
  return isSupportedCurrency(raw) ? raw : null;
}
