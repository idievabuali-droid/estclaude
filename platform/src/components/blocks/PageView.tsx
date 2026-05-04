'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics/track';

/**
 * Mounted once in the root layout. Fires a `page_view` event whenever
 * the route changes — including the very first load. We key off
 * pathname + search params so navigating between filter states on
 * /novostroyki counts as separate page views (the filter state IS
 * the search behaviour we want to capture).
 *
 * Renders nothing — this is a side-effect-only component.
 */
export function PageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    // Guard against React strict-mode double-invocation firing twice
    // for the same URL on mount; without this we'd record duplicate
    // page_views in dev (and one extra in prod is no big deal but
    // still wasteful).
    if (lastUrlRef.current === url) return;
    lastUrlRef.current = url;
    track('page_view', { pathname, search: searchParams.toString() || undefined });
  }, [pathname, searchParams]);

  return null;
}
