/**
 * Telegram Bot webhook. Receives every update Telegram sends about
 * our bot — for auth we only care about a few flows:
 *
 *   1. /start <token>  →  user opened the bot via our QR/deep-link.
 *      Persist the chat_id on the auth_session so we remember it
 *      across serverless cold starts. Reply with the "Поделиться
 *      номером" Share Contact prompt.
 *
 *   2. message.contact  →  user tapped Share Contact.
 *      Verify the contact actually belongs to the sender (Telegram
 *      sets contact.user_id to the sender's id when they share their
 *      OWN number — if missing or different, the user shared someone
 *      ELSE's contact and we reject), look up the pending session by
 *      chat_id, then create or update the user, link the auth_session,
 *      and confirm.
 *
 *   3. text message during pending session  →  user typed instead of
 *      tapping the Share Contact button (the button can be hidden by
 *      Telegram on some clients, or accidentally dismissed). Re-show
 *      the keyboard with a polite nudge — DON'T accept the typed
 *      number, because it can't be cryptographically tied to the
 *      sender (Share Contact's user_id field is the only verified
 *      bridge between phone and Telegram identity).
 *
 *   4. Anything else with no pending session  →  generic "I'm the bot"
 *      orientation reply.
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
      await handleNonContactInput(message);
    }
  } catch (err) {
    console.error('Telegram webhook handler error:', err);
    // Always 200 to Telegram — non-2xx makes it retry the same update,
    // and a deterministic error will just retry forever.
  }

  return NextResponse.json({ ok: true });
}

/**
 * Show the Share Contact keyboard. Extracted because we also re-show
 * it when the user types text instead of tapping the button.
 */
async function promptShareContact(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    'Нажмите кнопку ниже, чтобы поделиться номером телефона. Это нужно для входа на ЖК.tj и уведомлений по сохранённым квартирам.\n\n⚠️ Не печатайте номер вручную — Telegram не сможет проверить, что он ваш. Используйте кнопку.',
    {
      replyMarkup: {
        keyboard: [
          [{ text: '📱 Поделиться номером', request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    },
  );
}

/**
 * /start [token]
 *   - With token: this is the QR/deep-link flow from /voyti. Persist
 *     the chat_id on the auth_session and ask for the user's phone
 *     via Share Contact.
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

  // Validate the token exists and is still pending. If invalid, tell
  // the user — don't leak why specifically, but make it clear they
  // need a fresh link.
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

  // Persist chat_id on the session so the next message from this chat
  // (the contact share) can find its way back to this token without
  // needing in-memory state.
  await supabase
    .from('auth_sessions')
    .update({ tg_chat_id: chatId })
    .eq('id', session.id);

  await promptShareContact(chatId);
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
  // — refuse so attackers can't impersonate by forwarding a contact
  // they have for the target.
  if (!contact.user_id || contact.user_id !== senderId) {
    await sendMessage(
      chatId,
      'Поделитесь СВОИМ номером через кнопку «📱 Поделиться номером» — другой контакт нельзя.',
    );
    return;
  }

  const supabase = createAdminClient();

  // Find the pending session for this chat (set when the user did
  // /start <token>). DB-backed instead of in-memory so cold starts
  // don't lose the link.
  const { data: session } = await supabase
    .from('auth_sessions')
    .select('id, status, expires_at, token')
    .eq('tg_chat_id', chatId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    await sendMessage(
      chatId,
      'Сначала нажмите «Войти через Telegram» на сайте ЖК.tj и откройте бота по ссылке.',
    );
    return;
  }
  if (new Date(session.expires_at as string) < new Date()) {
    await sendMessage(
      chatId,
      'Сессия истекла. Откройте сайт и снова нажмите «Войти через Telegram».',
    );
    return;
  }

  // Normalise the phone number. Telegram returns it without a leading
  // "+" sometimes — store as E.164 with the "+" prefix to match every
  // other phone in our DB.
  const phoneRaw = contact.phone_number.replace(/[^0-9]/g, '');
  const phone = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`;

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

  await supabase
    .from('auth_sessions')
    .update({
      user_id: userId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  await sendMessage(
    chatId,
    `✓ Вы вошли как ${phone}. Вернитесь в браузер — страница откроется автоматически.`,
    {
      replyMarkup: { remove_keyboard: true },
    },
  );
}

/**
 * Anything that's not /start and not a contact share. Two cases:
 *
 *   - Chat IS mid-handshake (has a pending auth_session) — the user
 *     probably typed their number instead of tapping the Share
 *     Contact button. Re-show the keyboard with a clear nudge.
 *
 *   - Chat is NOT mid-handshake — orientation message.
 */
async function handleNonContactInput(message: TgMessage): Promise<void> {
  const chatId = message.chat.id;
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from('auth_sessions')
    .select('id, expires_at')
    .eq('tg_chat_id', chatId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending && new Date(pending.expires_at as string) > new Date()) {
    // Mid-handshake — re-show the Share Contact button. This is the
    // exact scenario your test case hit: user typed "935563306" as
    // text and the bot fell through to a generic message that lost
    // them the session. Now we re-prompt instead.
    await promptShareContact(chatId);
    return;
  }

  // Generic orientation — no pending session.
  await sendMessage(
    chatId,
    'Я бот ЖК.tj — помогаю войти на сайт и присылаю уведомления по сохранённым квартирам. Откройте сайт ЖК.tj и нажмите «Войти через Telegram», чтобы начать.',
  );
}
