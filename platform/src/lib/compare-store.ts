'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CompareType = 'buildings' | 'listings';

/**
 * Result of a toggle() call. Lets the caller distinguish between an
 * ordinary add/remove and a "type-swap" that wiped the previous
 * selection — so we can toast the user instead of silently losing
 * their compare set.
 */
export type ToggleResult =
  | { kind: 'added' }
  | { kind: 'removed' }
  | { kind: 'capped' }                                  // already at MAX, no-op
  | { kind: 'type-swapped'; previousType: CompareType }; // cleared old, added new

type CompareState = {
  type: CompareType | null;
  ids: string[];
  toggle: (type: CompareType, id: string) => ToggleResult;
  remove: (id: string) => void;
  clear: () => void;
  hasItem: (type: CompareType, id: string) => boolean;
};

const MAX_ITEMS = 4;

/**
 * Compare set lives client-side only (per Architecture: "Compare items —
 * no server table, URL-state only"). Persisted to sessionStorage so it
 * survives page navigation but resets on a new browser session.
 *
 * Type is locked to whichever was added first — switching type clears.
 * The toggle return value tells the caller what happened so it can
 * surface a toast on type-swap (silent wipes are confusing UX).
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      type: null,
      ids: [],
      toggle(type, id) {
        const s = get();
        // Different type → wipe and start fresh with the new selection.
        if (s.type && s.type !== type) {
          const previousType = s.type;
          set({ type, ids: [id] });
          return { kind: 'type-swapped', previousType };
        }
        const has = s.ids.includes(id);
        if (has) {
          const next = s.ids.filter((x) => x !== id);
          set({ type: next.length === 0 ? null : type, ids: next });
          return { kind: 'removed' };
        }
        if (s.ids.length >= MAX_ITEMS) {
          return { kind: 'capped' };
        }
        set({ type, ids: [...s.ids, id] });
        return { kind: 'added' };
      },
      remove(id) {
        const s = get();
        const next = s.ids.filter((x) => x !== id);
        set({ type: next.length === 0 ? null : s.type, ids: next });
      },
      clear() {
        set({ type: null, ids: [] });
      },
      hasItem(type, id) {
        const s = get();
        return s.type === type && s.ids.includes(id);
      },
    }),
    {
      name: 'estclaude:compare',
      storage: createJSONStorage(() => sessionStorage),
      // Skip on server to avoid hydration warnings
      skipHydration: true,
    },
  ),
);

export const COMPARE_MAX_ITEMS = MAX_ITEMS;
