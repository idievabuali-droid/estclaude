'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { formatPriceNumber, formatM2 } from '@/lib/format';

export interface PendingListingRow {
  id: string;
  rooms_count: number;
  size_m2: number;
  floor_number: number;
  price_total_dirams: bigint;
  building_name: string;
  seller_phone: string;
  /** ISO timestamp string when the listing was created. */
  created_at: string;
}

export interface ModerationListProps {
  rows: PendingListingRow[];
}

/**
 * Founder's moderation queue — list of `pending_review` listings with
 * inline approve / reject buttons.
 *
 * Each action POSTs to /api/listings/moderate and optimistically
 * removes the row from the displayed list. On error reverts and
 * shows a toast.
 *
 * Submitter is notified via Telegram automatically by the API (see
 * /api/listings/moderate/route.ts). No client-side notification logic.
 */
export function ModerationList({ rows }: ModerationListProps) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-200 bg-white p-6 text-center text-meta text-stone-500">
        Очередь пуста — все объявления просмотрены.
      </div>
    );
  }

  async function moderate(id: string, action: 'approve' | 'reject') {
    if (pendingId) return;
    setPendingId(id);
    const previousItems = items;
    setItems((arr) => arr.filter((r) => r.id !== id));
    try {
      const res = await fetch('/api/listings/moderate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listing_id: id, action }),
      });
      if (!res.ok) throw new Error('moderation failed');
      toast.success(action === 'approve' ? 'Опубликовано' : 'Отклонено');
      router.refresh();
    } catch {
      setItems(previousItems);
      toast.error('Не удалось — попробуйте ещё раз');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col divide-y divide-stone-200 rounded-md border border-stone-200 bg-white">
      {items.map((row) => {
        const isPending = pendingId === row.id;
        return (
          <div
            key={row.id}
            className={
              'flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between ' +
              (isPending ? 'opacity-60' : '')
            }
          >
            <div className="flex flex-col gap-1">
              <span className="text-meta font-semibold text-stone-900">
                {row.building_name} · {row.rooms_count}-комн ·{' '}
                {formatM2(row.size_m2)} · этаж {row.floor_number}
              </span>
              <span className="text-meta tabular-nums text-stone-700">
                {formatPriceNumber(row.price_total_dirams)} TJS
              </span>
              <span className="text-caption text-stone-500 tabular-nums">
                Отправил {row.seller_phone} · {formatRelative(row.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AppButton
                variant="primary"
                size="md"
                onClick={() => moderate(row.id, 'approve')}
                disabled={isPending}
              >
                <Check className="size-4" /> Одобрить
              </AppButton>
              <AppButton
                variant="secondary"
                size="md"
                onClick={() => moderate(row.id, 'reject')}
                disabled={isPending}
              >
                <X className="size-4" /> Отклонить
              </AppButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact "X minutes / hours / days ago" formatter for the queue. */
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}
