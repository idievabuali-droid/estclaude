/**
 * One-shot broadcaster for the ЖК.tj → Vafo.tj rebrand announcement.
 *
 * Sends a single migration-notice message to every Telegram chat we
 * have a chat_id for. Two sources, deduplicated:
 *
 *   1. `users.tg_chat_id`     — anyone who completed Telegram-bot login
 *      and has notifications_enabled (don't pester users who muted us).
 *   2. `saved_searches.notify_chat_id` — anyone subscribed to a saved
 *      search via the Telegram subscribe deep-link, even if they never
 *      logged in.
 *
 * IMPORTANT: this script reads `TELEGRAM_BOT_TOKEN` from `.env.local`.
 * When the founder runs it, they need to *temporarily* swap that to
 * the OLD bot's token (`@zhk_tj_bot`) — the message has to come from
 * the bot users actually have in their chat list, not the new bot.
 *
 * Recommended flow:
 *
 *   1. Open .env.local
 *   2. Note the current TELEGRAM_BOT_TOKEN (= the new @VafoTjBot token)
 *      somewhere safe.
 *   3. Replace TELEGRAM_BOT_TOKEN with the OLD @zhk_tj_bot token.
 *   4. node scripts/broadcast-rebrand.mjs
 *   5. Wait for "done" log line.
 *   6. Restore the new token in .env.local.
 *
 * Telegram rate-limits to ~30 messages/sec for bots — we sleep 50ms
 * between sends as a safety margin. Failures (blocked, deactivated,
 * etc.) are logged but don't halt the run.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(__dirname, '..');

const ENV_PATH = path.join(PLATFORM_DIR, '.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k, rest.join('=')];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN) {
  console.error(
    'Missing one of NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TELEGRAM_BOT_TOKEN in .env.local',
  );
  process.exit(1);
}

// The message. HTML mode so we can bold the new name + link the new
// bot. Keep it short — Tajik mobile users skim push notifications.
const MESSAGE = `🔔 <b>Мы переехали — теперь мы Vafo.tj</b>

Новый бот: @VafoTjBot
Новый сайт: https://vafo.tj

Подпишитесь на @VafoTjBot, чтобы продолжать получать уведомления о новых квартирах в Таджикистане. Старый бот скоро отключим.

Спасибо, что вы с нами 🙏`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendToChat(chatId) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: MESSAGE,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.ok === true, status: res.status, description: json.description };
}

async function main() {
  // Pull both chat-id sources, dedupe.
  const [usersRes, searchesRes] = await Promise.all([
    supabase
      .from('users')
      .select('tg_chat_id, notifications_enabled')
      .not('tg_chat_id', 'is', null)
      .eq('notifications_enabled', true),
    supabase
      .from('saved_searches')
      .select('notify_chat_id')
      .not('notify_chat_id', 'is', null),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (searchesRes.error) throw searchesRes.error;

  const ids = new Set();
  for (const u of usersRes.data ?? []) ids.add(Number(u.tg_chat_id));
  for (const s of searchesRes.data ?? []) ids.add(Number(s.notify_chat_id));

  const all = [...ids].filter((n) => Number.isFinite(n));
  console.log(`broadcasting to ${all.length} chat(s)`);

  let sent = 0;
  let failed = 0;
  const failures = [];

  for (const chatId of all) {
    const r = await sendToChat(chatId);
    if (r.ok) {
      sent++;
      process.stdout.write('.');
    } else {
      failed++;
      failures.push({ chatId, status: r.status, description: r.description });
      process.stdout.write('x');
    }
    await sleep(50); // ~20 msgs/sec, well under Telegram's 30/sec ceiling
  }
  process.stdout.write('\n');

  console.log(`— done ✓  (sent ${sent}, failed ${failed})`);
  if (failed > 0) {
    console.log('\nFailures (typical: user blocked the bot, chat deleted, etc.):');
    for (const f of failures.slice(0, 20)) {
      console.log(`  ${f.chatId}  ${f.status}  ${f.description ?? ''}`);
    }
    if (failures.length > 20) {
      console.log(`  ...and ${failures.length - 20} more`);
    }
  }
}

main().catch((err) => {
  console.error('broadcast failed:', err);
  process.exit(1);
});
