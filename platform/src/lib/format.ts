/**
 * Format helpers for prices, sizes, and other display values.
 * All numeric outputs are designed for tabular-nums display.
 */

const PRICE_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
});

const M2_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
});

/** Convert dirams (1 TJS = 100 dirams) to TJS string with thin-space grouping. */
export function formatPriceTJS(priceDirams: bigint | number): string {
  const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
  return `${PRICE_FORMATTER.format(Math.round(tjs))} TJS`;
}

/** Convert dirams to a "1 200 000" style string without currency suffix. */
export function formatPriceNumber(priceDirams: bigint | number): string {
  const tjs = typeof priceDirams === 'bigint' ? Number(priceDirams) / 100 : priceDirams / 100;
  return PRICE_FORMATTER.format(Math.round(tjs));
}

export function formatM2(sizeM2: number): string {
  return `${M2_FORMATTER.format(sizeM2)} м²`;
}

export function formatFloor(floor: number, totalFloors: number | null): string {
  return totalFloors ? `${floor}/${totalFloors}` : String(floor);
}

/**
 * Russian noun pluralization for counts (1 квартира / 2 квартиры / 5 квартир).
 * Pass an array of three forms: [singular, few (2-4), many (5+)].
 */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** Two-digit zero-padded number — used for "сегодня в 09:32". */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const RU_MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

/**
 * Listing-card relative time. Hybrid pattern matching Avito/Cian:
 * - today/yesterday → with time-of-day ("сегодня в 14:32" / "вчера в 18:00").
 *   Time matters when fresh: morning vs evening posts feel different to a
 *   buyer who's shopping today.
 * - 2–30 days → relative ("5 дней назад"). Time of day no longer relevant.
 * - older → absolute date ("12 окт" or "12 окт 2025" if different year).
 *   "X месяцев назад" becomes too vague past a month — give the actual
 *   date back so the buyer can judge for themselves.
 */
export function formatPostedAgo(iso: string): string {
  const posted = new Date(iso);
  const ms = Date.now() - posted.getTime();
  const day = Math.floor(ms / 86_400_000);
  if (day < 1) return `сегодня в ${pad2(posted.getHours())}:${pad2(posted.getMinutes())}`;
  if (day === 1) return `вчера в ${pad2(posted.getHours())}:${pad2(posted.getMinutes())}`;
  if (day < 30) return `${day} ${pluralRu(day, ['день', 'дня', 'дней'])} назад`;
  // Absolute date — append year only when it's a different calendar year
  // than now (avoids the "12 окт 2026" clutter for current-year posts).
  const monthShort = RU_MONTHS_SHORT[posted.getMonth()]!;
  const sameYear = posted.getFullYear() === new Date().getFullYear();
  return sameYear
    ? `${posted.getDate()} ${monthShort}`
    : `${posted.getDate()} ${monthShort} ${posted.getFullYear()}`;
}
