/**
 * Webhook for the intake bot — the hidden developer-data-collection
 * Telegram bot.
 *
 * This endpoint is INTERNAL: it has no UI, is not linked from any
 * page, nav, or sitemap, and a buyer of the platform can never reach
 * it. It exists only so the separate intake bot can ride this
 * deployment's hosting. It shares no code with the @VafoTjBot login
 * bot — all of its logic lives under src/lib/intake-bot/.
 *
 * Security: Telegram echoes back the secret_token we registered with
 * setWebhook in the X-Telegram-Bot-Api-Secret-Token header. We verify
 * it on every request — otherwise anyone could POST fake updates here.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { handleUpdate } from '@/lib/intake-bot/flow';
import type { TgUpdate } from '@/lib/intake-bot/types';

export async function POST(req: NextRequest) {
  const secret = process.env.INTAKE_BOT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('INTAKE_BOT_WEBHOOK_SECRET not set — refusing webhook');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (err) {
    // Always log loudly, but still 200 to Telegram — a non-2xx makes
    // it retry the same update forever.
    console.error('intake-bot webhook handler error:', err);
  }

  return NextResponse.json({ ok: true });
}
