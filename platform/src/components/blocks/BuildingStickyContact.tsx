'use client';

import { MessageCircle } from 'lucide-react';
import { formatPriceNumber } from '@/lib/format';
import { MessagingPopoverButton } from './MessagingPopoverButton';

export interface BuildingStickyContactProps {
  /** Russian name shown in the prefilled WhatsApp/Telegram message —
   *  the founder receives the message with this context already in
   *  the first line, no back-and-forth needed. */
  buildingName: string;
  /** District + address line tacked into the message body so the
   *  founder can route the conversation to the right developer
   *  without asking. */
  buildingAddress?: string;
  /** "от X TJS" cheapest-total price shown on the left of the bar.
   *  Per the senior-design prescription this is the highest-impact
   *  mobile pattern: anchor the action with the price the buyer is
   *  actually choosing on. Optional — falls back to the project
   *  name when no price is known. */
  priceFromDirams?: bigint | null;
  /** Founder contact channels — caller passes whatever is in
   *  FOUNDER_CONTACTS so this component stays free of env access. */
  whatsappLink: string;
  telegramLink: string;
  /** Full IMO deep-link, e.g. `imo://addContact?phone=992...`. */
  imoHref?: string | null;
  /** Phone number for the tel: link, in raw +992... format. */
  phone: string;
}

/**
 * Mobile-only sticky bottom bar for /zhk/[slug]. Per the senior-design
 * prescription:
 *
 *   "...a sticky bottom bar appears once you scroll past the hero:
 *   'от 168 000 TJS' on the left, 'Связаться' CTA on the right. This
 *   is the single highest-impact mobile pattern for this page type
 *   and exists on every serious real estate platform."
 *
 * Replaces the prior two-button layout (messaging popover + dedicated
 * call button), which split visual weight evenly and made the bar
 * read as a generic contact toolbar. Now the price grounds the bar
 * in what the buyer is choosing on, and a single primary CTA carries
 * all the contact intent (the popover surfaces WhatsApp / Telegram /
 * IMO; phone tap is one more step in the popover instead of a peer
 * button competing with messaging).
 *
 * Routes through founder contacts in V1 (no per-developer phone in
 * the data model yet); the prefilled message carries the building
 * name so context lands in chat.
 *
 * `phone` and `imoHref` are forwarded into the popover so the call
 * affordance is preserved one tap deeper — same total effort, less
 * competing chrome.
 */
export function BuildingStickyContact({
  buildingName,
  buildingAddress,
  priceFromDirams,
  whatsappLink,
  telegramLink,
  imoHref,
  // phone — currently unused after the dedicated call button was
  // collapsed into the popover. Kept on the prop signature so callers
  // don't need to be touched if/when a per-channel call entry returns.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  phone,
}: BuildingStickyContactProps) {
  const lines = [
    `Здравствуйте! Интересует ЖК ${buildingName}`,
    buildingAddress ? `(${buildingAddress})` : '',
    'Можете подсказать?',
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join(' '));
  const whatsappHref = `${whatsappLink}?text=${text}`;
  const telegramHref = `${telegramLink}?text=${text}`;
  const imoHrefFinal = imoHref ?? null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-3 pt-3">
        {/* LEFT: anchor — "от X TJS" or building name fallback. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {priceFromDirams != null ? (
            <>
              <span className="text-caption text-stone-500">от</span>
              <span className="truncate text-meta font-semibold tabular-nums text-stone-900">
                {formatPriceNumber(priceFromDirams)} TJS
              </span>
            </>
          ) : (
            <span className="truncate text-meta font-semibold text-stone-900">
              {buildingName}
            </span>
          )}
        </div>
        {/* RIGHT: single primary CTA. MessagingPopoverButton renders
            an AppButton primary "Сообщения" trigger that opens the
            channel popover (WhatsApp / Telegram / IMO). */}
        <div className="shrink-0">
          <MessagingPopoverButton
            variant="primary-mobile"
            whatsappHref={whatsappHref}
            telegramHref={telegramHref}
            imoHref={imoHrefFinal}
            label="Связаться"
            Icon={MessageCircle}
          />
        </div>
      </div>
    </div>
  );
}
