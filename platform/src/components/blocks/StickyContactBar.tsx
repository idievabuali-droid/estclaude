'use client';

import type { ComponentType } from 'react';
import { Phone } from 'lucide-react';
import { AppButton } from '@/components/primitives';
import type { ContactLinks } from '@/lib/contact-links';
import { MessagingPopoverButton } from './MessagingPopoverButton';

export interface StickyContactBarProps {
  links: ContactLinks;
  /** Short label for the intent button — "Визит" or "Онлайн-показ".
   *  Currently used only as aria-label since the button is icon-only. */
  intentShortLabel: string;
  IntentIcon: ComponentType<{ className?: string }>;
  onIntent: () => void;
}

/**
 * Sticky bottom bar (mobile only). Consolidated layout:
 *   [ 💬 Сообщения (labeled primary, flex-1) ] [ Звонок ] [ Визит ]
 *
 * Was 5 buttons (WA labeled + TG/IMO/Phone/Intent icon-stacks) which
 * felt cluttered and made the primary action ambiguous. The user
 * walked the live mobile site on iPhone and flagged it as messy.
 *
 * New layout: one "Сообщения" popover (WhatsApp / Telegram / IMO),
 * one "Звонок", one "Визит". Three buttons, each one a distinct
 * intent (chat / call / book). Buyer doesn't have to guess which
 * messenger; they tap Сообщения and the popover lets them pick.
 *
 * The intent button (rightmost) opens the visit/online-showing form
 * via onIntent — same modal that the desktop "Запланировать" CTA opens.
 */
function IconWithLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </span>
  );
}

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
        <MessagingPopoverButton
          variant="primary-mobile"
          whatsappHref={links.whatsapp}
          telegramHref={links.telegram}
          imoHref={links.imo}
        />
        <a href={links.call} aria-label="Позвонить">
          <AppButton variant="secondary" size="md" className="h-12 px-2 py-1">
            <IconWithLabel icon={<Phone className="size-4" aria-hidden />} label="Звонок" />
          </AppButton>
        </a>
        <AppButton
          variant="secondary"
          size="md"
          onClick={onIntent}
          aria-label={intentShortLabel}
          className="h-12 px-2 py-1"
        >
          <IconWithLabel icon={<IntentIcon className="size-4" />} label={intentShortLabel} />
        </AppButton>
      </div>
    </div>
  );
}
