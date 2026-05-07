/**
 * Friction-alerts pipeline. Runs server-side after an event lands in
 * the `events` table. For specific high-signal patterns, fires a
 * one-line Telegram DM to the founder so they see real-time when a
 * user is stuck — rather than waiting for the weekly /kabinet/analytics
 * triage.
 *
 * The patterns surfaced here are the three from the Phase A feedback-
 * loop plan:
 *
 *   1. Third `search_no_results` from the same anon_id within 30 min →
 *      "user is hunting for something the catalog doesn't have" (real-
 *      time inventory-gap signal).
 *   2. `callback_widget_typed_no_submit` → "user almost called but
 *      something stopped them" (CallbackWidget already captures this
 *      event; we just route it to Telegram now).
 *   3. `feedback_submitted` with category=bug → "user reported a bug,
 *      probably while still on the page; reach out fast."
 *
 * Best-effort + non-blocking. The events POST handler returns 202
 * regardless of whether this pipeline succeeds or fails. Errors are
 * logged, never thrown.
 *
 * Why server-side, not client-side: pattern detection (#1 above) needs
 * to read the `events` table to count the user's prior no-results in
 * the last 30 min. Doing that from the client would mean exposing the
 * events table to the client OR building a dedicated API. Server-side
 * is one query with the admin client, no extra surface area.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyFounder } from './founder-notify';

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://жк.tj';

/** A short anon_id slice for the alert message — 8 chars is enough to
 *  paste into the dashboard URL without leaking the full id in chat
 *  history. Drill-down link still uses the full id. */
function shortAnonId(anonId: string): string {
  return anonId.slice(0, 8);
}

function drillDownUrl(anonId: string): string {
  return `${SITE_BASE}/kabinet/analytics/${anonId}`;
}

/** Truncate user-supplied feedback text to a reasonable length for
 *  the chat preview. Founders open the drill-down for the full thing. */
function previewText(text: string, max = 200): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}

/**
 * Public entrypoint — call this from /api/events after a successful
 * insert with the original event payload. Internally it dispatches
 * to the per-event pattern checks. Each check is independent and may
 * or may not fire a Telegram message. Total time should be <1s in
 * the happy path; the events POST returns 202 ahead of this anyway.
 */
export async function detectAndAlert(args: {
  eventType: string;
  anonId: string;
  properties: Record<string, unknown>;
  pageUrl: string | null;
}): Promise<void> {
  const { eventType, anonId, properties, pageUrl } = args;
  try {
    if (eventType === 'search_no_results') {
      await checkRepeatNoResults(anonId, pageUrl);
      return;
    }
    if (eventType === 'callback_widget_typed_no_submit') {
      await alertCallbackStranded(anonId, properties);
      return;
    }
    if (eventType === 'feedback_submitted') {
      await alertFeedbackSubmitted(anonId, properties);
      return;
    }
  } catch (err) {
    console.error('friction-alerts detectAndAlert failed:', err);
  }
}

/**
 * Trigger 1: third no-results in 30 min. Reads the events table back
 * 30 min for this anon_id with type=search_no_results; alerts on the
 * exact 3rd hit (not the 4th, 5th, etc., to avoid spamming).
 */
async function checkRepeatNoResults(
  anonId: string,
  pageUrl: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('anon_id', anonId)
    .eq('event_type', 'search_no_results')
    .gte('occurred_at', since);
  if (count !== 3) return; // exact match — fire only once per session
  await notifyFounder(
    [
      `🕳️ ${shortAnonId(anonId)} ищет то, чего нет в каталоге.`,
      `3-й «ничего не найдено» за 30 мин · ${pageUrl ?? '/'}`,
      drillDownUrl(anonId),
    ].join('\n'),
  );
}

/** Trigger 2: visitor typed in CallbackWidget but didn't submit. */
async function alertCallbackStranded(
  anonId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const listingId = (properties.listing_id as string | undefined) ?? '?';
  await notifyFounder(
    [
      `📞 ${shortAnonId(anonId)} начал заявку и не отправил.`,
      `listing: ${listingId}`,
      drillDownUrl(anonId),
    ].join('\n'),
  );
}

/** Trigger 3: feedback submitted. Always fires (any category). Bug
 *  category gets a louder header. */
async function alertFeedbackSubmitted(
  anonId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const category = (properties.category as string | undefined) ?? 'idea';
  const text = (properties.text as string | undefined) ?? '(без текста)';
  const contact = (properties.contact as string | undefined) ?? null;
  const pageUrl = (properties.page_url as string | undefined) ?? '/';
  const header =
    category === 'bug'
      ? '🆘 Баг'
      : category === 'confusion'
        ? '😕 Непонятно'
        : category === 'missing'
          ? '🔍 Не нашёл'
          : '💡 Идея';
  const lines = [
    `${header} от ${shortAnonId(anonId)} · ${pageUrl}`,
    `«${previewText(text)}»`,
  ];
  if (contact) lines.push(`Связь: ${contact}`);
  lines.push(drillDownUrl(anonId));
  await notifyFounder(lines.join('\n'));
}
