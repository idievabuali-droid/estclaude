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

const RU_MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

/** Tajikistan timezone (UTC+5, no DST). All "today/yesterday/X days ago"
 *  comparisons are done from a buyer's perspective in Dushanbe time —
 *  not the server's UTC clock. Otherwise a listing posted at 8pm in
 *  Tajikistan (3pm UTC) and viewed at 7am next morning Tajikistan
 *  (2am UTC) would show "сегодня" because UTC sees it as the same day. */
const TAJIK_TZ = 'Asia/Dushanbe';

/** Get year/month/day/hour/minute components in Tajikistan time. */
function tajikParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TAJIK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);
  return {
    year: get('year'),
    month: get('month') - 1, // 0-indexed to match Date API conventions
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
  };
}

/** Two-digit zero-padded number — used for "сегодня в 09:32". */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Listing-card relative time. Hybrid pattern matching Avito/Cian:
 * - today/yesterday → with time-of-day in Tajikistan time
 *   ("сегодня в 14:32" / "вчера в 18:00"). The today/yesterday
 *   boundary is the calendar-day midnight in Dushanbe, not a 24-hour
 *   sliding window — a listing posted yesterday at 11pm should say
 *   "вчера" today at 9am, not "сегодня".
 * - 2–30 days → relative ("5 дней назад").
 * - older → absolute date in Tajik time ("12 окт" or "12 окт 2025").
 */
export function formatPostedAgo(iso: string): string {
  const postedParts = tajikParts(new Date(iso));
  const nowParts = tajikParts(new Date());

  // Calendar-day diff in Tajikistan time.
  const postedMidnight = Date.UTC(postedParts.year, postedParts.month, postedParts.day);
  const nowMidnight = Date.UTC(nowParts.year, nowParts.month, nowParts.day);
  const dayDiff = Math.floor((nowMidnight - postedMidnight) / 86_400_000);

  const timeOfDay = `${pad2(postedParts.hour)}:${pad2(postedParts.minute)}`;

  if (dayDiff <= 0) return `сегодня в ${timeOfDay}`;
  if (dayDiff === 1) return `вчера в ${timeOfDay}`;
  if (dayDiff < 30) return `${dayDiff} ${pluralRu(dayDiff, ['день', 'дня', 'дней'])} назад`;

  // Absolute date — append year only when different from current year.
  const monthShort = RU_MONTHS_SHORT[postedParts.month]!;
  const sameYear = postedParts.year === nowParts.year;
  return sameYear
    ? `${postedParts.day} ${monthShort}`
    : `${postedParts.day} ${monthShort} ${postedParts.year}`;
}
