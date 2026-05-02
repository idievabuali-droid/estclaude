/**
 * Registers our webhook URL with Telegram and configures the bot's
 * basic UI (commands, default texts).
 *
 * Run AFTER you have:
 *   1. Set TELEGRAM_BOT_TOKEN in .env.local
 *   2. Set TELEGRAM_BOT_USERNAME in .env.local
 *   3. Set TELEGRAM_WEBHOOK_SECRET in .env.local (any random 32+ char string)
 *   4. Deployed the app so /api/telegram/webhook is reachable from
 *      the public internet (Telegram won't talk to localhost).
 *
 * Usage:
 *   PUBLIC_URL=https://your-domain.com node scripts/setup-telegram.mjs
 *
 * Re-run any time the public URL changes (new deployment domain,
 * etc.) — Telegram only remembers one webhook URL per bot.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load .env.local (same parsing as apply-migrations.mjs).
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const SECRET = env.TELEGRAM_WEBHOOK_SECRET;
const PUBLIC_URL = process.env.PUBLIC_URL;

if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN in .env.local');
  process.exit(1);
}
if (!SECRET) {
  console.error('Missing TELEGRAM_WEBHOOK_SECRET in .env.local');
  process.exit(1);
}
if (!PUBLIC_URL) {
  console.error('Missing PUBLIC_URL — pass as env var:');
  console.error('  PUBLIC_URL=https://your-domain.com node scripts/setup-telegram.mjs');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function call(method, params) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const webhookUrl = `${PUBLIC_URL.replace(/\/$/, '')}/api/telegram/webhook`;

console.log(`→ Registering webhook: ${webhookUrl}`);
await call('setWebhook', {
  url: webhookUrl,
  secret_token: SECRET,
  allowed_updates: ['message'],
  drop_pending_updates: true,
});
console.log('  ✓ Webhook set');

console.log('→ Setting bot commands');
await call('setMyCommands', {
  commands: [
    { command: 'start', description: 'Войти на ЖК.tj' },
  ],
});
console.log('  ✓ Commands set');

console.log('→ Verifying webhook info');
const info = await call('getWebhookInfo', {});
console.log('  url:', info.url);
console.log('  pending updates:', info.pending_update_count);
if (info.last_error_message) {
  console.log('  ⚠ last error:', info.last_error_message);
} else {
  console.log('  no errors reported');
}

console.log('\nAll done. Bot is ready.');
