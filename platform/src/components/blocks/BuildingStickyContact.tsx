'use client';

import { Phone } from 'lucide-react';
import { AppButton } from '@/components/primitives';
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
  /** Founder contact channels — caller passes whatever is in
   *  FOUNDER_CONTACTS so this component stays free of env access. */
  whatsappLink: string;
  telegramLink: string;
  imoHref?: string | null;
  /** Phone number for the tel: link, in raw +992... format. */
  phone: string;
}

/**
 * Mobile-only sticky bottom bar for /zhk/[slug]. Mirrors the listing
 * detail's StickyContactBar pattern (Сообщения popover + Звонок) but
 * skips the per-listing "Визит" intent — at the building level the
 * apartment hasn't been chosen yet, so booking a specific viewing
 * doesn't apply.
 *
 * Without this bar, buyers who scrolled past the hero on a building
 * page had no fixed contact affordance — they had to scroll back up
 * or drill into a specific apartment to find a way to ask a
 * pre-purchase question. Cian + Avito both keep contact pinned on
 * building pages for the same reason: the "is this developer real,
 * are these prices serious" question comes BEFORE the "which unit"
 * question.
 *
 * Routes through founder contacts in V1 (no per-developer phone in
 * the data model yet); the prefilled message carries the building
 * name so context lands in chat.
 */
export function BuildingStickyContact({
  buildingName,
  buildingAddress,
  whatsappLink,
  telegramLink,
  imoHref,
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
  const imoHrefFinal = imoHref ? `${imoHref}?text=${text}` : null;
  const callHref = `tel:${phone}`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1.5 px-3 pt-3">
        <MessagingPopoverButton
          variant="primary-mobile"
          whatsappHref={whatsappHref}
          telegramHref={telegramHref}
          imoHref={imoHrefFinal}
        />
        <a href={callHref} aria-label="Позвонить">
          <AppButton variant="secondary" size="md" className="h-12 px-2 py-1">
            <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
              <Phone className="size-4" aria-hidden />
              <span className="text-[10px] font-medium">Звонок</span>
            </span>
          </AppButton>
        </a>
      </div>
    </div>
  );
}
