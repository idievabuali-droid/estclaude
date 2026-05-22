'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
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
import { PhotoPicker, type PendingPhoto } from '../../../PhotoPicker';
import { LocationSection } from '../../../LocationSection';
import { NewDeveloperModal, type NewDeveloperResult } from '../../../NewDeveloperModal';
import { NewDistrictModal, type NewDistrictResult } from '../../../NewDistrictModal';

export interface ExistingPhoto {
  /** photos.id — what /api/buildings/[id]/update needs to delete it. */
  id: string;
  /** Public URL for the thumbnail. */
  url: string;
}

export interface EditBuildingInitial {
  id: string;
  slug: string;
  name: string;
  address: string;
  district_id: string;
  developer_id: string;
  status: 'announced' | 'under_construction' | 'near_completion' | 'delivered';
  total_floors: number;
  total_units: number;
  /** "2026-Q3" or empty when unset. */
  handover_quarter: string;
  description: string;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface DistrictOption {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
}

export interface DeveloperOption {
  id: string;
  name: string;
  display_name_ru: string;
}

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

const ADD_DEVELOPER_VALUE = '__add_new_developer__';

/**
 * Building edit form — prefilled from server, saves a diff to
 * /api/buildings/[id]/update. Mirrors EditApartmentForm in pattern:
 * existing photos shown with X-to-remove (staged in removePhotoIds,
 * applied on save), new uploads flow through PhotoPicker.
 *
 * Inline "+ Создать нового" affordances on developer + district
 * dropdowns let the founder add either without leaving the edit
 * page — same modals the create flow uses (NewDeveloperModal,
 * NewDistrictModal).
 */
export function EditBuildingForm({
  initial,
  districts: initialDistricts,
  developers: initialDevelopers,
  existingExteriorPhotos,
  existingProgressPhotos,
}: {
  initial: EditBuildingInitial;
  districts: DistrictOption[];
  developers: DeveloperOption[];
  existingExteriorPhotos: ExistingPhoto[];
  existingProgressPhotos: ExistingPhoto[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Lists are mutable so the inline create-modals can append entries.
  const [districts, setDistricts] = useState(initialDistricts);
  const [developers, setDevelopers] = useState(initialDevelopers);
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);
  const [districtModalOpen, setDistrictModalOpen] = useState(false);

  // Form state — initialised from server-loaded values so the user
  // sees what's currently saved before they edit.
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [districtId, setDistrictId] = useState(initial.district_id);
  const [developerId, setDeveloperId] = useState(initial.developer_id);
  const [status, setStatus] = useState(initial.status);
  const [totalFloors, setTotalFloors] = useState<number | ''>(initial.total_floors);
  const [totalUnits, setTotalUnits] = useState<number | ''>(initial.total_units);
  const [handoverQuarter, setHandoverQuarter] = useState(initial.handover_quarter);
  const [description, setDescription] = useState(initial.description);
  const [amenities, setAmenities] = useState<string[]>(initial.amenities);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial.latitude != null && initial.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null,
  );

  // Photo edit state — same pattern as EditApartmentForm.
  const [removePhotoIds, setRemovePhotoIds] = useState<string[]>([]);
  const [newExteriorPhotos, setNewExteriorPhotos] = useState<PendingPhoto[]>([]);
  const [newProgressPhotos, setNewProgressPhotos] = useState<PendingPhoto[]>([]);
  const visibleExterior = existingExteriorPhotos.filter(
    (p) => !removePhotoIds.includes(p.id),
  );
  const visibleProgress = existingProgressPhotos.filter(
    (p) => !removePhotoIds.includes(p.id),
  );

  function toggleAmenity(value: string) {
    setAmenities((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value],
    );
  }

  function stageRemove(photoId: string) {
    setRemovePhotoIds((prev) => (prev.includes(photoId) ? prev : [...prev, photoId]));
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!name.trim()) return toast.error('Введите название ЖК');
    if (!address.trim()) return toast.error('Введите адрес');
    if (!districtId) return toast.error('Выберите район');
    if (!developerId) return toast.error('Выберите застройщика');
    if (typeof totalFloors !== 'number' || totalFloors <= 0) {
      return toast.error('Укажите количество этажей');
    }
    if (typeof totalUnits !== 'number' || totalUnits <= 0) {
      return toast.error('Укажите общее число квартир');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/buildings/${initial.id}/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          district_id: districtId,
          developer_id: developerId,
          status,
          total_floors: totalFloors,
          total_units: totalUnits,
          handover_quarter: handoverQuarter.trim() || null,
          description: description.trim() || null,
          amenities,
          latitude: coords?.lat,
          longitude: coords?.lng,
          // Concat exterior + progress so the API receives one array
          // with per-photo `kind` (same approach the create flow uses).
          pendingPhotos: [...newExteriorPhotos, ...newProgressPhotos],
          removePhotoIds,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; slug: string }
        | { error?: string; detail?: string };
      if (!res.ok || 'error' in data) {
        toast.error(('error' in data && data.error) || 'Не удалось сохранить');
        return;
      }
      toast.success('Сохранено.');
      // Send the founder back to the public-facing /zhk/[slug] so they
      // can immediately verify the change rendered.
      router.push(`/zhk/${(data as { slug: string }).slug}`);
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Location — address + district + map. LocationSection already
          supports the "+ Создать новый район" affordance via the
          onCreateNewDistrict callback. */}
      <LocationSection
        title="Где находится ЖК"
        subtitle="Адрес, район и точка на карте. Изменения применятся сразу после сохранения."
        address={address}
        onAddressChange={setAddress}
        addressFieldKey="b.address"
        districts={districts}
        districtId={districtId}
        onDistrictChange={setDistrictId}
        districtFieldKey="b.district_id"
        coords={coords}
        onCoordsChange={setCoords}
        onCreateNewDistrict={() => setDistrictModalOpen(true)}
      />

      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-4">
            <h2 className="text-h2 font-semibold text-stone-900">О ЖК</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <AppInput
                label="Название ЖК"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <AppSelect
                label="Застройщик"
                value={developerId}
                onChange={(e) => {
                  if (e.target.value === ADD_DEVELOPER_VALUE) {
                    setDeveloperModalOpen(true);
                    return;
                  }
                  setDeveloperId(e.target.value);
                }}
                required
                options={[
                  ...developers.map((d) => ({ value: d.id, label: d.display_name_ru })),
                  { value: ADD_DEVELOPER_VALUE, label: '+ Добавить нового застройщика' },
                ]}
              />
              <AppSelect
                label="Стадия строительства"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as EditBuildingInitial['status'])
                }
                required
                options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <AppInput
                label="Срок сдачи (например 2026-Q3)"
                value={handoverQuarter}
                onChange={(e) => setHandoverQuarter(e.target.value)}
                placeholder="2026-Q3"
              />
              <AppInput
                label="Этажей в доме"
                inputMode="numeric"
                value={totalFloors === '' ? '' : String(totalFloors)}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setTotalFloors(v ? parseInt(v, 10) : '');
                }}
                required
              />
              <AppInput
                label="Всего квартир"
                inputMode="numeric"
                value={totalUnits === '' ? '' : String(totalUnits)}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setTotalUnits(v ? parseInt(v, 10) : '');
                }}
                required
              />
            </div>
            <AppTextarea
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Кирпичный дом, закрытый двор, паркинг…"
            />
            <div className="flex flex-col gap-2">
              <span className="text-caption font-medium text-stone-500">Удобства</span>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((opt) => {
                  const active = amenities.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAmenity(opt.value)}
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

      {/* Photos — two galleries. Existing photos are shown as
          removable thumbnails; new uploads flow through PhotoPicker.
          On save we send both sets in one pendingPhotos array (each
          photo carries its `kind`) and removePhotoIds for deletes. */}
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-h2 font-semibold text-stone-900">Фото ЖК</h2>
              {visibleExterior.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {visibleExterior.map((p) => (
                    <div key={p.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt=""
                        className="aspect-square w-full rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => stageRemove(p.id)}
                        aria-label="Удалить фото"
                        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <PhotoPicker
                label={visibleExterior.length > 0 ? 'Добавить ещё фото ЖК' : 'Фото ЖК'}
                kind="building_exterior"
                max={8}
                photos={newExteriorPhotos}
                onChange={setNewExteriorPhotos}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-h2 font-semibold text-stone-900">
                Фото хода стройки
              </h2>
              {visibleProgress.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {visibleProgress.map((p) => (
                    <div key={p.id} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt=""
                        className="aspect-square w-full rounded-md object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => stageRemove(p.id)}
                        aria-label="Удалить фото"
                        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <PhotoPicker
                label={
                  visibleProgress.length > 0
                    ? 'Добавить ещё фото со стройки'
                    : 'Фото хода стройки'
                }
                kind="progress"
                max={15}
                photos={newProgressPhotos}
                onChange={setNewProgressPhotos}
              />
            </div>
          </div>
        </AppCardContent>
      </AppCard>

      <div className="flex justify-end gap-2">
        <AppButton
          variant="secondary"
          onClick={() => router.push(`/zhk/${initial.slug}`)}
        >
          Отмена
        </AppButton>
        <AppButton variant="primary" onClick={handleSubmit} loading={submitting}>
          Сохранить
        </AppButton>
      </div>

      <NewDeveloperModal
        open={developerModalOpen}
        onClose={() => setDeveloperModalOpen(false)}
        onCreated={(dev: NewDeveloperResult) => {
          setDevelopers((list) => [...list, dev]);
          setDeveloperId(dev.id);
        }}
      />
      <NewDistrictModal
        open={districtModalOpen}
        onClose={() => setDistrictModalOpen(false)}
        onCreated={(district: NewDistrictResult) => {
          setDistricts((list) => [...list, district]);
          setDistrictId(district.id);
        }}
      />
    </div>
  );
}
