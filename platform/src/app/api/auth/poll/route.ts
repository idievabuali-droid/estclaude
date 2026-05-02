/**
 * GET /api/auth/poll?token=...
 *
 * The frontend calls this every ~2 seconds while the QR is showing.
 * Three possible states for the token:
 *
 *   pending → bot hasn't completed yet, frontend keeps polling
 *   completed → user has shared their contact in the bot. We create a
 *               long-lived user_session, set the cookie, and tell the
 *               frontend to redirect.
 *   expired / unknown → frontend should restart by calling /start.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ status: 'invalid' });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('auth_sessions')
    .select('id, status, user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ status: 'invalid' });
  }
  if (new Date(data.expires_at as string) < new Date()) {
    return NextResponse.json({ status: 'expired' });
  }
  if (data.status !== 'completed' || !data.user_id) {
    return NextResponse.json({ status: 'pending' });
  }

  // Bot side completed — issue the web session and set the cookie.
  // Capture user agent + IP for the audit trail (read-only — never
  // used in auth decisions).
  const userAgent = req.headers.get('user-agent');
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const sessionId = await createSession(data.user_id as string, {
    userAgent,
    ipAddress,
  });

  // Burn the auth_session so it can't be reused — the web cookie is
  // now the proof of identity.
  await supabase.from('auth_sessions').delete().eq('id', data.id);

  const res = NextResponse.json({ status: 'completed' });
  res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
  return res;
}
