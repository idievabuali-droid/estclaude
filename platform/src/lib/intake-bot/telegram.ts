/**
 * Telegram Bot API client for the intake bot.
 *
 * Reads INTAKE_BOT_TOKEN — NOT the login bot's TELEGRAM_BOT_TOKEN.
 * The two bots are fully separate and only share this deployment for
 * hosting. Token is read at call time so importing this module never
 * crashes when the env var is absent; an actual API call fails fast.
 */
import type { TgInlineKeyboard } from './types';

const API_BASE = 'https://api.telegram.org';

function getToken(): string {
  const token = process.env.INTAKE_BOT_TOKEN;
  if (!token) {
    throw new Error('INTAKE_BOT_TOKEN is not set');
  }
  return token;
}

async function callApi<T = unknown>(
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${getToken()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? 'unknown'}`);
  }
  return json.result as T;
}

interface SentMessage {
  message_id: number;
}

/** Send a plain-text message. Returns the new message id. */
export async function sendMessage(
  chatId: number,
  text: string,
  keyboard?: TgInlineKeyboard,
): Promise<number> {
  const msg = await callApi<SentMessage>('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
  return msg.message_id;
}

/**
 * Edit an existing message's text + keyboard. Telegram rejects edits
 * to identical content or to very old messages — callers treat a
 * throw as non-fatal.
 */
export async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: TgInlineKeyboard,
): Promise<void> {
  await callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

/** Delete a message. Best-effort — callers swallow the throw. */
export async function deleteMessage(
  chatId: number,
  messageId: number,
): Promise<void> {
  await callApi('deleteMessage', { chat_id: chatId, message_id: messageId });
}

/** Acknowledge a callback query so Telegram stops the button spinner. */
export async function answerCallback(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}
