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
import { NumberField } from '../../../NumberField';
import { LocationSection } from '../../../LocationSection';
import { HandoverQuarterPicker } from '../../../HandoverQuarterPicker';
import { NewDeveloperModal, type NewDeveloperResult } from '../../../NewDeveloperModal';
import { NewDistrictModal, type NewDistrictResult } from '../../../NewDistrictModal';

export interface ExistingPhoto {
  /** photos.id — what /api/buildings/[id]/update needs to delete it. */
  id: string;
  /** Public URL for the thumbnail. */
  url: string;
  /** ISO timestamp the photo was taken. Set on construction-progress
   *  photos so the timeline groups by real shoot date; null for
   *  exterior/other kinds and for legacy progress rows uploaded
   *  before the dated picker existed. The form renders a date
   *  input on each progress thumb so the founder can fix or
   *  backfill the date inline. */
  taken_at?: string | null;
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
  // Portfolio fields — pre-fill the «Портфолио застройщика» section
  // when this developer is the selected one. Optional because a
  // developer freshly created via NewDeveloperModal has none yet
  // (the modal carries only name/phone/description). Same shape as
  // PostFlow's DeveloperOption. Columns from migrations 0002 + 0023.
  years_active?: number | null;
  projects_completed_count?: number | null;
  projects_announced_count?: number | null;
  projects_under_construction_count?: number | null;
  projects_near_completion_count?: number | null;
  /** Russian short company description — pre-fills the «Краткое
   *  описание застройщика» textarea below the portfolio numbers.
   *  Editable from this form (PATCH via the portfolio endpoint). */
  description_ru?: string | null;
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

/** The five portfolio inputs in the «Портфолио застройщика» section. */
type PortfolioInputs = {
  years_active: number | '';
  projects_completed: number | '';
  projects_announced: number | '';
  projects_under_construction: number | '';
  projects_near_completion: number | '';
};

/** Map a developer's stored portfolio columns to the form's input
 *  shape — null/undefined become '' so NumberField shows a blank.
 *  Used both for the lazy initial state and on every developer change,
 *  so the portfolio is always correct at render time (no reliance on a
 *  post-mount sync effect, which NumberField's mount-time draft would
 *  miss). */
function portfolioFromDev(dev: DeveloperOption | undefined): PortfolioInputs {
  return {
    years_active: dev?.years_active ?? '',
    projects_completed: dev?.projects_completed_count ?? '',
    projects_announced: dev?.projects_announced_count ?? '',
    projects_under_construction: dev?.projects_under_construction_count ?? '',
    projects_near_completion: dev?.projects_near_completion_count ?? '',
  };
}

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
  // Date overrides for EXISTING progress photos, keyed by photo id.
  // Value is YYYY-MM-DD (what the native date input emits) or '' to
  // clear. Only ids the founder actually touched land here — untouched
  // photos send no update. On save we diff against the original
  // taken_at and only POST entries that actually changed.
  const [photoDateUpdates, setPhotoDateUpdates] = useState<
    Record<string, string>
  >({});

  // Developer portfolio state — the «Портфолио застройщика» section.
  // Lazy-initialised from the building's developer so the inputs show
  // the right values on first paint. Re-set synchronously whenever the
  // developer changes (in the select onChange + new-developer modal
  // onCreated below) — NOT via a post-mount effect, because the portfolio
  // NumberFields are remounted on developer change via key={developerId}
  // and must read the correct value at mount. This is the only way to
  // change a developer's portfolio after creation — NewDeveloperModal
  // doesn't carry these fields (DECISIONS 2026-05-22).
  const [portfolio, setPortfolio] = useState<PortfolioInputs>(() =>
    portfolioFromDev(
      initialDevelopers.find((d) => d.id === initial.developer_id),
    ),
  );
  // Selected developer's «Краткое описание» — pre-fill from the
  // developer's stored description, re-sync synchronously on developer
  // change (same pattern as portfolio above). Named `developerDescription`
  // to disambiguate from the building's own `description` above.
  const [developerDescription, setDeveloperDescription] = useState<string>(() =>
    initialDevelopers.find((d) => d.id === initial.developer_id)
      ?.description_ru ?? '',
  );

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

    // Build the per-photo date diff: only entries the founder actually
    // changed from the saved value, and skipping any photo staged for
    // removal (no point updating a row about to be deleted). Each entry
    // becomes `{ id, taken_at }` where `taken_at` is a noon-UTC ISO
    // (matches PhotoPicker's convention — avoids TZ-shift bugs) or null
    // when the founder cleared the field.
    const originalDateById = new Map(
      existingProgressPhotos.map((p) => [p.id, p.taken_at ?? null]),
    );
    const photoDateUpdatesPayload = Object.entries(photoDateUpdates)
      .filter(([id]) => !removePhotoIds.includes(id))
      .map(([id, ymd]) => ({
        id,
        taken_at: ymd ? `${ymd}T12:00:00.000Z` : null,
      }))
      .filter(({ id, taken_at }) => {
        const orig = originalDateById.get(id) ?? null;
        // Compare as YYYY-MM-DD slices so a re-pick of the same date
        // (which would change the ISO suffix) doesn't dirty the row.
        const origYmd = orig ? orig.slice(0, 10) : null;
        const nextYmd = taken_at ? taken_at.slice(0, 10) : null;
        return origYmd !== nextYmd;
      });

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
          photoDateUpdates: photoDateUpdatesPayload,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; slug: string }
        | { error?: string; detail?: string };
      if (!res.ok || 'error' in data) {
        toast.error(('error' in data && data.error) || 'Не удалось сохранить');
        return;
      }

      // Persist the developer portfolio if any of the five fields
      // changed from the developer's saved values. Diff-aware so a
      // no-op save doesn't hit the endpoint. The building is already
      // saved here — a portfolio failure surfaces as a warning toast
      // but never blocks the redirect. Awaited (not fire-and-forget)
      // so the warning is real, not a silently-swallowed console line.
      let portfolioWarning = false;
      const currentDev = developers.find((d) => d.id === developerId);
      if (currentDev) {
        const diffNum = (
          current: number | null | undefined,
          next: number | '',
        ): number | null | undefined => {
          const nextNum = next === '' ? null : next;
          // Treat undefined (developer freshly created via the modal,
          // no portfolio columns loaded) and null as the same "unset"
          // state so an untouched field doesn't PATCH a spurious null.
          return nextNum === (current ?? null) ? undefined : nextNum;
        };
        const portfolioPatch: Record<string, number | string | null> = {};
        const fy = diffNum(currentDev.years_active, portfolio.years_active);
        if (fy !== undefined) portfolioPatch.years_active = fy;
        const fc = diffNum(
          currentDev.projects_completed_count,
          portfolio.projects_completed,
        );
        if (fc !== undefined) portfolioPatch.projects_completed_count = fc;
        const fa = diffNum(
          currentDev.projects_announced_count,
          portfolio.projects_announced,
        );
        if (fa !== undefined) portfolioPatch.projects_announced_count = fa;
        const fu = diffNum(
          currentDev.projects_under_construction_count,
          portfolio.projects_under_construction,
        );
        if (fu !== undefined) {
          portfolioPatch.projects_under_construction_count = fu;
        }
        const fn = diffNum(
          currentDev.projects_near_completion_count,
          portfolio.projects_near_completion,
        );
        if (fn !== undefined) portfolioPatch.projects_near_completion_count = fn;
        // Description — diff against the developer's stored value;
        // empty string treated as null so an unset description doesn't
        // round-trip as "" and dirty the JSONB.
        const descCur = currentDev.description_ru ?? null;
        const descNext = developerDescription.trim() || null;
        if (descCur !== descNext) {
          portfolioPatch.description = descNext;
        }
        if (Object.keys(portfolioPatch).length > 0) {
          try {
            const pRes = await fetch(
              `/api/developers/${developerId}/portfolio`,
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(portfolioPatch),
              },
            );
            if (!pRes.ok) portfolioWarning = true;
          } catch {
            portfolioWarning = true;
          }
        }
      }

      if (portfolioWarning) {
        toast.error('ЖК сохранён, но портфолио застройщика не обновилось.');
      } else {
        toast.success('Сохранено.');
      }
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
                  // Re-fill the portfolio section from the newly-picked
                  // developer, synchronously — paired with the
                  // key={developerId} remount on the grid below.
                  setPortfolio(
                    portfolioFromDev(
                      developers.find((d) => d.id === e.target.value),
                    ),
                  );
                  setDeveloperDescription(
                    developers.find((d) => d.id === e.target.value)
                      ?.description_ru ?? '',
                  );
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
              <HandoverQuarterPicker
                value={handoverQuarter}
                onChange={setHandoverQuarter}
              />
              <NumberField
                label="Этажей в доме"
                value={totalFloors}
                onChange={setTotalFloors}
                required
              />
              <NumberField
                label="Квартир всего в ЖК"
                helperText="Сколько квартир всего в доме — не путать с числом активных объявлений."
                value={totalUnits}
                onChange={setTotalUnits}
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

      {/* Портфолио застройщика — five number inputs for the selected
          developer's track record. Identical to the create flow's
          section (PostFlow.tsx); pre-filled from the developer, PATCHed
          to /api/developers/[id]/portfolio on save. Sits right after
          «О ЖК» so the edit flow reads building → developer → photos,
          the same order as create. */}
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2 font-semibold text-stone-900">
                Портфолио застройщика
              </h2>
              <p className="text-meta text-stone-500">
                Опыт и проекты выбранного застройщика. Появится в карточке «О застройщике» на странице ЖК. Можно оставить пустым.
              </p>
            </div>
            <AppTextarea
              label="Краткое описание застройщика"
              value={developerDescription}
              onChange={(e) => setDeveloperDescription(e.target.value)}
              rows={3}
              placeholder="Молодая компания, фокус на качестве отделки и сдаче в срок."
            />
            {/* key={developerId} remounts all five NumberFields when
                the developer changes, so each picks up the fresh
                portfolio value at mount (NumberField seeds its draft
                from `value` only at mount). */}
            <div
              key={developerId}
              className="grid grid-cols-2 gap-3 md:grid-cols-5"
            >
              <NumberField
                label="Лет на рынке"
                value={portfolio.years_active}
                onChange={(v) =>
                  setPortfolio((p) => ({ ...p, years_active: v }))
                }
              />
              <NumberField
                label="Котлован"
                value={portfolio.projects_announced}
                onChange={(v) =>
                  setPortfolio((p) => ({ ...p, projects_announced: v }))
                }
              />
              <NumberField
                label="Строится"
                value={portfolio.projects_under_construction}
                onChange={(v) =>
                  setPortfolio((p) => ({ ...p, projects_under_construction: v }))
                }
              />
              <NumberField
                label="Почти готов"
                value={portfolio.projects_near_completion}
                onChange={(v) =>
                  setPortfolio((p) => ({ ...p, projects_near_completion: v }))
                }
              />
              <NumberField
                label="Сдано"
                value={portfolio.projects_completed}
                onChange={(v) =>
                  setPortfolio((p) => ({ ...p, projects_completed: v }))
                }
              />
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
                  {visibleProgress.map((p) => {
                    // Display value: the founder's override if they
                    // touched this row (including '' to clear), otherwise
                    // the original taken_at trimmed to YYYY-MM-DD (what
                    // <input type="date"> expects).
                    const dateValue =
                      p.id in photoDateUpdates
                        ? photoDateUpdates[p.id]!
                        : p.taken_at
                          ? p.taken_at.slice(0, 10)
                          : '';
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <div className="relative">
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
                        {/* Per-photo date editor — native input, compact.
                            Native picker is touch-friendly and we're
                            founder-only here, so cross-browser styling
                            quirks are acceptable. Clearing the field
                            stores '' so the diff writes null on save. */}
                        <input
                          type="date"
                          aria-label="Дата съёмки"
                          value={dateValue}
                          onChange={(e) =>
                            setPhotoDateUpdates((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-stone-300 bg-white px-1.5 py-1 text-[11px] text-stone-700 tabular-nums focus:border-terracotta-500 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <PhotoPicker
                label={
                  visibleProgress.length > 0
                    ? 'Добавить ещё фото со стройки'
                    : 'Фото хода стройки'
                }
                kind="progress"
                withDate
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
          // A freshly-created developer has no portfolio yet — clear
          // the section so it doesn't show the previous developer's
          // numbers.
          setPortfolio(portfolioFromDev(undefined));
          // Description shows empty for the new dev. The modal-captured
          // description is already in DB; the diff in handleSubmit sees
          // null === null and won't patch (so it isn't clobbered).
          setDeveloperDescription('');
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
