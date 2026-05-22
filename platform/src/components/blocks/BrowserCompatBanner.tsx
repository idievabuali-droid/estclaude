'use client';

import { useEffect, useState } from 'react';

/**
 * Soft browser-update nudge for the long tail of users on browsers
 * older than Chrome 111 / Safari 15.4 / Firefox 113 (where Tailwind
 * v4's oklch() palette can't be parsed — see globals.css @supports
 * block for the matching CSS fallback).
 *
 * Behaviour:
 *   - Runs feature detection on mount via CSS.supports('color', oklch(...)).
 *     If supported (the modern path) → renders nothing, zero cost.
 *   - If unsupported → renders a quiet single-line strip above the
 *     SiteHeader with copy and a dismiss "×".
 *   - Once dismissed, suppresses for the session via sessionStorage.
 *     Doesn't persist across tabs / sessions — a buyer on an older
 *     phone gets one reminder per visit, not perpetual silence.
 *
 * No tracking, no auto-redirect, no blocking. Purely informational —
 * matches the platform's halal-by-design + no-fake-urgency principles.
 *
 * Why @supports + this banner together: the CSS fallback keeps the
 * page functional (dark buttons visible, brand colours readable);
 * the banner explains WHY things might look slightly different from
 * screenshots they've seen elsewhere and points them at the fix.
 */
const DISMISS_KEY = 'vafo:browser-compat-dismissed';

export function BrowserCompatBanner() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // SSR guard — `CSS.supports` only exists client-side. We don't
    // render during SSR (state starts false), so the banner never
    // flashes for modern users. Only the client-side check decides
    // visibility.
    try {
      if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
        return;
      }
      const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
      if (dismissed) return;
      const oklchOk = CSS.supports('color', 'oklch(0 0 0)');
      if (!oklchOk) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShown(true);
      }
    } catch {
      // sessionStorage can throw in privacy modes or sandboxed frames —
      // swallow and skip the banner; the @supports fallback in CSS
      // keeps the UI usable either way.
    }
  }, []);

  if (!shown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-meta text-stone-800"
    >
      <span>
        Ваш браузер устарел — некоторые элементы могут отображаться неправильно. Обновите Chrome, Safari или Firefox.
      </span>
      <button
        type="button"
        onClick={() => {
          setShown(false);
          try {
            sessionStorage.setItem(DISMISS_KEY, '1');
          } catch {
            // Best-effort persist; if it fails, banner just shows again
            // next time the page mounts — acceptable, not destructive.
          }
        }}
        aria-label="Закрыть"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-stone-600 hover:bg-amber-100 hover:text-stone-900"
      >
        ×
      </button>
    </div>
  );
}
