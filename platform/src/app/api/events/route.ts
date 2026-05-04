/**
 * POST /api/events
 *
 * Fire-and-forget analytics ingestion. Every meaningful interaction
 * the front-end wants to record (page_view, listing card click,
 * search_run, contact_button_click, save_attempt_logged_out, etc.)
 * pings this endpoint. We auth-tag the row with whatever context is
 * available — anon_id from the cookie always; user_id from the
 * session if the visitor is signed in — so the per-visitor timeline
 * works whether they ever log in or not.
 *
 * Body shape:
 *   { type: string, properties?: Record<string, unknown> }
 *
 * Always returns 202. We never block the page on tracking — a tracking
 * failure mustn't break a click.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { readAnonIdServer } from '@/lib/analytics/anon-id';

interface EventBody {
  type: string;
  properties?: Record<string, unknown>;
}

// Hard cap on properties payload size — prevents a runaway client
// from stuffing megabytes into jsonb. 4 KB is generous; the typical
// event payload is < 200 bytes.
const MAX_PROPERTIES_BYTES = 4096;

/** Whitelist of event types we actually care about. Anything outside
 *  is silently dropped (still 202) so a misbehaving / malicious client
 *  can't pollute the events table with arbitrary noise. Add to this
 *  list as new tracking points come online. */
const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'listing_card_click',
  'building_card_click',
  'kvartira_view',
  'zhk_view',
  'search_run',
  'search_no_results',
  'contact_button_click',
  'save_attempt_logged_out',
  'saved_search_subscribed',
  'callback_request_submitted',
  'callback_widget_typed_no_submit',
  'listing_revisit',
  'login_callback_submitted',
]);

/** Soft per-anon rate limit. In-memory map (per serverless instance);
 *  good enough for V1 to stop a single tab spamming. Multi-instance
 *  fairness comes later if needed. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const recentEvents = new Map<string, number[]>();
function isRateLimited(anonId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = (recentEvents.get(anonId) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_LIMIT_MAX) {
    recentEvents.set(anonId, bucket);
    return true;
  }
  bucket.push(now);
  recentEvents.set(anonId, bucket);
  return false;
}

export async function POST(req: NextRequest) {
  let body: EventBody;
  try {
    body = (await req.json()) as EventBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
  if (!body.type || typeof body.type !== 'string') {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
  if (!ALLOWED_EVENT_TYPES.has(body.type)) {
    // Unknown event type — drop silently. Client gets 202 so a forked
    // codebase or stale build won't loop retrying; we just don't store.
    return NextResponse.json({ ok: false, reason: 'unknown type' }, { status: 202 });
  }

  const properties = body.properties ?? {};
  if (JSON.stringify(properties).length > MAX_PROPERTIES_BYTES) {
    return NextResponse.json({ ok: false, reason: 'too large' }, { status: 202 });
  }

  const anonId = await readAnonIdServer();
  if (!anonId) {
    // No cookie means the visitor hit /api/events before any page —
    // unusual but possible (direct curl, prefetch). Drop silently
    // because there's no way to attribute the event meaningfully.
    return NextResponse.json({ ok: false, reason: 'no anon_id' }, { status: 202 });
  }
  if (isRateLimited(anonId)) {
    return NextResponse.json({ ok: false, reason: 'rate limit' }, { status: 202 });
  }

  const user = await getCurrentUser();
  const userAgent = req.headers.get('user-agent');
  const referrer = req.headers.get('referer');

  // Fire-and-forget — don't await. The endpoint returns 202 to the
  // client immediately; the insert continues in the background. If
  // the insert fails we log it but don't surface to the client.
  void (async () => {
    try {
      const supabase = createAdminClient();
      await supabase.from('events').insert({
        anon_id: anonId,
        user_id: user?.id ?? null,
        event_type: body.type,
        properties,
        url: (properties as { url?: string }).url ?? null,
        referrer,
        user_agent: userAgent,
      });
    } catch (err) {
      console.error('events insert failed:', err);
    }
  })();

  return NextResponse.json({ ok: true }, { status: 202 });
}
