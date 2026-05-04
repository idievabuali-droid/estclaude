import 'server-only';
import { cookies } from 'next/headers';

/**
 * Server-side reader for the visitor's anon_id cookie. The cookie
 * itself is set by proxy.ts (Next middleware) on every non-API
 * request — by the time any server component runs, the cookie is
 * either already present from a prior visit or has just been
 * minted. Returns null only on the truly-first request to an API
 * endpoint that runs before any page hit, which is rare in practice
 * (API endpoints are called from pages that have already had the
 * middleware run).
 */
export async function readAnonIdServer(): Promise<string | null> {
  const jar = await cookies();
  return jar.get('anon_id')?.value ?? null;
}
