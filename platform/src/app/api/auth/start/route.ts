/**
 * POST /api/auth/start
 *
 * Begins a Telegram login attempt. Generates a short-lived random
 * token, creates a pending auth_session, returns the token + the
 * deep-link the frontend should QR-encode and link to.
 *
 * The frontend then polls /api/auth/poll until the token is bound to
 * a user (the bot side completes the handshake).
 */
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBotUsername } from '@/lib/telegram/bot';

const TOKEN_TTL_MINUTES = 10;

export async function POST() {
  // URL-safe random token. 32 bytes → 43 base64url chars. The token
  // is what the bot sees in /start <token>; we keep it short enough
  // for QR codes to scan reliably (Telegram's start payload is
  // limited to 64 chars total).
  const token = randomBytes(32).toString('base64url');

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_TTL_MINUTES);

  const supabase = createAdminClient();

  // Opportunistic cleanup of expired auth_sessions. Free side effect
  // of every login attempt — keeps the table from growing unbounded
  // without a dedicated cron. Limit to old rows so we don't scan the
  // whole table on every call.
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 1);
  void supabase
    .from('auth_sessions')
    .delete()
    .lt('expires_at', cutoff.toISOString());

  const { error } = await supabase.from('auth_sessions').insert({
    token,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  let botUsername: string;
  try {
    botUsername = getBotUsername();
  } catch {
    return NextResponse.json(
      { error: 'Bot not configured (TELEGRAM_BOT_USERNAME missing)' },
      { status: 500 },
    );
  }

  // Two link forms: tg:// for native app deep-link (works on mobile
  // when Telegram is installed); https://t.me/ as a fallback that
  // works in browsers and on desktop without the app installed.
  const tgDeepLink = `tg://resolve?domain=${botUsername}&start=${token}`;
  const httpsLink = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({
    token,
    tgDeepLink,
    httpsLink,
    expiresAt: expiresAt.toISOString(),
  });
}
