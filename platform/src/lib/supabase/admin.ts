/**
 * Service-role Supabase client for server-side admin work.
 *
 * Use this ONLY from API routes and server-only services where the
 * action is on behalf of the system, not a logged-in user — typical
 * cases:
 *   - Telegram bot webhook (request authenticated by Telegram, no user
 *     session yet)
 *   - Auth session creation / lookup (the user IS the thing being
 *     created)
 *   - Cron / background workers (no user context)
 *
 * Never import this from a Client Component or expose its calls via a
 * fetch endpoint without explicit access checks — it bypasses RLS.
 *
 * Implementation: uses createServerClient from @supabase/ssr (rather
 * than the typed createClient from @supabase/supabase-js) so we don't
 * have to maintain a generated Database type just to operate on tables
 * we already know exist. This matches the pattern used by the regular
 * server.ts client.
 */
import { createServerClient } from '@supabase/ssr';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
    );
  }

  // No-op cookie handlers — service-role calls don't need cookies and
  // some entry points (the webhook) don't have a request cookie store
  // available anyway.
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
