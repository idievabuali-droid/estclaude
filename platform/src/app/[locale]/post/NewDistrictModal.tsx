'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AppButton, AppInput } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface NewDistrictResult {
  id: string;
  name: string;
  /** Centroid coords — used by LocationSection to recenter the map when
   *  the district is selected, and by `nearestDistrictId` for the
   *  auto-snap from a dropped pin. New districts default to Vahdat
   *  town centre (founder can edit precise coords in Supabase Studio). */
  center_lat: number;
  center_lng: number;
}

export interface NewDistrictModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the freshly created district; parent appends to its
   *  in-memory list and auto-selects it in the dropdown. */
  onCreated: (district: NewDistrictResult) => void;
}

/**
 * Inline "+ Создать новый район" overlay launched from the district
 * dropdown in LocationSection. Posts to /api/districts/create with
 * city='vahdat' and a centroid that defaults to Vahdat town centre —
 * the founder can refine coords later via Supabase Studio.
 *
 * Mirror of NewDeveloperModal pattern: any phone-verified user can
 * create one, the row is added to the districts table immediately, and
 * the dropdown auto-selects the newly-created district so the seller
 * can continue with the building form without re-opening it.
 */
export function NewDistrictModal({ open, onClose, onCreated }: NewDistrictModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (submitting) return;
    if (!name.trim()) return toast.error('Введите название района');

    setSubmitting(true);
    try {
      const res = await fetch('/api/districts/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as
        | NewDistrictResult
        | { error?: string; detail?: string };
      if (!res.ok || 'error' in data) {
        toast.error(
          ('error' in data && data.error) || 'Не удалось добавить район',
        );
        return;
      }
      toast.success('Район добавлен.');
      onCreated(data as NewDistrictResult);
      // Reset for next open.
      setName('');
      onClose();
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Новый район"
    >
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-h3 font-semibold text-stone-900">Новый район</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex size-8 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <AppInput
            label="Название района"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Чорбог"
            required
            helperText="Координаты района можно будет уточнить позже. Сейчас по умолчанию — центр Вахдата."
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <AppButton variant="secondary" onClick={onClose}>
            Отмена
          </AppButton>
          <AppButton variant="primary" onClick={handleSubmit} loading={submitting}>
            Добавить
          </AppButton>
        </div>
      </div>
    </div>
  );
}
