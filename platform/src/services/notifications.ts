/**
 * Notification dispatcher.
 *
 * Reads undispatched change_events, looks up which users have saved
 * the affected listing/building, and sends each user a Telegram
 * message via the bot. Marks events dispatched so they're never
 * re-sent.
 *
 * Run by /api/cron/notifications on a schedule (Vercel Cron in
 * production; manual invocation in dev). Idempotent — re-running
 * safely processes only what's pending.
 *
 * V1 notification scope (the ones that matter for retention; everything
 * else is noise):
 *   - price_changed (only when DOWN — price increases don't drive
 *     re-engagement, just frustration)
 *   - new_unit_added (saved building got a new apartment)
 *   - status_changed (e.g. under_construction → near_completion)
 *
 * Skipped:
 *   - construction_photo_added — too frequent, low-value individually
 *   - seller_slow_response — internal signal, not user-facing
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage, type InlineKeyboardButton } from '@/lib/telegram/bot';
import { formatPriceNumber } from '@/lib/format';
import type { ChangeEventType } from '@/types/domain';

interface ChangeEventRow {
  id: string;
  type: ChangeEventType;
  payload: Record<string, unknown>;
  listing_id: string | null;
  building_id: string | null;
  created_at: string;
}

interface RecipientUser {
  id: string;
  tg_chat_id: number;
  notifications_enabled: boolean;
}

/** Public URL for deep-linking back into the app from Telegram messages. */
function publicAppUrl(): string {
  return (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Process all pending change events. Returns how many were dispatched
 * and how many individual messages were sent.
 */
export async function dispatchPendingNotifications(): Promise<{
  events: number;
  messages: number;
}> {
  const supabase = createAdminClient();

  // Pull undispatched events. Cap at 100 per run so a backlog doesn't
  // hold up the cron call past its timeout — leftovers go on the next
  // tick.
  const { data: rawEvents } = await supabase
    .from('change_events')
    .select('id, type, payload, listing_id, building_id, created_at')
    .is('dispatched_at', null)
    .order('created_at', { ascending: true })
    .limit(100);

  const events = (rawEvents ?? []) as ChangeEventRow[];
  if (events.length === 0) return { events: 0, messages: 0 };

  let messageCount = 0;

  for (const event of events) {
    try {
      const sent = await dispatchOne(event);
      messageCount += sent;
    } catch (err) {
      console.error(`Failed to dispatch event ${event.id}:`, err);
      // Don't mark dispatched — let the next cron tick retry.
      continue;
    }
    await supabase
      .from('change_events')
      .update({ dispatched_at: new Date().toISOString() })
      .eq('id', event.id);
  }

  return { events: events.length, messages: messageCount };
}

async function dispatchOne(event: ChangeEventRow): Promise<number> {
  // Only V1-relevant types. Other types still get marked dispatched
  // (so they don't accumulate forever), just no message goes out.
  const formatted = formatNotification(event);
  if (!formatted) return 0;

  const supabase = createAdminClient();

  // Find users who saved the affected item AND have a Telegram chat
  // AND haven't disabled notifications.
  let savedQuery = supabase
    .from('saved_items')
    .select('user_id');
  if (event.listing_id) {
    savedQuery = savedQuery.eq('listing_id', event.listing_id);
  } else if (event.building_id) {
    savedQuery = savedQuery.eq('building_id', event.building_id);
  } else {
    return 0;
  }

  const { data: saves } = await savedQuery;
  const userIds = [...new Set((saves ?? []).map((r) => r.user_id as string))];
  if (userIds.length === 0) return 0;

  const { data: users } = await supabase
    .from('users')
    .select('id, tg_chat_id, notifications_enabled')
    .in('id', userIds);

  const recipients = (users ?? []).filter(
    (u) => u.tg_chat_id != null && u.notifications_enabled === true,
  ) as RecipientUser[];

  // Send sequentially with small jitter — Telegram rate-limits at
  // ~30 msgs/sec globally, but per-chat is much stricter (~1/sec).
  // For our V1 volume (<100 users per event), sequential is fine and
  // keeps the code simple.
  let sent = 0;
  for (const r of recipients) {
    try {
      await sendMessage(r.tg_chat_id, formatted.text, {
        parseMode: 'HTML',
        disablePreview: false,
        replyMarkup: { inline_keyboard: [[formatted.button]] },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to message chat ${r.tg_chat_id}:`, err);
    }
  }
  return sent;
}

/**
 * Build the message text + button for a given change event. Returns
 * null for event types we don't notify on — caller skips those.
 */
function formatNotification(event: ChangeEventRow): {
  text: string;
  button: InlineKeyboardButton;
} | null {
  const base = publicAppUrl();

  switch (event.type) {
    case 'price_changed': {
      const oldP = Number(event.payload.old_price_dirams ?? 0);
      const newP = Number(event.payload.new_price_dirams ?? 0);
      // Only notify on price DROPS — increases drive frustration, not
      // re-engagement. (We could include both with separate framing
      // later if data shows it works.)
      if (newP >= oldP) return null;
      const dropPercent = Math.round(((oldP - newP) / oldP) * 100);
      const oldFmt = formatPriceNumber(BigInt(oldP));
      const newFmt = formatPriceNumber(BigInt(newP));
      const slug = event.payload.listing_slug as string | undefined;
      const url = slug ? `${base}/kvartira/${slug}` : base;
      return {
        text:
          `💰 <b>Цена снижена на ${dropPercent}%</b>\n\n` +
          `Было: <s>${oldFmt} TJS</s>\n` +
          `Стало: <b>${newFmt} TJS</b>`,
        button: { text: 'Открыть квартиру', url },
      };
    }
    case 'new_unit_added': {
      const buildingName = (event.payload.building_name as string) ?? 'ЖК';
      const slug = event.payload.building_slug as string | undefined;
      const url = slug ? `${base}/zhk/${slug}` : base;
      return {
        text:
          `🏠 <b>Новая квартира в ${buildingName}</b>\n\n` +
          `В сохранённом ЖК появилось новое объявление.`,
        button: { text: 'Посмотреть', url },
      };
    }
    case 'status_changed': {
      const buildingName = (event.payload.building_name as string) ?? 'ЖК';
      const to = event.payload.to as string | undefined;
      const slug = event.payload.building_slug as string | undefined;
      const url = slug ? `${base}/zhk/${slug}` : base;
      const statusLabel: Record<string, string> = {
        under_construction: 'строится',
        near_completion: 'почти готов',
        delivered: 'сдан',
      };
      const label = statusLabel[to ?? ''] ?? to ?? '';
      return {
        text:
          `🏗 <b>${buildingName}: ${label}</b>\n\n` +
          `Статус строительства обновился.`,
        button: { text: 'Открыть ЖК', url },
      };
    }
    case 'construction_photo_added':
    case 'seller_slow_response':
      return null;
    default:
      return null;
  }
}
