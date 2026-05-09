import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listBuildings } from '@/services/buildings';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostFlow } from './PostFlow';

// Vahdat town centre — used when a district has no centroid stored
// (legacy seed rows). Same constant as services/buildings.ts.
const VAHDAT_FALLBACK = { lat: 38.5511, lng: 69.0214 };

// Short context labels for Vahdat's 5 districts — bare district names
// confused sellers ("which one is Сарбозор?"). The label still ends in
// the canonical name so cross-referencing the rest of the platform
// stays trivial. Falls back to the bare name for unknown slugs.
const DISTRICT_HINTS: Record<string, string> = {
  'vahdat-center': 'Центр — площадь Дусти, центральный рынок',
  gulistan: 'Гулистон — северо-восток, школы и поликлиника',
  sharora: 'Шарора — на горе, виды на горы',
  istiqlol: 'Истиқлол — у трассы Душанбе',
  sarbozor: 'Сарбозор — река Кофарнихон',
};

/**
 * /post — single-page listing creation flow.
 *
 * V1.1 update: opened the form to phone-verified sellers (was founder-
 * only). Anyone logged in via Telegram can post; non-founder submissions
 * land in `status='pending_review'` and surface in the founder's
 * moderation queue at /kabinet. Approve/reject pipeline lives in
 * /api/listings/moderate. Anonymous visitors are redirected to /voyti
 * (mirrors the /izbrannoe pattern — login is one tap via Telegram).
 *
 * Two paths inside the form (PostFlow):
 *
 *   1. NEW BUILDING + APARTMENTS — fill building once, add many
 *      apartments with the "+ Добавить ещё квартиру" button.
 *   2. APARTMENT IN EXISTING BUILDING — pick a building, fill one
 *      apartment.
 *
 * Header copy diverges by role: the founder publishes immediately, a
 * seller goes through moderation first. PostFlow itself reads `isFounder`
 * to flip the submit button label and the success redirect target.
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Anonymous → bounce to /voyti with a redirect back. Telegram auth is
  // one-tap so this is barely friction, and forcing the login means the
  // submit handler always has a phone number it can use for moderation
  // call-back. (Phone-verification IS the trust gate now that sellers
  // self-serve.)
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/post')}`);
  }
  const founder = await isFounder(user.id);

  // Pre-fetch reference data the form needs (small lists in V1; loading
  // eagerly is simpler than search-as-you-type).
  //  - districts (with centroid coords) → dropdown + map pre-centering
  //  - existing buildings → dropdown for "apartment in existing" + map
  //    landmark layer (sellers orient by "I'm near ЖК Гулистон Резиденс")
  //  - developers → dropdown for new buildings
  //  - pois → map landmark layer. OSM coverage in Vahdat is sparse, so
  //    the base style barely shows any names. Rendering OUR curated POIs
  //    (рынок, школы, мечети…) directly on the map gives the seller the
  //    landmarks they actually use to orient when picking a location.
  const supabase = createAdminClient();
  const [districtsRes, allBuildings, developersRes, poisRes] = await Promise.all([
    supabase
      .from('districts')
      .select('id, name, slug, center_latitude, center_longitude')
      .eq('city', 'vahdat')
      .order('display_order', { ascending: true }),
    listBuildings({}),
    supabase.from('developers').select('id, name, display_name').order('name'),
    supabase
      .from('pois')
      .select('id, name, kind, latitude, longitude, popularity')
      .eq('city', 'vahdat')
      .order('popularity', { ascending: false })
      .limit(120),
  ]);
  const districts = (districtsRes.data ?? []).map((d) => {
    const slug = d.slug as string;
    const ru = (d.name as { ru: string }).ru;
    return {
      id: d.id as string,
      name: DISTRICT_HINTS[slug] ?? ru,
      // Centroid coords may be null for some seed rows — fall back to
      // Vahdat-town centre so the map still has something to centre on.
      center_lat: (d.center_latitude as number | null) ?? VAHDAT_FALLBACK.lat,
      center_lng: (d.center_longitude as number | null) ?? VAHDAT_FALLBACK.lng,
    };
  });
  const developers = (developersRes.data ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    display_name_ru: (d.display_name as { ru: string }).ru,
  }));

  // Map landmarks — POIs from our curated table + every published ЖК
  // with coords. Combined into one list so LocationPicker doesn't need
  // to know about both shapes; the `kind` discriminator drives the
  // marker style (icon + colour).
  const landmarks: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    kind: 'poi' | 'building';
    poiKind?: string;
  }> = [
    ...(poisRes.data ?? [])
      .filter((p) => Number(p.latitude) !== 0 && Number(p.longitude) !== 0)
      .map((p) => ({
        id: `poi-${p.id as string}`,
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        name: (p.name as { ru: string }).ru,
        kind: 'poi' as const,
        poiKind: p.kind as string,
      })),
    ...allBuildings
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({
        id: `building-${b.id}`,
        lat: b.latitude as number,
        lng: b.longitude as number,
        name: b.name.ru,
        kind: 'building' as const,
      })),
  ];

  // District-level price benchmarks (TJS/m²). Pre-converted from the
  // dirams source so the form can compare without re-doing the math.
  // Empty Record when no district has enough samples (sample_size >= 5);
  // PostFlow's per-m² hint silently degrades to "≈ X TJS/м²" without
  // the comparison line. (A2 — informs price typo + fairness signal.)
  const benchmarksByDistrict: Record<string, number> = {};
  try {
    const benchMap = await getDistrictBenchmarks(districts.map((d) => d.id));
    for (const [id, b] of benchMap) {
      benchmarksByDistrict[id] = Math.round(Number(b.median_per_m2_dirams) / 100);
    }
  } catch (err) {
    // Benchmarks are advisory; surfacing them isn't critical to posting.
    console.error('district benchmarks load failed (non-fatal):', err);
  }

  // Header copy depends on role: founder posts go live immediately,
  // seller posts go to moderation first. The form itself (PostFlow)
  // also reads isFounder to relabel the submit button + change the
  // success redirect.
  const headerTitle = founder ? 'Добавить объявление' : 'Разместить квартиру';
  const headerSubtitle = founder
    ? 'Опубликовано сразу после нажатия «Опубликовать».'
    : 'Проверим и опубликуем — обычно в течение дня.';

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-1.5 py-8 md:py-10">
          <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
            {founder ? 'Публикация' : 'Новое объявление'}
          </span>
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            {headerTitle}
          </h1>
          <p className="text-meta text-stone-500">{headerSubtitle}</p>
        </AppContainer>
      </section>
      <section className="py-6 pb-20">
        <AppContainer>
          <PostFlow
            districts={districts}
            existingBuildings={allBuildings.map((b) => ({
              id: b.id,
              name: b.name.ru,
              // district_id threaded so the per-m² hint can resolve a
              // benchmark when the seller is posting into an existing ЖК.
              district_id: b.district_id,
            }))}
            developers={developers}
            isFounder={founder}
            userPhone={user.phone}
            userId={user.id}
            benchmarksByDistrict={benchmarksByDistrict}
            landmarks={landmarks}
          />
        </AppContainer>
      </section>
    </>
  );
}
