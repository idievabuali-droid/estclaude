'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  AppCard,
  AppCardContent,
  AppButton,
  AppSelect,
  AppTextarea,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { PhotoPicker, type PendingPhoto } from '../../PhotoPicker';
import { NumberField } from '../../NumberField';

export interface ExistingPhoto {
  /** photos.id — what /api/listings/[id]/update needs to delete it. */
  id: string;
  /** Public URL for the thumbnail. */
  url: string;
}

export interface EditApartmentInitial {
  id: string;
  rooms_count: number;
  size_m2: number;
  floor_number: number;
  price_tjs: number;
  finishing_type: 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated';
  bathroom_separate: boolean | null;
  description: string;
  installment_enabled: boolean;
  installment_monthly_tjs: number | null;
  installment_first_payment_percent: number | null;
  installment_term_months: number | null;
}

const FINISHING_OPTIONS = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

const ROOMS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
];

/**
 * Edit form — single apartment, prefilled from server. Mirrors the
 * field set used in the create flow (PostFlow's ApartmentEditor) so
 * the seller experiences a consistent shape across create + edit.
 *
 * On save: POSTs the diff to /api/listings/[id]/update. Server
 * decides whether to flip the listing back to pending_review based
 * on what changed (see updateListing in services/listings.ts).
 */
export function EditApartmentForm({
  initial,
  buildingName,
  buildingSlug,
  existingPhotos,
}: {
  initial: EditApartmentInitial;
  buildingName: string;
  buildingSlug: string | null;
  existingPhotos: ExistingPhoto[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(initial.installment_enabled);

  // Photo state. Existing photos are visible immediately; clicking the
  // X stages an id in `removePhotoIds` (no immediate deletion — only
  // applied on save). New uploads flow through PhotoPicker into
  // `newPhotos` and get attached server-side at save time.
  const [removePhotoIds, setRemovePhotoIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<PendingPhoto[]>([]);
  const visibleExisting = existingPhotos.filter((p) => !removePhotoIds.includes(p.id));

  const [rooms, setRooms] = useState<number | ''>(initial.rooms_count);
  const [size, setSize] = useState<number | ''>(initial.size_m2);
  const [floor, setFloor] = useState<number | ''>(initial.floor_number);
  const [price, setPrice] = useState<number | ''>(initial.price_tjs);
  const [finishing, setFinishing] = useState(initial.finishing_type);
  const [bathroom, setBathroom] = useState<'' | 'combined' | 'separate'>(
    initial.bathroom_separate === null
      ? ''
      : initial.bathroom_separate
        ? 'separate'
        : 'combined',
  );
  const [description, setDescription] = useState(initial.description);
  const [installmentEnabled, setInstallmentEnabled] = useState(
    initial.installment_enabled,
  );
  const [installmentMonthly, setInstallmentMonthly] = useState<number | ''>(
    initial.installment_monthly_tjs ?? '',
  );
  const [installmentPct, setInstallmentPct] = useState<number | ''>(
    initial.installment_first_payment_percent ?? 30,
  );
  const [installmentTerm, setInstallmentTerm] = useState<number | ''>(
    initial.installment_term_months ?? 84,
  );

  async function handleSubmit() {
    if (submitting) return;
    if (!rooms || !size || !floor || !price || !finishing) {
      return toast.error('Заполните обязательные поля');
    }

    setSubmitting(true);
    const body = {
      rooms_count: Number(rooms),
      size_m2: Number(size),
      floor_number: Number(floor),
      price_tjs: Number(price),
      finishing_type: finishing,
      bathroom_separate:
        bathroom === 'separate' ? true : bathroom === 'combined' ? false : null,
      description: description.trim() || null,
      installment: installmentEnabled
        ? {
            monthly_tjs: Number(installmentMonthly) || 0,
            first_payment_percent: Number(installmentPct) || 30,
            term_months: Number(installmentTerm) || 84,
          }
        : null,
      pendingPhotos: newPhotos,
      removePhotoIds,
    };

    try {
      const res = await fetch(`/api/listings/${initial.id}/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; re_moderated?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error || 'Не удалось сохранить');
        return;
      }
      if (data.re_moderated) {
        toast.success(
          'Изменения отправлены на модерацию — мы проверим и опубликуем заново.',
        );
      } else {
        toast.success('Изменения сохранены');
      }
      router.push(buildingSlug ? `/zhk/${buildingSlug}` : '/kabinet');
      router.refresh();
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <AppSelect
                label="Комнат"
                value={String(rooms)}
                onChange={(e) => setRooms(e.target.value ? Number(e.target.value) : '')}
                required
                placeholder="—"
                options={ROOMS_OPTIONS}
              />
              <NumberField
                label="Площадь, м²"
                decimal
                value={size}
                onChange={setSize}
                required
              />
              <NumberField
                label="Этаж"
                value={floor}
                onChange={setFloor}
                required
              />
              <NumberField
                label="Цена, TJS"
                value={price}
                onChange={setPrice}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AppSelect
                label="Отделка"
                value={finishing}
                onChange={(e) =>
                  setFinishing(e.target.value as EditApartmentInitial['finishing_type'])
                }
                required
                options={FINISHING_OPTIONS}
              />
              <AppSelect
                label="Санузел"
                value={bathroom}
                onChange={(e) =>
                  setBathroom(e.target.value as '' | 'combined' | 'separate')
                }
                placeholder="—"
                options={[
                  { value: 'combined', label: 'Совмещённый' },
                  { value: 'separate', label: 'Раздельный' },
                ]}
              />
            </div>

            {/* Existing photos — thumbnails with X to mark for removal.
                Removal stages locally; nothing is deleted until "Save"
                (and then the API actually deletes from Storage + DB). */}
            {visibleExisting.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-meta font-medium text-stone-700">
                  Текущие фото
                </span>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                  {visibleExisting.map((p) => (
                    <div
                      key={p.id}
                      className="group relative aspect-square overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRemovePhotoIds((ids) => [...ids, p.id])}
                        aria-label="Удалить фото"
                        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-sm bg-white/85 text-stone-700 hover:bg-white hover:text-rose-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Add new photos. Uploads happen immediately to Storage;
                DB rows are inserted only when the seller hits Save. */}
            <PhotoPicker
              label={visibleExisting.length === 0 ? 'Фото квартиры' : 'Добавить фото'}
              kind="unit_living"
              max={Math.max(1, 15 - visibleExisting.length)}
              photos={newPhotos}
              onChange={setNewPhotos}
            />

            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex w-fit items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800"
            >
              {advancedOpen ? '▾' : '▸'} {advancedOpen ? 'Скрыть' : 'Описание и рассрочка'}
            </button>

            {advancedOpen ? (
              <div className="flex flex-col gap-3 border-t border-stone-200 pt-3">
                <AppTextarea
                  label="Описание квартиры"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Угловая, окна на юг, балкон, особенности"
                />
                <label className="flex items-center gap-2 text-meta text-stone-700">
                  <input
                    type="checkbox"
                    checked={installmentEnabled}
                    onChange={(e) => setInstallmentEnabled(e.target.checked)}
                    className="size-4"
                  />
                  Доступна рассрочка от застройщика
                </label>
                {installmentEnabled ? (
                  <div className="grid grid-cols-3 gap-3">
                    <NumberField
                      label="Месяц, TJS"
                      value={installmentMonthly}
                      onChange={setInstallmentMonthly}
                    />
                    <NumberField
                      label="Первый взнос, %"
                      value={installmentPct}
                      onChange={setInstallmentPct}
                    />
                    <NumberField
                      label="Срок, мес"
                      value={installmentTerm}
                      onChange={setInstallmentTerm}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </AppCardContent>
      </AppCard>

      <AppButton
        variant="primary"
        size="lg"
        onClick={handleSubmit}
        loading={submitting}
      >
        Сохранить изменения
      </AppButton>
      <p className="text-caption text-stone-500">
        ЖК: {buildingName}
      </p>
    </div>
  );
}
