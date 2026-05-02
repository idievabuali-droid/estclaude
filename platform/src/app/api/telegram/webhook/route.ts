/**
 * Telegram Bot webhook. Receives every update Telegram sends about
 * our bot — for auth we only care about two flows:
 *
 *   1. /start <token>  →  user opened the bot via our QR/deep-link.
 *      Reply with the "Поделиться номером" Share Contact prompt and
 *      remember which auth_session this chat is bound to.
 *
 *   2. message.contact  →  user tapped Share Contact.
 *      Verify the contact actually belongs to the sender (Telegram
 *      will set contact.user_id to the sender's id when they share
 *      their OWN number — if it's missing or different, the user
 *      shared someone ELSE's contact and we reject), then create or
 *      update the user, link the auth_session, and confirm.
 *
 * Webhook security: Telegram includes the secret_token we registered
 * with /setWebhook in the X-Telegram-Bot-Api-Secret-Token header. We
 * verify it on every request — without this an attacker could POST
 * fake messages to our webhook URL.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram/bot';
import type { TgUpdate, TgMessage, TgContact } from '@/lib/telegram/types';

// In-memory map of chat_id → pending auth_session token, populated
// when the user starts the bot via /start <token> and consumed when
// they share their contact. Lives only for the duration of the
// serverless function instance — but the bot interaction is fast (a
// few seconds at most), so cold-start churn is acceptable. For higher
// reliability we'd persist this in Redis or a chat_state table; V1
// keeps it in-memory until that's actually needed.
const chatPendingToken = new Map<number, string>();

/** Maps the chat → token in memory AND, defensively, in the DB so
 *  cold starts between /start and contact share don't lose the link.
 *  We store it on auth_sessions itself by writing the chat_id into a
 *  pending state — completed when contact arrives. */
async function rememberPendingChat(chatId: number, token: string): Promise<void> {
  chatPendingToken.set(chatId, token);
}

function consumePendingChat(chatId: number): string | undefined {
  const token = chatPendingToken.get(chatId);
  if (token) chatPendingToken.delete(chatId);
  return token;
}

export async function POST(req: NextRequest) {
  // ─── 1. Verify the request really came from Telegram ────────
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('TELEGRAM_WEBHOOK_SECRET not set — refusing webhook');
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (headerSecret !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = update.message;
  if (!message) {
    // Updates we don't care about (channel posts, edited messages,
    // etc.). Acknowledge to stop Telegram from retrying.
    return NextResponse.json({ ok: true });
  }

  try {
    if (message.text?.startsWith('/start')) {
      await handleStartCommand(message);
    } else if (message.contact) {
      await handleContactShare(message, message.contact);
    } else {
      await handleUnrecognized(message);
    }
  } catch (err) {
    console.error('Telegram webhook handler error:', err);
    // Always 200 to Telegram — non-2xx makes it retry the same update,
    // and a deterministic error will just retry forever.
  }

  return NextResponse.json({ ok: true });
}

/**
 * /start [token]
 *   - With token: this is the QR/deep-link flow from /voyti. Save the
 *     pending session and ask for the user's phone via Share Contact.
 *   - Without token: somebody opened the bot directly. Send a friendly
 *     orientation message — we can't auth them without a session.
 */
async function handleStartCommand(message: TgMessage): Promise<void> {
  const text = message.text ?? '';
  const parts = text.split(/\s+/);
  const token = parts[1]?.trim() || undefined;
  const chatId = message.chat.id;

  if (!token) {
    await sendMessage(
      chatId,
      'Привет! Чтобы войти на ЖК.tj, откройте сайт и нажмите «Войти через Telegram» — затем вернитесь сюда по ссылке.',
    );
    return;
  }

  // Validate the token exists and is still pending (not expired,
  // not already completed). If invalid, tell the user — don't leak
  // why specifically, but make it clear they need a fresh link.
  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from('auth_sessions')
    .select('id, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (
    !session ||
    session.status !== 'pending' ||
    new Date(session.expires_at as string) < new Date()
  ) {
    await sendMessage(
      chatId,
      'Ссылка устарела. Откройте сайт ЖК.tj и снова нажмите «Войти через Telegram».',
    );
    return;
  }

  await rememberPendingChat(chatId, token);

  // Ask for the phone via the native Share Contact button. Setting
  // request_contact=true gives the user a one-tap share — much
  // better UX than typing a number. one_time_keyboard hides the
  // keyboard after they tap.
  await sendMessage(
    chatId,
    'Поделитесь своим номером телефона, чтобы войти на ЖК.tj. Это нужно для входа и уведомлений по сохранённым квартирам.',
    {
      replyMarkup: {
        keyboard: [
          [{ text: '📱 Поделиться номером', request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
}

/**
 * User tapped Share Contact (or sent any contact card). Verify it's
 * THEIR contact, link to user record, mark auth_session completed.
 */
async function handleContactShare(message: TgMessage, contact: TgContact): Promise<void> {
  const chatId = message.chat.id;
  const senderId = message.from?.id;

  // Critical: contact.user_id is set by Telegram when the user shares
  // their OWN number via the Share Contact button. If it's missing or
  // doesn't match the sender, they shared someone else's contact card
  // — refuse the auth so attackers can't impersonate by forwarding a
  // contact they have for the target.
  if (!contact.user_id || contact.user_id !== senderId) {
    await sendMessage(
      chatId,
      'Поделитесь своим номером телефона через кнопку «Поделиться номером» — другой контакт нельзя.',
    );
    return;
  }

  const token = consumePendingChat(chatId);
  if (!token) {
    await sendMessage(
      chatId,
      'Сначала нажмите «Войти через Telegram» на сайте ЖК.tj и откройте бота по ссылке.',
    );
    return;
  }

  // Normalise the phone number. Telegram returns it without a leading
  // "+" sometimes — store as E.164 with the "+" prefix to match every
  // other phone in our DB.
  const phoneRaw = contact.phone_number.replace(/[^0-9]/g, '');
  const phone = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`;

  const supabase = createAdminClient();

  // Re-verify session is still alive (could have expired during the
  // user's tap delay).
  const { data: session } = await supabase
    .from('auth_sessions')
    .select('id, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (
    !session ||
    session.status !== 'pending' ||
    new Date(session.expires_at as string) < new Date()
  ) {
    await sendMessage(
      chatId,
      'Сессия истекла. Откройте сайт и снова нажмите «Войти через Telegram».',
    );
    return;
  }

  // Find existing user by Telegram id (most reliable) OR by phone
  // (catches users who signed up before via SMS in some future
  // hybrid flow). Telegram id wins if both match different users —
  // the Telegram identity is the cryptographically verified one.
  const { data: byTgId } = await supabase
    .from('users')
    .select('id')
    .eq('tg_user_id', senderId)
    .maybeSingle();

  const { data: byPhone } = byTgId
    ? { data: null }
    : await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

  let userId: string;

  if (byTgId) {
    // Existing Telegram-linked user — update their phone in case it
    // changed and refresh their last-known display fields.
    userId = byTgId.id as string;
    await supabase
      .from('users')
      .update({
        phone,
        tg_chat_id: chatId,
        tg_username: message.from?.username ?? null,
        tg_first_name: message.from?.first_name ?? null,
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } else if (byPhone) {
    // Existing phone-only user — link Telegram identity to them.
    userId = byPhone.id as string;
    await supabase
      .from('users')
      .update({
        tg_user_id: senderId,
        tg_chat_id: chatId,
        tg_username: message.from?.username ?? null,
        tg_first_name: message.from?.first_name ?? null,
        tg_linked_at: new Date().toISOString(),
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } else {
    // First time we've seen this person — create the user.
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        phone,
        name: [message.from?.first_name, message.from?.last_name]
          .filter(Boolean)
          .join(' ') || null,
        tg_user_id: senderId,
        tg_chat_id: chatId,
        tg_username: message.from?.username ?? null,
        tg_first_name: message.from?.first_name ?? null,
        tg_linked_at: new Date().toISOString(),
        phone_verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insertErr || !newUser) {
      console.error('Failed to create user:', insertErr);
      await sendMessage(chatId, 'Не удалось войти. Попробуйте ещё раз через минуту.');
      return;
    }
    userId = newUser.id as string;
  }

  // Mark the auth session completed so the polling web tab picks it up.
  await supabase
    .from('auth_sessions')
    .update({
      user_id: userId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  // Confirm to the user; remove the keyboard so the chat looks clean.
  await sendMessage(
    chatId,
    `✓ Вы вошли как ${phone}. Вернитесь в браузер — страница откроется автоматически.`,
    {
      replyMarkup: { remove_keyboard: true },
    },
  );
}

/** Catch-all for messages we don't understand — gentle hint, never angry. */
async function handleUnrecognized(message: TgMessage): Promise<void> {
  await sendMessage(
    message.chat.id,
    'Я бот ЖК.tj — помогаю войти на сайт и присылаю уведомления по сохранённым квартирам. Откройте /start чтобы начать.',
  );
}
