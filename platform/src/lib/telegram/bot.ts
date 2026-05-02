/**
 * Telegram Bot API client. Thin wrapper around the HTTP API at
 * https://api.telegram.org/bot<TOKEN>/<METHOD>. We don't use a third-
 * party library because (a) we only need a handful of methods,
 * (b) every dependency is one more thing to keep updated, and (c) the
 * Telegram API is stable and well-documented.
 *
 * Token is read from TELEGRAM_BOT_TOKEN at call time (not module load)
 * so this file can be imported in places where the env var isn't
 * available without crashing — actual API calls fail fast if missing.
 */

const API_BASE = 'https://api.telegram.org';

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return token;
}

export function getBotUsername(): string {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) {
    throw new Error('TELEGRAM_BOT_USERNAME is not set');
  }
  return username;
}

/** Generic call to a Telegram Bot API method. */
async function callApi<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const token = getBotToken();
  const url = `${API_BASE}/bot${token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram API ${method} failed: ${json.description ?? 'unknown'}`);
  }
  return json.result as T;
}

export type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

export type ReplyKeyboardButton = {
  text: string;
  request_contact?: boolean;
};

export type ReplyMarkup =
  | { inline_keyboard: InlineKeyboardButton[][] }
  | {
      keyboard: ReplyKeyboardButton[][];
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true };

/**
 * Send a text message to a Telegram chat. Supports HTML formatting
 * (we use it for bold names and clickable inline buttons in
 * notification messages — see notifications.ts).
 */
export async function sendMessage(
  chatId: number,
  text: string,
  options: {
    parseMode?: 'HTML' | 'MarkdownV2';
    replyMarkup?: ReplyMarkup;
    disablePreview?: boolean;
  } = {},
): Promise<void> {
  await callApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode,
    reply_markup: options.replyMarkup,
    disable_web_page_preview: options.disablePreview,
  });
}

/**
 * Send a photo with caption. Used for notifications that include the
 * listing's cover image — much higher engagement than text-only.
 */
export async function sendPhoto(
  chatId: number,
  photoUrl: string,
  caption: string,
  options: {
    parseMode?: 'HTML' | 'MarkdownV2';
    replyMarkup?: ReplyMarkup;
  } = {},
): Promise<void> {
  await callApi('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: options.parseMode,
    reply_markup: options.replyMarkup,
  });
}

/** Set the bot's command list shown in the Telegram UI. */
export async function setMyCommands(
  commands: Array<{ command: string; description: string }>,
): Promise<void> {
  await callApi('setMyCommands', { commands });
}

/**
 * Register a webhook URL with Telegram. Telegram POSTs each update to
 * this URL, including the secret token in the X-Telegram-Bot-Api-
 * Secret-Token header so we can verify the request really came from
 * Telegram (not a public attacker hitting our endpoint).
 */
export async function setWebhook(
  url: string,
  secretToken: string,
  allowedUpdates: string[] = ['message'],
): Promise<void> {
  await callApi('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: allowedUpdates,
    drop_pending_updates: true,
  });
}

/** Inspect current webhook config — useful for debugging. */
export async function getWebhookInfo(): Promise<{
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}> {
  return callApi('getWebhookInfo');
}

/** Remove the registered webhook (e.g. for local development). */
export async function deleteWebhook(): Promise<void> {
  await callApi('deleteWebhook');
}
