'use client';

import type { ComponentType } from 'react';
import { MessageCircle, Send, Phone, Image as ImageIcon } from 'lucide-react';
import { AppButton } from '@/components/primitives';
import type { ContactLinks } from '@/lib/contact-links';

export interface StickyContactBarProps {
  links: ContactLinks;
  /** Short label for the intent button — "Визит" or "Онлайн-показ".
   *  Currently used only as aria-label since the button is icon-only. */
  intentShortLabel: string;
  IntentIcon: ComponentType<{ className?: string }>;
  onIntent: () => void;
}

/**
 * Sticky bottom bar (mobile only). Layout:
 *   [ 💬 WhatsApp (label, primary, flex-1) ] [ ✈ ] [ 🖼 ] [ 📞 ] [ 📅 ]
 *
 * WhatsApp gets the labeled primary slot because it's the dominant
 * channel in our market (Tajik buyers default to WA). Telegram, IMO,
 * Phone, and the intent (Visit / Online-showing) are icon-only secondary
 * buttons. Five actions fit on a 375px width with this hierarchy.
 *
 * The intent button (rightmost) opens the visit/online-showing form
 * via onIntent — same modal that the desktop "Запланировать" CTA opens.
 */
export function StickyContactBar({
  links,
  intentShortLabel,
  IntentIcon,
  onIntent,
}: StickyContactBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1.5 px-3 pt-3">
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
          <AppButton variant="primary" size="md" className="w-full">
            <MessageCircle className="size-4" />
            WhatsApp
          </AppButton>
        </a>
        <a href={links.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <AppButton variant="secondary" size="md" className="aspect-square px-0">
            <Send className="size-4" aria-hidden />
          </AppButton>
        </a>
        <a href={links.imo} target="_blank" rel="noopener noreferrer" aria-label="IMO">
          <AppButton variant="secondary" size="md" className="aspect-square px-0">
            <ImageIcon className="size-4" aria-hidden />
          </AppButton>
        </a>
        <a href={links.call} aria-label="Позвонить">
          <AppButton variant="secondary" size="md" className="aspect-square px-0">
            <Phone className="size-4" aria-hidden />
          </AppButton>
        </a>
        <AppButton
          variant="secondary"
          size="md"
          onClick={onIntent}
          aria-label={intentShortLabel}
          className="aspect-square px-0"
        >
          <IntentIcon className="size-4" />
        </AppButton>
      </div>
    </div>
  );
}
