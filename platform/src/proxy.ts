import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/** Visitor identification cookie. Set on first request, valid for a
 *  year, HttpOnly so client JS can't fingerprint or rewrite it. Used
 *  by /api/events to attribute every event (and saved_searches before
 *  the visitor logs in) to a stable browser session. */
const ANON_COOKIE = 'anon_id';
const ANON_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export default function proxy(req: NextRequest) {
  const res = intl(req);
  // Set anon_id if the visitor doesn't have one yet. We attach it to
  // the next-intl response so a single round-trip handles both —
  // matters because next-intl might rewrite/redirect, and a separate
  // NextResponse would discard those changes.
  if (!req.cookies.get(ANON_COOKIE)) {
    res.cookies.set(ANON_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ANON_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
