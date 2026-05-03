'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AppButton, AppInput, AppTextarea } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface NewDeveloperResult {
  id: string;
  name: string;
  display_name_ru: string;
}

export interface NewDeveloperModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the freshly created developer; parent appends to its
   *  in-memory list and auto-selects it in the dropdown. */
  onCreated: (dev: NewDeveloperResult) => void;
}

/**
 * Inline "+ Добавить нового застройщика" overlay launched from the
 * developer dropdown in PostFlow. Posts to /api/developers/create
 * with status='pending' — the new developer is immediately attachable
 * to a building, but doesn't show the verified badge until the
 * founder approves it from the admin queue (separate task).
 *
 * Phone is required because developers.primary_contact_phone is NOT
 * NULL in the schema — the platform calls every new developer to
 * verify before flipping them to active, so this number is the only
 * way that's possible.
 */
export function NewDeveloperModal({ open, onClose, onCreated }: NewDeveloperModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (submitting) return;
    if (!name.trim()) return toast.error('Введите название застройщика');
    if (!phone.trim()) return toast.error('Введите контактный телефон');

    setSubmitting(true);
    try {
      const res = await fetch('/api/developers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = (await res.json()) as
        | NewDeveloperResult
        | { error?: string; detail?: string };
      if (!res.ok || 'error' in data) {
        toast.error(
          ('error' in data && data.error) || 'Не удалось добавить застройщика',
        );
        return;
      }
      toast.success('Застройщик добавлен. Команда проверит — пока без бейджа.');
      onCreated(data as NewDeveloperResult);
      // Reset form for the next time the modal opens.
      setName('');
      setPhone('');
      setDescription('');
      onClose();
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      // Stop the backdrop click from leaking into the form below; the
      // backdrop itself closes on click for "tap outside to dismiss".
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Новый застройщик"
    >
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-h3 font-semibold text-stone-900">
            Новый застройщик
          </h3>
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
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sitora Development"
            required
          />
          <AppInput
            label="Телефон офиса"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+992 93 123 45 67"
            required
            helperText="Команда позвонит, чтобы подтвердить застройщика"
          />
          <AppTextarea
            label="Краткое описание"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Например: вахдатская строительная компания, 5 проектов сдано"
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
