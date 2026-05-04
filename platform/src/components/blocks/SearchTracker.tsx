'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/track';

export interface SearchTrackerProps {
  /** Which list page the search ran on. Becomes the `page` field in
   *  the event so the founder dashboard can group results. */
  page: 'novostroyki' | 'kvartiry';
  /** The active filter values, as an object of strings/arrays — same
   *  shape the URL produces. Stored verbatim into properties.filters.
   *  Keep this stable across renders (server-side built object) or
   *  the dedupe ref below will misfire. */
  filters: Record<string, string | string[] | undefined>;
  /** Result row count from the server fetch. 0 fires the dedicated
   *  `search_no_results` event in addition to `search_run`. */
  resultCount: number;
}

/**
 * Mounted on /novostroyki and /kvartiry to fire a `search_run` event
 * each time the user lands on a filtered page (URL change). When the
 * result is 0, also fires `search_no_results` — separate event so
 * the dashboard's "buyers told us what's missing" query is trivial.
 *
 * We only fire when at least one filter is active. Visiting the page
 * with no filters at all is `page_view` territory, not "search".
 *
 * Renders nothing — pure side effect.
 */
export function SearchTracker({ page, filters, resultCount }: SearchTrackerProps) {
  // Dedupe key is the JSON of (filters + count). Without this React
  // strict mode + every parent re-render fires duplicate events.
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([k, v]) => {
        if (v == null || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        // Strip the view-mode toggle and map-focus params — they're
        // navigation state, not search criteria.
        return k !== 'view' && k !== 'focus' && k !== 'from' && k !== 'fromSlug';
      }),
    );
    if (Object.keys(cleanFilters).length === 0) return;

    const key = JSON.stringify({ page, cleanFilters, resultCount });
    if (lastFiredRef.current === key) return;
    lastFiredRef.current = key;

    track('search_run', { page, filters: cleanFilters, result_count: resultCount });
    if (resultCount === 0) {
      track('search_no_results', { page, filters: cleanFilters });
    }
  }, [page, filters, resultCount]);

  return null;
}
