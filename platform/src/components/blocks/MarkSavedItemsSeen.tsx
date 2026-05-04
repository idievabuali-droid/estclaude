'use client';

import { useEffect } from 'react';

/**
 * Tiny client effect that POSTs to /api/saved/mark-seen once on mount.
 * Mounted on /izbrannoe so the change-badges the user is currently
 * looking at clear from the NEXT visit's perspective — but stay visible
 * during this visit because the page is already rendered.
 *
 * Failure is silent: a missed mark-seen just means the badge shows once
 * more on the next visit, which is the safe direction.
 */
export function MarkSavedItemsSeen() {
  useEffect(() => {
    const ctrl = new AbortController();
    void fetch('/api/saved/mark-seen', { method: 'POST', signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, []);
  return null;
}
