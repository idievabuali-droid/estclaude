'use client';

import { useEffect } from 'react';
import { toast } from '@/components/primitives/AppToast';

/**
 * Fires a pending /api/saved/toggle call once the user lands back in
 * the app after a session-expired login round-trip. The save intent
 * was stashed into sessionStorage by `SaveToggle` when its `toggle`
 * call got a 401 — without this rescue, the user logs back in and
 * the heart they were trying to fill in just stays empty (they have
 * to remember which card it was and tap again).
 *
 * Behaviour:
 *  - Reads `retry_save` from sessionStorage on mount.
 *  - If present and fresh (<10 min old), POST to /api/saved/toggle.
 *  - Removes the key whether the retry succeeds or fails — we never
 *    want to silently re-fire on every page load.
 *  - On success, shows a confirmation toast so the user knows the
 *    save landed even though they didn't click anything visible.
 *  - On 401 (still not authenticated), drops the entry quietly — at
 *    that point the user is anonymous again and the save would have
 *    gone to anon storage anyway.
 *
 * Mounted once at the locale-layout level so it runs across every
 * page; the retry happens exactly once per stash.
 */
export function RetrySaveOnReturn() {
  useEffect(() => {
    let cancelled = false;
    const RETRY_KEY = 'retry_save';
    const MAX_AGE_MS = 10 * 60 * 1000; // 10 min — a login round-trip rarely takes more.

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(RETRY_KEY);
    } catch {
      return; // private mode etc — no-op.
    }
    if (!raw) return;

    // Always clear, even before validating. We want to retry exactly
    // once per stash — even if the parse / fetch fails, we shouldn't
    // attempt again on next page load.
    try {
      sessionStorage.removeItem(RETRY_KEY);
    } catch {
      /* ignore */
    }

    let payload: { type?: string; id?: string; ts?: number };
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return;
    }

    const { type, id, ts } = payload;
    if (
      (type !== 'building' && type !== 'listing') ||
      typeof id !== 'string' ||
      typeof ts !== 'number'
    ) {
      return;
    }
    if (Date.now() - ts > MAX_AGE_MS) return;

    void fetch('/api/saved/toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, id }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) return; // still not auth'd — give up quietly.
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
        if (data.saved) {
          toast.success('Сохранено — продолжайте, где остановились.');
        }
      })
      .catch(() => {
        /* network blip — drop silently */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
