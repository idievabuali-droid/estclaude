/**
 * Single source of truth for the founder's contact channels.
 *
 * Surfaced on the /post contact card (V1: only the founder publishes
 * listings; everyone else messages here and the founder posts on
 * their behalf) and on the home-page "хотите разместить?" CTA. Edit
 * this file to update channels everywhere — no DB write needed.
 *
 * `phone` is the digits-only form used for tel:/whatsapp links;
 * `phoneDisplay` is what we show in copy. Keep both in sync.
 *
 * `telegramHandle` is a personal handle (without `@`). For now we
 * point at `zhk_tj_admin` — change this when you have a real handle.
 */
export const FOUNDER_CONTACTS = {
  phone: '+992935563306',
  phoneDisplay: '+992 93 556 33 06',
  whatsappLink: 'https://wa.me/992935563306',
  telegramHandle: '@zhk_tj_bot',
  telegramLink: 'https://t.me/zhk_tj_admin',
} as const;
