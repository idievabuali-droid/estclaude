'use client';

import { useEffect } from 'react';

/**
 * Reads window.location.hash on mount and auto-opens the matching
 * <details> in the FAQ. Used so badges / chips elsewhere (e.g.
 * "Проверенный застройщик" → /tsentr-pomoshchi#verified-developer)
 * land on an OPEN entry, not just scroll to a closed one.
 *
 * Tiny effect — no observable UI of its own. We don't need a hash
 * change listener: the page reload triggered by the in-app Link is
 * enough, and the user re-tapping a different anchor would be a
 * full navigation.
 */
export function FaqAutoOpen() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') {
      (el as HTMLDetailsElement).open = true;
      // Re-scroll into view because the page already settled before
      // the open animation moved everything down.
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  return null;
}
