/**
 * Registers the webhook for the intake bot (the hidden developer-
 * data-collection bot) and sets its command list.
 *
 * This is a SEPARATE bot from the @VafoTjBot login bot — it uses its
 * own token and webhook, and only shares this deployment for hosting.
 *
 * Run AFTER you have:
 *   1. Set INTAKE_BOT_TOKEN in .env.local (from BotFather)
 *   2. Set INTAKE_BOT_WEBHOOK_SECRET in .env.local (any random string)
 *   3. Deployed the app so /api/intake-bot is reachable from the
 *      public internet (Telegram won't talk to localhost).
 *
 * Usage:
 *   PUBLIC_URL=https://your-domain.com node scripts/setup-intake-bot.mjs
 *
 * Re-run any time the public URL changes (new deployment domain).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load .env.local (same parsing as setup-telegram.mjs).
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const TOKEN = env.INTAKE_BOT_TOKEN;
const SECRET = env.INTAKE_BOT_WEBHOOK_SECRET;
const PUBLIC_URL = process.env.PUBLIC_URL;

if (!TOKEN) {
  console.error('Missing INTAKE_BOT_TOKEN in .env.local');
  process.exit(1);
}
if (!SECRET) {
  console.error('Missing INTAKE_BOT_WEBHOOK_SECRET in .env.local');
  process.exit(1);
}
if (!PUBLIC_URL) {
  console.error('Missing PUBLIC_URL — pass as env var:');
  console.error(
    '  PUBLIC_URL=https://your-domain.com node scripts/setup-intake-bot.mjs',
  );
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

const webhookUrl = `${PUBLIC_URL.replace(/\/$/, '')}/api/intake-bot`;

console.log(`→ Registering webhook: ${webhookUrl}`);
await call('setWebhook', {
  url: webhookUrl,
  secret_token: SECRET,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
});
console.log('  ✓ Webhook set');

console.log('→ Setting bot commands');
await call('setMyCommands', {
  commands: [
    { command: 'start', description: 'Открыть меню сбора данных' },
    { command: 'menu', description: 'Показать меню' },
  ],
});
console.log('  ✓ Commands set');

console.log('\nDone. Open the bot in Telegram and send /start.');
