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
  /**
   * Visual treatment:
   *
   * - `'icon'` — 36px white circle with just the MessageCircle icon.
   *   The legacy form, designed for the /zhk Застройщик-card overlay.
   * - `'inline'` — full-width outlined button with the icon + label
   *   "Связаться". Used inside the BuildingCard body (founder critique
   *   2026-05-09: the icon overlaying the photo competed with the
   *   listing's primary content; contact moved into the card body so
   *   buyers see what the listing IS first, then have an explicit way
   *   to reach out).
   *
   * Defaults to `'icon'` so existing callers don't change behaviour.
   */
  variant?: 'icon' | 'inline';
  className?: string;
}

/**
 * "Связаться" affordance on BuildingCard (inline variant) and the
 * /zhk Застройщик card (icon variant). V1 funnels every contact
 * through the founder (FOUNDER_CONTACTS) over WhatsApp, with a
 * prefilled message that carries the building name + address so the
 * founder lands in chat with full context.
 *
 * Rendered as a button (not anchor) — BuildingCard wraps the whole
 * card in a <Link>, and HTML doesn't allow nested <a>. The button
 * uses preventDefault + stopPropagation so the parent link doesn't
 * intercept; window.open preserves the new-tab behaviour anchors get.
 */
export function BuildingContactButton({
  buildingName,
  buildingAddress,
  variant = 'icon',
  className,
}: BuildingContactButtonProps) {
  const lines = [
    `Здравствуйте! Интересует ЖК ${buildingName}`,
    buildingAddress ? `(${buildingAddress})` : '',
    'Можете подсказать?',
  ].filter(Boolean);
  const text = encodeURIComponent(lines.join(' '));
  const href = `${FOUNDER_CONTACTS.whatsappLink}?text=${text}`;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  };
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Связаться по ЖК ${buildingName}`}
        className={
          'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white text-meta font-medium text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-50 ' +
          (className ?? '')
        }
      >
        <MessageCircle className="size-4 text-emerald-700" aria-hidden />
        Связаться
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
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
