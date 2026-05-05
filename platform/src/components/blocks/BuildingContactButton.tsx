'use client';

import { MessageCircle } from 'lucide-react';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

export interface BuildingContactButtonProps {
  /** Building name shown in the prefilled WhatsApp message — gives the
   *  founder context the moment the buyer arrives in chat. */
  buildingName: string;
  /** Optional district + address line so the founder can route to
   *  the right developer / colleague even before the buyer types. */
  buildingAddress?: string;
  className?: string;
}

/**
 * Small "Связаться" pill on BuildingCard + the /zhk Застройщик card.
 * Was missing entirely — Saidakbar wanted to ask "do you have any
 * 3-комн units delivering this year?" before clicking through and
 * had to dig 3 levels deep without ever finding a developer contact.
 *
 * V1 reality: there's no per-developer phone in the data model, so
 * every contact funnels through the founder (FOUNDER_CONTACTS).
 * Single channel = WhatsApp (dominant in market). Prefilled text
 * carries the building name so the founder can answer in context.
 *
 * Rendered as a button (not anchor) — BuildingCard wraps the whole
 * card in a <Link>, and HTML doesn't allow nested <a>. The earlier
 * anchor version triggered a hydration error every render which forced
 * full page reloads and on mobile interrupted the photo carousel
 * swipe gesture. window.open keeps the new-tab behaviour anchors get.
 */
export function BuildingContactButton({
  buildingName,
  buildingAddress,
  className,
}: BuildingContactButtonProps) {
  const lines = [
    `Здравствуйте! Интересует ЖК ${buildingName}`,
    buildingAddress ? `(${buildingAddress})` : '',
    'Можете подсказать?',
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join(' '));
  const href = `${FOUNDER_CONTACTS.whatsappLink}?text=${text}`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(href, '_blank', 'noopener,noreferrer');
      }}
      aria-label={`Связаться по ЖК ${buildingName}`}
      title="Спросить о ЖК"
      className={
        'inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-emerald-700 transition-colors hover:bg-white hover:text-emerald-800 ' +
        (className ?? '')
      }
    >
      <MessageCircle className="size-4" aria-hidden />
    </button>
  );
}
