/**
 * Client-side analytics tracker. Fires a fire-and-forget POST to
 * /api/events. Always returns void — never throws — so a tracking
 * call can be scattered through onClick handlers without try/catch.
 *
 * Uses `keepalive: true` so an event fired during a navigation (e.g.
 * a click on a Link that immediately routes away) still completes
 * after the page unloads. Browsers cap the keepalive payload at
 * ~64KB total per origin per page; our events are tiny, no risk.
 *
 * Server-side rendering safety: the function is a no-op on the server
 * (no `fetch` to make). React strict-mode double-invocation in dev
 * is fine — duplicate events on initial page mount are an acceptable
 * loss for the simpler client API.
 */
export function track(type: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      type,
      properties: { ...(properties ?? {}), url: window.location.pathname + window.location.search },
    });
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Tracking must never break the user's interaction.
  }
}
