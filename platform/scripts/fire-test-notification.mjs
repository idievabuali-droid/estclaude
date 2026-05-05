/**
 * One-shot smoke-test script for the saved-search → Telegram loop.
 *
 * Inserts a fresh active listing matching common wizard criteria
 * (2-комн, без ремонта, monthly ≤ 4 000 TJS) and sends Telegram
 * messages directly to every active saved_search whose filters match.
 *
 * Replicates `notifyMatchingListing` from src/lib/saved-searches/match.ts
 * inline so we can run it from a Node script without the Next.js
 * server context. Two delivery paths:
 *
 *   - notify_chat_id set      → direct buyer message via @zhk_tj_bot
 *   - notify_phone, no chat_id → relay message to the founder asking
 *                                them to manually WhatsApp the buyer
 *
 * Usage:
 *   node scripts/fire-test-notification.mjs           # publish + notify
 *   node scripts/fire-test-notification.mjs --dry     # show what WOULD fire, no insert/send
 *   node scripts/fire-test-notification.mjs --cleanup # delete prior test listings
 *
 * Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY +
 * TELEGRAM_BOT_TOKEN + APP_ORIGIN.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
const APP_ORIGIN = env.APP_ORIGIN ?? 'https://estclaude11-qn4w.vercel.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env');
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN — Telegram messages cannot be sent');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const CLEANUP = args.has('--cleanup');

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram API: ${json.description}`);
  }
  return json.result;
}

function formatMatchMessage({ search_display_name, building_name, rooms_count, size_m2, price_total_tjs, listing_slug }) {
  const url = `${APP_ORIGIN}/ru/kvartira/${listing_slug}`;
  const priceFmt = new Intl.NumberFormat('ru-RU').format(price_total_tjs);
  return [
    `🏠 Новая квартира по вашему поиску: «${search_display_name}»`,
    '',
    `${building_name} · ${rooms_count}-комн · ${size_m2} м²`,
    `${priceFmt} TJS`,
    '',
    url,
  ].join('\n');
}

function formatBuyerWhatsAppBody({ search_display_name, building_name, rooms_count, size_m2, price_total_tjs, listing_slug }) {
  const url = `${APP_ORIGIN}/ru/kvartira/${listing_slug}`;
  const priceFmt = new Intl.NumberFormat('ru-RU').format(price_total_tjs);
  return [
    `Здравствуйте! У нас появилась квартира по вашему поиску «${search_display_name}»:`,
    '',
    `${building_name} · ${rooms_count}-комн · ${size_m2} м² · ${priceFmt} TJS`,
    url,
    '',
    `Если интересно — расскажу подробнее.`,
  ].join('\n');
}

function formatFounderRelayMessage(input) {
  const priceFmt = new Intl.NumberFormat('ru-RU').format(input.price_total_tjs);
  const buyerBody = formatBuyerWhatsAppBody(input);
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

/**
 * Simplified match check. The real `matchesSearch` in src/lib/filters
 * is more thorough (handles district, near_lat radius, handover years,
 * amenities etc) but for this smoke test we cover the criteria the
 * wizard installment path uses:
 *   - rooms (CSV) must include the listing's rooms_count
 *   - finishing (CSV) must include the listing's finishing_type
 *   - monthly_to (TJS) must be ≥ the listing's monthly TJS
 *   - price_to (TJS) must be ≥ the listing's total TJS
 *
 * Filters that aren't set on the search are treated as "match all".
 * Errors on the conservative side: if a search has filters this
 * script doesn't understand (district / amenities / etc), it MIGHT
 * fire a notification that the real logic wouldn't — false positives
 * are fine for a smoke test.
 */
function matchesListing(filters, listing) {
  const rooms = (filters.rooms || '').split(',').filter(Boolean).map((s) => parseInt(s, 10));
  if (rooms.length && !rooms.includes(listing.rooms_count)) return false;

  const finishing = (filters.finishing || '').split(',').filter(Boolean);
  if (finishing.length && !finishing.includes(listing.finishing_type)) return false;

  const priceTotalTjs = Math.round(Number(listing.price_total_dirams) / 100);
  const priceTo = filters.price_to ? parseInt(filters.price_to, 10) : null;
  if (priceTo != null && priceTotalTjs > priceTo) return false;

  if (listing.installment_monthly_amount_dirams) {
    const monthlyTjs = Math.round(Number(listing.installment_monthly_amount_dirams) / 100);
    const monthlyTo = filters.monthly_to ? parseInt(filters.monthly_to, 10) : null;
    if (monthlyTo != null && monthlyTjs > monthlyTo) return false;
  } else if (filters.monthly_to) {
    // Search wants installment but listing has none → no match.
    return false;
  }

  return true;
}

async function main() {
  if (CLEANUP) {
    const { data } = await supabase
      .from('listings')
      .select('id, slug')
      .ilike('slug', 'test-match-%');
    for (const r of data ?? []) {
      await supabase.from('listings').delete().eq('id', r.id);
      console.log(`✗ removed ${r.slug}`);
    }
    console.log(`Cleanup done. Removed ${data?.length ?? 0} test listings.`);
    return;
  }

  // 1. Find first published Vahdat building.
  const { data: building } = await supabase
    .from('buildings')
    .select('id, slug, name, total_floors')
    .eq('city', 'vahdat')
    .eq('is_published', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (!building) {
    console.error('No published Vahdat buildings.');
    process.exit(1);
  }
  const buildingName = building.name?.ru ?? building.slug;
  console.log(`→ Building: ${buildingName}`);

  // 2. Find founder user (admin role) — needed for seller_user_id and
  //    for relay tg_chat_id on WhatsApp-subscribed searches.
  const { data: founderRole } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .order('user_id', { ascending: true })
    .limit(1)
    .single();
  if (!founderRole) {
    console.error('No founder/admin user found.');
    process.exit(1);
  }
  const { data: founderUser } = await supabase
    .from('users')
    .select('id, tg_chat_id')
    .eq('id', founderRole.user_id)
    .single();
  console.log(`→ Founder tg_chat_id: ${founderUser?.tg_chat_id ?? '(NOT SET — relay messages will fail)'}`);

  // 3. Show what saved searches currently exist so we know what to expect.
  const { data: searches } = await supabase
    .from('saved_searches')
    .select('id, page, filters, display_name, notify_chat_id, notify_phone, last_seen_listing_id, active')
    .eq('active', true);
  console.log(`→ Active saved_searches: ${searches?.length ?? 0}`);
  for (const s of searches ?? []) {
    const channel = s.notify_chat_id
      ? `Telegram (chat_id ${s.notify_chat_id})`
      : s.notify_phone
        ? `WhatsApp relay (phone ${s.notify_phone})`
        : '(no notify channel set!)';
    console.log(`   - "${s.display_name}" [${s.page}] → ${channel}`);
  }

  // 4. Build the test listing payload.
  const ts = Date.now().toString(36);
  const slug = `test-match-${ts}`;
  const listingPayload = {
    slug,
    building_id: building.id,
    seller_user_id: founderRole.user_id,
    source_type: 'developer',
    status: 'active',
    rooms_count: 2,
    size_m2: 55,
    floor_number: 4,
    total_floors: building.total_floors ?? 7,
    price_total_dirams: '19800000', // 198k TJS
    finishing_type: 'no_finish',
    installment_available: true,
    installment_monthly_amount_dirams: '240000', // 2.4k TJS / mo
    installment_first_payment_percent: 30,
    installment_term_months: 84,
    published_at: new Date().toISOString(),
    unit_description: { ru: `[TEST ${ts}] Тестовая квартира`, tg: `[TEST ${ts}]` },
  };

  if (DRY) {
    console.log('\n[DRY RUN] Would insert:');
    console.log(JSON.stringify(listingPayload, null, 2));
    console.log('\n[DRY RUN] Match check for each active saved_search:');
    for (const s of searches ?? []) {
      const matched = matchesListing(s.filters, listingPayload);
      console.log(`   "${s.display_name}" → ${matched ? 'MATCH (would notify)' : 'no match'}`);
    }
    return;
  }

  // 5. Insert the listing.
  const { data: inserted, error } = await supabase
    .from('listings')
    .insert(listingPayload)
    .select('id, slug')
    .single();
  if (error || !inserted) {
    console.error('Insert failed:', error);
    process.exit(1);
  }
  console.log(`\n✓ Inserted ${inserted.slug} (${inserted.id})`);

  // 6. Run match logic for every active saved search and fire notifications.
  let matchCount = 0;
  let sentCount = 0;
  for (const s of searches ?? []) {
    if (s.last_seen_listing_id === inserted.id) continue;
    const matched = matchesListing(s.filters, listingPayload);
    if (!matched) continue;
    matchCount++;

    // Mark before send (idempotency).
    await supabase
      .from('saved_searches')
      .update({ last_seen_listing_id: inserted.id })
      .eq('id', s.id);

    const messageInput = {
      search_display_name: s.display_name,
      building_name: buildingName,
      rooms_count: 2,
      size_m2: 55,
      price_total_tjs: 198000,
      listing_slug: inserted.slug,
    };

    try {
      if (s.notify_chat_id) {
        const text = formatMatchMessage(messageInput);
        await sendTelegram(s.notify_chat_id, text);
        console.log(`   ✓ Direct Telegram → chat_id ${s.notify_chat_id} ("${s.display_name}")`);
        sentCount++;
      } else if (s.notify_phone) {
        if (!founderUser?.tg_chat_id) {
          console.log(`   ⚠ Skip relay for "${s.display_name}" — founder tg_chat_id not set`);
          continue;
        }
        const text = formatFounderRelayMessage({ ...messageInput, phone: s.notify_phone });
        await sendTelegram(founderUser.tg_chat_id, text);
        console.log(`   ✓ Founder relay → ${s.notify_phone} ("${s.display_name}")`);
        sentCount++;
      }
    } catch (err) {
      console.error(`   ✗ Send failed for "${s.display_name}":`, err.message);
    }
  }

  console.log(`\nMatched: ${matchCount}, Sent: ${sentCount}`);
  console.log(`Cleanup later: node scripts/fire-test-notification.mjs --cleanup`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
