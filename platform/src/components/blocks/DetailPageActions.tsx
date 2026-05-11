'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ShareButton } from './ShareButton';
import { SaveToggle } from './SaveToggle';

export interface DetailPageActionsProps {
  /** SaveToggle target — same as the hero overlay. */
  type: 'building' | 'listing';
  id: string;
  /** Pre-built share text + title (re-used from the hero overlay). */
  shareText: string;
  shareTitle: string;
  /**
   * When set, the island starts HIDDEN and slides in once the element
   * with this DOM id has scrolled out of the viewport. Used to avoid
   * double-icon at the top of the page where the hero already shows
   * its own Save + Share overlay. Same pattern as BuildingStickyContact's
   * hideUntilElementHiddenId.
   *
   * If the id resolves to no element (e.g. hero rendered conditionally
   * and the condition failed), the island reverts to always-visible —
   * never strand the buyer without access to save/share.
   */
  revealAfterId?: string;
}

/**
 * Detail-page floating action island. Holds Save + Share at a fixed
 * position just below the SiteHeader (top-right) on detail pages.
 *
 * Why this exists: founder critique 2026-05-11 — "the share and save
 * buttons on the detail page should be seen all the time, like the
 * contact button." Before this, save+share lived only as overlays on
 * the hero photo; once the buyer scrolled past the hero they had no
 * way to save the listing without scrolling all the way back up.
 *
 * Mature-platform pattern (Cian, Avito, Bayut, Rightmove, Zillow): a
 * small floating action cluster that surfaces save/share at any
 * scroll depth. Cian and Bayut specifically use the "reveal after
 * hero scrolls out" approach so there's no visual collision with the
 * hero's own overlay icons.
 *
 * Positioning: fixed top-[6.75rem] right-3 z-30. That puts the pill
 * BELOW SiteHeader (56px) AND the sticky sub-nav (~52px) so it doesn't
 * cover tab labels. Stays out of the way of the mobile bottom contact
 * bar (which lives at the opposite edge of the viewport). z-30 lifts
 * it above page content but below modal dialogs.
 */
export function DetailPageActions({
  type,
  id,
  shareText,
  shareTitle,
  revealAfterId,
}: DetailPageActionsProps) {
  // Start hidden when revealAfterId is set so the island doesn't flash
  // on top of the hero overlay at page load. The IntersectionObserver
  // below either keeps us hidden (anchor visible) or slides us in
  // (anchor already scrolled past, e.g. via browser scroll restoration).
  const [hidden, setHidden] = useState<boolean>(revealAfterId != null);

  useEffect(() => {
    if (!revealAfterId) return;
    const target = document.getElementById(revealAfterId);
    if (!target) {
      // Anchor not found — stay visible so save/share is always
      // reachable. queueMicrotask defers past the synchronous effect
      // body to satisfy react-hooks/set-state-in-effect (same pattern
      // BuildingStickyContact + LocationSearch use).
      queueMicrotask(() => setHidden(false));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the hero overlay is in view → hide the island (the
        // overlay covers the same action). When it scrolls off → show.
        setHidden(entry?.isIntersecting ?? false);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [revealAfterId]);

  return (
    <div
      className={cn(
        // Position: fixed below the SiteHeader (56px) + sub-nav band
        // (~52px) so the island doesn't cover tab labels on /zhk. At
        // mobile widths the buffer above keeps the icons clear of the
        // sticky chrome.
        'fixed right-3 top-[6.75rem] z-30 flex items-center gap-2 md:right-5',
        // Slide-in animation mirrors BuildingStickyContact's: fade +
        // translate together via transition-all. pointer-events-none
        // on the hidden state so the invisible pill doesn't intercept
        // taps near the corner.
        'transition-all duration-200 ease-out',
        hidden
          ? 'pointer-events-none -translate-y-1 opacity-0'
          : 'pointer-events-auto translate-y-0 opacity-100',
      )}
      aria-hidden={hidden}
    >
      <ShareButton compact text={shareText} title={shareTitle} />
      <SaveToggle type={type} id={id} />
    </div>
  );
}
