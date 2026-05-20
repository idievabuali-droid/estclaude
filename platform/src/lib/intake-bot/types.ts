/**
 * Minimal Telegram Bot API types consumed by the intake bot's
 * webhook. Deliberately separate from src/lib/telegram/types.ts —
 * the intake bot shares no code with the @VafoTjBot login bot.
 *
 * Reference: https://core.telegram.org/bots/api
 */

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
}

export interface TgLocation {
  latitude: number;
  longitude: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  location?: TgLocation;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export interface TgInlineButton {
  text: string;
  callback_data: string;
}

/** Telegram inline keyboard — an array of button rows. */
export type TgInlineKeyboard = TgInlineButton[][];
