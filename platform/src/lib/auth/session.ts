/**
 * Session management — server-side helpers used by API routes and
 * server components.
 *
 * Pattern: standard rotating session id stored in Postgres. The cookie
 * value IS the user_sessions.id (a UUID). On each request we look up
 * the session, verify it isn't expired, return the associated user.
 *
 *   Pros: trivial revoke (delete the row → cookie becomes inert),
 *         no JWT signing surface, sessions auditable in the DB.
 *   Cons: one DB round-trip per authenticated request.
 *
 * For V1 the round-trip is fine — Postgres lookup by indexed UUID is
 * sub-millisecond, and we're already hitting the DB to render most
 * pages anyway.
 */
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export const SESSION_COOKIE = 'session';
const SESSION_TTL_DAYS = 90;

export interface CurrentUser {
  id: string;
  phone: string;
  name: string | null;
  tg_chat_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  notifications_enabled: boolean;
}

/**
 * Returns the current logged-in user, or null if no valid session.
 * Safe to call from any Server Component or API route. Updates the
 * session's last_used_at as a side effect (helps spot dormant
 * sessions in the future).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from('user_sessions')
    .select('id, user_id, expires_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at as string) < new Date()) {
    // Expired — clean it up so it doesn't accumulate.
    await supabase.from('user_sessions').delete().eq('id', session.id);
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select(
      'id, phone, name, tg_chat_id, tg_username, tg_first_name, notifications_enabled',
    )
    .eq('id', session.user_id)
    .maybeSingle();

  if (!user) return null;

  // Touch last_used_at — fire-and-forget; we don't await so the
  // request isn't blocked on this housekeeping write.
  void supabase
    .from('user_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', session.id);

  return user as CurrentUser;
}

/**
 * Create a new session for a user and return its id. Caller is
 * responsible for setting the cookie.
 */
export async function createSession(
  userId: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null },
): Promise<string> {
  const supabase = createAdminClient();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      expires_at: expiresAt.toISOString(),
      user_agent: meta?.userAgent ?? null,
      ip_address: meta?.ipAddress ?? null,
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Failed to create session');
  return data.id as string;
}

/** Delete a session by id (used on logout). */
export async function destroySession(sessionId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('user_sessions').delete().eq('id', sessionId);
}

/**
 * Cookie configuration shared by all places that set the session
 * cookie (start auth, future refresh). Using `secure` only in prod
 * lets local development over http://localhost work.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}
