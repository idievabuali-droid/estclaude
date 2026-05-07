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
