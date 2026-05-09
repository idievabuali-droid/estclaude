'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton, AppCard, AppCardContent } from '@/components/primitives';
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
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="text-h3 font-semibold text-stone-900">
              Очередь пуста
            </span>
            <span className="text-meta text-stone-500">
              Все объявления просмотрены — спасибо. Новые отправки появятся здесь.
            </span>
          </div>
        </AppCardContent>
      </AppCard>
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

  // Each pending row gets its own AppCard for visual parity with the
  // "Мои объявления" cards rendered 20 lines down on /kabinet — without
  // the wrap, the moderation queue read like an admin-panel artifact
  // (raw divs with manual borders) instead of part of the same product.
  return (
    <div className="flex flex-col gap-3">
      {items.map((row) => {
        const isPending = pendingId === row.id;
        return (
          <AppCard key={row.id}>
            <AppCardContent>
              <div
                className={
                  'flex flex-col gap-3 md:flex-row md:items-center md:justify-between ' +
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
                  {/* Phone + relative-time split across two lines on mobile
                      (was one cramped line before) — phone is the action
                      detail the founder calls; timestamp is contextual. */}
                  <div className="flex flex-col text-caption tabular-nums text-stone-500 md:flex-row md:gap-2">
                    <span>Отправил {row.seller_phone}</span>
                    <span className="hidden md:inline">·</span>
                    <span>{formatRelative(row.created_at)}</span>
                  </div>
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
            </AppCardContent>
          </AppCard>
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
