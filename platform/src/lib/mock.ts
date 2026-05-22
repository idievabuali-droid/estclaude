/**
 * Mock data — used until Supabase is provisioned and the service layer
 * is wired up. Shapes mirror Data Model v2 §5 so the swap is mechanical:
 * delete this file, replace `import { mock... } from '@/lib/mock'` with
 * service-layer fetches.
 */
import type {
  BuildingStatus,
  FinishingType,
  ListingStatus,
  SourceType,
  VerificationTier,
  Bilingual,
} from '@/types/domain';

export type MockDistrict = {
  id: string;
  city: 'dushanbe' | 'vahdat';
  name: Bilingual;
  slug: string;
};

export type MockDeveloper = {
  id: string;
  name: string;
  display_name: Bilingual;
  is_verified: boolean;
  /** ISO timestamp when the platform verified this developer (or null). */
  verified_at: string | null;
  has_female_agent: boolean;
  years_active: number | null;
  /** Career total of FINISHED ЖК — maps to BuildingStatus 'delivered'.
   *  Captured via number-stepper input in PostFlow's "Портфолио
   *  застройщика" section, alongside the three in-progress stages
   *  below. Together the four ints describe the developer's full
   *  cross-platform portfolio (vs the auto-computed devStats grid
   *  which only counts buildings published on Vafo). */
  projects_completed_count: number | null;
  /** Career total of projects in the 'announced' stage ("Котлован").
   *  Added in migration 0023. */
  projects_announced_count: number | null;
  /** Career total of projects in the 'under_construction' stage
   *  ("Строится"). Added in migration 0023. */
  projects_under_construction_count: number | null;
  /** Career total of projects in the 'near_completion' stage
   *  ("Почти готов"). Added in migration 0023. */
  projects_near_completion_count: number | null;
  /** Short company description (bilingual jsonb). Rendered as a quiet
   *  paragraph on /zhk/[slug] §G developer card when set. Captured
   *  via NewDeveloperModal's "Краткое описание" field. */
  description: Bilingual | null;
  /** Legacy free-text notes column (migration 0022). Kept on the schema
   *  for back-compat with existing rows, but replaced in 2026-05-22 by
   *  the structured stage counts above — NewDeveloperModal no longer
   *  writes here, and /zhk no longer renders it. Will be dropped in a
   *  future cleanup migration once verified there's no stale data. */
  portfolio_notes: string | null;
};

export type MockBuilding = {
  id: string;
  slug: string;
  developer_id: string;
  district_id: string;
  city: 'dushanbe' | 'vahdat';
  name: Bilingual;
  address: Bilingual;
  latitude: number;
  longitude: number;
  status: BuildingStatus;
  handover_estimated_quarter: string | null;
  total_units: number;
  total_floors: number;
  amenities: string[];
  cover_color: string; // placeholder rendered when cover_photo_url is null
  /** Public Storage URL of the building's cover photo, or null when
   *  none has been uploaded yet (we then fall back to cover_color). */
  cover_photo_url: string | null;
  /** All photo URLs in display order, cover first. Drives the in-card
   *  carousel so buyers can swipe through photos without clicking into
   *  the detail page. Empty array when the building has no uploaded
   *  photos (cards then render the colored placeholder). */
  photo_urls: string[];
  price_from_dirams: bigint | null;
  price_per_m2_from_dirams: bigint | null;
  description: Bilingual;
  /** ISO timestamp of the last update — drives the "● Обновлено" badge
   *  on /izbrannoe by comparing against saved_items.change_badges_seen_at.
   *  Optional because mock fixtures don't set it; real Supabase rows do. */
  updated_at?: string | null;
};

export type MockListing = {
  id: string;
  slug: string;
  /**
   * NULL = standalone listing (no parent ЖК). When NULL, the
   * listing carries its own street_address / district_id / lat /
   * lng / total_floors / has_elevator / year_built. Display code
   * branches on this.
   */
  building_id: string | null;
  source_type: SourceType;
  status: ListingStatus;
  rooms_count: number;
  size_m2: number;
  floor_number: number;
  total_floors: number | null;
  price_total_dirams: bigint;
  price_per_m2_dirams: bigint;
  finishing_type: FinishingType;
  installment_available: boolean;
  installment_first_payment_percent: number | null;
  installment_monthly_amount_dirams: bigint | null;
  installment_term_months: number | null;
  verification_tier: VerificationTier;
  cover_color: string;
  /** Public Storage URL of the listing's cover photo, or null when
   *  none has been uploaded yet (we then fall back to cover_color). */
  cover_photo_url: string | null;
  /** All photo URLs in display order, cover first. Drives the in-card
   *  carousel so buyers can swipe through photos without clicking into
   *  the detail page. Empty array when the listing has no uploaded
   *  photos (cards then render the colored placeholder). */
  photo_urls: string[];
  unit_description: Bilingual;
  view_count: number;
  published_at: string;
  bathroom_count: number | null;
  balcony: boolean | null;
  ceiling_height_cm: number | null;
  /**
   * Russian RE convention: true = раздельный (toilet separate from
   * bath), false = совмещённый (combined). Null = not specified
   * (legacy listings + sellers who skip the field).
   */
  bathroom_separate: boolean | null;
  /**
   * Whether the apartment has a registered technical passport
   * (cadastre document). True = есть, false = нет, null = не указано.
   * Buyers commonly open a contact thread with "есть техпаспорт?" so
   * pre-disclosing this on the card is a real friction-saver.
   */
  has_technical_passport: boolean | null;
  /**
   * ─── Standalone-listing fields (populated only when
   *     building_id is null) ────────────────────────────────
   *
   * For listings inside a ЖК these come from the parent building
   * via mapper helpers; the columns on the listing itself stay
   * null. `getEffectiveDistrict()` / `getEffectiveCoords()` /
   * `getEffectiveAddress()` should be the only readers.
   */
  street_address: string | null;
  district_id: string | null;
  latitude: number | null;
  longitude: number | null;
  has_elevator: boolean | null;
  year_built: number | null;
  /** Free-text orientation. Sellers fill with anything short like
   *  "во двор", "на дорогу", "на юг" — not constrained to compass
   *  directions. Surfaces as a pill in §4 Об этой квартире when set. */
  orientation: string | null;
  /** Bilingual free-text describing what windows look out on
   *  ("окна на парк, тихая сторона"). Surfaces as a quiet line in
   *  §4 when filled. */
  view_notes: Bilingual | null;
  /** FK to the photo (in `photos` table) that represents the
   *  apartment's layout diagram. Drives the §5 Планировка section
   *  on the detail page when set. */
  floor_plan_photo_id: string | null;
  /** ISO timestamp of last edit — see MockBuilding.updated_at. */
  updated_at?: string | null;
};

// Helpers
const TJS = (n: number) => BigInt(n * 100); // n TJS → dirams

// ─── Districts (Vahdat only — single-city V1 launch) ─────────
// Five microdistricts of Vahdat town. IDs use d-* prefix for the
// mock layer (separate from Supabase UUIDs in the real seed).
export const mockDistricts: MockDistrict[] = [
  { id: 'd-vahdat-center', city: 'vahdat', name: { ru: 'Центр', tg: 'Марказ' }, slug: 'vahdat-center' },
  { id: 'd-gulistan', city: 'vahdat', name: { ru: 'Гулистон', tg: 'Гулистон' }, slug: 'gulistan' },
  { id: 'd-sharora', city: 'vahdat', name: { ru: 'Шарора', tg: 'Шарора' }, slug: 'sharora' },
  { id: 'd-istiqlol', city: 'vahdat', name: { ru: 'Истиқлол', tg: 'Истиқлол' }, slug: 'istiqlol' },
  { id: 'd-sarbozor', city: 'vahdat', name: { ru: 'Сарбозор', tg: 'Сарбозор' }, slug: 'sarbozor' },
];

// ─── Developers (Vahdat-themed names) ─────────────────────────
export const mockDevelopers: MockDeveloper[] = [
  {
    id: 'dev-1',
    name: 'Sitora Development',
    display_name: { ru: 'Ситора Девелопмент', tg: 'Ситора Девелопмент' },
    is_verified: true,
    verified_at: '2026-01-12T10:00:00Z',
    has_female_agent: true,
    years_active: 6,
    projects_completed_count: 4,
    projects_announced_count: null,
    projects_under_construction_count: null,
    projects_near_completion_count: null,
    description: null,
    portfolio_notes: null,
  },
  {
    id: 'dev-2',
    name: 'Kofarnihon Development',
    display_name: { ru: 'Кофарнихон Девелопмент', tg: 'Кофарнихон Девелопмент' },
    is_verified: true,
    verified_at: '2025-09-03T10:00:00Z',
    has_female_agent: false,
    years_active: 9,
    projects_completed_count: 6,
    projects_announced_count: null,
    projects_under_construction_count: null,
    projects_near_completion_count: null,
    description: null,
    portfolio_notes: null,
  },
  {
    id: 'dev-3',
    name: 'Vahdat City',
    display_name: { ru: 'Ваҳдат Сити', tg: 'Ваҳдат Сити' },
    is_verified: false,
    verified_at: null,
    has_female_agent: false,
    years_active: 3,
    projects_completed_count: 1,
    projects_announced_count: null,
    projects_under_construction_count: null,
    projects_near_completion_count: null,
    description: null,
    portfolio_notes: null,
  },
];

// ─── Buildings (6 Vahdat new-builds) ──────────────────────────
// Coordinates clustered around Vahdat town center (38.5511°N, 69.0214°E).
// Pricing tuned for Vahdat: roughly 3,500–5,500 TJS/m². Floor counts
// kept lower than typical Dushanbe builds — Vahdat doesn't have high-rises.
export const mockBuildings: MockBuilding[] = [
  {
    id: 'b-vahdat-park',
    slug: 'vahdat-park',
    developer_id: 'dev-1',
    district_id: 'd-vahdat-center',
    city: 'vahdat',
    name: { ru: 'ЖК Vahdat Park', tg: 'ЖК Vahdat Park' },
    address: { ru: 'ул. Айни, 14', tg: 'кӯчаи Айнӣ, 14' },
    latitude: 38.5511,
    longitude: 69.0214,
    status: 'under_construction',
    handover_estimated_quarter: '2026-Q4',
    total_units: 96,
    total_floors: 10,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    cover_color: 'oklch(0.704 0.14 40)',
    price_from_dirams: TJS(168_000),
    price_per_m2_from_dirams: TJS(4_100),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Современный жилой комплекс в центре Вахдата. Закрытая территория, подземный паркинг, детская площадка.',
      tg: 'Маҷмааи зисти муосир дар маркази Ваҳдат.',
    },
  },
  {
    id: 'b-gulistan-residence',
    slug: 'gulistan-residence',
    developer_id: 'dev-2',
    district_id: 'd-gulistan',
    city: 'vahdat',
    name: { ru: 'ЖК Гулистон Резиденс', tg: 'ЖК Гулистон Резиденс' },
    address: { ru: 'мкр. Гулистон, 7', tg: 'микроноҳияи Гулистон, 7' },
    latitude: 38.5489,
    longitude: 69.0250,
    status: 'near_completion',
    handover_estimated_quarter: '2026-Q2',
    total_units: 64,
    total_floors: 8,
    amenities: ['parking', 'security', 'elevator'],
    cover_color: 'oklch(0.554 0.135 240)',
    price_from_dirams: TJS(333_000),
    price_per_m2_from_dirams: TJS(4_900),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Камерный жилой комплекс рядом со школой и поликлиникой.',
      tg: 'Маҷмааи камерӣ дар назди мактаб ва поликлиника.',
    },
  },
  {
    id: 'b-sharora-tower',
    slug: 'sharora-tower',
    developer_id: 'dev-3',
    district_id: 'd-sharora',
    city: 'vahdat',
    name: { ru: 'ЖК Шарора Тауэр', tg: 'ЖК Шарора Тауэр' },
    address: { ru: 'ул. Сомони, 22', tg: 'кӯчаи Сомонӣ, 22' },
    latitude: 38.5550,
    longitude: 69.0180,
    status: 'announced',
    handover_estimated_quarter: '2027-Q3',
    total_units: 72,
    total_floors: 9,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    cover_color: 'oklch(0.525 0.145 145)',
    price_from_dirams: TJS(218_000),
    price_per_m2_from_dirams: TJS(3_900),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Новый проект в микрорайоне Шарора. Видовые квартиры на верхних этажах.',
      tg: 'Лоиҳаи нав дар микроноҳияи Шарора.',
    },
  },
  {
    id: 'b-istiqlol-evolution',
    slug: 'istiqlol-evolution',
    developer_id: 'dev-2',
    district_id: 'd-istiqlol',
    city: 'vahdat',
    name: { ru: 'ЖК Истиқлол Эволюшн', tg: 'ЖК Истиқлол Эволюшн' },
    address: { ru: 'ул. Истиқлол, 8', tg: 'кӯчаи Истиқлол, 8' },
    latitude: 38.5475,
    longitude: 69.0290,
    status: 'delivered',
    handover_estimated_quarter: null,
    total_units: 80,
    total_floors: 9,
    amenities: ['parking', 'elevator', 'commercial-floor'],
    cover_color: 'oklch(0.595 0.14 85)',
    price_from_dirams: TJS(211_000),
    price_per_m2_from_dirams: TJS(3_900),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Сданный дом с готовой инфраструктурой. Магазины и кафе на первом этаже.',
      tg: 'Бинои супоридашуда бо инфрасохтори тайёр.',
    },
  },
  {
    id: 'b-kofarnihon-city',
    slug: 'kofarnihon-city',
    developer_id: 'dev-2',
    district_id: 'd-sarbozor',
    city: 'vahdat',
    name: { ru: 'ЖК Кофарнихон Сити', tg: 'ЖК Кофарнихон Сити' },
    address: { ru: 'ул. Бухоро, 31', tg: 'кӯчаи Бухоро, 31' },
    latitude: 38.5520,
    longitude: 69.0200,
    status: 'under_construction',
    handover_estimated_quarter: '2027-Q1',
    total_units: 120,
    total_floors: 10,
    amenities: ['parking', 'playground', 'security', 'elevator', 'commercial-floor'],
    cover_color: 'oklch(0.495 0.13 40)',
    price_from_dirams: TJS(270_000),
    price_per_m2_from_dirams: TJS(4_200),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Жилой квартал на берегу реки Кофарнихон. Прогулочная зона и детский сад.',
      tg: 'Микроноҳияи зисти дар соҳили дарёи Кофарнихон.',
    },
  },
  {
    id: 'b-orzu-residence',
    slug: 'orzu-residence',
    developer_id: 'dev-1',
    district_id: 'd-gulistan',
    city: 'vahdat',
    name: { ru: 'ЖК Орзу', tg: 'ЖК Орзу' },
    address: { ru: 'мкр. Гулистон, 18', tg: 'микроноҳияи Гулистон, 18' },
    latitude: 38.5495,
    longitude: 69.0235,
    status: 'announced',
    handover_estimated_quarter: '2027-Q4',
    total_units: 84,
    total_floors: 7,
    amenities: ['parking', 'playground', 'elevator'],
    cover_color: 'oklch(0.808 0.1 40)',
    price_from_dirams: TJS(142_000),
    price_per_m2_from_dirams: TJS(3_600),
    cover_photo_url: null,
    photo_urls: [],
    description: {
      ru: 'Доступное жильё для молодых семей. Рассрочка от застройщика.',
      tg: 'Манзили дастрас барои оилаҳои ҷавон.',
    },
  },
];

// ─── Listings (5-15 across the buildings) ─────────────────────
function mkListing(seed: {
  id: string;
  building_id: string;
  source: SourceType;
  rooms: number;
  size: number;
  floor: number;
  totalFloors: number;
  priceTjs: number;
  finishing: FinishingType;
  tier: VerificationTier;
  cover: string;
  installmentMonthly?: number;
  desc?: string;
  bathrooms?: number;
  balcony?: boolean;
  ceiling?: number;
}): MockListing {
  const price = TJS(seed.priceTjs);
  const perM2 = BigInt(Math.round(Number(price) / seed.size));
  return {
    id: seed.id,
    slug: `${seed.building_id}-${seed.id}`,
    building_id: seed.building_id,
    source_type: seed.source,
    status: 'active',
    rooms_count: seed.rooms,
    size_m2: seed.size,
    floor_number: seed.floor,
    total_floors: seed.totalFloors,
    price_total_dirams: price,
    price_per_m2_dirams: perM2,
    finishing_type: seed.finishing,
    installment_available: seed.installmentMonthly != null,
    installment_first_payment_percent: seed.installmentMonthly != null ? 30 : null,
    installment_monthly_amount_dirams: seed.installmentMonthly != null ? TJS(seed.installmentMonthly) : null,
    installment_term_months: seed.installmentMonthly != null ? 84 : null,
    verification_tier: seed.tier,
    cover_color: seed.cover,
    cover_photo_url: null,
    photo_urls: [],
    unit_description: {
      ru: seed.desc ?? 'Просторная квартира с хорошей планировкой и видом во двор.',
      tg: 'Хонаи васеъ бо нақшаи хуб.',
    },
    view_count: Math.floor(Math.random() * 400) + 30,
    published_at: '2026-04-12T10:00:00Z',
    bathroom_count: seed.bathrooms ?? null,
    balcony: seed.balcony ?? null,
    ceiling_height_cm: seed.ceiling ?? null,
    bathroom_separate: null,
    has_technical_passport: null,
    street_address: null,
    district_id: null,
    latitude: null,
    longitude: null,
    has_elevator: null,
    year_built: null,
    orientation: null,
    view_notes: null,
    floor_plan_photo_id: null,
  };
}

export const mockListings: MockListing[] = [
  // Vahdat Park (8 units) — under construction, центр
  mkListing({ id: 'vp-2k-a', building_id: 'b-vahdat-park', source: 'developer', rooms: 2, size: 62, floor: 4, totalFloors: 10, priceTjs: 285_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.704 0.14 40)', installmentMonthly: 3_400, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-3k-b', building_id: 'b-vahdat-park', source: 'developer', rooms: 3, size: 82, floor: 7, totalFloors: 10, priceTjs: 393_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 4_700, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-1k-c', building_id: 'b-vahdat-park', source: 'developer', rooms: 1, size: 41, floor: 9, totalFloors: 10, priceTjs: 168_000, finishing: 'no_finish', tier: 'phone_verified', cover: 'oklch(0.808 0.1 40)', bathrooms: 1, balcony: false, ceiling: 280 }),
  mkListing({ id: 'vp-2k-d', building_id: 'b-vahdat-park', source: 'developer', rooms: 2, size: 60, floor: 6, totalFloors: 10, priceTjs: 268_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.704 0.14 40)', installmentMonthly: 3_200, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-3k-e', building_id: 'b-vahdat-park', source: 'developer', rooms: 3, size: 88, floor: 5, totalFloors: 10, priceTjs: 414_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 4_900, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-1k-f', building_id: 'b-vahdat-park', source: 'developer', rooms: 1, size: 43, floor: 8, totalFloors: 10, priceTjs: 175_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.808 0.1 40)', installmentMonthly: 2_100, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-2k-g', building_id: 'b-vahdat-park', source: 'developer', rooms: 2, size: 65, floor: 3, totalFloors: 10, priceTjs: 295_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.704 0.14 40)', bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'vp-3k-h', building_id: 'b-vahdat-park', source: 'developer', rooms: 3, size: 84, floor: 9, totalFloors: 10, priceTjs: 405_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 4_800, bathrooms: 2, balcony: true, ceiling: 280 }),
  // Гулистон Резиденс (5 units) — near completion, finished interiors
  mkListing({ id: 'gr-3k-a', building_id: 'b-gulistan-residence', source: 'developer', rooms: 3, size: 88, floor: 5, totalFloors: 8, priceTjs: 484_000, finishing: 'full_finish', tier: 'phone_verified', cover: 'oklch(0.554 0.135 240)', bathrooms: 2, balcony: true, ceiling: 290 }),
  mkListing({ id: 'gr-2k-b', building_id: 'b-gulistan-residence', source: 'intermediary', rooms: 2, size: 68, floor: 3, totalFloors: 8, priceTjs: 333_000, finishing: 'full_finish', tier: 'listing_verified', cover: 'oklch(0.554 0.135 240)', desc: 'Светлая двухкомнатная с видом на горы.', bathrooms: 1, balcony: true, ceiling: 290 }),
  mkListing({ id: 'gr-2k-c', building_id: 'b-gulistan-residence', source: 'developer', rooms: 2, size: 70, floor: 6, totalFloors: 8, priceTjs: 350_000, finishing: 'full_finish', tier: 'phone_verified', cover: 'oklch(0.554 0.135 240)', bathrooms: 1, balcony: true, ceiling: 290 }),
  mkListing({ id: 'gr-3k-d', building_id: 'b-gulistan-residence', source: 'developer', rooms: 3, size: 95, floor: 7, totalFloors: 8, priceTjs: 522_000, finishing: 'full_finish', tier: 'phone_verified', cover: 'oklch(0.554 0.135 240)', bathrooms: 2, balcony: true, ceiling: 290 }),
  mkListing({ id: 'gr-1k-e', building_id: 'b-gulistan-residence', source: 'developer', rooms: 1, size: 45, floor: 4, totalFloors: 8, priceTjs: 225_000, finishing: 'full_finish', tier: 'phone_verified', cover: 'oklch(0.554 0.135 240)', bathrooms: 1, balcony: true, ceiling: 290 }),
  // Шарора Тауэр (announced) — early-bird
  mkListing({ id: 'st-2k-a', building_id: 'b-sharora-tower', source: 'developer', rooms: 2, size: 56, floor: 3, totalFloors: 9, priceTjs: 218_000, finishing: 'no_finish', tier: 'phone_verified', cover: 'oklch(0.525 0.145 145)', installmentMonthly: 2_600, bathrooms: 1, balcony: true, ceiling: 270 }),
  // Истиқлол Эволюшн (delivered) — owner + intermediary
  mkListing({ id: 'ie-2k-a', building_id: 'b-istiqlol-evolution', source: 'owner', rooms: 2, size: 54, floor: 4, totalFloors: 9, priceTjs: 211_000, finishing: 'owner_renovated', tier: 'profile_verified', cover: 'oklch(0.595 0.14 85)', desc: 'Жилое состояние, ремонт сделан в 2024 году. Кухня и техника остаются.', bathrooms: 1, balcony: false, ceiling: 260 }),
  mkListing({ id: 'ie-3k-b', building_id: 'b-istiqlol-evolution', source: 'intermediary', rooms: 3, size: 76, floor: 6, totalFloors: 9, priceTjs: 312_000, finishing: 'full_finish', tier: 'phone_verified', cover: 'oklch(0.595 0.14 85)', bathrooms: 2, balcony: true, ceiling: 260 }),
  // Кофарнихон Сити (6 units) — under construction
  mkListing({ id: 'kc-2k-a', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 2, size: 64, floor: 5, totalFloors: 10, priceTjs: 270_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 3_200, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'kc-3k-b', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 3, size: 86, floor: 8, totalFloors: 10, priceTjs: 380_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 4_500, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ id: 'kc-1k-c', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 1, size: 39, floor: 3, totalFloors: 10, priceTjs: 158_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.808 0.1 40)', bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'kc-2k-d', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 2, size: 60, floor: 6, totalFloors: 10, priceTjs: 252_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 3_000, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ id: 'kc-3k-e', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 3, size: 90, floor: 9, totalFloors: 10, priceTjs: 405_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', installmentMonthly: 4_800, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ id: 'kc-2k-f', building_id: 'b-kofarnihon-city', source: 'developer', rooms: 2, size: 67, floor: 7, totalFloors: 10, priceTjs: 281_000, finishing: 'pre_finish', tier: 'phone_verified', cover: 'oklch(0.495 0.13 40)', bathrooms: 1, balcony: true, ceiling: 280 }),
  // Орзу (announced, affordable)
  mkListing({ id: 'or-1k-a', building_id: 'b-orzu-residence', source: 'developer', rooms: 1, size: 38, floor: 2, totalFloors: 7, priceTjs: 142_000, finishing: 'no_finish', tier: 'phone_verified', cover: 'oklch(0.808 0.1 40)', installmentMonthly: 1_700, bathrooms: 1, balcony: true, ceiling: 270 }),
  mkListing({ id: 'or-2k-b', building_id: 'b-orzu-residence', source: 'developer', rooms: 2, size: 55, floor: 4, totalFloors: 7, priceTjs: 198_000, finishing: 'no_finish', tier: 'phone_verified', cover: 'oklch(0.808 0.1 40)', installmentMonthly: 2_400, bathrooms: 1, balcony: true, ceiling: 270 }),
];

// ─── Lookup helpers ───────────────────────────────────────────
export function getDeveloper(id: string) {
  return mockDevelopers.find((d) => d.id === id) ?? null;
}
export function getDistrict(id: string) {
  return mockDistricts.find((d) => d.id === id) ?? null;
}
export function getBuildingBySlug(slug: string) {
  return mockBuildings.find((b) => b.slug === slug) ?? null;
}
export function getListingBySlug(slug: string) {
  return mockListings.find((l) => l.slug === slug) ?? null;
}
export function getListingsForBuilding(buildingId: string) {
  return mockListings.filter((l) => l.building_id === buildingId);
}

/** Mock district median used by FairnessIndicator. */
export function getDistrictMedianPerM2(districtId: string): {
  median: number;
  sample: number;
} | null {
  // Vahdat market benchmarks (per Data Model §5.14, sample_size >= 5).
  // Numbers tuned for Vahdat: roughly 3,800-4,700 TJS/m² depending on
  // microdistrict, with Центр the most expensive.
  const benchmarks: Record<string, { median: number; sample: number }> = {
    'd-vahdat-center': { median: 4_700 * 100, sample: 12 },
    'd-gulistan': { median: 4_100 * 100, sample: 8 },
    'd-sharora': { median: 3_900 * 100, sample: 5 },
    'd-istiqlol': { median: 4_200 * 100, sample: 9 },
    'd-sarbozor': { median: 3_800 * 100, sample: 5 },
  };
  return benchmarks[districtId] ?? null;
}
