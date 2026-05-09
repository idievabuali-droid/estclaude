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
    if (filters.monthly_to) {
      // Installment buyers think in monthly payment first; show that
      // ahead of total price so the summary matches how they framed
      // the wizard answer ("я могу 4 000 в месяц"). The platform
      // also auto-narrows to installment_available=true when this
      // param is set, so the chip implies "with installment".
      parts.push(`до ${fmtPriceTjs(filters.monthly_to as string)} TJS / мес`);
    } else if (filters.price_to) {
      parts.push(`до ${fmtPriceTjs(filters.price_to as string)} TJS`);
    } else if (filters.price_from) {
      parts.push(`от ${fmtPriceTjs(filters.price_from as string)} TJS`);
    }
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

  // LocationSearch state — when present, it's the most distinctive
  // signal in the search and goes FIRST so the title reads naturally:
  // "рядом с Школа №4 · 2-комн · до 350к TJS".
  const nearLabel = filters.near_label as string | undefined;
  if (nearLabel) parts.unshift(`рядом с ${nearLabel}`);

  return parts.length ? parts.join(' · ') : 'Сохранённый поиск';
}

export interface MatchMessageInput {
  search_display_name: string;
  building_name: string;
  rooms_count: number;
  size_m2: number;
  price_total_tjs: number;
  listing_slug: string;
  origin: string; // e.g. https://vafo.tj
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

/**
 * Buyer-facing WhatsApp message body — what the founder sends to the
 * buyer when a match fires. Written so it reads as a normal personal
 * "thought of you" note, not a forwarded notification. Founder taps
 * the wa.me link (see `formatFounderRelayMessage`), WhatsApp opens
 * pre-loaded with this text, founder hits send. From the buyer's
 * perspective the message arrives instantly from the founder's real
 * WhatsApp — feels automated even though it's a one-tap manual send.
 */
export function formatBuyerWhatsAppBody(input: MatchMessageInput): string {
  const url = `${input.origin}/ru/kvartira/${input.listing_slug}`;
  const priceFmt = new Intl.NumberFormat('ru-RU').format(input.price_total_tjs);
  return [
    `Здравствуйте! У нас появилась квартира по вашему поиску «${input.search_display_name}»:`,
    '',
    `${input.building_name} · ${input.rooms_count}-комн · ${input.size_m2} м² · ${priceFmt} TJS`,
    url,
    '',
    `Если интересно — расскажу подробнее.`,
  ].join('\n');
}

/**
 * Telegram body for the founder relay nudge. Includes a `wa.me` deep
 * link pre-loaded with the buyer-facing message body, so the founder
 * can complete the send in ONE tap (open the link → WhatsApp opens
 * pre-loaded → founder hits send). Without this the founder had to
 * manually copy the listing details into WhatsApp every time, which
 * meant relays often took hours and felt like missed messages.
 */
export function formatFounderRelayMessage(
  input: MatchMessageInput & { phone: string },
): string {
  const priceFmt = new Intl.NumberFormat('ru-RU').format(input.price_total_tjs);
  const buyerBody = formatBuyerWhatsAppBody(input);
  // wa.me requires a digits-only phone number — strip everything else.
  const phoneDigits = input.phone.replace(/\D/g, '');
  const sendNowLink = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buyerBody)}`;
  return [
    `📲 Новый матч — отправьте в WhatsApp`,
    `${input.phone}`,
    `По поиску: «${input.search_display_name}»`,
    '',
    `${input.building_name} · ${input.rooms_count}-комн · ${input.size_m2} м² · ${priceFmt} TJS`,
    '',
    `Отправить за один тап:`,
    sendNowLink,
  ].join('\n');
}
