'use client';

import { MessageCircle, Phone, CalendarCheck } from 'lucide-react';
import { AppButton } from '@/components/primitives';

export interface StickyContactBarProps {
  whatsappHref: string;
  callHref: string;
  onRequestVisit: () => void;
}

/**
 * StickyContactBar — Layer 7.10.
 * Mobile sticky bottom bar with the three contact actions.
 * Uses safe-area inset (Layer 4.7).
 *
 * BUG-8: WhatsApp text was being squeezed by the icon at 375px. Solution:
 * make WhatsApp the labeled primary CTA, render Call + Visit as icon-only
 * secondary buttons. Most buyers want WhatsApp anyway (Tajik default).
 */
export function StickyContactBar({ whatsappHref, callHref, onRequestVisit }: StickyContactBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex-1">
          <AppButton variant="primary" size="md" className="w-full">
            <MessageCircle className="size-4" />
            WhatsApp
          </AppButton>
        </a>
        <a href={callHref} aria-label="Позвонить">
          <AppButton variant="secondary" size="md" className="aspect-square px-0">
            <Phone className="size-4" aria-hidden />
          </AppButton>
        </a>
        <AppButton
          variant="secondary"
          size="md"
          onClick={onRequestVisit}
          aria-label="Запросить визит"
          className="aspect-square px-0"
        >
          <CalendarCheck className="size-4" aria-hidden />
        </AppButton>
      </div>
    </div>
  );
}
