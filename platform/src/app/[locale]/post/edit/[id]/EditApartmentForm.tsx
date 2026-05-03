'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import {
  AppCard,
  AppCardContent,
  AppButton,
  AppInput,
  AppSelect,
  AppTextarea,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

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
}: {
  initial: EditApartmentInitial;
  buildingName: string;
  buildingSlug: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(initial.installment_enabled);

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
              <AppInput
                label="Площадь, м²"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={size}
                onChange={(e) =>
                  setSize(e.target.value === '' ? '' : Number(e.target.value))
                }
                required
              />
              <AppInput
                label="Этаж"
                type="number"
                inputMode="numeric"
                min={1}
                value={floor}
                onChange={(e) =>
                  setFloor(e.target.value === '' ? '' : Number(e.target.value))
                }
                required
              />
              <AppInput
                label="Цена, TJS"
                type="number"
                inputMode="numeric"
                min={0}
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
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
                    <AppInput
                      label="Месяц, TJS"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={installmentMonthly}
                      onChange={(e) =>
                        setInstallmentMonthly(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                    />
                    <AppInput
                      label="Первый взнос, %"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={installmentPct}
                      onChange={(e) =>
                        setInstallmentPct(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                    />
                    <AppInput
                      label="Срок, мес"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={120}
                      value={installmentTerm}
                      onChange={(e) =>
                        setInstallmentTerm(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
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
