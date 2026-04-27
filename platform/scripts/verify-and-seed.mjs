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

// Districts
const districts = [
  { id: '11111111-1111-1111-1111-111111111101', city: 'dushanbe', name: { ru: 'Сино', tg: 'Сино' }, slug: 'sino' },
  { id: '11111111-1111-1111-1111-111111111102', city: 'dushanbe', name: { ru: 'Исмоили Сомони', tg: 'Исмоили Сомонӣ' }, slug: 'ismoili-somoni' },
  { id: '11111111-1111-1111-1111-111111111103', city: 'dushanbe', name: { ru: 'Фирдавси', tg: 'Фирдавсӣ' }, slug: 'firdavsi' },
  { id: '11111111-1111-1111-1111-111111111104', city: 'dushanbe', name: { ru: 'Шохмансур', tg: 'Шоҳмансур' }, slug: 'shohmansur' },
  { id: '11111111-1111-1111-1111-111111111105', city: 'vahdat', name: { ru: 'Вахдат', tg: 'Ваҳдат' }, slug: 'vahdat' },
];
{
  const { error } = await supabase.from('districts').upsert(districts, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${districts.length} districts`);
}

// Developers
const developers = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Sitora Development',
    display_name: { ru: 'Ситора Девелопмент', tg: 'Ситора Девелопмент' },
    primary_contact_phone: '+992900000001',
    has_female_agent: true,
    years_active: 8,
    projects_completed_count: 12,
    status: 'active',
    verified_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Dushanbe Plaza Group',
    display_name: { ru: 'Душанбе Плаза Групп', tg: 'Душанбе Плаза Групп' },
    primary_contact_phone: '+992900000002',
    has_female_agent: false,
    years_active: 14,
    projects_completed_count: 23,
    status: 'active',
    verified_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Pomir Construction',
    display_name: { ru: 'Помир Констракшн', tg: 'Помир Констракшн' },
    primary_contact_phone: '+992900000003',
    has_female_agent: false,
    years_active: 3,
    projects_completed_count: 2,
    status: 'pending',
  },
];
{
  const { error } = await supabase.from('developers').upsert(developers, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${developers.length} developers`);
}

// Seed seller user (mock — represents the founder posting on behalf of developers)
const founderUser = {
  id: '33333333-3333-3333-3333-333333333301',
  phone: '+992900000099',
  name: 'Founder Account',
  preferred_language: 'ru',
  phone_verified_at: new Date().toISOString(),
};
{
  const { error } = await supabase.from('users').upsert([founderUser], { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ 1 founder user`);
}

// Buildings
const buildings = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    slug: 'sitora-hills',
    developer_id: developers[0].id,
    district_id: districts[0].id,
    city: 'dushanbe',
    name: { ru: 'ЖК Sitora Hills', tg: 'ЖК Sitora Hills' },
    address: { ru: 'ул. Айни, 84', tg: 'кӯчаи Айнӣ, 84' },
    latitude: 38.5598,
    longitude: 68.787,
    description: { ru: 'Современный жилой комплекс рядом с парком Рудаки. 4 секции, закрытая территория, подземный паркинг.', tg: 'Маҷмааи зисти муосир дар назди боғи Рӯдакӣ.' },
    status: 'under_construction',
    handover_estimated_quarter: '2026-Q4',
    total_units: 218,
    total_floors: 16,
    amenities: ['parking', 'playground', 'security', 'elevator'],
    is_published: true,
    is_featured: true,
    featured_rank: 1,
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    slug: 'rudaki-residence',
    developer_id: developers[1].id,
    district_id: districts[1].id,
    city: 'dushanbe',
    name: { ru: 'ЖК Rudaki Residence', tg: 'ЖК Rudaki Residence' },
    address: { ru: 'пр. Рудаки, 137', tg: 'хиёбони Рӯдакӣ, 137' },
    latitude: 38.5755,
    longitude: 68.7831,
    description: { ru: 'Премиальный комплекс на проспекте Рудаки с видом на горы.', tg: 'Маҷмааи премиалӣ дар хиёбони Рӯдакӣ бо манзараи кӯҳҳо.' },
    status: 'near_completion',
    handover_estimated_quarter: '2026-Q2',
    total_units: 144,
    total_floors: 12,
    amenities: ['parking', 'gym', 'security', 'elevator', 'commercial-floor'],
    is_published: true,
    is_featured: true,
    featured_rank: 2,
  },
  {
    id: '44444444-4444-4444-4444-444444444403',
    slug: 'bahor-park',
    developer_id: developers[0].id,
    district_id: districts[2].id,
    city: 'dushanbe',
    name: { ru: 'ЖК Bahor Park', tg: 'ЖК Bahor Park' },
    address: { ru: 'ул. Шевченко, 19', tg: 'кӯчаи Шевченко, 19' },
    latitude: 38.5402,
    longitude: 68.7631,
    description: { ru: 'Камерный 9-этажный дом во Фирдавси.', tg: 'Бинои 9-ошёна дар Фирдавсӣ.' },
    status: 'announced',
    handover_estimated_quarter: '2027-Q3',
    total_units: 96,
    total_floors: 9,
    amenities: ['parking', 'playground', 'security'],
    is_published: true,
    is_featured: true,
    featured_rank: 3,
  },
  {
    id: '44444444-4444-4444-4444-444444444404',
    slug: 'vahdat-tower',
    developer_id: developers[2].id,
    district_id: districts[4].id,
    city: 'vahdat',
    name: { ru: 'ЖК Vahdat Tower', tg: 'ЖК Ваҳдат Тауэр' },
    address: { ru: 'ул. Гагарина, 4', tg: 'кӯчаи Гагарин, 4' },
    latitude: 38.555,
    longitude: 69.039,
    description: { ru: 'Сданный дом в центре Вахдата. Доступные цены.', tg: 'Бинои супоридашуда дар маркази Ваҳдат.' },
    status: 'delivered',
    handover_estimated_quarter: null,
    total_units: 72,
    total_floors: 9,
    amenities: ['parking', 'elevator'],
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
const listings = [
  mkListing({ suffix: '101', building_id: buildings[0].id, source: 'developer', rooms: 2, size: 64.5, floor: 5, total_floors: 16, priceTjs: 742000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 8750, bathrooms: 1, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '102', building_id: buildings[0].id, source: 'developer', rooms: 3, size: 84.2, floor: 8, total_floors: 16, priceTjs: 968000, finishing: 'pre_finish', tier: 'phone_verified', installmentMonthly: 11400, bathrooms: 2, balcony: true, ceiling: 280 }),
  mkListing({ suffix: '103', building_id: buildings[0].id, source: 'developer', rooms: 1, size: 42, floor: 12, total_floors: 16, priceTjs: 483000, finishing: 'no_finish', tier: 'phone_verified', bathrooms: 1, balcony: false, ceiling: 280 }),
  mkListing({ suffix: '201', building_id: buildings[1].id, source: 'developer', rooms: 3, size: 92, floor: 7, total_floors: 12, priceTjs: 1306000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 2, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '202', building_id: buildings[1].id, source: 'intermediary', rooms: 2, size: 71, floor: 4, total_floors: 12, priceTjs: 985000, finishing: 'full_finish', tier: 'listing_verified', desc: 'Светлая двухкомнатная с панорамными окнами.', bathrooms: 1, balcony: true, ceiling: 290 }),
  mkListing({ suffix: '301', building_id: buildings[2].id, source: 'developer', rooms: 2, size: 58, floor: 3, total_floors: 9, priceTjs: 567000, finishing: 'no_finish', tier: 'phone_verified', installmentMonthly: 6700, bathrooms: 1, balcony: true, ceiling: 270 }),
  mkListing({ suffix: '401', building_id: buildings[3].id, source: 'owner', rooms: 2, size: 53, floor: 4, total_floors: 9, priceTjs: 392000, finishing: 'owner_renovated', tier: 'profile_verified', desc: 'Жилое состояние, сделан полный ремонт в 2024 году.', bathrooms: 1, balcony: false, ceiling: 260 }),
  mkListing({ suffix: '402', building_id: buildings[3].id, source: 'intermediary', rooms: 3, size: 78, floor: 7, total_floors: 9, priceTjs: 577000, finishing: 'full_finish', tier: 'phone_verified', bathrooms: 2, balcony: true, ceiling: 260 }),
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
const benchmarks = [
  { id: '66666666-6666-6666-6666-666666666601', district_id: districts[0].id, rooms_count: null, finishing_type: null, sample_size: 18, median_price_per_m2_dirams: 1180000 },
  { id: '66666666-6666-6666-6666-666666666602', district_id: districts[1].id, rooms_count: null, finishing_type: null, sample_size: 14, median_price_per_m2_dirams: 1450000 },
  { id: '66666666-6666-6666-6666-666666666603', district_id: districts[2].id, rooms_count: null, finishing_type: null, sample_size: 9,  median_price_per_m2_dirams: 940000 },
  { id: '66666666-6666-6666-6666-666666666604', district_id: districts[3].id, rooms_count: null, finishing_type: null, sample_size: 6,  median_price_per_m2_dirams: 1020000 },
  { id: '66666666-6666-6666-6666-666666666605', district_id: districts[4].id, rooms_count: null, finishing_type: null, sample_size: 5,  median_price_per_m2_dirams: 720000 },
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
