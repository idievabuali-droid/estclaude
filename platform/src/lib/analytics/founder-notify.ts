/**
 * Founder Telegram notification helper. Looks up the founder's
 * tg_chat_id (the user with role='admin' who has bound their Telegram
 * chat to the platform) and sends them a message via the bot.
 *
 * The pattern was duplicated across `/api/callback-request`,
 * `/api/login-callback`, and `lib/saved-searches/match.ts`. Extracted
 * here so the new friction-alerts pipeline (Phase A3 of the feedback
 * loop plan) can reuse it without re-implementing the lookup.
 *
 * Best-effort: silently swallows errors. The events insert and the
 * rest of the analytics pipeline must never fail because the founder's
 * Telegram is unreachable.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram/bot';

let cachedFounderChatId: number | null | undefined = undefined;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — founder doesn't change often

async function readFounderChatId(): Promise<number | null> {
  const now = Date.now();
  if (cachedFounderChatId !== undefined && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedFounderChatId;
  }
  try {
    const supabase = createAdminClient();
    const { data: founderRow } = await supabase
      .from('user_roles')
      .select('user_id, users:users!inner(tg_chat_id)')
      .eq('role', 'admin')
      .order('user_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    const tgChatId =
      ((founderRow?.users as unknown as { tg_chat_id?: number | null } | null) ?? null)
        ?.tg_chat_id ?? null;
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
