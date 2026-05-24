'use client';

import { useEffect } from 'react';

/**
 * Side-effect-only client component that writes the global
 * `--site-header-y` CSS variable on `<html>` based on scroll
 * direction. SiteHeader and any sticky element stacked below it
 * consume the variable to slide together when the buyer scrolls
 * down (recovering vertical space for content) and slide back when
 * they scroll up.
 *
 * Pattern: Cian / Avito / Yandex Недвижимость mobile lists all hide
 * the global site chrome on scroll-down to maximise card area on a
 * tall list. With ~16 mobile screens of cards in a 12-building list
 * the recovered 56px = one extra row of card per scroll.
 *
 * Renders nothing. Mount it once near the top of the tree (e.g.
 * inside `<SiteHeader>`).
 *
 * Mobile-only: the consuming elements override the variable on
 * desktop via `md:translate-y-0` and `md:top-…`, so we don't need
 * to media-query check here — the writes are simply ignored above
 * the md breakpoint.
 *
 * Threshold: don't hide until the buyer has scrolled past 80px,
 * so a small bounce-back near the top doesn't flicker the header.
 * rAF-throttled so a 60Hz scroll storm doesn't thrash the DOM.
 */
export function ScrollDirectionTracker() {
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const HIDE_AFTER = 80; // px from top before we consider hiding
    const HEADER_HEIGHT = 56; // matches SiteHeader's h-14

    function update() {
      const y = window.scrollY;
      const dir = y > lastY ? 'down' : 'up';
      lastY = y;

      // Snap visible at the very top of the page regardless of
      // direction — a stray upward gesture shouldn't keep the header
      // hidden when there's no content above it anyway.
      const hide = y > HIDE_AFTER && dir === 'down';
      document.documentElement.style.setProperty(
        '--site-header-y',
        hide ? `-${HEADER_HEIGHT}px` : '0px',
      );
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    // Set initial value so the variable exists from first paint —
    // avoids a one-frame layout shift when the first scroll fires.
    document.documentElement.style.setProperty('--site-header-y', '0px');
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.documentElement.style.removeProperty('--site-header-y');
    };
  }, []);

  return null;
}
