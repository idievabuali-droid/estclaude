/**
 * Scope-keyed recent-searches store, backed by localStorage.
 *
 * Surfaced in the LocationSearch dropdown when the input is empty +
 * focused. Helps a returning visitor pick up where they left off
 * without re-typing — Avito / Cian / Bayut all have this and buyers
 * reach for it.
 *
 * Why scope-keyed: the same LocationSearch component is reused on the
 * home (scope="all", buyers shopping by anything) AND in the guided
 * picker (scope="location", only districts/POIs matter). Mixing those
 * two histories would confuse buyers — wizard's "Какие районы вам
 * подходят?" shouldn't surface "3 комнаты до 200к" as a recent.
 *
 * Behaviour:
 *  - Up to MAX (5) entries per scope, LRU-style: most recent at the
 *    top, duplicates collapsed before insertion.
 *  - Saved on submit (Найти / Enter) AND on autocomplete pick.
 *  - Per-scope localStorage key so two scopes don't pollute each other.
 *  - Dies silently in private mode / quota exceeded / storage disabled
 *    — every function returns the safe no-op fallback.
 */

const MAX_RECENT = 5;

/** Two scopes today; extend the union if a third surface needs its
 *  own history. Keep the literal short — it's used as part of the
 *  localStorage key. */
export type RecentSearchScope = 'all' | 'location';

function storageKey(scope: RecentSearchScope): string {
  return `vafo:recent_searches:${scope}`;
}

/** Load the last MAX entries for a scope. Newest first. Returns []
 *  on any storage error — the dropdown just renders without the
 *  recent section in that case. */
export function loadRecent(scope: RecentSearchScope): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Insert a query at the top of the scope's list. Duplicates of the
 *  same query (case-insensitive trimmed compare) collapse — re-running
 *  an existing recent just floats it back to position 0. Empty/blank
 *  strings are no-ops. */
export function pushRecent(scope: RecentSearchScope, query: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const existing = loadRecent(scope);
    const lower = trimmed.toLowerCase();
    const filtered = existing.filter((s) => s.toLowerCase() !== lower);
    const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
    window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    // Quota exceeded / private mode — non-fatal. The user just doesn't
    // get this nice-to-have.
  }
}

/** Remove a single entry. Used by the per-row ✕ in the recent group.
 *  Compare case-insensitive trimmed (matches pushRecent's dedupe). */
export function removeRecent(scope: RecentSearchScope, query: string): void {
  if (typeof window === 'undefined') return;
  const target = query.trim().toLowerCase();
  if (!target) return;
  try {
    const existing = loadRecent(scope);
    const next = existing.filter((s) => s.trim().toLowerCase() !== target);
    if (next.length === 0) {
      window.localStorage.removeItem(storageKey(scope));
    } else {
      window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
}

/** Wipe all entries for a scope. Used by "Очистить всё" link in the
 *  recent group footer. */
export function clearRecent(scope: RecentSearchScope): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(scope));
  } catch {
    /* ignore */
  }
}
