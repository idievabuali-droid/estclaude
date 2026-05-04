'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

/**
 * Toggle/delete buttons for a single saved search row. Optimistic UI
 * with revert on failure; the page refreshes on success so the
 * server-rendered list reflects the new state.
 */
export function SavedSearchActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState(active);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const next = !optimisticActive;
    setOptimisticActive(next);
    try {
      const res = await fetch(`/api/saved-searches/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error('toggle');
      router.refresh();
    } catch {
      setOptimisticActive(!next);
      toast.error('Не удалось переключить уведомления');
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending) return;
    if (!confirm('Удалить этот сохранённый поиск?')) return;
    setPending(true);
    try {
      const res = await fetch(`/api/saved-searches?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete');
      router.refresh();
    } catch {
      toast.error('Не удалось удалить');
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <AppButton
        variant={optimisticActive ? 'secondary' : 'primary'}
        onClick={toggle}
        loading={pending}
      >
        {optimisticActive ? 'Выключить' : 'Включить'}
      </AppButton>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Удалить"
        className="inline-flex size-9 items-center justify-center rounded-sm text-stone-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
