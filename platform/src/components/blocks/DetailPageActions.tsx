'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShareButton } from './ShareButton';
import { SaveToggle } from './SaveToggle';

export interface DetailPageActionsProps {
  /** SaveToggle target — same as the hero overlay previously was. */
  type: 'building' | 'listing';
  id: string;
  /** Pre-built share text + title (re-used from the hero overlay). */
  shareText: string;
  shareTitle: string;
}

/**
 * Detail-page Save + Share actions, portalled INTO the SiteHeader's
 * `#site-header-actions` slot so the buttons live inside the existing
 * chrome instead of floating in mid-air below it.
 *
 * Pattern reference (Cian, Bayut, Avito, Rightmove, Zillow): on
 * project / listing detail pages, save + share live in the persistent
 * top bar — not as a separate floating island. The bar is already
 * sticky on scroll, so the actions are always accessible without
 * adding a second sticky element to the page.
 *
 * Earlier this component rendered as a fixed-positioned pill below
 * the SiteHeader. Founder critique 2026-05-11 (second pass): "it is
 * just staying on the like making a place that doesn't actually make
 * sense at all … it's not connected." Correct — a floating island
 * mid-screen with no visual anchor reads as orphan UI. The portal
 * approach attaches the actions to the SiteHeader's right-side
 * cluster (next to Войти / Кабинет) so they're visually integrated
 * with the rest of the chrome.
 *
 * Mechanism: the SiteHeader renders an empty
 * `<div id="site-header-actions">` slot. This component looks up that
 * slot at mount and uses `createPortal` to render children into it.
 * Slot is empty on non-detail pages — DetailPageActions is only
 * mounted on /zhk + /kvartira details, where the page chooses to
 * surface these actions.
 *
 * No IntersectionObserver / scroll-spy needed: SiteHeader is
 * `sticky top-0 z-30`, so the actions are always in view at every
 * scroll depth. The hero photo's own overlay save + share icons were
 * removed in the same change — the header version is the single
 * source for these actions across the entire detail page.
 */
export function DetailPageActions({
  type,
  id,
  shareText,
  shareTitle,
}: DetailPageActionsProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Look up the slot once on mount. SiteHeader renders the slot
    // server-side so by the time this client effect runs it should
    // exist. queueMicrotask defers the setState past the synchronous
    // effect body to satisfy react-hooks/set-state-in-effect (same
    // pattern used by BuildingStickyContact + LocationSearch). The
    // requestAnimationFrame fallback handles the rare edge case where
    // this component hydrates before the slot does (e.g. if
    // SiteHeader is itself behind a Suspense boundary).
    const find = () => document.getElementById('site-header-actions');
    const initial = find();
    if (initial) {
      queueMicrotask(() => setSlot(initial));
      return;
    }
    const raf = requestAnimationFrame(() => setSlot(find()));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!slot) return null;
  return createPortal(
    <>
      <ShareButton compact text={shareText} title={shareTitle} />
      <SaveToggle type={type} id={id} />
    </>,
    slot,
  );
}
