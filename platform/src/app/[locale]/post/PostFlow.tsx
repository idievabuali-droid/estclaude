'use client';

import { useState } from 'react';
import { Plus, Building2, Home, Trash2, Copy, ChevronRight } from 'lucide-react';
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

interface DistrictOption {
  id: string;
  name: string;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface DeveloperOption {
  id: string;
  name: string;
  display_name_ru: string;
}

export interface PostFlowProps {
  districts: DistrictOption[];
  existingBuildings: BuildingOption[];
  developers: DeveloperOption[];
  isFounder: boolean;
}

type Mode = 'choose' | 'new-building' | 'existing-building';

interface ApartmentDraft {
  // Per-card local id so React keys stay stable across reorders / removes.
  uid: string;
  rooms_count: number | '';
  size_m2: number | '';
  floor_number: number | '';
  price_tjs: number | '';
  finishing_type: 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated' | '';
  /**
   * Russian RE convention: совмещённый (combined toilet+bath) vs
   * раздельный (separate). 'separate' = true, 'combined' = false,
   * '' = not specified. Tajik apartments rarely have more than one
   * bathroom, so just capturing the type covers most cases.
   */
  bathroom_separate: '' | 'combined' | 'separate';
  // Advanced (collapsed by default):
  description?: string;
  installmentEnabled: boolean;
  installment_monthly_tjs?: number;
  installment_first_payment_percent?: number;
  installment_term_months?: number;
}

const FINISHING_OPTIONS = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
] as const;

const STATUS_OPTIONS = [
  { value: 'announced', label: 'Котлован' },
  { value: 'under_construction', label: 'Строится' },
  { value: 'near_completion', label: 'Почти готов' },
  { value: 'delivered', label: 'Сдан' },
] as const;

const AMENITY_OPTIONS = [
  { value: 'parking', label: 'Парковка' },
  { value: 'security', label: 'Охрана' },
  { value: 'elevator', label: 'Лифт' },
  { value: 'playground', label: 'Детская площадка' },
  { value: 'gym', label: 'Фитнес' },
  { value: 'commercial-floor', label: 'Коммерческий этаж' },
] as const;

const ROOMS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
];

function makeApartmentDraft(overrides: Partial<ApartmentDraft> = {}): ApartmentDraft {
  return {
    uid: Math.random().toString(36).slice(2, 10),
    rooms_count: '',
    size_m2: '',
    floor_number: '',
    price_tjs: '',
    finishing_type: '',
    bathroom_separate: '',
    installmentEnabled: false,
    ...overrides,
  };
}

/**
 * Two-flow listing creation form.
 *
 * The "choose" screen offers two big buttons: new building+apartments,
 * or apartment in existing building. After picking, the form swaps to
 * the matching shape. Mode can be reset via the "Назад" link.
 *
 * Apartments are managed as a local array of drafts. "+ Добавить ещё
 * квартиру" appends a fresh draft. "Дублировать" copies an apartment
 * with the floor number incremented (most common mass-add pattern: same
 * layout on multiple floors). "Удалить" removes one — minimum 1 stays.
 *
 * On submit we POST the whole payload to /api/inventory/create. Server
 * decides published vs pending_review based on the user's role.
 */
export function PostFlow({
  districts,
  existingBuildings,
  developers,
  isFounder,
}: PostFlowProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [submitting, setSubmitting] = useState(false);

  // New-building form state.
  const [b, setB] = useState({
    name: '',
    address: '',
    district_id: districts[0]?.id ?? '',
    developer_id: developers[0]?.id ?? '',
    status: 'under_construction' as 'announced' | 'under_construction' | 'near_completion' | 'delivered',
    total_floors: '' as number | '',
    total_units: '' as number | '',
    handover_quarter: '',
    description: '',
    amenities: [] as string[],
  });

  // Existing-building selection.
  const [existingBuildingId, setExistingBuildingId] = useState(
    existingBuildings[0]?.id ?? '',
  );

  // Apartments list — start with one card.
  const [apartments, setApartments] = useState<ApartmentDraft[]>([makeApartmentDraft()]);

  function patchApartment(uid: string, patch: Partial<ApartmentDraft>) {
    setApartments((arr) =>
      arr.map((a) => (a.uid === uid ? { ...a, ...patch } : a)),
    );
  }

  function addApartment() {
    setApartments((arr) => [...arr, makeApartmentDraft()]);
  }

  function duplicateApartment(uid: string) {
    setApartments((arr) => {
      const idx = arr.findIndex((a) => a.uid === uid);
      if (idx < 0) return arr;
      const src = arr[idx]!;
      const nextFloor =
        typeof src.floor_number === 'number' ? src.floor_number + 1 : '';
      const copy = makeApartmentDraft({
        ...src,
        uid: Math.random().toString(36).slice(2, 10),
        floor_number: nextFloor,
      });
      const next = [...arr];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function removeApartment(uid: string) {
    setApartments((arr) =>
      arr.length === 1 ? arr : arr.filter((a) => a.uid !== uid),
    );
  }

  async function handleSubmit() {
    if (submitting) return;

    // Client-side validation. Server re-validates but a clear toast
    // here saves a roundtrip.
    if (mode === 'new-building') {
      if (!b.name.trim()) return toast.error('Укажите название ЖК');
      if (!b.address.trim()) return toast.error('Укажите адрес');
      if (!b.district_id) return toast.error('Выберите район');
      if (!b.developer_id) return toast.error('Выберите застройщика');
      if (!b.total_floors || !b.total_units)
        return toast.error('Укажите этажность и количество квартир');
    } else if (mode === 'existing-building') {
      if (!existingBuildingId) return toast.error('Выберите ЖК');
    } else {
      return;
    }

    for (let i = 0; i < apartments.length; i++) {
      const a = apartments[i]!;
      if (
        !a.rooms_count ||
        !a.size_m2 ||
        !a.floor_number ||
        !a.price_tjs ||
        !a.finishing_type
      ) {
        return toast.error(
          `Заполните все обязательные поля квартиры #${i + 1}`,
        );
      }
    }

    setSubmitting(true);
    const body = {
      building:
        mode === 'existing-building'
          ? { id: existingBuildingId }
          : {
              name: b.name.trim(),
              address: b.address.trim(),
              district_id: b.district_id,
              developer_id: b.developer_id,
              status: b.status,
              total_floors: Number(b.total_floors),
              total_units: Number(b.total_units),
              handover_quarter: b.handover_quarter.trim() || undefined,
              description: b.description.trim() || undefined,
              amenities: b.amenities,
            },
      apartments: apartments.map((a) => ({
        rooms_count: Number(a.rooms_count),
        size_m2: Number(a.size_m2),
        floor_number: Number(a.floor_number),
        price_tjs: Number(a.price_tjs),
        finishing_type: a.finishing_type as
          | 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated',
        // Convention: true = раздельный (separate), false = совмещённый
        // (combined). Empty string = not specified → null in DB.
        bathroom_separate:
          a.bathroom_separate === 'separate'
            ? true
            : a.bathroom_separate === 'combined'
              ? false
              : undefined,
        description: a.description?.trim() || undefined,
        installment: a.installmentEnabled
          ? {
              monthly_tjs: a.installment_monthly_tjs ?? 0,
              first_payment_percent: a.installment_first_payment_percent ?? 30,
              term_months: a.installment_term_months ?? 84,
            }
          : undefined,
      })),
    };

    try {
      const res = await fetch('/api/inventory/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        building_id?: string;
        building_slug?: string | null;
        created?: { id: string; slug: string }[];
        failed?: { index: number; error: string }[];
        moderation_required?: boolean;
        error?: string;
      };
      if (!res.ok || data.error) {
        toast.error(data.error || 'Не удалось опубликовать');
        return;
      }
      const okCount = data.created?.length ?? 0;
      const failCount = data.failed?.length ?? 0;
      if (data.moderation_required) {
        toast.success(
          `Отправлено на модерацию: ${okCount} ${plural(okCount, ['квартира', 'квартиры', 'квартир'])}`,
        );
        router.push('/kabinet');
      } else {
        toast.success(
          failCount > 0
            ? `Опубликовано ${okCount} из ${okCount + failCount}`
            : `Опубликовано: ${okCount} ${plural(okCount, ['квартира', 'квартиры', 'квартир'])}`,
        );
        // Land on the new building page when one was created; otherwise
        // back to the existing building's page.
        const slug = data.building_slug ?? null;
        if (slug) router.push(`/zhk/${slug}`);
        else if (existingBuildingId) {
          // We don't know the slug client-side, send to /novostroyki to
          // see all buildings (the new listing is in there).
          router.push('/novostroyki');
        } else {
          router.push('/kabinet');
        }
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Mode picker (initial screen) ──────────────────────────
  if (mode === 'choose') {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <ModePickButton
          icon={<Building2 className="size-6 text-terracotta-700" />}
          title="Новый ЖК с квартирами"
          description="Добавьте новостройку и сразу несколько квартир в неё"
          onClick={() => setMode('new-building')}
          accent="terracotta"
        />
        <ModePickButton
          icon={<Home className="size-6 text-stone-700" />}
          title="Квартира в существующем ЖК"
          description="Выберите ЖК из списка и добавьте одну квартиру"
          onClick={() => setMode('existing-building')}
          accent="stone"
        />
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setMode('choose')}
        className="inline-flex w-fit items-center gap-1 text-meta font-medium text-stone-500 hover:text-terracotta-600"
      >
        <ChevronRight className="size-4 rotate-180" /> К выбору типа
      </button>

      {/* Building section (new or pick existing) */}
      {mode === 'new-building' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold text-stone-900">ЖК</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <AppInput
                  label="Название ЖК"
                  value={b.name}
                  onChange={(e) => setB((s) => ({ ...s, name: e.target.value }))}
                  required
                  placeholder="ЖК Гулистон Резиденс"
                />
                <AppInput
                  label="Адрес"
                  value={b.address}
                  onChange={(e) => setB((s) => ({ ...s, address: e.target.value }))}
                  required
                  placeholder="ул. Гагарина, 12"
                />
                <AppSelect
                  label="Район"
                  value={b.district_id}
                  onChange={(e) =>
                    setB((s) => ({ ...s, district_id: e.target.value }))
                  }
                  required
                  options={districts.map((d) => ({ value: d.id, label: d.name }))}
                />
                <AppSelect
                  label="Застройщик"
                  value={b.developer_id}
                  onChange={(e) =>
                    setB((s) => ({ ...s, developer_id: e.target.value }))
                  }
                  required
                  options={developers.map((d) => ({
                    value: d.id,
                    label: d.display_name_ru,
                  }))}
                />
                <AppSelect
                  label="Стадия строительства"
                  value={b.status}
                  onChange={(e) =>
                    setB((s) => ({ ...s, status: e.target.value as typeof s.status }))
                  }
                  required
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
                <AppInput
                  label="Срок сдачи (например 2026-Q3)"
                  value={b.handover_quarter}
                  onChange={(e) =>
                    setB((s) => ({ ...s, handover_quarter: e.target.value }))
                  }
                  placeholder="2026-Q3"
                />
                <AppInput
                  label="Этажей в доме"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={b.total_floors}
                  onChange={(e) =>
                    setB((s) => ({
                      ...s,
                      total_floors: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  required
                />
                <AppInput
                  label="Всего квартир"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={b.total_units}
                  onChange={(e) =>
                    setB((s) => ({
                      ...s,
                      total_units: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <AppTextarea
                label="Описание"
                value={b.description}
                onChange={(e) =>
                  setB((s) => ({ ...s, description: e.target.value }))
                }
                rows={3}
                placeholder="Кирпичный дом, закрытый двор, паркинг…"
              />
              <div className="flex flex-col gap-2">
                <span className="text-caption font-medium text-stone-500">Удобства</span>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((opt) => {
                    const active = b.amenities.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setB((s) => ({
                            ...s,
                            amenities: active
                              ? s.amenities.filter((a) => a !== opt.value)
                              : [...s.amenities, opt.value],
                          }))
                        }
                        aria-pressed={active}
                        className={
                          'inline-flex h-9 items-center rounded-sm border px-3 text-meta font-medium transition-colors ' +
                          (active
                            ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800'
                            : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50')
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">ЖК</h2>
              {existingBuildings.length > 0 ? (
                <AppSelect
                  label="Выберите ЖК"
                  value={existingBuildingId}
                  onChange={(e) => setExistingBuildingId(e.target.value)}
                  required
                  options={existingBuildings.map((bld) => ({
                    value: bld.id,
                    label: bld.name,
                  }))}
                />
              ) : (
                <p className="text-meta text-stone-500">
                  В системе пока нет ЖК. Создайте новый через «Новый ЖК с квартирами».
                </p>
              )}
            </div>
          </AppCardContent>
        </AppCard>
      )}

      {/* Apartments list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-h2 font-semibold text-stone-900">
          Квартиры ({apartments.length})
        </h2>
        {apartments.map((apt, idx) => (
          <ApartmentEditor
            key={apt.uid}
            index={idx}
            apartment={apt}
            onChange={(patch) => patchApartment(apt.uid, patch)}
            onDuplicate={() => duplicateApartment(apt.uid)}
            onRemove={
              apartments.length > 1 ? () => removeApartment(apt.uid) : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={addApartment}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 bg-white text-meta font-medium text-stone-700 hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
        >
          <Plus className="size-4" /> Добавить ещё квартиру
        </button>
      </div>

      <AppButton
        variant="primary"
        size="lg"
        onClick={handleSubmit}
        loading={submitting}
      >
        {isFounder ? 'Опубликовать' : 'Отправить на модерацию'}
      </AppButton>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function ModePickButton({
  icon,
  title,
  description,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent: 'terracotta' | 'stone';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start gap-3 rounded-md border p-5 text-left transition-colors ' +
        (accent === 'terracotta'
          ? 'border-terracotta-300 bg-terracotta-50/60 hover:border-terracotta-500 hover:bg-terracotta-50'
          : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50')
      }
    >
      <span
        className={
          'inline-flex size-12 items-center justify-center rounded-md ' +
          (accent === 'terracotta' ? 'bg-terracotta-100' : 'bg-stone-100')
        }
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-h3 font-semibold text-stone-900">{title}</span>
        <span className="text-meta text-stone-600">{description}</span>
      </div>
    </button>
  );
}

function ApartmentEditor({
  index,
  apartment,
  onChange,
  onDuplicate,
  onRemove,
}: {
  index: number;
  apartment: ApartmentDraft;
  onChange: (patch: Partial<ApartmentDraft>) => void;
  onDuplicate: () => void;
  onRemove?: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-h3 font-semibold text-stone-900">
              Квартира #{index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDuplicate}
                title="Дублировать (этаж +1)"
                className="inline-flex size-8 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <Copy className="size-4" />
              </button>
              {onRemove ? (
                <button
                  type="button"
                  onClick={onRemove}
                  title="Удалить"
                  className="inline-flex size-8 items-center justify-center rounded-sm text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AppSelect
              label="Комнат"
              value={String(apartment.rooms_count)}
              onChange={(e) =>
                onChange({
                  rooms_count: e.target.value ? Number(e.target.value) : '',
                })
              }
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
              value={apartment.size_m2}
              onChange={(e) =>
                onChange({
                  size_m2: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              required
              placeholder="55"
            />
            <AppInput
              label="Этаж"
              type="number"
              inputMode="numeric"
              min={1}
              value={apartment.floor_number}
              onChange={(e) =>
                onChange({
                  floor_number: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              required
              placeholder="3"
            />
            <AppInput
              label="Цена, TJS"
              type="number"
              inputMode="numeric"
              min={0}
              value={apartment.price_tjs}
              onChange={(e) =>
                onChange({
                  price_tjs: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              required
              placeholder="450000"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AppSelect
              label="Отделка"
              value={apartment.finishing_type}
              onChange={(e) =>
                onChange({ finishing_type: e.target.value as ApartmentDraft['finishing_type'] })
              }
              required
              placeholder="—"
              options={FINISHING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <AppSelect
              label="Санузел"
              value={apartment.bathroom_separate}
              onChange={(e) =>
                onChange({
                  bathroom_separate: e.target.value as ApartmentDraft['bathroom_separate'],
                })
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
                rows={2}
                value={apartment.description ?? ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Угловая, окна на юг, балкон, особенности"
              />
              <label className="flex items-center gap-2 text-meta text-stone-700">
                <input
                  type="checkbox"
                  checked={apartment.installmentEnabled}
                  onChange={(e) =>
                    onChange({ installmentEnabled: e.target.checked })
                  }
                  className="size-4"
                />
                Доступна рассрочка от застройщика
              </label>
              {apartment.installmentEnabled ? (
                <div className="grid grid-cols-3 gap-3">
                  <AppInput
                    label="Месяц, TJS"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={apartment.installment_monthly_tjs ?? ''}
                    onChange={(e) =>
                      onChange({
                        installment_monthly_tjs:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                  <AppInput
                    label="Первый взнос, %"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={apartment.installment_first_payment_percent ?? 30}
                    onChange={(e) =>
                      onChange({
                        installment_first_payment_percent:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                  <AppInput
                    label="Срок, мес"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    value={apartment.installment_term_months ?? 84}
                    onChange={(e) =>
                      onChange({
                        installment_term_months:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}
