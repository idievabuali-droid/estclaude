/**
 * Founder Telegram notification helper. Looks up the founder's
 * tg_chat_id (the user with a founder role — `admin` OR `staff` — who
 * has bound their Telegram chat to the platform) and sends them a
 * message via the bot.
 *
 * The pattern was duplicated across `/api/callback-request`,
 * `/api/login-callback`, and `lib/saved-searches/match.ts`. Extracted
 * here so the new friction-alerts pipeline (Phase A3 of the feedback
 * loop plan) can reuse it without re-implementing the lookup.
 *
 * IMPORTANT: the role filter MUST match what `isFounder()` accepts in
 * `lib/auth/roles.ts` — both `admin` and `staff` are treated as
 * "founder" everywhere else (kabinet access, direct-publish on /post,
 * moderation queue). An earlier version queried `role='admin'` only,
 * so if the founder's user_roles row used `role='staff'`, every
 * callback / saved-search WhatsApp / pending-listing notification
 * silently failed to reach them while everything else still worked.
 * The mismatch was invisible until the founder pointed out "I never
 * receive callback phone numbers" (2026-05-09).
 *
 * Best-effort: silently swallows errors. The events insert and the
 * rest of the analytics pipeline must never fail because the founder's
 * Telegram is unreachable. We DO log a console.warn when no founder
 * row is found so a future regression is visible in server logs
 * instead of disappearing.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram/bot';

const FOUNDER_ROLES = ['admin', 'staff'] as const;

let cachedFounderChatId: number | null | undefined = undefined;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — founder doesn't change often

/**
 * Resolve the founder's Telegram chat_id, with a 5-minute in-process
 * cache. Returns null when no founder row exists, the founder hasn't
 * bound their Telegram (`tg_chat_id` is null), or the lookup throws.
 *
 * Exported so other modules (`saved-searches/match.ts`,
 * `/api/callback-request`) share the same role-filter semantics + the
 * cache, instead of each re-running the query with a different role
 * filter and getting different answers.
 */
export async function readFounderChatId(): Promise<number | null> {
  const now = Date.now();
  if (cachedFounderChatId !== undefined && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedFounderChatId;
  }
  try {
    const supabase = createAdminClient();
    const { data: founderRow } = await supabase
      .from('user_roles')
      .select('user_id, users:users!inner(tg_chat_id)')
      // Accept BOTH founder roles. See the doc-comment above for why.
      .in('role', FOUNDER_ROLES as unknown as string[])
      .order('user_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    const tgChatId =
      ((founderRow?.users as unknown as { tg_chat_id?: number | null } | null) ?? null)
        ?.tg_chat_id ?? null;
    if (!founderRow) {
      // No row at all — founder hasn't been granted admin/staff yet.
      // Loud-ish warn so a future deploy + missing-role regression is
      // visible in server logs.
      console.warn(
        'notifyFounder: no user_roles row with role in (admin, staff) — founder Telegram alerts will not fire until one is inserted.',
      );
    } else if (!tgChatId) {
      console.warn(
        'notifyFounder: founder user_roles row found but users.tg_chat_id is null — founder needs to /start the Telegram bot to bind their chat.',
      );
    }
    cachedFounderChatId = tgChatId ?? null;
    cacheLoadedAt = now;
    return cachedFounderChatId;
  } catch (err) {
    console.error('founder chat_id lookup failed:', err);
    return null;
  }
}

/**
 * Send a one-line alert to the founder's Telegram. Best-effort —
 * never throws. Returns true if sent, false if the founder has no
 * bound chat_id or the send failed.
 */
export async function notifyFounder(text: string): Promise<boolean> {
  const chatId = await readFounderChatId();
  if (!chatId) return false;
  try {
    await sendMessage(chatId, text, { disablePreview: true });
    return true;
  } catch (err) {
    console.error('notifyFounder send failed:', err);
    return false;
  }
}

/**
 * Notify the founder that a non-founder seller submitted a listing
 * that's waiting in the moderation queue. Fired from
 * `/api/inventory/create` after a successful insert when the
 * submitter doesn't have an admin/staff role.
 *
 * Why a dedicated helper: the message format wants to be consistent
 * across the few places we'd otherwise inline it (today just the
 * inventory route, but the same shape will apply if we ever build
 * an "edit triggered re-moderation" notification).
 *
 * Best-effort: failures get logged but the API response still
 * succeeds — we don't want a Telegram outage blocking listing
 * submission.
 */
export async function notifyPendingListing(opts: {
  buildingName: string;
  apartmentCount: number;
  sellerPhone: string;
  origin: string;
}): Promise<boolean> {
  const { buildingName, apartmentCount, sellerPhone, origin } = opts;
  const phone = sellerPhone.startsWith('+') ? sellerPhone : `+${sellerPhone}`;
  const aptLabel =
    apartmentCount === 1
      ? '1 квартира'
      : `${apartmentCount} ${pluralRu(apartmentCount, ['квартира', 'квартиры', 'квартир'])}`;
  const text = [
    `📋 Новое объявление на проверке`,
    `${buildingName} · ${aptLabel}`,
    `Продавец: ${phone}`,
    `Очередь: ${origin}/kabinet`,
  ].join('\n');
  return notifyFounder(text);
}

/** Russian plural helper — duplicated from PostFlow's local `plural`
 *  because importing client-only helpers into a server module is
 *  noisier than copying a 6-line function. */
function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
