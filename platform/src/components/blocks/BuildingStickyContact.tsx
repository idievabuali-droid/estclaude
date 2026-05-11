'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { formatPriceNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  /**
   * When set, the bar starts HIDDEN and only slides in once the element
   * with this DOM id has scrolled out of the viewport. Cian / Avito /
   * Bayut all do this on project-detail mobile: an inline primary
   * contact button lives in the price card up top, and the sticky bar
   * only appears once the buyer scrolls past it — so contact is always
   * one-tap, but the two CTAs never compete for attention at the same
   * scroll position.
   *
   * If the id resolves to no element (e.g. price card hidden because
   * no price is known), the bar reverts to always-visible. We never
   * leave the buyer with NO sticky contact path on a long page.
   */
  hideUntilElementHiddenId?: string;
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
  hideUntilElementHiddenId,
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

  // `hidden` = bar slid off-screen + non-interactive. When
  // hideUntilElementHiddenId is set, default to hidden so the bar
  // doesn't flash on top of the inline button when the buyer lands
  // at the top of the page (where the inline button is in view).
  // Once the IntersectionObserver attaches it'll either keep us
  // hidden (inline button visible) or slide us in (inline button
  // already scrolled past, e.g. browser scroll restoration).
  const [hidden, setHidden] = useState<boolean>(hideUntilElementHiddenId != null);

  useEffect(() => {
    if (!hideUntilElementHiddenId) return;
    const target = document.getElementById(hideUntilElementHiddenId);
    if (!target) {
      // Graceful fallback: anchor element isn't in the DOM (e.g. the
      // page-level inline contact rendered conditionally and the
      // condition failed). Stay visible so the buyer always has a
      // contact path — never strand them without a sticky on a long
      // page. queueMicrotask defers the setState past the effect's
      // synchronous body to satisfy the react-hooks/set-state-in-effect
      // rule (same pattern LocationSearch uses for its hot-path effects).
      queueMicrotask(() => setHidden(false));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // `isIntersecting === true` means the anchor element (inline
        // contact button) has at least one pixel inside the viewport.
        // Hide the sticky bar while that's true — two CTAs at the
        // same scroll position is exactly the redundancy this prop
        // exists to prevent. Once the inline button has fully scrolled
        // off-screen (isIntersecting === false), slide the bar in.
        setHidden(entry?.isIntersecting ?? false);
      },
      // threshold 0 = trigger on the first / last pixel of the
      // anchor. The transition is smooth (300ms via CSS) so the
      // exact threshold doesn't need to be tuned for "early reveal."
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideUntilElementHiddenId]);

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-md md:hidden',
        // Slide-up + fade transition. transition-all picks up both the
        // translate-y and opacity changes from one declaration. The
        // pointer-events-none on the hidden state prevents the bar from
        // intercepting taps while it's animating off-screen.
        'transition-all duration-300 ease-out',
        hidden
          ? 'pointer-events-none translate-y-full opacity-0'
          : 'pointer-events-auto translate-y-0 opacity-100',
      )}
      // aria-hidden mirrors the visual state so screen readers don't
      // announce a contact bar that isn't visible. Default `false`
      // (always visible) matches existing back-compat behaviour for
      // callers that don't pass `hideUntilElementHiddenId`.
      aria-hidden={hidden}
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
