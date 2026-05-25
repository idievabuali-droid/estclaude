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
 * Localize the handover-quarter string for display only — DB stores
 * the canonical Latin form (`YYYY-Q[1-4]`, e.g. "2026-Q4") so parsers
 * in `lib/building-stages.ts`, `services/buildings.ts`, and
 * `lib/filters/buildings.ts` keep working untouched. This function
 * substitutes the Latin "Q" with Cyrillic "К" for Russian-speaking
 * buyers ("2026-К4"), matching the rest of the platform's typography.
 *
 * Pass-through behaviour for null / unrecognised values so callers
 * can use it inline next to fallbacks like `?? '—'`.
 */
export function formatHandoverQuarter(quarter: string | null | undefined): string | null {
  if (!quarter) return null;
  // Match canonical YYYY-Q[1-4]; anything else passes through unchanged
  // so a one-off legacy value doesn't crash a card render.
  return quarter.replace(/^(\d{4})-Q([1-4])$/, '$1-К$2');
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

/**
 * Builds a building's secondary location label (district · address) but drops
 * the address when it just echoes the building name — for street-named
 * buildings like Хиёбони Рудаки on Хиёбони Рудаки where the H1/H3 already
 * shows the name verbatim. Compared case-insensitively after trim.
 *
 * Used wherever a building card shows a secondary geographic line: the §8
 * card on /kvartira (2ced31d), the /zhk hero + sticky bar (aa51341), and
 * BuildingCard's address row in list surfaces.
 */
export function locationLabel(
  district: string,
  address: string,
  buildingName: string,
): string {
  const addr = address.trim();
  if (addr.length === 0) return district;
  if (addr.toLowerCase() === buildingName.trim().toLowerCase()) return district;
  return `${district} · ${address}`;
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

/**
 * Both relative AND absolute date — "5 дней назад · 12 окт" — so a
 * detail-page reader can spot stale listings (relative for casual scan,
 * absolute for trust check). For listing/building cards keep
 * `formatPostedAgo` because space is tight there.
 *
 * Falls back to just the absolute form for ≥30-day-old items, since
 * the relative form ("…назад") becomes the absolute date anyway.
 */
export function formatPostedAgoLong(iso: string): string {
  const relative = formatPostedAgo(iso);
  const postedParts = tajikParts(new Date(iso));
  const nowParts = tajikParts(new Date());
  const postedMidnight = Date.UTC(postedParts.year, postedParts.month, postedParts.day);
  const nowMidnight = Date.UTC(nowParts.year, nowParts.month, nowParts.day);
  const dayDiff = Math.floor((nowMidnight - postedMidnight) / 86_400_000);
  if (dayDiff < 2) return relative; // сегодня/вчера already include time
  if (dayDiff >= 30) return relative; // already absolute
  // 2–29 days: append the absolute date as a secondary cue.
  const monthShort = RU_MONTHS_SHORT[postedParts.month]!;
  return `${relative} · ${postedParts.day} ${monthShort}`;
}
