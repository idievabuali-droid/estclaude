/**
 * Human-readable formatting for saved searches.
 *
 * `displayNameFromFilters` produces the short label shown in the
 * dropdown ("1-комн до 200к TJS · Гулистон"). It picks 2-3 of the
 * most distinctive filter values rather than trying to express
 * everything — long labels are unreadable.
 *
 * `formatMatchMessage` produces the Telegram body sent when a new
 * listing matches a subscribed search.
 */

const FINISHING_LABEL: Record<string, string> = {
  no_finish: 'без ремонта',
  pre_finish: 'предчистовая',
  full_finish: 'с ремонтом',
  owner_renovated: 'отремонтировано',
};

const STATUS_LABEL: Record<string, string> = {
  announced: 'котлован',
  under_construction: 'строится',
  near_completion: 'почти готов',
  delivered: 'сдан',
};

function fmtPriceTjs(value: string): string {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}М`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}к`;
  return String(n);
}

export function displayNameFromFilters(
  page: 'novostroyki' | 'kvartiry',
  filters: Record<string, string | string[] | undefined>,
): string {
  const parts: string[] = [];

  if (page === 'kvartiry') {
    const rooms = (filters.rooms as string)?.split(',').filter(Boolean) ?? [];
    if (rooms.length) parts.push(`${rooms.join('/')}-комн`);
    const finishing = (filters.finishing as string)?.split(',').filter(Boolean) ?? [];
    if (finishing.length === 1) parts.push(FINISHING_LABEL[finishing[0]!] ?? finishing[0]!);
    if (filters.price_to) parts.push(`до ${fmtPriceTjs(filters.price_to as string)} TJS`);
    else if (filters.price_from) parts.push(`от ${fmtPriceTjs(filters.price_from as string)} TJS`);
    if (filters.size_from || filters.size_to) {
      const a = filters.size_from ?? '';
      const b = filters.size_to ?? '';
      parts.push(`${a}–${b}м²`);
    }
  } else {
    const status = (filters.status as string)?.split(',').filter(Boolean) ?? [];
    if (status.length === 1) parts.push(STATUS_LABEL[status[0]!] ?? status[0]!);
    if (filters.price_per_m2_to) {
      parts.push(`до ${fmtPriceTjs(filters.price_per_m2_to as string)} TJS/м²`);
    }
    const handover = (filters.handover as string)?.split(',').filter(Boolean) ?? [];
    if (handover.length === 1) parts.push(`сдача ${handover[0]}`);
    const amenities = (filters.amenities as string)?.split(',').filter(Boolean) ?? [];
    if (amenities.length === 1) parts.push(amenities[0]!);
  }

  // District applies on both pages — when shown, it's distinctive.
  const district = (filters.district as string)?.split(',').filter(Boolean) ?? [];
  if (district.length === 1) parts.push(district[0]!);

  return parts.length ? parts.join(' · ') : 'Сохранённый поиск';
}

export interface MatchMessageInput {
  search_display_name: string;
  building_name: string;
  rooms_count: number;
  size_m2: number;
  price_total_tjs: number;
  listing_slug: string;
  origin: string; // e.g. https://zhk.tj
}

/** Telegram body for a direct-to-buyer match alert. */
export function formatMatchMessage(input: MatchMessageInput): string {
  const url = `${input.origin}/ru/kvartira/${input.listing_slug}`;
  const priceFmt = new Intl.NumberFormat('ru-RU').format(input.price_total_tjs);
  return [
    `🏠 Новая квартира по вашему поиску: «${input.search_display_name}»`,
    '',
    `${input.building_name} · ${input.rooms_count}-комн · ${input.size_m2} м²`,
    `${priceFmt} TJS`,
    '',
    url,
  ].join('\n');
}

/** Telegram body to ping the founder for a phone-fallback match. */
export function formatFounderRelayMessage(input: MatchMessageInput & { phone: string }): string {
  const url = `${input.origin}/ru/kvartira/${input.listing_slug}`;
  const priceFmt = new Intl.NumberFormat('ru-RU').format(input.price_total_tjs);
  return [
    `📲 Новый матч — нужно написать в WhatsApp`,
    `${input.phone}`,
    `По поиску: «${input.search_display_name}»`,
    '',
    `${input.building_name} · ${input.rooms_count}-комн · ${input.size_m2} м² · ${priceFmt} TJS`,
    url,
  ].join('\n');
}
