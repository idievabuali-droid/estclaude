/**
 * Parametric search-query parser for the home hero search box.
 *
 * Recognises common Russian patterns buyers type when they're shopping
 * by characteristics rather than location:
 *   - rooms count: "3 комнаты" / "3-к" / "3к" / "трёхкомнатная"
 *   - price ceiling: "до 200к" / "до 200 тыс" / "до 200000" / "до 500 тысяч"
 *   - price floor: "от 100к"
 *   - finishing: "с ремонтом" / "без ремонта" / "под ключ"
 *
 * Why a parser at all: the autocomplete service only matches names
 * (district names, building names, POI names). A buyer typing
 * "3 комнаты до 200к" gets zero results today and dead-ends. Mature
 * platforms (Cian, Avito, Bayut) recognise these patterns and route
 * the buyer to the apartments list with the right filters pre-applied.
 *
 * Conservative regex set — word-boundary required so "3-этажная" does
 * NOT mis-parse as rooms=3. Caps on ranges (rooms 1..9, price 1k..10000k)
 * so a typo can't blow out the URL with `priceMaxTjs=999999999999`.
 *
 * Pure function. Zero deps. Safe to call on every keystroke.
 */

export type ParsedQuery = {
  /** 1-9 rooms. Larger numbers fall through (treated as text remainder). */
  rooms?: number;
  /** TJS, raw integer. Caller decides display formatting. */
  priceMinTjs?: number;
  /** TJS, raw integer. */
  priceMaxTjs?: number;
  /** Subset of the listings.finishing_type enum we shipped in V1. */
  finishing?: 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated';
  /** What's left of the query after structural tokens are stripped.
   *  Trim before use. May be empty. The home page passes this as `?q=`
   *  so the destination list page can soft-filter by name/address. */
  remainder: string;
};

// ─── Rooms ────────────────────────────────────────────────────────
// Numeric forms: "3 комн", "3-к", "3к", "3 комнаты", "3-комнатная"
// The `\b` boundary + the explicit "комн|к(?!\w)" suffix is what
// stops "3-этажная" / "3 этаж" from matching.
const ROOMS_NUMERIC_RE = /\b([1-9])\s*-?\s*(?:комн[а-я]*|к(?!\w))/iu;
// Spelled-out forms in Russian; common spellings only (нет смысла
// гнаться за каждым склонением — exact-form > recall here).
const ROOMS_WORDS: Record<string, number> = {
  'однокомн': 1,
  'одно-комн': 1,
  'двух': 2,
  'двухкомн': 2,
  'двух-комн': 2,
  'трёх': 3,
  'трех': 3,
  'трёхкомн': 3,
  'трехкомн': 3,
  'четырёх': 4,
  'четырех': 4,
  'четырёхкомн': 4,
  'четырехкомн': 4,
  'пятикомн': 5,
};

// ─── Price ─────────────────────────────────────────────────────────
// "до 200к" / "до 200 тыс" / "до 200 тысяч" / "до 200000"
// Captures the number group + an optional thousand-suffix. If the
// suffix is present, multiply by 1000.
//
// Why `(?:^|\s)` instead of `\b`: JavaScript regex `\b` is ASCII-only
// (the `u` flag does NOT extend it), so `\bдо` between a space and
// the Cyrillic "д" never matches — both sides count as non-word.
// Explicit start-or-whitespace works regardless of script.
const PRICE_MAX_RE = /(?:^|\s)до\s+(\d+(?:[\s,.]?\d{3})*)\s*(к|тыс[а-я]*)?(?=\s|$|[.,;!?])/iu;
const PRICE_MIN_RE = /(?:^|\s)от\s+(\d+(?:[\s,.]?\d{3})*)\s*(к|тыс[а-я]*)?(?=\s|$|[.,;!?])/iu;
// Sanity bounds for prices in TJS (the platform's primary currency).
// Below 1 000 TJS is almost certainly a parse error; above 10 000 000
// TJS isn't a Vahdat-residential price, also a parse error. Both
// degrade by dropping the value (fall back to remainder).
const PRICE_MIN_BOUND = 1_000;
const PRICE_MAX_BOUND = 10_000_000;

// ─── Finishing ─────────────────────────────────────────────────────
// "с ремонтом" → full_finish (typical seller phrasing)
// "без ремонта" → no_finish
// "под ключ" → full_finish (synonym, common in TJ market)
// Same `\b` → `(?:^|\s)` swap as price regexes for Cyrillic-aware
// left-boundary matching.
const FINISHING_PATTERNS: Array<[RegExp, ParsedQuery['finishing']]> = [
  [/(?:^|\s)без\s+ремонт[а-я]*/iu, 'no_finish'],
  [/(?:^|\s)с\s+ремонт[а-я]*/iu, 'full_finish'],
  [/(?:^|\s)под\s+ключ(?=\s|$|[.,;!?])/iu, 'full_finish'],
  [/(?:^|\s)предчистов[а-я]*/iu, 'pre_finish'],
];

/** Parse a free-text query. Always returns an object — empty fields
 *  when nothing matches. `remainder` carries the un-parsed portion
 *  trimmed of recognised tokens. */
export function parseQuery(input: string): ParsedQuery {
  if (!input) return { remainder: '' };
  let remainder = input;
  const out: ParsedQuery = { remainder: '' };

  // Rooms — try numeric form first.
  const roomsNum = remainder.match(ROOMS_NUMERIC_RE);
  if (roomsNum) {
    const n = Number(roomsNum[1]);
    if (n >= 1 && n <= 9) {
      out.rooms = n;
      remainder = remainder.replace(roomsNum[0], ' ');
    }
  }
  // Then spelled-out words. Only if numeric didn't match (don't
  // double-stomp, "3 трёхкомнатная" is a typo not a buyer intent).
  if (out.rooms === undefined) {
    for (const [stem, n] of Object.entries(ROOMS_WORDS)) {
      const idx = remainder.toLowerCase().indexOf(stem);
      if (idx >= 0) {
        out.rooms = n;
        // Rough trim — strip the stem + any "комн" suffix attached.
        remainder = remainder.replace(/\b\S*комн[а-я]*/iu, ' ').replace(stem, ' ');
        break;
      }
    }
  }

  // Price max ("до X").
  const priceMax = remainder.match(PRICE_MAX_RE);
  if (priceMax && priceMax[1]) {
    const numStr = priceMax[1].replace(/[\s,.]/g, '');
    let n = Number(numStr);
    if (Number.isFinite(n)) {
      // Suffix "к" / "тыс" multiplies by 1000.
      if (priceMax[2]) n *= 1000;
      if (n >= PRICE_MIN_BOUND && n <= PRICE_MAX_BOUND) {
        out.priceMaxTjs = n;
        remainder = remainder.replace(priceMax[0], ' ');
      }
    }
  }
  // Price min ("от X").
  const priceMin = remainder.match(PRICE_MIN_RE);
  if (priceMin && priceMin[1]) {
    const numStr = priceMin[1].replace(/[\s,.]/g, '');
    let n = Number(numStr);
    if (Number.isFinite(n)) {
      if (priceMin[2]) n *= 1000;
      if (n >= PRICE_MIN_BOUND && n <= PRICE_MAX_BOUND) {
        out.priceMinTjs = n;
        remainder = remainder.replace(priceMin[0], ' ');
      }
    }
  }

  // Finishing — first match wins; "без ремонта" needs to win over
  // "с ремонтом" because both contain "ремонт", so the no-finish
  // pattern is listed first above.
  for (const [pattern, value] of FINISHING_PATTERNS) {
    if (pattern.test(remainder)) {
      out.finishing = value;
      remainder = remainder.replace(pattern, ' ');
      break;
    }
  }

  // Collapse whitespace; trim. The remainder is what /kvartiry's
  // soft text filter will receive as `?q=`.
  out.remainder = remainder.replace(/\s+/g, ' ').trim();
  return out;
}

/** True when the parsed query has at least one structural filter
 *  (rooms, price, finishing). Drives the home page's "Найти" routing
 *  decision: any structural hit → /kvartiry; pure text → /novostroyki. */
export function hasStructuralFilter(parsed: ParsedQuery): boolean {
  return !!(
    parsed.rooms ||
    parsed.priceMinTjs ||
    parsed.priceMaxTjs ||
    parsed.finishing
  );
}

/** Human-readable rendering of a parsed query for the dropdown
 *  "По характеристикам" row. Concise, sentence-cased, comma-joined.
 *  Returns null when nothing parametric was found. */
export function describeParsedQuery(parsed: ParsedQuery): string | null {
  const parts: string[] = [];
  if (parsed.rooms) parts.push(`${parsed.rooms} ${pluralRooms(parsed.rooms)}`);
  if (parsed.priceMinTjs && parsed.priceMaxTjs) {
    parts.push(`${formatTjs(parsed.priceMinTjs)} – ${formatTjs(parsed.priceMaxTjs)}`);
  } else if (parsed.priceMaxTjs) {
    parts.push(`до ${formatTjs(parsed.priceMaxTjs)}`);
  } else if (parsed.priceMinTjs) {
    parts.push(`от ${formatTjs(parsed.priceMinTjs)}`);
  }
  if (parsed.finishing) parts.push(finishingLabel(parsed.finishing));
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

function pluralRooms(n: number): string {
  if (n === 1) return 'комната';
  if (n >= 2 && n <= 4) return 'комнаты';
  return 'комнат';
}

function formatTjs(n: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(n)} TJS`;
}

function finishingLabel(f: NonNullable<ParsedQuery['finishing']>): string {
  switch (f) {
    case 'no_finish': return 'без ремонта';
    case 'pre_finish': return 'предчистовая';
    case 'full_finish': return 'с ремонтом';
    case 'owner_renovated': return 'отремонтировано владельцем';
  }
}
