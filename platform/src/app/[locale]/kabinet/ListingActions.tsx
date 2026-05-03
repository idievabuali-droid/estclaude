'use client';

import { useState } from 'react';
import { Pencil, Eye, EyeOff, CheckCircle2, Trash2 } from 'lucide-react';
import { useRouter, Link } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface ListingActionsProps {
  listingId: string;
  /**
   * Current status — drives which buttons appear:
   *   active → Hide + Mark Sold
   *   hidden → Show
   *   sold → Republish (back to active)
   *   pending_review / rejected → no lifecycle buttons (only Edit + Delete)
   */
  status: 'active' | 'hidden' | 'sold' | 'pending_review' | 'rejected' | 'draft' | 'expired';
}

/**
 * Per-listing action buttons rendered in the seller's table on
 * /kabinet. Replaces the previous dead "Редактировать" / "Скрыть"
 * stubs with real functionality:
 *
 *   Edit  → /post/edit/[id] form
 *   Hide  → /api/listings/[id]/status with status='hidden'
 *   Show  → /api/listings/[id]/status with status='active' (republish)
 *   Sold  → /api/listings/[id]/status with status='sold' (with confirm)
 *   Delete → /api/listings/[id]/delete (soft delete, with confirm)
 *
 * After every successful action we router.refresh() so the table re-
 * renders with new status badges and matching button set without a
 * page reload.
 */
export function ListingActions({ listingId, status }: ListingActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingSold, setConfirmingSold] = useState(false);

  async function setStatus(newStatus: 'active' | 'hidden' | 'sold') {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('failed');
      const labels: Record<string, string> = {
        active: 'Опубликовано',
        hidden: 'Скрыто',
        sold: 'Помечено как проданное',
      };
      toast.success(labels[newStatus] ?? 'Готово');
      router.refresh();
    } catch {
      toast.error('Не удалось — попробуйте ещё раз');
    } finally {
      setPending(false);
      setConfirmingSold(false);
    }
  }

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/delete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Объявление удалено');
      router.refresh();
    } catch {
      toast.error('Не удалось — попробуйте ещё раз');
    } finally {
      setPending(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/post/edit/${listingId}`}>
        <AppButton variant="secondary" size="sm" disabled={pending}>
          <Pencil className="size-3.5" /> Редактировать
        </AppButton>
      </Link>

      {status === 'active' ? (
        <>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => setStatus('hidden')}
            disabled={pending}
          >
            <EyeOff className="size-3.5" /> Скрыть
          </AppButton>
          {confirmingSold ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setStatus('sold')}
              disabled={pending}
            >
              Точно продано?
            </AppButton>
          ) : (
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingSold(true)}
              disabled={pending}
            >
              <CheckCircle2 className="size-3.5" /> Продано
            </AppButton>
          )}
        </>
      ) : null}

      {status === 'hidden' ? (
        <AppButton
          variant="primary"
          size="sm"
          onClick={() => setStatus('active')}
          disabled={pending}
        >
          <Eye className="size-3.5" /> Опубликовать снова
        </AppButton>
      ) : null}

      {status === 'sold' ? (
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => setStatus('active')}
          disabled={pending}
        >
          <Eye className="size-3.5" /> Снять отметку
        </AppButton>
      ) : null}

      {confirmingDelete ? (
        <AppButton
          variant="primary"
          size="sm"
          onClick={handleDelete}
          disabled={pending}
          className="bg-rose-600 hover:bg-rose-700"
        >
          Точно удалить?
        </AppButton>
      ) : (
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => setConfirmingDelete(true)}
          disabled={pending}
        >
          <Trash2 className="size-3.5" /> Удалить
        </AppButton>
      )}
    </div>
  );
}
