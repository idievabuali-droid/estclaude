/**
 * Client-side persistent store for anonymous saves.
 *
 * Anonymous visitors used to hit a "log in to save" toast and bounce
 * — losing the highest-intent moment in the buyer journey. Now their
 * save persists in localStorage so the bookmark icon stays filled
 * across sessions on the same browser. When they later log in via
 * Telegram, `migrateAnonSavesToUser()` (called from /voyti completion
 * flow) POSTs the local set to the server which inserts them into
 * `saved_items` tied to the now-known user_id.
 *
 * Trade-offs:
 *  - browser-local: not synced across devices, lost on cookie-clear
 *  - V1 acceptable: Vahdat buyers shop predominantly from one phone
 *  - the SaveToggle component reads/writes here; /izbrannoe still
 *    requires login (the anonymous saves migrate up at login time)
 */

const STORAGE_KEY = 'zhktj.anon_saves.v1';

interface AnonSave {
  type: 'building' | 'listing';
  id: string;
  saved_at: string;
}

function readAll(): AnonSave[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnonSave[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: AnonSave[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota or disabled — silently swallow; the save just
    // doesn't persist this session.
  }
}

export function hasAnonSave(type: 'building' | 'listing', id: string): boolean {
  return readAll().some((s) => s.type === type && s.id === id);
}

export function addAnonSave(type: 'building' | 'listing', id: string): void {
  const all = readAll();
  if (all.some((s) => s.type === type && s.id === id)) return;
  all.push({ type, id, saved_at: new Date().toISOString() });
  writeAll(all);
}

export function removeAnonSave(type: 'building' | 'listing', id: string): void {
  writeAll(readAll().filter((s) => !(s.type === type && s.id === id)));
}

export function listAnonSaves(): AnonSave[] {
  return readAll();
}

export function clearAnonSaves(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * After a successful Telegram login, copy the local anon saves up to
 * the server so they appear in /izbrannoe under the user's account.
 * Best-effort: failures are logged but don't block the login flow.
 * Idempotent on the server (the saved_items unique index dedupes).
 */
export async function migrateAnonSavesToUser(): Promise<void> {
  const saves = readAll();
  if (saves.length === 0) return;
  try {
    const res = await fetch('/api/saved/migrate-anon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ saves }),
    });
    if (res.ok) {
      clearAnonSaves();
    }
  } catch (err) {
    console.error('migrateAnonSavesToUser failed (non-fatal):', err);
  }
}
