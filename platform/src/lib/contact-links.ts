/**
 * Contact-channel deep-link builder. Pure function, server + client safe.
 * Single source of truth so the apartment detail desktop buttons and
 * the mobile sticky bar generate identical URLs from the seller's phone.
 */

export type ContactLinks = {
  whatsapp: string;
  telegram: string;
  imo: string;
  call: string;
};

/**
 * Build deep-links for the four contact channels from a single phone.
 * Phone must be E.164-style (e.g. "+992935563306"). The optional message
 * is pre-filled in WhatsApp / Telegram; if omitted, links open with no
 * message body.
 */
export function buildContactLinks(phone: string, message?: string): ContactLinks {
  const clean = phone.replace(/[^0-9+]/g, ''); // "+992935563306"
  const noPlus = clean.replace('+', '');        // "992935563306"
  const enc = message ? encodeURIComponent(message) : '';
  return {
    // WhatsApp pre-fills the message body so the seller sees context.
    whatsapp: enc ? `https://wa.me/${noPlus}?text=${enc}` : `https://wa.me/${noPlus}`,
    // Telegram opens a chat by phone number when no username is set.
    telegram: `https://t.me/${clean}`,
    // IMO's official deep-link only works when IMO is installed on the
    // buyer's device. Falls back to a "no-op" tap on desktop.
    imo: `imo://addContact?phone=${noPlus}`,
    call: `tel:${clean}`,
  };
}
