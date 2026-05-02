/**
 * Verifies the schema is in place, then seeds districts, developers,
 * buildings, and listings using the service_role key (bypasses RLS).
 *
 * Idempotent — uses upsert with stable IDs so it can be re-run safely.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// ─── Verify ──────────────────────────────────────────────────
console.log('Verifying schema...');
const tables = [
  'users', 'user_roles', 'developers', 'buildings', 'listings',
  'photos', 'saved_items', 'contact_requests', 'change_events',
  'verification_submissions', 'verification_visits', 'verification_slots',
  'fraud_reports', 'districts', 'district_price_benchmarks',
  'phone_verifications', 'notifications',
];
for (const t of tables) {
  const { error } = await supabase.from(t).select('*', { head: true, count: 'exact' });
  if (error) {
    console.error(`✗ ${t}: ${error.message}`);
    process.exit(1);
  }
  process.stdout.write(`✓ ${t}  `);
}
console.log('\n\nAll 17 tables verified.\n');

// ─── Seed ────────────────────────────────────────────────────
console.log('Seeding data...');

// Districts — VAHDAT-ONLY. Five microdistricts of Vahdat town so the
// filter UI has variety without overwhelming a small market. IDs kept
// stable from the original seed (upsert overwrites in place).
const districts = [
  { id: '11111111-1111-1111-1111-111111111101', city: 'vahdat', name: { ru: 'Центр', tg: 'Марказ' }, slug: 'vahdat-center' },
  { id: '11111111-1111-1111-1111-111111111102', city: 'vahdat', name: { ru: 'Гулистон', tg: 'Гулистон' }, slug: 'gulistan' },
  { id: '11111111-1111-1111-1111-111111111103', city: 'vahdat', name: { ru: 'Шарора', tg: 'Шарора' }, slug: 'sharora' },
  { id: '11111111-1111-1111-1111-111111111104', city: 'vahdat', name: { ru: 'Истиқлол', tg: 'Истиқлол' }, slug: 'istiqlol' },
  { id: '11111111-1111-1111-1111-111111111105', city: 'vahdat', name: { ru: 'Сарбозор', tg: 'Сарбозор' }, slug: 'sarbozor' },
];
{
  const { error } = await supabase.from('districts').upsert(districts, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${districts.length} districts`);
}

// Developers — VAHDAT-FOCUSED. Names re-themed to feel local to Vahdat
// (Kofarnihon is the river running through Vahdat town). Numbers tuned
// down because Vahdat is a smaller market — fewer projects per dev.
const developers = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Sitora Development',
    display_name: { ru: 'Ситора Девелопмент', tg: 'Ситора Девелопмент' },
    primary_contact_phone: '+992900000001',
    has_female_agent: true,
    years_active: 6,
    projects_completed_count: 4,
    status: 'active',
    verified_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Kofarnihon Development',
    display_name: { ru: 'Кофарнихон Девелопмент', tg: 'Кофарнихон Девелопмент' },
    primary_contact_phone: '+992900000002',
    has_female_agent: false,
    years_active: 9,
    projects_completed_count: 6,
    status: 'active',
    verified_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Vahdat City',
    display_name: { ru: 'Ваҳдат Сити', tg: 'Ваҳдат Сити' },
    primary_contact_phone: '+992900000003',
    has_female_agent: false,
    years_active: 3,
    projects_completed_count: 1,
    status: 'pending',
  },
];
{
  const { error } = await supabase.from('developers').upsert(developers, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${developers.length} developers`);
}

// Seed seller user — the founder posting on behalf of developers and
// for own-apartment listings. Phone is the live contact number used
// for all channels (WhatsApp, Telegram, IMO, and direct calls).
const founderUser = {
  id: '33333333-3333-3333-3333-333333333301',
  phone: '+992935563306',
  name: 'Founder Account',
  preferred_language: 'ru',
  phone_verified_at: new Date().toISOString(),
};
{
  const { error } = await supabase.from('users').upsert([founderUser], { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ 1 founder user`);
}

// Buildings — six Vahdat new-builds spread across the five microdistricts.
// Coordinates clustered around Vahdat town center (38.5511°N, 69.0214°E).
// Floor counts kept lower than Dushanbe seed (Vahdat doesn't have the
// high-rises Dushanbe does; 7-12 storeys is realistic). Prices tuned
// down via the listings below; per-m² is meaningfully cheaper here.
// IDs 01–04 reuse existing UUIDs (upsert overwrites in place);
// 05 and 06 are new.
const buildings = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    slug: 'vahdat-park',
    developer_id: developers[0].id,
    district_id: districts[0].id, // Центр
    city: 'vahdat',
    name: { ru: 'ЖК Vahdat Park', tg: 'ЖК Vahdat Park' },
    address: { ru: 'ул. Айни, 14', tg: 'кӯчаи Айнӣ, 14' },
    latitude: 38.5511,
    longitude: 69.0214,
    description: { ru: 'Современный жилой комплекс в центре Вахдата. Закрытая территория, подземный паркинг, детская площадка.', tg: 'Маҷмааи зисти муосир дар маркази Ваҳдат.' },
    status: 'under_construction',
    handover_estimated_quarter: '2026-Q4',
    total_units: 96,
    total_floors: 10,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    is_published: true,
    is_featured: true,
    featured_rank: 1,
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    slug: 'gulistan-residence',
    developer_id: developers[1].id,
    district_id: districts[1].id, // Гулистон
    city: 'vahdat',
    name: { ru: 'ЖК Гулистон Резиденс', tg: 'ЖК Гулистон Резиденс' },
    address: { ru: 'мкр. Гулистон, 7', tg: 'микроноҳияи Гулистон, 7' },
    latitude: 38.5489,
    longitude: 69.0250,
    description: { ru: 'Камерный жилой комплекс рядом со школой и поликлиникой.', tg: 'Маҷмааи камерӣ дар назди мактаб ва поликлиника.' },
    status: 'near_completion',
    handover_estimated_quarter: '2026-Q2',
    total_units: 64,
    total_floors: 8,
    amenities: ['parking', 'security', 'elevator'],
    is_published: true,
    is_featured: true,
    featured_rank: 2,
  },
  {
    id: '44444444-4444-4444-4444-444444444403',
    slug: 'sharora-tower',
    developer_id: developers[2].id,
    district_id: districts[2].id, // Шарора
    city: 'vahdat',
    name: { ru: 'ЖК Шарора Тауэр', tg: 'ЖК Шарора Тауэр' },
    address: { ru: 'ул. Сомони, 22', tg: 'кӯчаи Сомонӣ, 22' },
    latitude: 38.5550,
    longitude: 69.0180,
    description: { ru: 'Новый проект в микрорайоне Шарора. Видовые квартиры на верхних этажах.', tg: 'Лоиҳаи нав дар микроноҳияи Шарора.' },
    status: 'announced',
    handover_estimated_quarter: '2027-Q3',
    total_units: 72,
    total_floors: 9,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    is_published: true,
    is_featured: true,
    featured_rank: 3,
  },
  {
    id: '44444444-4444-4444-4444-444444444404',
    slug: 'istiqlol-evolution',
    developer_id: developers[1].id,
    district_id: districts[3].id, // Истиқлол
    city: 'vahdat',
    name: { ru: 'ЖК Истиқлол Эволюшн', tg: 'ЖК Истиқлол Эволюшн' },
    address: { ru: 'ул. Истиқлол, 8', tg: 'кӯчаи Истиқлол, 8' },
    latitude: 38.5475,
    longitude: 69.0290,
    description: { ru: 'Сданный дом с готовой инфраструктурой. Магазины и кафе на первом этаже.', tg: 'Бинои супоридашуда бо инфрасохтори тайёр.' },
    status: 'delivered',
    handover_estimated_quarter: null,
    total_units: 80,
    total_floors: 9,
    amenities: ['parking', 'elevator', 'commercial-floor'],
    is_published: true,
    is_featured: false,
    featured_rank: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444405',
    slug: 'kofarnihon-city',
    developer_id: developers[1].id,
    district_id: districts[4].id, // Сарбозор
    city: 'vahdat',
    name: { ru: 'ЖК Кофарнихон Сити', tg: 'ЖК Кофарнихон Сити' },
    address: { ru: 'ул. Бухоро, 31', tg: 'кӯчаи Бухоро, 31' },
    latitude: 38.5520,
    longitude: 69.0200,
    description: { ru: 'Жилой квартал на берегу реки Кофарнихон. Прогулочная зона и детский сад.', tg: 'Микроноҳияи зисти дар соҳили дарёи Кофарнихон.' },
    status: 'under_construction',
    handover_estimated_quarter: '2027-Q1',
    total_units: 120,
    total_floors: 10,
    amenities: ['parking', 'playground', 'security', 'elevator', 'commercial-floor'],
    is_published: true,
    is_featured: false,
    featured_rank: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444406',
    slug: 'orzu-residence',
    developer_id: developers[0].id,
    district_id: districts[1].id, // Гулистон
    city: 'vahdat',
    name: { ru: 'ЖК Орзу', tg: 'ЖК Орзу' },
    address: { ru: 'мкр. Гулистон, 18', tg: 'микроноҳияи Гулистон, 18' },
    latitude: 38.5495,
    longitude: 69.0235,
    description: { ru: 'Доступное жильё для молодых семей. Рассрочка от застройщика.', tg: 'Манзили дастрас барои оилаҳои ҷавон.' },
    status: 'announced',
    handover_estimated_quarter: '2027-Q4',
    total_units: 84,
    total_floors: 7,
    amenities: ['parking', 'playground', 'elevator'],
    is_published: true,
    is_featured: false,
    featured_rank: null,
  },
];
{
  const { error } = await supabase.from('buildings').upsert(buildings, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${buildings.length} buildings`);
}

// Listings
function mkListing(seed) {
  const id = `55555555-5555-5555-5555-${seed.suffix.padStart(12, '0')}`;
  return {
    id,
    slug: `${seed.building_id.slice(-6)}-${seed.suffix}`,
    building_id: seed.building_id,
    seller_user_id: founderUser.id,
    source_type: seed.source,
    status: 'active',
    rooms_count: seed.rooms,
    size_m2: seed.size,
    floor_number: seed.floor,
    total_floors: seed.total_floors,
    price_total_dirams: seed.priceTjs * 100,
    finishing_type: seed.finishing,
    installment_available: seed.installmentMonthly != null,
    installment_first_payment_percent: seed.installmentMonthly != null ? 30 : null,
    installment_monthly_amount_dirams: seed.installmentMonthly != null ? seed.installmentMonthly * 100 : null,
    installment_term_months: seed.installmentMonthly != null ? 84 : null,
    verification_tier: seed.tier,
    bathroom_count: seed.bathrooms ?? null,
    balcony: seed.balcony ?? null,
    ceiling_height_cm: seed.ceiling ?? null,
    unit_description: { ru: seed.desc ?? 'Просторная квартира с хорошей планировкой и видом во двор.', tg: 'Хонаи васеъ.' },
    published_at: new Date().toISOString(),
  };
}
// Listings — pricing tuned for the Vahdat market: roughly 3,500–5,500
// TJS / m² depending on stage and finishing. Spread across all 6
// buildings so every project has at least one active unit. Three
// flagship buildings (Vahdat Park, Гулистон Резиденс, Кофарнихон Сити)
// are stocked with more units so the "+ ещё N квартир" overflow line
// renders on the building cards.
const listings = [
  // Vahdat Park (under construction, центр) — 8 units across mix of plans
  mkListing({ suffix: '101', building_id: buildings[0].id, source: 'developer', rooms: 2, size: 62, floor: 4, total_floors: 10, priceTjs: 285000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 3400, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '102', building_id: buildings[0].id, source: 'developer', rooms: 3, size: 82, floor: 7, total_floors: 10, priceTjs: 393000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 4700, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '103', building_id: buildings[0].id, source: 'developer', rooms: 1, size: 41, floor: 9, total_floors: 10, priceTjs: 168000, finishing: 'no_finish', tier: 'phone_verified', bathrooms: 1, balcony: false, ceiling: 280 }),
  mkListing({ suffix: '104', building_id: buildings[0].id, source: 'developer', rooms: 2, size: 60, floor: 6, total_floors: 10, priceTjs: 268000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 3200, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '105', building_id: buildings[0].id, source: 'developer', rooms: 3, size: 88, floor: 5, total_floors: 10, priceTjs: 414000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 4900, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '106', building_id: buildings[0].id, source: 'developer', rooms: 1, size: 43, floor: 8, total_floors: 10, priceTjs: 175000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 2100, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '107', building_id: buildings[0].id, source: 'developer', rooms: 2, size: 65, floor: 3, total_floors: 10, priceTjs: 295000, finishing: 'pre_finish', tier: 'phone_verified', bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '108', building_id: buildings[0].id, source: 'developer', rooms: 3, size: 84, floor: 9, total_floors: 10, priceTjs: 405000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 4800, bathrooms: 2, balcony: true, ceiling: 280 }),
  // Гулистон Резиденс (near completion) — 5 units, finished interiors
  mkListing({ suffix: '201', building_id: buildings[1].id, source: 'developer', rooms: 3, size: 88, floor: 5, total_floors: 8, priceTjs: 484000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 2, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '202', building_id: buildings[1].id, source: 'intermediary', rooms: 2, size: 68, floor: 3, total_floors: 8, priceTjs: 333000, finishing: 'full_finish', tier: 'listing_verified', desc: 'Светлая двухкомнатная с видом на горы.', bathrooms: 1, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '203', building_id: buildings[1].id, source: 'developer', rooms: 2, size: 70, floor: 6, total_floors: 8, priceTjs: 350000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 1, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '204', building_id: buildings[1].id, source: 'developer', rooms: 3, size: 95, floor: 7, total_floors: 8, priceTjs: 522000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 2, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '205', building_id: buildings[1].id, source: 'developer', rooms: 1, size: 45, floor: 4, total_floors: 8, priceTjs: 225000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 1, balcony: true, ceiling: 290 }),
  // Шарора Тауэр (announced, Шарора) — early-bird pricing on 1 unit
  mkListing({ suffix: '301', building_id: buildings[2].id, source: 'developer', rooms: 2, size: 56, floor: 3, total_floors: 9, priceTjs: 218000, finishing: 'no_finish', tier: 'phone_verified', installmentMonthly: 2600, bathrooms: 1, balcony: true, ceiling: 270 }),
  // Истиқлол Эволюшн (delivered) — owner resale + intermediary
  mkListing({ suffix: '401', building_id: buildings[3].id, source: 'owner', rooms: 2, size: 54, floor: 4, total_floors: 9, priceTjs: 211000, finishing: 'owner_renovated', tier: 'profile_verified', desc: 'Жилое состояние, ремонт сделан в 2024 году. Кухня и техника остаются.', bathrooms: 1, balcony: false, ceiling: 260 }),
  mkListing({ suffix: '402', building_id: buildings[3].id, source: 'intermediary', rooms: 3, size: 76, floor: 6, total_floors: 9, priceTjs: 312000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 2, balcony: true, ceiling: 260 }),
  // Кофарнихон Сити (under construction, Сарбозор) — 6 units
  mkListing({ suffix: '501', building_id: buildings[4].id, source: 'developer', rooms: 2, size: 64, floor: 5, total_floors: 10, priceTjs: 270000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 3200, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '502', building_id: buildings[4].id, source: 'developer', rooms: 3, size: 86, floor: 8, total_floors: 10, priceTjs: 380000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 4500, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '503', building_id: buildings[4].id, source: 'developer', rooms: 1, size: 39, floor: 3, total_floors: 10, priceTjs: 158000, finishing: 'pre_finish', tier: 'phone_verified', bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '504', building_id: buildings[4].id, source: 'developer', rooms: 2, size: 60, floor: 6, total_floors: 10, priceTjs: 252000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 3000, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '505', building_id: buildings[4].id, source: 'developer', rooms: 3, size: 90, floor: 9, total_floors: 10, priceTjs: 405000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 4800, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '506', building_id: buildings[4].id, source: 'developer', rooms: 2, size: 67, floor: 7, total_floors: 10, priceTjs: 281000, finishing: 'pre_finish', tier: 'phone_verified', bathrooms: 1, balcony: true, ceiling: 280 }),
  // Орзу (announced, Гулистон) — affordable young-family positioning
  mkListing({ suffix: '601', building_id: buildings[5].id, source: 'developer', rooms: 1, size: 38, floor: 2, total_floors: 7, priceTjs: 142000, finishing: 'no_finish', tier: 'phone_verified', installmentMonthly: 1700, bathrooms: 1, balcony: true, ceiling: 270 }),
  mkListing({ suffix: '602', building_id: buildings[5].id, source: 'developer', rooms: 2, size: 55, floor: 4, total_floors: 7, priceTjs: 198000, finishing: 'no_finish', tier: 'phone_verified', installmentMonthly: 2400, bathrooms: 1, balcony: true, ceiling: 270 }),
];
{
  const { error } = await supabase.from('listings').upsert(listings, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${listings.length} listings`);
}

// Progress photos — fakes monthly construction snapshots for under-construction
// buildings. WEDGE-1: drives the /zhk/[slug]/progress timeline page.
// Storage paths reference public-photos bucket (we'll skip the actual upload
// for now — the page renders coloured placeholders with date overlays so the
// feature ships without real photos).
const progressPhotos = [];
for (const b of buildings) {
  if (b.status !== 'under_construction' && b.status !== 'near_completion') continue;
  // Seed 6 monthly snapshots for the past 6 months
  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo++) {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    d.setDate(15);
    progressPhotos.push({
      id: `99999999-9999-9999-9999-${b.id.slice(-6)}${String(monthsAgo).padStart(6, '0')}`,
      storage_path: `progress/${b.slug}/${d.toISOString().slice(0, 7)}.jpg`,
      building_id: b.id,
      kind: 'progress',
      width: 1920,
      height: 1280,
      file_size_bytes: 800_000,
      taken_at: d.toISOString(),
      display_order: 5 - monthsAgo, // newest first within month groups
      uploaded_by: founderUser.id,
    });
  }
}
{
  const { error } = await supabase.from('photos').upsert(progressPhotos, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${progressPhotos.length} progress photos`);
}

// District price benchmarks — drives the fairness indicator on listing cards.
// One row per district with sample_size>=5 (per Data Model §5.14, hidden
// when sample is too small).
// Benchmarks tuned for Vahdat market: roughly 380–520k dirams/m²
// (= 3,800–5,200 TJS/m²). Centre is the most expensive; outlying
// microdistricts cheaper. Sample sizes kept honest — Vahdat is small,
// some districts haven't accumulated enough comps yet.
const benchmarks = [
  { id: '66666666-6666-6666-6666-666666666601', district_id: districts[0].id, rooms_count: null, finishing_type: null, sample_size: 12, median_price_per_m2_dirams: 470000 }, // Центр
  { id: '66666666-6666-6666-6666-666666666602', district_id: districts[1].id, rooms_count: null, finishing_type: null, sample_size: 8,  median_price_per_m2_dirams: 410000 }, // Гулистон
  { id: '66666666-6666-6666-6666-666666666603', district_id: districts[2].id, rooms_count: null, finishing_type: null, sample_size: 5,  median_price_per_m2_dirams: 390000 }, // Шарора
  { id: '66666666-6666-6666-6666-666666666604', district_id: districts[3].id, rooms_count: null, finishing_type: null, sample_size: 9,  median_price_per_m2_dirams: 420000 }, // Истиқлол
  { id: '66666666-6666-6666-6666-666666666605', district_id: districts[4].id, rooms_count: null, finishing_type: null, sample_size: 5,  median_price_per_m2_dirams: 380000 }, // Сарбозор
];
{
  const { error } = await supabase
    .from('district_price_benchmarks')
    .upsert(benchmarks, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${benchmarks.length} price benchmarks`);
}

// Saved items for the founder user — gives the /izbrannoe page real content
// to render. In production these come from the buyer clicking the bookmark.
const savedItems = [
  { id: '77777777-7777-7777-7777-777777777701', user_id: founderUser.id, building_id: buildings[0].id, listing_id: null },
  { id: '77777777-7777-7777-7777-777777777702', user_id: founderUser.id, building_id: buildings[1].id, listing_id: null },
  { id: '77777777-7777-7777-7777-777777777703', user_id: founderUser.id, building_id: null, listing_id: listings[0].id },
  { id: '77777777-7777-7777-7777-777777777704', user_id: founderUser.id, building_id: null, listing_id: listings[3].id },
  { id: '77777777-7777-7777-7777-777777777705', user_id: founderUser.id, building_id: null, listing_id: listings[6].id },
];
{
  const { error } = await supabase.from('saved_items').upsert(savedItems, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${savedItems.length} saved items`);
}

// Change events — drives the "Что изменилось" strip on /izbrannoe
const changeEvents = [
  {
    id: '88888888-8888-8888-8888-888888888801',
    listing_id: listings[0].id,
    building_id: null,
    type: 'price_changed',
    payload: { old_price_dirams: 78000000, new_price_dirams: 74200000 },
  },
  {
    id: '88888888-8888-8888-8888-888888888802',
    listing_id: null,
    building_id: buildings[2].id,
    type: 'construction_photo_added',
    payload: { count: 6 },
  },
  {
    id: '88888888-8888-8888-8888-888888888803',
    listing_id: listings[3].id,
    building_id: null,
    type: 'status_changed',
    payload: { from: 'active', to: 'sold' },
  },
];
{
  const { error } = await supabase.from('change_events').upsert(changeEvents, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${changeEvents.length} change events`);
}

// Storage buckets — per Architecture (Media architecture).
// Public buckets readable without auth; verification bucket is RLS-restricted.
const buckets = [
  { id: 'public-photos', public: true },
  { id: 'progress-photos', public: true },
  { id: 'verification', public: false },
];
for (const b of buckets) {
  const { error } = await supabase.storage.createBucket(b.id, { public: b.public });
  // Ignore "already exists" errors so the script stays idempotent
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
  console.log(`✓ bucket ${b.id} (${b.public ? 'public' : 'private'})`);
}

console.log('\nSeed complete.');
