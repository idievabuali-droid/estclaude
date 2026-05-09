'use client';

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { MessageSquare, MessageCircle, Send } from 'lucide-react';
import { AppButton } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

export interface MessagingPopoverButtonProps {
  /** WhatsApp deep-link (already includes the prefilled text). */
  whatsappHref: string;
  /** Telegram deep-link (already includes the prefilled text). */
  telegramHref: string;
  /** IMO deep-link, or null when IMO is unsupported. */
  imoHref?: string | null;
  /** Visual variant:
   *   primary-lg: desktop labeled big button (stone-900 filled)
   *   secondary-lg: desktop labeled big button (white + stone-300 border).
   *     Used when an even-higher-intent CTA (e.g. "Запросить визит") is
   *     the primary on the same page and Сообщения should read as a
   *     peer to "Позвонить" rather than competing with the primary.
   *   primary-mobile: mobile sticky-bar primary slot (labeled,
   *     content-sized so a price-anchored bar can render
   *     [price | button] without the button stretching across the
   *     full row).
   *   icon-stack: mobile sticky-bar icon-with-label slot (compact) */
  variant: 'primary-lg' | 'secondary-lg' | 'primary-mobile' | 'icon-stack';
  /** Override the trigger label. Default "Сообщения". /zhk uses
   *  "Связаться" per the senior-design prescription so the sticky
   *  bar reads as a single decision action, not a generic toolbar. */
  label?: string;
  /** Override the trigger icon. Default MessageSquare. */
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

/**
 * One "Сообщения" button → popover with WhatsApp / Telegram / IMO.
 * Replaces the previous 3-icon-row pattern (WA + TG + IMO each as a
 * separate button) which felt cluttered on mobile and made the
 * primary action ambiguous.
 *
 * Tap → small floating menu with the 3 channels. User picks the one
 * they actually use. Closes on selection or outside click.
 *
 * The popover renders below or above the button based on available
 * space — auto-flips when the button is near the bottom of the
 * viewport (the mobile sticky bar case). For V1 we just always anchor
 * above when the variant is mobile, below otherwise — no dynamic flip
 * logic, simpler.
 */
export function MessagingPopoverButton({
  whatsappHref,
  telegramHref,
  imoHref,
  variant,
  label,
  Icon,
  className,
}: MessagingPopoverButtonProps) {
  const TriggerIcon = Icon ?? MessageSquare;
  const triggerLabel = label ?? 'Сообщения';
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Safe-in-Link click handling: when this popover lives inside a
  // parent `<Link>` (BuildingCard wraps the entire card), a bare
  // `setOpen(...)` would let the click bubble up and trigger the
  // Link's navigation. preventDefault + stopPropagation neutralises
  // both. Always-on; no harm when the popover ISN'T nested.
  const onTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const trigger = (() => {
    if (variant === 'primary-lg') {
      return (
        <AppButton variant="primary" size="lg" className="w-full" onClick={onTriggerClick}>
          <TriggerIcon className="size-4" /> {triggerLabel}
        </AppButton>
      );
    }
    if (variant === 'secondary-lg') {
      return (
        <AppButton variant="secondary" size="lg" className="w-full" onClick={onTriggerClick}>
          <TriggerIcon className="size-4" /> {triggerLabel}
        </AppButton>
      );
    }
    if (variant === 'primary-mobile') {
      return (
        <AppButton variant="primary" size="md" onClick={onTriggerClick}>
          <TriggerIcon className="size-4" /> {triggerLabel}
        </AppButton>
      );
    }
    // icon-stack — used in the mobile sticky bar's secondary slots when
    // the bar prefers a denser layout. Not currently default.
    return (
      <AppButton variant="secondary" size="md" className="h-12 px-2 py-1" onClick={onTriggerClick}>
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          <MessageSquare className="size-4" aria-hidden />
          <span className="text-[10px] font-medium">Сообщ.</span>
        </span>
      </AppButton>
    );
  })();

  // Anchoring: mobile sticky bar always opens upward (the bar is at
  // the bottom of the viewport so a downward popover gets clipped).
  // Desktop opens below.
  const popoverPosition =
    variant === 'primary-mobile' || variant === 'icon-stack'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  return (
    <div ref={wrapRef} className={cn('relative inline-flex', className)}>
      {trigger}
      {open ? (
        <div
          role="menu"
          aria-label="Способ связи"
          className={`absolute left-0 right-0 z-30 ${popoverPosition} min-w-[15rem] overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg`}
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={(e) => {
              // stopPropagation so a parent `<Link>` (BuildingCard
              // wraps the card in one) doesn't intercept; default
              // behaviour (open href in new tab) is preserved because
              // we don't preventDefault.
              e.stopPropagation();
              // Capture intent at the moment of handoff. The user is
              // about to leave for WhatsApp where we lose visibility;
              // this event lets the founder reconcile WhatsApp DMs to
              // an anon_id timeline in /kabinet/analytics.
              track('contact_button_click', { channel: 'whatsapp', source: 'popover' });
              setOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2.5 text-meta text-stone-900 hover:bg-stone-50"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-fairness-great)] text-white" aria-hidden>
              <MessageCircle className="size-3.5" />
            </span>
            WhatsApp
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              track('contact_button_click', { channel: 'telegram', source: 'popover' });
              setOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2.5 text-meta text-stone-900 hover:bg-stone-50"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-semantic-info)] text-white" aria-hidden>
              <Send className="size-3.5" />
            </span>
            Telegram
          </a>
          {imoHref ? (
            <a
              href={imoHref}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                track('contact_button_click', { channel: 'imo', source: 'popover' });
                setOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-meta text-stone-900 hover:bg-stone-50"
            >
              {/* IMO wordmark on sky-blue — Lucide doesn't ship an IMO
                  icon, and the previous generic image icon (stone-grey)
                  read as a placeholder. The "imo" lowercase wordmark on
                  the brand cyan-blue is recognisable to anyone who has
                  used the app, with no asset dependency. */}
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-sky-500 text-white" aria-hidden>
                <span className="text-[10px] font-bold leading-none">imo</span>
              </span>
              IMO
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
