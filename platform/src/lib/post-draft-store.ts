'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FinishingType, SourceType } from '@/types/domain';

/**
 * Draft listing kept across the multi-step /post/* flow. Persists to
 * localStorage so a refresh or accidental Back doesn't lose data
 * (JOURNEY-7). When real auth + draft-row writes are wired the same
 * shape carries over to a `listings` row with status='draft'.
 */
export type PostDraft = {
  phone: string | null;
  source: SourceType | null;
  buildingId: string | null;
  rooms: number | null;
  sizeM2: number | null;
  floor: number | null;
  totalFloors: number | null;
  buildingBlock: string | null;
  unitNumberInternal: string | null;
  priceTjs: number | null;
  finishing: FinishingType | null;
  installmentEnabled: boolean;
  installmentFirstPaymentPercent: number | null;
  installmentMonthlyTjs: number | null;
  installmentTermMonths: number | null;
  description: string | null;
  photoIds: string[];
  coverPhotoId: string | null;
};

const EMPTY_DRAFT: PostDraft = {
  phone: null,
  source: null,
  buildingId: null,
  rooms: null,
  sizeM2: null,
  floor: null,
  totalFloors: null,
  buildingBlock: null,
  unitNumberInternal: null,
  priceTjs: null,
  finishing: null,
  installmentEnabled: false,
  installmentFirstPaymentPercent: null,
  installmentMonthlyTjs: null,
  installmentTermMonths: null,
  description: null,
  photoIds: [],
  coverPhotoId: null,
};

type DraftStore = {
  draft: PostDraft;
  patch: (changes: Partial<PostDraft>) => void;
  reset: () => void;
};

export const usePostDraftStore = create<DraftStore>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,
      patch(changes) {
        set((s) => ({ draft: { ...s.draft, ...changes } }));
      },
      reset() {
        set({ draft: EMPTY_DRAFT });
      },
    }),
    {
      name: 'estclaude:post-draft',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
