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
  projects_completed_count: number | null;
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
  cover_color: string; // for placeholder rendering
  price_from_dirams: bigint | null;
  price_per_m2_from_dirams: bigint | null;
  description: Bilingual;
};

export type MockListing = {
  id: string;
  slug: string;
  building_id: string;
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
  unit_description: Bilingual;
  view_count: number;
  published_at: string;
  bathroom_count: number | null;
  balcony: boolean | null;
  ceiling_height_cm: number | null;
};

// Helpers
const TJS = (n: number) => BigInt(n * 100); // n TJS → dirams

// ─── Districts (Dushanbe only for V1 mock) ────────────────────
export const mockDistricts: MockDistrict[] = [
  { id: 'd-sino', city: 'dushanbe', name: { ru: 'Сино', tg: 'Сино' }, slug: 'sino' },
  {
    id: 'd-ismoili-somoni',
    city: 'dushanbe',
    name: { ru: 'Исмоили Сомони', tg: 'Исмоили Сомонӣ' },
    slug: 'ismoili-somoni',
  },
  { id: 'd-firdavsi', city: 'dushanbe', name: { ru: 'Фирдавси', tg: 'Фирдавсӣ' }, slug: 'firdavsi' },
  { id: 'd-shohmansur', city: 'dushanbe', name: { ru: 'Шохмансур', tg: 'Шоҳмансур' }, slug: 'shohmansur' },
  { id: 'd-vahdat', city: 'vahdat', name: { ru: 'Вахдат', tg: 'Ваҳдат' }, slug: 'vahdat' },
];

// ─── Developers ───────────────────────────────────────────────
export const mockDevelopers: MockDeveloper[] = [
  {
    id: 'dev-1',
    name: 'Sitora Development',
    display_name: { ru: 'Ситора Девелопмент', tg: 'Ситора Девелопмент' },
    is_verified: true,
    verified_at: '2026-01-12T10:00:00Z',
    has_female_agent: true,
    years_active: 8,
    projects_completed_count: 12,
  },
  {
    id: 'dev-2',
    name: 'Dushanbe Plaza Group',
    display_name: { ru: 'Душанбе Плаза Групп', tg: 'Душанбе Плаза Групп' },
    is_verified: true,
    verified_at: '2025-09-03T10:00:00Z',
    has_female_agent: false,
    years_active: 14,
    projects_completed_count: 23,
  },
  {
    id: 'dev-3',
    name: 'Pomir Construction',
    display_name: { ru: 'Помир Констракшн', tg: 'Помир Констракшн' },
    is_verified: false,
    verified_at: null,
    has_female_agent: false,
    years_active: 3,
    projects_completed_count: 2,
  },
];

// ─── Buildings ────────────────────────────────────────────────
export const mockBuildings: MockBuilding[] = [
  {
    id: 'b-sitora-hills',
    slug: 'sitora-hills',
    developer_id: 'dev-1',
    district_id: 'd-sino',
    city: 'dushanbe',
    name: { ru: 'ЖК Sitora Hills', tg: 'ЖК Sitora Hills' },
    address: { ru: 'ул. Айни, 84', tg: 'кӯчаи Айнӣ, 84' },
    latitude: 38.5598,
    longitude: 68.787,
    status: 'under_construction',
    handover_estimated_quarter: '2026-Q4',
    total_units: 218,
    total_floors: 16,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    cover_color: 'oklch(0.704 0.14 40)',
    price_from_dirams: TJS(620_000),
    price_per_m2_from_dirams: TJS(11_500),
    description: {
      ru: 'Современный жилой комплекс рядом с парком Рудаки. 4 секции, закрытая территория, подземный паркинг.',
      tg: 'Маҷмааи зисти муосир дар назди боғи Рӯдакӣ. 4 қисм, ҳудуди пӯшида, паркинги зеризаминӣ.',
    },
  },
  {
    id: 'b-rudaki-residence',
    slug: 'rudaki-residence',
    developer_id: 'dev-2',
    district_id: 'd-ismoili-somoni',
    city: 'dushanbe',
    name: { ru: 'ЖК Rudaki Residence', tg: 'ЖК Rudaki Residence' },
    address: { ru: 'пр. Рудаки, 137', tg: 'хиёбони Рӯдакӣ, 137' },
    latitude: 38.5755,
    longitude: 68.7831,
    status: 'near_completion',
    handover_estimated_quarter: '2026-Q2',
    total_units: 144,
    total_floors: 12,
    amenities: ['parking', 'gym', 'security', 'elevator', 'commercial-floor'],
    cover_color: 'oklch(0.554 0.135 240)',
    price_from_dirams: TJS(890_000),
    price_per_m2_from_dirams: TJS(14_200),
    description: {
      ru: 'Премиальный комплекс на проспекте Рудаки с видом на горы. Лобби, фитнес, коммерческий первый этаж.',
      tg: 'Маҷмааи премиалӣ дар хиёбони Рӯдакӣ бо манзараи кӯҳҳо.',
    },
  },
  {
    id: 'b-bahor-park',
    slug: 'bahor-park',
    developer_id: 'dev-1',
    district_id: 'd-firdavsi',
    city: 'dushanbe',
    name: { ru: 'ЖК Bahor Park', tg: 'ЖК Bahor Park' },
    address: { ru: 'ул. Шевченко, 19', tg: 'кӯчаи Шевченко, 19' },
    latitude: 38.5402,
    longitude: 68.7631,
    status: 'announced',
    handover_estimated_quarter: '2027-Q3',
    total_units: 96,
    total_floors: 9,
    amenities: ['parking', 'playground', 'security'],
    cover_color: 'oklch(0.525 0.145 145)',
    price_from_dirams: TJS(540_000),
    price_per_m2_from_dirams: TJS(9_800),
    description: {
      ru: 'Камерный 9-этажный дом во Фирдавси. Хорошая транспортная доступность.',
      tg: 'Бинои 9-ошёна дар Фирдавсӣ. Дастрасии нақлиётӣ хуб.',
    },
  },
  {
    id: 'b-vahdat-tower',
    slug: 'vahdat-tower',
    developer_id: 'dev-3',
    district_id: 'd-vahdat',
    city: 'vahdat',
    name: { ru: 'ЖК Vahdat Tower', tg: 'ЖК Ваҳдат Тауэр' },
    address: { ru: 'ул. Гагарина, 4', tg: 'кӯчаи Гагарин, 4' },
    latitude: 38.555,
    longitude: 69.039,
    status: 'delivered',
    handover_estimated_quarter: null,
    total_units: 72,
    total_floors: 9,
    amenities: ['parking', 'elevator'],
    cover_color: 'oklch(0.595 0.14 85)',
    price_from_dirams: TJS(380_000),
    price_per_m2_from_dirams: TJS(7_400),
    description: {
      ru: 'Сданный дом в центре Вахдата. Доступные цены, готовые квартиры.',
      tg: 'Бинои супоридашуда дар маркази Ваҳдат.',
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
    unit_description: {
      ru: seed.desc ?? 'Просторная квартира с хорошей планировкой и видом во двор.',
      tg: 'Хонаи васеъ бо нақшаи хуб.',
    },
    view_count: Math.floor(Math.random() * 400) + 30,
    published_at: '2026-04-12T10:00:00Z',
    bathroom_count: seed.bathrooms ?? null,
    balcony: seed.balcony ?? null,
    ceiling_height_cm: seed.ceiling ?? null,
  };
}

export const mockListings: MockListing[] = [
  // Sitora Hills (developer-source)
  mkListing({
    id: 'sh-2k-a',
    building_id: 'b-sitora-hills',
    source: 'developer',
    rooms: 2,
    size: 64.5,
    floor: 5,
    totalFloors: 16,
    priceTjs: 742_000,
    finishing: 'pre_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.704 0.14 40)',
    installmentMonthly: 8_750,
    bathrooms: 1,
    balcony: true,
    ceiling: 280,
  }),
  mkListing({
    id: 'sh-3k-b',
    building_id: 'b-sitora-hills',
    source: 'developer',
    rooms: 3,
    size: 84.2,
    floor: 8,
    totalFloors: 16,
    priceTjs: 968_000,
    finishing: 'pre_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.495 0.13 40)',
    installmentMonthly: 11_400,
    bathrooms: 2,
    balcony: true,
    ceiling: 280,
  }),
  mkListing({
    id: 'sh-1k-c',
    building_id: 'b-sitora-hills',
    source: 'developer',
    rooms: 1,
    size: 42.0,
    floor: 12,
    totalFloors: 16,
    priceTjs: 483_000,
    finishing: 'no_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.808 0.1 40)',
    bathrooms: 1,
    balcony: false,
    ceiling: 280,
  }),
  // Rudaki Residence (mix of developer + intermediary)
  mkListing({
    id: 'rr-3k-a',
    building_id: 'b-rudaki-residence',
    source: 'developer',
    rooms: 3,
    size: 92.0,
    floor: 7,
    totalFloors: 12,
    priceTjs: 1_306_000,
    finishing: 'full_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.554 0.135 240)',
    bathrooms: 2,
    balcony: true,
    ceiling: 290,
  }),
  mkListing({
    id: 'rr-2k-b',
    building_id: 'b-rudaki-residence',
    source: 'intermediary',
    rooms: 2,
    size: 71.0,
    floor: 4,
    totalFloors: 12,
    priceTjs: 985_000,
    finishing: 'full_finish',
    tier: 'listing_verified',
    cover: 'oklch(0.554 0.135 240)',
    desc: 'Светлая двухкомнатная с панорамными окнами. Закрытая территория, охрана.',
    bathrooms: 1,
    balcony: true,
    ceiling: 290,
  }),
  // Bahor Park (developer)
  mkListing({
    id: 'bp-2k-a',
    building_id: 'b-bahor-park',
    source: 'developer',
    rooms: 2,
    size: 58.0,
    floor: 3,
    totalFloors: 9,
    priceTjs: 567_000,
    finishing: 'no_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.525 0.145 145)',
    installmentMonthly: 6_700,
    bathrooms: 1,
    balcony: true,
    ceiling: 270,
  }),
  // Vahdat Tower (resale via owner)
  mkListing({
    id: 'vt-2k-a',
    building_id: 'b-vahdat-tower',
    source: 'owner',
    rooms: 2,
    size: 53.0,
    floor: 4,
    totalFloors: 9,
    priceTjs: 392_000,
    finishing: 'owner_renovated',
    tier: 'profile_verified',
    cover: 'oklch(0.595 0.14 85)',
    desc: 'Жилое состояние, сделан полный ремонт в 2024 году. Кухня и встроенная техника остаются.',
    bathrooms: 1,
    balcony: false,
    ceiling: 260,
  }),
  mkListing({
    id: 'vt-3k-b',
    building_id: 'b-vahdat-tower',
    source: 'intermediary',
    rooms: 3,
    size: 78.0,
    floor: 7,
    totalFloors: 9,
    priceTjs: 577_000,
    finishing: 'full_finish',
    tier: 'phone_verified',
    cover: 'oklch(0.595 0.14 85)',
    bathrooms: 2,
    balcony: true,
    ceiling: 260,
  }),
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
  // Hand-picked benchmarks per Data Model §5.14 (sample_size >= 5 to display).
  const benchmarks: Record<string, { median: number; sample: number }> = {
    'd-sino': { median: 11_800 * 100, sample: 18 },
    'd-ismoili-somoni': { median: 14_500 * 100, sample: 14 },
    'd-firdavsi': { median: 9_400 * 100, sample: 9 },
    'd-shohmansur': { median: 10_200 * 100, sample: 6 },
    'd-vahdat': { median: 7_200 * 100, sample: 5 },
  };
  return benchmarks[districtId] ?? null;
}
