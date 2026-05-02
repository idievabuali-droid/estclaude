/**
 * POST /api/auth/logout
 *
 * Deletes the current session row (so the cookie becomes inert even
 * if a copy lingers somewhere) and clears the cookie on the client.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    try {
      await destroySession(sessionId);
    } catch {
      // Even if the DB delete fails, we still clear the cookie below
      // so the user is locally logged out — they won't be able to
      // use the session even though the row lingers (it will expire
      // naturally).
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
