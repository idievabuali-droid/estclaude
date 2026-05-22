'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Building2, Home, Trash2, Copy, ChevronRight } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  AppCard,
  AppCardContent,
  AppButton,
  AppInput,
  AppSelect,
  AppTextarea,
  AppModal,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { PhotoPicker, type PendingPhoto } from './PhotoPicker';
import { NewDeveloperModal } from './NewDeveloperModal';
import { NewDistrictModal } from './NewDistrictModal';
import { NumberField } from './NumberField';
import { LocationSection } from './LocationSection';
import {
  saveDraft,
  loadDraft,
  clearDraft,
  formatRelative,
} from './draft-storage';

interface DistrictOption {
  id: string;
  name: string;
  /** Centroid lat/lng — used to centre the map picker on selection. */
  center_lat: number;
  center_lng: number;
}

interface BuildingOption {
  id: string;
  name: string;
  /** Used by the per-m² benchmark hint (A2) when the seller is posting
   *  into an existing ЖК — without it we can't resolve a district median. */
  district_id: string;
}

interface DeveloperOption {
  id: string;
  name: string;
  display_name_ru: string;
  // Portfolio fields — captured in the building form's "Портфолио
  // застройщика" section, not in NewDeveloperModal. Loaded with the
  // developers list so picking an existing developer pre-fills the
  // section. Nullable per schema (columns added 0002 + 0023).
  years_active?: number | null;
  projects_completed_count?: number | null;
  projects_announced_count?: number | null;
  projects_under_construction_count?: number | null;
  projects_near_completion_count?: number | null;
}

/** Curated POIs + existing buildings rendered as labelled markers on
 *  the LocationPicker map. Sellers in Vahdat orient by landmarks they
 *  already know (рынок Гулистон, школа №1, ЖК Резиденс) — base-map
 *  OSM coverage is too sparse to do that on its own. */
export interface LandmarkOption {
  id: string;
  lat: number;
  lng: number;
  name: string;
  kind: 'poi' | 'building';
  poiKind?: string;
}

/** Synthetic dropdown value that opens the new-developer modal
 *  instead of selecting an existing one. UUIDs never look like this. */
const ADD_DEVELOPER_VALUE = '__add_new__';

export interface PostFlowProps {
  districts: DistrictOption[];
  existingBuildings: BuildingOption[];
  developers: DeveloperOption[];
  isFounder: boolean;
  /** Phone captured at Telegram /start auth — shown in the verification
   *  contact card so the seller can confirm we'll call this number. The
   *  moderation queue UI also surfaces it for the founder. */
  userPhone: string;
  /** Namespaces the autosave-draft localStorage key per user, so two
   *  users on the same browser don't collide on each other's drafts. */
  userId: string;
  /** District-id → median TJS/m² (already converted from dirams). Used
   *  by the per-m² hint to surface a "на X% выше/ниже среднего" line.
   *  Empty when no district has sample_size>=5 — hint silently degrades
   *  to just "≈ X TJS/м²" without the comparison. (A2.) */
  benchmarksByDistrict: Record<string, number>;
  /** POIs + existing ЖК coords to render as labelled markers on the
   *  map picker (helps sellers orient when OSM coverage is sparse). */
  landmarks: LandmarkOption[];
}

type Mode = 'choose' | 'new-building' | 'existing-building' | 'standalone';

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
  /**
   * Tech passport (техпаспорт) — '' means seller didn't say.
   * Yes/no resolves to a boolean server-side; '' resolves to null
   * (column is nullable per migration 0018).
   */
  has_technical_passport: '' | 'yes' | 'no';
  /** Photos already uploaded to Storage by /api/storage/upload but
   *  not yet attached to a listing — submission attaches them. */
  photos: PendingPhoto[];
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
    has_technical_passport: '',
    photos: [],
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
// Shape of the autosave payload — flat enough to JSON-roundtrip cleanly,
// rich enough to fully restore the form. Lives outside the component so
// the saveDraft<DraftPayload> generic stays referenceable.
interface DraftPayload {
  mode: Mode;
  building: BuildingDraft;
  buildingPhotos: PendingPhoto[];
  /** Construction-progress photos (kind='progress'). Separate from
   *  buildingPhotos so the cover-photo math doesn't accidentally pick
   *  a progress shot. Added 2026-05-22 — the founder uploads new
   *  progress photos every month, so this slot accumulates over time
   *  and is editable from /post/edit/building/[id]. */
  progressPhotos?: PendingPhoto[];
  coords: { lat: number; lng: number } | null;
  existingBuildingId: string;
  apartments: ApartmentDraft[];
}

interface BuildingDraft {
  name: string;
  address: string;
  landmark: string;
  district_id: string;
  developer_id: string;
  status: 'announced' | 'under_construction' | 'near_completion' | 'delivered';
  total_floors: number | '';
  total_units: number | '';
  handover_quarter: string;
  description: string;
  amenities: string[];
}

export function PostFlow({
  districts: initialDistricts,
  existingBuildings,
  developers: initialDevelopers,
  isFounder,
  userPhone,
  userId,
  benchmarksByDistrict,
  landmarks,
}: PostFlowProps) {
  // Districts list is mutable: opening the new-district modal can
  // append a fresh entry. We initialise once from the server-fetched
  // list and add to it locally as the user creates new ones (mirrors
  // the developers-state pattern below).
  const [districts, setDistricts] = useState(initialDistricts);
  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [submitting, setSubmitting] = useState(false);
  // Drives the "Есть незавершённое объявление" banner. Set on mount
  // when a TTL-fresh draft is found; cleared on Восстановить / Очистить.
  const [draftPrompt, setDraftPrompt] = useState<{
    savedAt: number;
    payload: DraftPayload;
  } | null>(null);

  // Field-keyed validation errors. Replaces the toast-only "Заполните
  // обязательные поля квартиры #N" early-return pattern with red-border +
  // helper-text inline highlighting + scroll-to-first-error. Toasts are
  // kept ONLY for non-field errors (network failure, server rejection).
  // Keys: 'b.<field>' for building, 'apt.<uid>.<field>' for apartments,
  // 'existing.id' for existing-building selection.
  const [errors, setErrors] = useState<Record<string, string>>({});
  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Developers list is mutable: opening the new-developer modal can
  // append a fresh entry. We initialise once from the server-fetched
  // list and add to it locally as the user creates new ones.
  const [developers, setDevelopers] = useState<DeveloperOption[]>(initialDevelopers);
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);

  // New-building form state.
  const [b, setB] = useState<BuildingDraft>({
    name: '',
    address: '',
    /** Optional landmark — Vahdat addresses are sparse; "напротив рынка"
     *  is what locals actually use. Stored alongside the formal address. */
    landmark: '',
    district_id: districts[0]?.id ?? '',
    developer_id: initialDevelopers[0]?.id ?? '',
    status: 'under_construction',
    total_floors: '',
    total_units: '',
    handover_quarter: '',
    description: '',
    amenities: [],
  });

  // Map-picked coordinates. Initially null — LocationPicker emits the
  // district centroid on first mount so the form always has a value
  // to submit even if the seller never drags the pin.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Building-level cover photos (only used in 'new-building' mode).
  // Becomes the building's hero image + the cover_photo_id reference
  // on /zhk pages and building cards.
  const [buildingPhotos, setBuildingPhotos] = useState<PendingPhoto[]>([]);

  // Construction-progress photos (kind='progress'). Separate state +
  // separate PhotoPicker so the cover-photo flag from progress shots
  // never overrides the exterior cover — we concat
  // [...buildingPhotos, ...progressPhotos] on submit so attachAndSetCover
  // picks the first is_cover=true from the exterior set. Displayed on
  // /zhk/[slug]/progress; accumulates over the build's lifetime.
  const [progressPhotos, setProgressPhotos] = useState<PendingPhoto[]>([]);

  // Developer portfolio breakdown — five number-stepper inputs in the
  // "Портфолио застройщика" section below the developer dropdown.
  // Pre-filled from the selected developer's existing row (sync effect
  // further down); user edits → on building submit we PATCH the
  // developer via /api/developers/[id]/portfolio.
  //
  // Why not in NewDeveloperModal: founder feedback 2026-05-22 —
  // everything should be enterable in the main building form via
  // structured selectors, not behind a modal as free text.
  const [portfolio, setPortfolio] = useState<{
    years_active: number | '';
    projects_completed: number | '';
    projects_announced: number | '';
    projects_under_construction: number | '';
    projects_near_completion: number | '';
  }>({
    years_active: '',
    projects_completed: '',
    projects_announced: '',
    projects_under_construction: '',
    projects_near_completion: '',
  });

  // Existing-building selection.
  const [existingBuildingId, setExistingBuildingId] = useState(
    existingBuildings[0]?.id ?? '',
  );

  // Standalone-mode state (mode === 'standalone'). Captures the
  // structural facts we'd otherwise read from a parent ЖК — schema
  // columns added in migration 0019.
  const [standalone, setStandalone] = useState({
    street_address: '',
    district_id: districts[0]?.id ?? '',
    total_floors: '' as number | '',
    has_elevator: '' as '' | 'yes' | 'no',
    year_built: '' as number | '',
  });

  // Resolves the district whose benchmark applies to the current
  // apartments. Order: new-building → seller-picked district;
  // existing-building → chosen building's district; standalone →
  // seller-picked district on the standalone form.
  const activeDistrictId =
    mode === 'new-building'
      ? b.district_id || undefined
      : mode === 'existing-building'
        ? existingBuildings.find((bld) => bld.id === existingBuildingId)?.district_id
        : mode === 'standalone'
          ? standalone.district_id || undefined
          : undefined;

  // Apartments list — start with one card.
  const [apartments, setApartments] = useState<ApartmentDraft[]>([makeApartmentDraft()]);

  // ─── Autosave (A3) ─────────────────────────────────────────────
  // On mount, surface a draft restore prompt if one exists and is fresh.
  // We deliberately don't auto-restore: the seller might have abandoned
  // intentionally, or be filling a brand-new listing. Show the banner,
  // let them choose. Loaded once on mount — `userId` is stable for the
  // session.
  // The `restoredOnceRef` flag prevents a restore + immediate save
  // overwrite race: when the user clicks "Восстановить" we apply the
  // payload via setState, and the autosave effect (which depends on
  // those states) would otherwise re-fire and re-write a slightly
  // different payload mid-restore. By tracking that we just restored,
  // the next save is a no-op until the seller actually edits.
  const restoredOnceRef = useRef(false);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    // Defer the setState to a microtask so this effect body doesn't
    // call setState synchronously — the React 19 lint rule
    // `react-hooks/set-state-in-effect` disallows that pattern. The
    // localStorage read itself is sync; only the state update is
    // pushed off the current render commit, which is exactly what
    // we want on mount anyway (let the page paint, then surface the
    // restore prompt).
    queueMicrotask(() => {
      const found = loadDraft<DraftPayload>(userId);
      if (found) setDraftPrompt(found);
    });
    hasMountedRef.current = true;
  }, [userId]);

  // Sync portfolio state from the selected developer whenever the
  // developer_id changes or the developers list mutates (new-developer
  // modal append). Empty values translate to '' so NumberField shows
  // an empty placeholder rather than "0". Overwrites any in-progress
  // local edits — accepted trade-off: picking a different developer
  // and back should reset to that developer's saved values, not
  // preserve a half-typed edit for the wrong dev.
  useEffect(() => {
    const dev = developers.find((d) => d.id === b.developer_id);
    if (!dev) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortfolio({
      years_active: dev.years_active ?? '',
      projects_completed: dev.projects_completed_count ?? '',
      projects_announced: dev.projects_announced_count ?? '',
      projects_under_construction: dev.projects_under_construction_count ?? '',
      projects_near_completion: dev.projects_near_completion_count ?? '',
    });
  }, [b.developer_id, developers]);

  // Save on every change, debounced 500ms. Skip the very first run
  // (the initial paint) so we don't immediately write a blank draft
  // on mount before the user has typed anything. Skip the run after a
  // restore for the same reason.
  useEffect(() => {
    if (!hasMountedRef.current) return;
    if (restoredOnceRef.current) {
      restoredOnceRef.current = false;
      return;
    }
    // Don't save if the seller hasn't picked a mode yet — no useful
    // state to recover and the banner would feel ghostly.
    if (mode === 'choose') return;
    const t = window.setTimeout(() => {
      const payload: DraftPayload = {
        mode,
        building: b,
        buildingPhotos,
        progressPhotos,
        coords,
        existingBuildingId,
        apartments,
      };
      saveDraft<DraftPayload>(userId, payload);
    }, 500);
    return () => window.clearTimeout(t);
  }, [userId, mode, b, buildingPhotos, progressPhotos, coords, existingBuildingId, apartments]);

  function restoreDraft() {
    if (!draftPrompt) return;
    const p = draftPrompt.payload;
    restoredOnceRef.current = true;
    setMode(p.mode);
    setB(p.building);
    setBuildingPhotos(p.buildingPhotos ?? []);
    setProgressPhotos(p.progressPhotos ?? []);
    setCoords(p.coords ?? null);
    if (p.existingBuildingId) setExistingBuildingId(p.existingBuildingId);
    if (Array.isArray(p.apartments) && p.apartments.length > 0) {
      setApartments(p.apartments);
    }
    setDraftPrompt(null);
  }

  function discardDraft() {
    clearDraft(userId);
    setDraftPrompt(null);
  }

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
        // Photos start fresh on duplicates — same-photo-on-multiple-
        // floors is rare and would force the user to remember to swap
        // them. Cleaner to require an upload per duplicated unit.
        photos: [],
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

  // A4 — confirm modal opens after a clean validation pass; the
  // primary button inside the modal is what actually fires actuallySubmit().
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A5 — partial-failure block. Populated when the server returns
  // failed: [{ index, error }] entries; cleared on next submit attempt.
  const [partialFailures, setPartialFailures] = useState<
    Array<{ uid: string; index: number; error: string }>
  >([]);

  /**
   * Click handler for the "Опубликовать / Отправить на проверку" button.
   * Runs A1 validation, scrolls to first error if any, otherwise opens
   * the A4 confirm modal. Network call is deferred to actuallySubmit().
   */
  function handleSubmitClick() {
    if (submitting) return;

    // ─── Inline validation (A1) ─────────────────────────────────
    // Collect every empty required field as a key→message map. If any
    // exist, scroll to the first one and abort submit. Toast remains
    // only for non-field problems (network failure, server rejection).
    const nextErrors: Record<string, string> = {};
    if (mode === 'new-building') {
      if (!b.name.trim()) nextErrors['b.name'] = 'Укажите название ЖК';
      if (!b.address.trim()) nextErrors['b.address'] = 'Укажите адрес';
      if (!b.district_id) nextErrors['b.district_id'] = 'Выберите район';
      if (!b.developer_id) nextErrors['b.developer_id'] = 'Выберите застройщика';
      if (!b.total_floors) nextErrors['b.total_floors'] = 'Укажите этажность';
      if (!b.total_units) nextErrors['b.total_units'] = 'Укажите количество квартир';
    } else if (mode === 'existing-building') {
      if (!existingBuildingId) nextErrors['existing.id'] = 'Выберите ЖК';
    } else if (mode === 'standalone') {
      // Standalone listings: address + district required (the listings
      // table check constraint also enforces district presence). Other
      // structural fields (total_floors / has_elevator / year_built)
      // are deliberately optional — sellers often don't know.
      if (!standalone.street_address.trim()) {
        nextErrors['s.street_address'] = 'Укажите адрес';
      }
      if (!standalone.district_id) {
        nextErrors['s.district_id'] = 'Выберите район';
      }
    } else {
      return;
    }

    for (const a of apartments) {
      if (!a.rooms_count) nextErrors[`apt.${a.uid}.rooms_count`] = 'Укажите комнатность';
      if (!a.size_m2) nextErrors[`apt.${a.uid}.size_m2`] = 'Укажите площадь';
      if (!a.floor_number) nextErrors[`apt.${a.uid}.floor_number`] = 'Укажите этаж';
      if (!a.price_tjs) nextErrors[`apt.${a.uid}.price_tjs`] = 'Укажите цену';
      if (!a.finishing_type) nextErrors[`apt.${a.uid}.finishing_type`] = 'Выберите отделку';
    }

    setErrors(nextErrors);
    const firstErrorKey = Object.keys(nextErrors)[0];
    if (firstErrorKey) {
      // Defer one frame so React commits the error state before we
      // try to find the highlighted node.
      requestAnimationFrame(() => {
        const node = document.querySelector(
          `[data-field-key="${firstErrorKey}"]`,
        );
        if (node) {
          node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
      return;
    }

    // Validation clean → open confirm modal. The modal's primary
    // button calls actuallySubmit. We deliberately don't bypass the
    // modal even for the founder — a 5-second pause is cheap, and
    // catches most "wrong building" / "swapped digits" typos.
    setConfirmOpen(true);
  }

  async function actuallySubmit() {
    if (submitting) return;
    setConfirmOpen(false);
    setPartialFailures([]);
    setSubmitting(true);
    // Body shape varies by mode:
    //   - 'existing-building': { building: { id }, apartments: [...] }
    //   - 'new-building':      { building: { ...new ЖК }, apartments: [...] }
    //   - 'standalone':        { standalone: { address, district_id, ... }, apartments: [...] }
    // The API branches on whether `body.standalone` is set.
    const body: Record<string, unknown> = {
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
        // Tech-passport mirrors bathroom_separate: '' → undefined (null
        // in DB), 'yes' → true, 'no' → false.
        has_technical_passport:
          a.has_technical_passport === 'yes'
            ? true
            : a.has_technical_passport === 'no'
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
        pendingPhotos: a.photos,
      })),
    };

    // Attach the parent — building (existing or new ЖК) OR a standalone
    // location block. Exactly one of the three is set per mode.
    if (mode === 'existing-building') {
      body.building = { id: existingBuildingId };
    } else if (mode === 'new-building') {
      body.building = {
        name: b.name.trim(),
        address: b.address.trim(),
        landmark: b.landmark.trim() || undefined,
        district_id: b.district_id,
        developer_id: b.developer_id,
        status: b.status,
        total_floors: Number(b.total_floors),
        total_units: Number(b.total_units),
        handover_quarter: b.handover_quarter.trim() || undefined,
        description: b.description.trim() || undefined,
        amenities: b.amenities,
        latitude: coords?.lat,
        longitude: coords?.lng,
        // Concat exterior + progress so the API receives one array
        // with per-photo `kind`. Order matters — `attachAndSetCover`
        // picks the first is_cover=true row, which we want to be from
        // the exterior set (a progress shot of foundations shouldn't
        // become the building's hero image).
        pendingPhotos: [...buildingPhotos, ...progressPhotos],
      };
    } else if (mode === 'standalone') {
      body.standalone = {
        street_address: standalone.street_address.trim(),
        district_id: standalone.district_id,
        latitude: coords?.lat,
        longitude: coords?.lng,
        total_floors:
          typeof standalone.total_floors === 'number' ? standalone.total_floors : undefined,
        has_elevator:
          standalone.has_elevator === 'yes'
            ? true
            : standalone.has_elevator === 'no'
              ? false
              : undefined,
        year_built:
          typeof standalone.year_built === 'number' ? standalone.year_built : undefined,
      };
    }

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

      // A5 — surface per-apartment failures inline. The API returns
      // `failed: [{ index, error }]`; map index back to the apartment's
      // `uid` so the "scroll to" link works after the apartment list
      // re-renders. We DON'T redirect when there are failures: the
      // seller stays on the form, sees what's left, and resubmits.
      if (failCount > 0 && data.failed) {
        const failures = data.failed
          .map((f) => {
            const apt = apartments[f.index];
            return apt ? { uid: apt.uid, index: f.index, error: f.error } : null;
          })
          .filter((x): x is { uid: string; index: number; error: string } => x != null);
        setPartialFailures(failures);
      }

      // Successful submit → drop the autosave draft so the next visit
      // starts clean. Done before the redirect so the banner doesn't
      // briefly flash "Есть незавершённое объявление" on the way out.
      // We only clear when EVERYTHING succeeded — partial-failure means
      // the seller still needs the unfinished apartments locally.
      if (failCount === 0 && okCount > 0) clearDraft(userId);

      // Server returned a 200 with NO created and NO failed entries.
      // Defensive — shouldn't happen in practice, but if it does the
      // user sees nothing change which is the worst possible outcome.
      // Surface a toast asking them to retry; they'd otherwise stare
      // at the form wondering whether they clicked.
      if (okCount === 0 && failCount === 0) {
        toast.error('Сервер вернул пустой ответ. Попробуйте ещё раз.');
        return;
      }

      // If everything failed, keep them on the form with the inline
      // failure block — and ALSO surface a toast so the user notices
      // (the inline block can scroll out of view on long forms).
      if (okCount === 0) {
        toast.error(
          failCount === 1
            ? 'Не удалось принять квартиру — см. причину под формой.'
            : `Не удалось принять ${failCount} ${plural(failCount, ['квартиру', 'квартиры', 'квартир'])} — см. причины под формой.`,
        );
        return;
      }

      // PATCH the developer's portfolio breakdown — only fires when the
      // user actually changed something from the dev's saved values (so
      // we don't hit the endpoint with a no-op every publish). Best-
      // effort: a failure here doesn't roll back the building publish.
      // Only runs for new-building mode where we picked a developer.
      if (mode === 'new-building' && b.developer_id) {
        const currentDev = developers.find((d) => d.id === b.developer_id);
        if (currentDev) {
          const patch: Record<string, number | null> = {};
          const diffNum = (
            current: number | null | undefined,
            next: number | '',
          ): number | null | undefined => {
            const nextNum = next === '' ? null : next;
            if (nextNum === (current ?? null)) return undefined;
            return nextNum;
          };
          const a = diffNum(currentDev.years_active, portfolio.years_active);
          if (a !== undefined) patch.years_active = a;
          const b1 = diffNum(
            currentDev.projects_completed_count,
            portfolio.projects_completed,
          );
          if (b1 !== undefined) patch.projects_completed_count = b1;
          const c = diffNum(
            currentDev.projects_announced_count,
            portfolio.projects_announced,
          );
          if (c !== undefined) patch.projects_announced_count = c;
          const d2 = diffNum(
            currentDev.projects_under_construction_count,
            portfolio.projects_under_construction,
          );
          if (d2 !== undefined) patch.projects_under_construction_count = d2;
          const e = diffNum(
            currentDev.projects_near_completion_count,
            portfolio.projects_near_completion,
          );
          if (e !== undefined) patch.projects_near_completion_count = e;
          if (Object.keys(patch).length > 0) {
            // Awaited (not fire-and-forget): a failure here — e.g.
            // migration 0023 not applied, so the stage columns don't
            // exist — must surface as a visible warning, not a silently
            // swallowed console line. The building/listing is already
            // published, so we warn but never block the redirect.
            try {
              const pRes = await fetch(
                `/api/developers/${b.developer_id}/portfolio`,
                {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(patch),
                },
              );
              if (!pRes.ok) {
                toast.error(
                  'Объявление опубликовано, но портфолио застройщика не сохранилось.',
                );
              }
            } catch {
              toast.error(
                'Объявление опубликовано, но портфолио застройщика не сохранилось.',
              );
            }
          }
        }
      }

      if (data.moderation_required) {
        // Seller path — listing(s) sit at status='pending_review' until
        // founder approves via /kabinet ModerationList. Land them on
        // /kabinet so they see the new "На проверке" badge immediately;
        // /zhk/<slug> would 404 (building is_published=false).
        toast.success(
          okCount > 1
            ? `Отправлено на проверку: ${okCount} ${plural(okCount, ['квартира', 'квартиры', 'квартир'])}. Обычно отвечаем в течение дня.`
            : 'Отправлено на проверку. Обычно отвечаем в течение дня.',
        );
        router.push('/kabinet');
      } else {
        toast.success(
          failCount > 0
            ? `Опубликовано ${okCount} из ${okCount + failCount}`
            : `Опубликовано: ${okCount} ${plural(okCount, ['квартира', 'квартиры', 'квартир'])}`,
        );
        // Redirect rules:
        //   - new ЖК → /zhk/<slug>: the seller wants to see their fresh
        //     building page with the units beneath it.
        //   - standalone OR single-apartment-into-existing-ЖК → land
        //     directly on the apartment detail page so they can verify
        //     the listing looks right (price/photos/address). Falls
        //     back to /kabinet when the API didn't return a slug.
        //   - everything else → /kabinet (multi-apartment posts cover
        //     mass-add cases where there isn't one obvious destination).
        const buildingSlug = data.building_slug ?? null;
        const aptSlug =
          data.created && data.created.length === 1 ? data.created[0]?.slug ?? null : null;
        if (mode === 'new-building' && buildingSlug) {
          router.push(`/zhk/${buildingSlug}`);
        } else if (aptSlug) {
          router.push(`/kvartira/${aptSlug}`);
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

  // ─── Draft restore banner (A3) ──────────────────────────────
  // Lifted above the mode-picker / main-form branch so it shows on
  // BOTH screens — sellers who closed the tab mid-form land back at
  // /post and need to see the recover prompt before they pick a mode
  // (otherwise picking a mode resets the draft they could have
  // restored).
  const draftBanner = draftPrompt ? (
    <div className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-meta font-medium text-stone-900">
          Есть незавершённое объявление
        </span>
        <span className="text-caption text-stone-500">
          Сохранено {formatRelative(draftPrompt.savedAt)}
        </span>
      </div>
      <div className="flex gap-2">
        <AppButton variant="secondary" size="sm" onClick={discardDraft}>
          Очистить
        </AppButton>
        <AppButton variant="primary" size="sm" onClick={restoreDraft}>
          Восстановить
        </AppButton>
      </div>
    </div>
  ) : null;

  // ─── Mode picker (initial screen) ──────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex flex-col gap-4">
        {draftBanner}
        {/* Three modes — wide grid on desktop, stack on mobile.
            "Просто квартира" covers the older-stock / second-hand /
            unknown-developer case from migration 0019; the seller
            doesn't need to know which "ЖК" (or whether one exists). */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
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
          <ModePickButton
            icon={<Home className="size-6 text-stone-700" />}
            title="Просто квартира (без ЖК)"
            description="Дом построен давно или вы не знаете застройщика — это нормально"
            onClick={() => setMode('standalone')}
            accent="stone"
          />
        </div>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {draftBanner}
      <button
        type="button"
        onClick={() => setMode('choose')}
        className="inline-flex w-fit items-center gap-1 text-meta font-medium text-stone-500 hover:text-terracotta-600"
      >
        <ChevronRight className="size-4 rotate-180" /> К выбору типа
      </button>

      {/* Building section (new or pick existing) */}
      {mode === 'new-building' ? (
        <>
          {/* "Где находится" lifted to the TOP of the form so the
              seller's first interaction is the one thing they always
              know — the location. Address autocomplete + map + auto-
              derived district are all bundled here. Picking an
              existing ЖК from the autocomplete flips mode and pre-
              selects that building (no duplicates). */}
          <LocationSection
            title="Где находится ЖК"
            subtitle="Введите адрес или название — подскажем известные ЖК и ориентиры."
            address={b.address}
            onAddressChange={(next) => {
              setB((s) => ({ ...s, address: next }));
              clearError('b.address');
            }}
            addressFieldKey="b.address"
            addressError={errors['b.address']}
            districts={districts}
            districtId={b.district_id}
            onDistrictChange={(id) => {
              setB((s) => ({ ...s, district_id: id }));
              clearError('b.district_id');
            }}
            districtFieldKey="b.district_id"
            districtError={errors['b.district_id']}
            coords={coords}
            onCoordsChange={setCoords}
            landmarks={landmarks}
            onPickExistingBuilding={(buildingId) => {
              setExistingBuildingId(buildingId);
              setMode('existing-building');
            }}
            onCreateNewDistrict={() => setDistrictModalOpen(true)}
          />
          <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold text-stone-900">О ЖК</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div data-field-key="b.name">
                  <AppInput
                    label="Название ЖК"
                    value={b.name}
                    onChange={(e) => {
                      setB((s) => ({ ...s, name: e.target.value }));
                      clearError('b.name');
                    }}
                    required
                    placeholder="ЖК Гулистон Резиденс"
                    errorText={errors['b.name']}
                  />
                </div>
                <div data-field-key="b.developer_id">
                  <AppSelect
                    label="Застройщик"
                    value={b.developer_id}
                    // Synthetic value opens the new-developer modal instead
                    // of selecting; we deliberately don't update the form
                    // state with __add_new__ so the dropdown bounces back
                    // to the prior selection while the modal is open.
                    onChange={(e) => {
                      if (e.target.value === ADD_DEVELOPER_VALUE) {
                        setDeveloperModalOpen(true);
                        return;
                      }
                      setB((s) => ({ ...s, developer_id: e.target.value }));
                      clearError('b.developer_id');
                    }}
                    required
                    options={[
                      ...developers.map((d) => ({
                        value: d.id,
                        label: d.display_name_ru,
                      })),
                      { value: ADD_DEVELOPER_VALUE, label: '+ Добавить нового застройщика' },
                    ]}
                    errorText={errors['b.developer_id']}
                  />
                </div>
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
                <div data-field-key="b.total_floors">
                  <NumberField
                    label="Этажей в доме"
                    value={b.total_floors}
                    onChange={(v) => {
                      setB((s) => ({ ...s, total_floors: v }));
                      clearError('b.total_floors');
                    }}
                    required
                    errorText={errors['b.total_floors']}
                  />
                </div>
                <div data-field-key="b.total_units">
                  <NumberField
                    label="Всего квартир"
                    value={b.total_units}
                    onChange={(v) => {
                      setB((s) => ({ ...s, total_units: v }));
                      clearError('b.total_units');
                    }}
                    required
                    errorText={errors['b.total_units']}
                  />
                </div>
              </div>
              {/* Адрес / Район / карта живут в LocationSection выше.
                  «Ориентир» как отдельное поле убран — местный
                  ориентир вписывается прямо в строку адреса
                  («ул. Айни 14, напротив парка»). Описание ниже всё
                  равно остаётся доступным для расширенной информации. */}
              <AppTextarea
                label="Описание"
                value={b.description}
                onChange={(e) =>
                  setB((s) => ({ ...s, description: e.target.value }))
                }
                rows={3}
                placeholder="Кирпичный дом, закрытый двор, паркинг…"
              />
              <PhotoPicker
                label="Фото ЖК"
                kind="building_exterior"
                max={8}
                photos={buildingPhotos}
                onChange={setBuildingPhotos}
              />
              {/* Construction-progress gallery — separate picker so
                  cover-photo logic stays predictable (exterior cover
                  doesn't get overwritten by a foundation shot). The
                  founder typically adds 1 photo per month over the
                  build's lifetime; max=15 leaves room for ~1 year of
                  monthly updates. Editable later from /post/edit/
                  building/[id]. */}
              <PhotoPicker
                label="Фото хода стройки"
                kind="progress"
                max={15}
                photos={progressPhotos}
                onChange={setProgressPhotos}
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

        {/* Portfolio breakdown for the selected developer — 5 number
            inputs in a structured grid. Pre-filled from the developer's
            existing row whenever you pick / create one, and PATCHed
            back to /api/developers/[id]/portfolio on publish. Lives in
            the building form (not in NewDeveloperModal) so everything
            you fill is in one flow and entered via stepper-numeric
            selectors rather than free text — founder feedback
            2026-05-22. */}
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-h2 font-semibold text-stone-900">
                  Портфолио застройщика
                </h2>
                <p className="text-meta text-stone-500">
                  Опыт и текущие проекты выбранного застройщика. Появится в карточке «О застройщике» на странице ЖК. Можно оставить пустым — ничего не покажется.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
        </>
      ) : mode === 'existing-building' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">ЖК</h2>
              {existingBuildings.length > 0 ? (
                <div data-field-key="existing.id">
                  <AppSelect
                    label="Выберите ЖК"
                    value={existingBuildingId}
                    onChange={(e) => {
                      setExistingBuildingId(e.target.value);
                      clearError('existing.id');
                    }}
                    required
                    options={existingBuildings.map((bld) => ({
                      value: bld.id,
                      label: bld.name,
                    }))}
                    errorText={errors['existing.id']}
                  />
                </div>
              ) : (
                <p className="text-meta text-stone-500">
                  В системе пока нет ЖК. Создайте новый через «Новый ЖК с квартирами».
                </p>
              )}
            </div>
          </AppCardContent>
        </AppCard>
      ) : (
        // ─── STANDALONE — apartment without a parent ЖК ───────────
        // "Где находится" lifted out into the shared LocationSection
        // (same component the new-building flow uses); the rest of
        // this card carries optional structural facts about the
        // building (floors / лифт / year built) that buyers care
        // about even when no ЖК is associated.
        <>
          <LocationSection
            title="Где находится квартира"
            subtitle="Дом построен давно или не входит в известный ЖК — это нормально. Введите адрес или ориентир."
            address={standalone.street_address}
            onAddressChange={(next) => {
              setStandalone((s) => ({ ...s, street_address: next }));
              clearError('s.street_address');
            }}
            addressFieldKey="s.street_address"
            addressError={errors['s.street_address']}
            districts={districts}
            districtId={standalone.district_id}
            onDistrictChange={(id) => {
              setStandalone((s) => ({ ...s, district_id: id }));
              clearError('s.district_id');
            }}
            districtFieldKey="s.district_id"
            districtError={errors['s.district_id']}
            coords={coords}
            onCoordsChange={setCoords}
            landmarks={landmarks}
            onCreateNewDistrict={() => setDistrictModalOpen(true)}
            onPickExistingBuilding={(buildingId) => {
              // Picked an existing ЖК from autocomplete while in
              // standalone mode → flip to existing-building. Saves the
              // seller from re-discovering the picker.
              setExistingBuildingId(buildingId);
              setMode('existing-building');
            }}
          />
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-4">
                <h2 className="text-h2 font-semibold text-stone-900">О доме (необязательно)</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <NumberField
                    label="Этажей в доме"
                    value={standalone.total_floors}
                    onChange={(v) => setStandalone((s) => ({ ...s, total_floors: v }))}
                    placeholder="5"
                  />
                  <AppSelect
                    label="Лифт"
                    value={standalone.has_elevator}
                    onChange={(e) =>
                      setStandalone((s) => ({
                        ...s,
                        has_elevator: e.target.value as '' | 'yes' | 'no',
                      }))
                    }
                    placeholder="—"
                    options={[
                      { value: 'yes', label: 'Есть' },
                      { value: 'no', label: 'Нет' },
                    ]}
                  />
                  <NumberField
                    label="Год постройки"
                    value={standalone.year_built}
                    onChange={(v) => setStandalone((s) => ({ ...s, year_built: v }))}
                    placeholder="2003"
                  />
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </>
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
            errors={errors}
            clearError={clearError}
            isFounder={isFounder}
            districtBenchmarkTjsPerM2={
              activeDistrictId ? benchmarksByDistrict[activeDistrictId] : undefined
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

      {/* A5 — partial-failure block. Renders after a submit response
          where some apartments succeeded and some didn't. The successes
          are already gone (server-side committed); the failures stay
          in `apartments` so the seller can see / fix / resubmit them.
          Each row links to the apartment by data-field-key — clicking
          scrolls to it. */}
      {partialFailures.length > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-md border border-stone-300 bg-stone-50 p-4"
          role="status"
          aria-live="polite"
        >
          <span className="text-meta font-semibold text-stone-900">
            Не удалось принять {partialFailures.length}{' '}
            {plural(partialFailures.length, ['квартиру', 'квартиры', 'квартир'])}
          </span>
          <ul className="flex flex-col gap-1.5">
            {partialFailures.map((f) => (
              <li
                key={f.uid}
                className="flex flex-wrap items-center justify-between gap-2 text-meta text-stone-700"
              >
                <span>
                  Квартира #{f.index + 1}
                  {f.error ? (
                    <span className="ml-2 text-stone-500">— {f.error}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const node = document.querySelector(
                      `[data-field-key="apt.${f.uid}.rooms_count"]`,
                    );
                    if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
                  }}
                  className="text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
                >
                  Перейти →
                </button>
              </li>
            ))}
          </ul>
          <span className="text-caption text-stone-500">
            Уже принятые квартиры публиковать заново не нужно — они появятся
            в «Мои объявления». Исправьте оставшиеся и нажмите «Отправить» ещё
            раз.
          </span>
        </div>
      ) : null}

      {/* Контакт для проверки — seller-only block. We already have the
          number from Telegram /start (every signed-in user is phone-
          verified), so this is a confirmation surface, not a re-entry
          form. The founder will use this to call the seller before
          approving the listing. */}
      {!isFounder ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-2">
              <h2 className="text-h2 font-semibold text-stone-900">
                Контакт для проверки
              </h2>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-h3 font-semibold tabular-nums text-stone-900">
                  {userPhone.startsWith('+') ? userPhone : `+${userPhone}`}
                </span>
                <span className="text-meta text-stone-500">
                  — номер из Telegram
                </span>
              </div>
              <p className="text-meta text-stone-600">
                Позвоним для подтверждения объявления. Если удобнее другой
                номер — напишите в Telegram, поменяем.
              </p>
              <p className="text-caption text-stone-500">
                Понимаю, что объявление будет проверено перед публикацией.
              </p>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      <AppButton
        variant="primary"
        size="lg"
        onClick={handleSubmitClick}
        loading={submitting}
      >
        {isFounder ? 'Опубликовать' : 'Отправить на проверку'}
      </AppButton>

      <NewDeveloperModal
        open={developerModalOpen}
        onClose={() => setDeveloperModalOpen(false)}
        onCreated={(dev) => {
          setDevelopers((list) => [...list, dev]);
          setB((s) => ({ ...s, developer_id: dev.id }));
        }}
      />

      <NewDistrictModal
        open={districtModalOpen}
        onClose={() => setDistrictModalOpen(false)}
        onCreated={(district) => {
          // Append to the in-memory list so the dropdown picks it up,
          // then auto-select in BOTH the building draft and the
          // standalone draft — whichever LocationSection is currently
          // visible will reflect the new district immediately.
          setDistricts((list) => [...list, district]);
          setB((s) => ({ ...s, district_id: district.id }));
          setStandalone((s) => ({ ...s, district_id: district.id }));
        }}
      />

      {/* A4 — confirm-before-publish modal. Shown only after validation
          passes. Catches the most common typos (wrong building name,
          swapped digits in price) without rendering a full live preview.
          The summary is computed inline from current form state — no
          extra fetch needed. */}
      <AppModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isFounder ? 'Готово к публикации?' : 'Готово к отправке?'}
      >
        {(() => {
          const summaryName =
            mode === 'new-building'
              ? b.name.trim() || 'ЖК (без названия)'
              : existingBuildings.find((bld) => bld.id === existingBuildingId)?.name ?? 'ЖК';
          const prices = apartments
            .map((a) => (typeof a.price_tjs === 'number' ? a.price_tjs : 0))
            .filter((p) => p > 0);
          const sizes = apartments
            .map((a) => (typeof a.size_m2 === 'number' ? a.size_m2 : 0))
            .filter((s) => s > 0);
          const minPrice = prices.length ? Math.min(...prices) : 0;
          const maxPrice = prices.length ? Math.max(...prices) : 0;
          const totalPrice = prices.reduce((acc, p) => acc + p, 0);
          const totalSize = sizes.reduce((acc, s) => acc + s, 0);
          const avgPerM2 = totalSize > 0 ? Math.round(totalPrice / totalSize) : 0;
          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-meta font-semibold text-stone-900">
                  {summaryName}
                </span>
                <span className="text-meta text-stone-600">
                  {apartments.length}{' '}
                  {plural(apartments.length, ['квартира', 'квартиры', 'квартир'])}
                  {prices.length > 0 ? (
                    <>
                      {' · '}
                      {minPrice === maxPrice
                        ? `${RU_NUM.format(minPrice)} TJS`
                        : `от ${RU_NUM.format(minPrice)} до ${RU_NUM.format(maxPrice)} TJS`}
                    </>
                  ) : null}
                </span>
                {avgPerM2 > 0 ? (
                  <span className="text-caption text-stone-500 tabular-nums">
                    Средняя цена: ≈ {RU_NUM.format(avgPerM2)} TJS/м²
                  </span>
                ) : null}
              </div>
              <p className="text-caption text-stone-500">
                {isFounder
                  ? 'Объявление будет видно покупателям сразу после нажатия.'
                  : 'Мы прочитаем заявку и свяжемся с вами по указанному номеру для проверки. Обычно отвечаем в течение дня.'}
              </p>
              <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AppButton
                  variant="secondary"
                  size="md"
                  onClick={() => setConfirmOpen(false)}
                >
                  Назад
                </AppButton>
                <AppButton
                  variant="primary"
                  size="md"
                  onClick={actuallySubmit}
                  loading={submitting}
                >
                  {isFounder ? 'Опубликовать' : 'Отправить на проверку'}
                </AppButton>
              </div>
            </div>
          );
        })()}
      </AppModal>
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
  errors,
  clearError,
  isFounder,
  districtBenchmarkTjsPerM2,
}: {
  index: number;
  apartment: ApartmentDraft;
  onChange: (patch: Partial<ApartmentDraft>) => void;
  onDuplicate: () => void;
  onRemove?: () => void;
  errors: Record<string, string>;
  clearError: (key: string) => void;
  isFounder: boolean;
  /** Median TJS/m² for the apartment's district. Undefined when the
   *  district has no benchmark with sample_size>=5 — hint silently
   *  drops the comparison line. */
  districtBenchmarkTjsPerM2: number | undefined;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const errKey = (field: string) => `apt.${apartment.uid}.${field}`;
  const priceHint = pricePerM2Hint(
    apartment.price_tjs,
    apartment.size_m2,
    districtBenchmarkTjsPerM2,
  );

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
            <div data-field-key={errKey('rooms_count')}>
              <AppSelect
                label="Комнат"
                value={String(apartment.rooms_count)}
                onChange={(e) => {
                  onChange({
                    rooms_count: e.target.value ? Number(e.target.value) : '',
                  });
                  clearError(errKey('rooms_count'));
                }}
                required
                placeholder="—"
                options={ROOMS_OPTIONS}
                errorText={errors[errKey('rooms_count')]}
              />
            </div>
            <div data-field-key={errKey('size_m2')}>
              <NumberField
                label="Площадь, м²"
                decimal
                value={apartment.size_m2}
                onChange={(v) => {
                  onChange({ size_m2: v });
                  clearError(errKey('size_m2'));
                }}
                required
                placeholder="55"
                errorText={errors[errKey('size_m2')]}
              />
            </div>
            <div data-field-key={errKey('floor_number')}>
              <NumberField
                label="Этаж"
                value={apartment.floor_number}
                onChange={(v) => {
                  onChange({ floor_number: v });
                  clearError(errKey('floor_number'));
                }}
                required
                placeholder="3"
                errorText={errors[errKey('floor_number')]}
              />
            </div>
            <div data-field-key={errKey('price_tjs')}>
              <NumberField
                label="Цена, TJS"
                value={apartment.price_tjs}
                onChange={(v) => {
                  onChange({ price_tjs: v });
                  clearError(errKey('price_tjs'));
                }}
                required
                placeholder="450000"
                errorText={errors[errKey('price_tjs')]}
                helperText={priceHint}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div data-field-key={errKey('finishing_type')}>
              <AppSelect
                label="Отделка"
                value={apartment.finishing_type}
                onChange={(e) => {
                  onChange({ finishing_type: e.target.value as ApartmentDraft['finishing_type'] });
                  clearError(errKey('finishing_type'));
                }}
                required
                placeholder="—"
                options={FINISHING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                errorText={errors[errKey('finishing_type')]}
              />
            </div>
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

          {/* Документы — техпаспорт. Buyers ask "есть техпаспорт?"
              before everything else for resale; surfacing it on the
              listing card removes a back-and-forth WhatsApp round.
              Optional: blank = не указано (для котлована/новостроек,
              где документ ещё не выдан). */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AppSelect
              label="Техпаспорт"
              value={apartment.has_technical_passport}
              onChange={(e) =>
                onChange({
                  has_technical_passport: e.target.value as ApartmentDraft['has_technical_passport'],
                })
              }
              placeholder="—"
              options={[
                { value: 'yes', label: 'Есть' },
                { value: 'no', label: 'Нет / выдадут при сдаче' },
              ]}
              helperText="Покупатели чаще всего спрашивают именно про это."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <PhotoPicker
              label="Фото квартиры"
              kind="unit_living"
              // 30 matches Cian/Bayut and gives buyers a real walkthrough.
              // Earlier limit of 15 felt arbitrary — sellers who already
              // shoot a full set on phone hit it instantly.
              max={30}
              photos={apartment.photos}
              onChange={(photos) => onChange({ photos })}
            />
            {/* Photo-first nudge (A6) — only for sellers with no photos
                yet. Founder doesn't see it (they post on behalf of
                developers and may add photos in a separate batch). */}
            {!isFounder && apartment.photos.length === 0 ? (
              <p className="text-caption text-stone-500">
                Без фото объявления почти не получают откликов и редко проходят проверку.
              </p>
            ) : null}
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
                  <NumberField
                    label="Месяц, TJS"
                    value={apartment.installment_monthly_tjs ?? ''}
                    onChange={(v) =>
                      onChange({
                        installment_monthly_tjs: v === '' ? undefined : v,
                      })
                    }
                  />
                  <NumberField
                    label="Первый взнос, %"
                    value={apartment.installment_first_payment_percent ?? 30}
                    onChange={(v) =>
                      onChange({
                        installment_first_payment_percent: v === '' ? undefined : v,
                      })
                    }
                  />
                  <NumberField
                    label="Срок, мес"
                    value={apartment.installment_term_months ?? 84}
                    onChange={(v) =>
                      onChange({
                        installment_term_months: v === '' ? undefined : v,
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

const RU_NUM = new Intl.NumberFormat('ru-RU');

/**
 * Inline price-per-m² hint shown under the price field.
 *
 * Two purposes:
 *
 *  1. **Typo guard** — if a seller types 4 500 000 instead of 450 000,
 *     the per-m² number jumps an order of magnitude. Even without a
 *     benchmark to compare against, a 5-figure-per-m² number stands out
 *     visually as wrong before the seller hits submit.
 *
 *  2. **Fairness signal** — when the district has a benchmark
 *     (sample_size >= 5), append "на X% выше/ниже среднего по району".
 *     Helps sellers price reasonably AND gives them context that we're
 *     a price-aware platform (not a free-for-all classifieds).
 *
 * Returns undefined when price or size aren't fully filled — the
 * NumberField renders no helper text in that case (clean field).
 *
 * Tones: stays in stone-500 (the AppInput helperText default). We
 * deliberately don't go red even for "very above average" — pricing
 * variance has many legitimate reasons (renovation, view, balcony).
 * Surfacing the gap as informational, not judgemental, matches the
 * platform's halal-by-design tone.
 */
function pricePerM2Hint(
  priceTjs: number | '',
  sizeM2: number | '',
  districtBenchmarkTjsPerM2: number | undefined,
): string | undefined {
  if (typeof priceTjs !== 'number' || typeof sizeM2 !== 'number' || sizeM2 <= 0) {
    return undefined;
  }
  const perM2 = Math.round(priceTjs / sizeM2);
  if (perM2 <= 0) return undefined;
  const base = `≈ ${RU_NUM.format(perM2)} TJS/м²`;
  if (!districtBenchmarkTjsPerM2 || districtBenchmarkTjsPerM2 <= 0) return base;
  const deltaPct = Math.round(((perM2 - districtBenchmarkTjsPerM2) / districtBenchmarkTjsPerM2) * 100);
  if (deltaPct === 0) return `${base} · среднее по району`;
  const direction = deltaPct > 0 ? 'выше' : 'ниже';
  return `${base} · на ${Math.abs(deltaPct)}% ${direction} среднего по району`;
}
