/**
 * Autosave draft storage for the /post form (A3).
 *
 * Why this exists: PostFlow is a single long page with potentially
 * 10+ apartment cards. A tab close, browser crash, accidental back-
 * button, or "let me just check that other tab" detour wipes
 * everything in component state. Sellers giving up halfway is real
 * — Cian/Avito both autosave to localStorage continuously.
 *
 * What we save: the entire form state (mode, building draft, apartment
 * drafts, photo IDs, mode picker selection). Photos that finished
 * uploading to Storage keep their PendingPhoto records here, so on
 * restore they re-attach to the form without re-uploading. Photos
 * mid-upload are lost — accepted V1 trade-off.
 *
 * Key shape: `post-draft-v1-{userId}` so two users on the same browser
 * never collide. The `v1` namespace lets us bump the schema later
 * without colliding with old drafts.
 *
 * TTL: 24 hours. Older drafts are silently discarded — if the seller
 * hasn't returned in a day, the form they filled probably no longer
 * matches reality (different photos, different price agreement).
 */
const VERSION = 'v1';
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Opaque shape — PostFlow defines its own DraftPayload internally and
 * passes it as a generic. We never inspect it here, just round-trip
 * JSON. Keeps the storage helper agnostic of form-state shape so
 * adding/removing fields doesn't bend this file.
 */
export interface StoredDraft<T> {
  savedAt: number;
  payload: T;
}

function key(userId: string): string {
  return `post-draft-${VERSION}-${userId}`;
}

/** Best-effort. Throws are swallowed — autosave must never break the
 *  form. localStorage can be full or unavailable (private mode on iOS,
 *  some embedded browsers). */
export function saveDraft<T>(userId: string, payload: T): void {
  if (typeof window === 'undefined') return;
  try {
    const wrapped: StoredDraft<T> = {
      savedAt: Date.now(),
      payload,
    };
    window.localStorage.setItem(key(userId), JSON.stringify(wrapped));
  } catch {
    // ignore — quota errors, locked storage, etc.
  }
}

/** Returns the draft when one exists AND it's within TTL. Returns
 *  null on parse failure, missing, or expired — caller should treat
 *  null as "no draft". Expired drafts are removed as a side effect
 *  so the next read isn't burdened. */
export function loadDraft<T>(userId: string): StoredDraft<T> | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key(userId));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (
      typeof parsed?.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > TTL_MS
    ) {
      // Old or malformed — clean it up so it doesn't keep showing
      // "draft from 4 days ago" banners on every visit.
      try {
        window.localStorage.removeItem(key(userId));
      } catch {
        // ignore
      }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

/** Compact relative-time formatter for the restore banner. Mirrors
 *  ModerationList's `formatRelative` — different file, same pattern;
 *  copied rather than imported to keep the autosave module standalone. */
export function formatRelative(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  // 24h max per TTL — anything older is purged before we get here.
  return new Date(savedAt).toLocaleString('ru-RU');
}
