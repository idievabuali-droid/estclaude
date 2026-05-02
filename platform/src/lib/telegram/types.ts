/**
 * Subset of Telegram Bot API types we actually consume in webhook
 * handling. The full type set is huge — only model what we read.
 *
 * Reference: https://core.telegram.org/bots/api
 */

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TgChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  username?: string;
  first_name?: string;
}

export interface TgContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  /** Set when the user shares their OWN contact via the Share Contact
   *  button — equals message.from.id. This is how we link a phone
   *  number to a verified Telegram identity. If the user shares
   *  someone else's contact, user_id will be different (or undefined),
   *  and we MUST reject the auth attempt. */
  user_id?: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  contact?: TgContact;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}
