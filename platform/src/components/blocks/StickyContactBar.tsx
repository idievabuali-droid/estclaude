'use client';

import { MessageCircle } from 'lucide-react';
import { formatPriceNumber } from '@/lib/format';
import type { ContactLinks } from '@/lib/contact-links';
import { MessagingPopoverButton } from './MessagingPopoverButton';

export interface StickyContactBarProps {
  links: ContactLinks;
  /** "от X TJS" anchor on the left of the bar. Per the senior-design
   *  prescription this is the highest-impact mobile pattern: the bar
   *  is grounded in what the buyer is choosing on (the price), not a
   *  generic toolbar of contact channels. Optional — falls back to a
   *  short "Цена в объявлении" label when no price is passed. */
  priceFromDirams?: bigint | null;
}

/**
 * Mobile sticky bottom bar for /kvartira detail. Aligned to /zhk's
 * BuildingStickyContact pattern per the senior-design prescription:
 *
 *   "...a sticky bottom bar appears once you scroll past the hero:
 *    'от 168 000 TJS' on the left, 'Связаться' CTA on the right."
 *
 * Replaces the prior 3-button layout (Сообщения + Звонок + Визит)
 * which split visual weight three ways and made the primary action
 * ambiguous. Now: price grounds the bar, single "Связаться" CTA
 * opens the channel popover (WhatsApp / Telegram / IMO). Phone tap
 * is one step deeper inside the popover; Визит/Онлайн-показ flow
 * lives on the desktop CTAs + the inline form modal.
 */
export function StickyContactBar({ links, priceFromDirams }: StickyContactBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-3 pt-3">
        {/* LEFT: price anchor — "от X TJS" or fallback. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {priceFromDirams != null ? (
            <span className="truncate text-meta font-semibold tabular-nums text-stone-900">
              {formatPriceNumber(priceFromDirams)} TJS
            </span>
          ) : (
            <span className="truncate text-meta font-semibold text-stone-900">
              Цена в объявлении
            </span>
          )}
        </div>
        {/* RIGHT: single primary CTA. */}
        <div className="shrink-0">
          <MessagingPopoverButton
            variant="primary-mobile"
            whatsappHref={links.whatsapp}
            telegramHref={links.telegram}
            imoHref={links.imo}
            label="Связаться"
            Icon={MessageCircle}
          />
        </div>
      </div>
    </div>
  );
}
