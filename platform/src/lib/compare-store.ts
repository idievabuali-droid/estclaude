'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CompareType = 'buildings' | 'listings';

type CompareState = {
  type: CompareType | null;
  ids: string[];
  toggle: (type: CompareType, id: string) => void;
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
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      type: null,
      ids: [],
      toggle(type, id) {
        const s = get();
        // Different type → reset to the new selection
        if (s.type && s.type !== type) {
          return set({ type, ids: [id] });
        }
        const has = s.ids.includes(id);
        if (has) {
          const next = s.ids.filter((x) => x !== id);
          return set({ type: next.length === 0 ? null : type, ids: next });
        }
        if (s.ids.length >= MAX_ITEMS) return;
        set({ type, ids: [...s.ids, id] });
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
