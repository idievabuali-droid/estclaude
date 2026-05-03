import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listBuildings } from '@/services/buildings';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostFlow } from './PostFlow';
import { ContactCard } from './ContactCard';

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
 * Replaces the previous 7-step wizard (phone → ownership → building →
 * details → photos → review → published) which was 60% UI and 0% data
 * persistence. The new shape is one server-rendered page that hosts a
 * client form with two paths:
 *
 *   1. NEW BUILDING + APARTMENTS — fill building once, add many
 *      apartments with the "+ Добавить ещё квартиру" button.
 *   2. APARTMENT IN EXISTING BUILDING — pick a building, fill one
 *      apartment.
 *
 * Auth gating mirrors /izbrannoe — unauthenticated users go to /voyti
 * with a redirect back here. Status logic (founder → live; other →
 * moderation) is enforced server-side in /api/inventory/create.
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // V1 publishing model: only the founder posts directly. Everyone
  // else (logged-in or not) gets a contact card explaining how to
  // reach us so we can post on their behalf. No /voyti redirect for
  // non-founders — making people log in just to read "call this
  // number" is pointless friction.
  const user = await getCurrentUser();
  const founder = user ? await isFounder(user.id) : false;

  if (!founder) {
    return (
      <>
        <section className="border-b border-stone-200 bg-white">
          <AppContainer className="flex flex-col gap-2 py-5">
            <h1 className="text-h1 font-semibold text-stone-900">
              Разместить квартиру
            </h1>
            <p className="text-meta text-stone-500">
              На старте платформы мы публикуем все объявления вручную,
              чтобы вычитать каждое и помочь с фото.
            </p>
          </AppContainer>
        </section>
        <section className="py-6 pb-20">
          <AppContainer>
            <ContactCard />
          </AppContainer>
        </section>
      </>
    );
  }

  // Founder path: pre-fetch the reference data the form needs.
  //  - districts (with centroid coords) → dropdown + map pre-centering
  //  - existing buildings → dropdown for "apartment in existing"
  //  - developers → dropdown for new buildings
  // All small lists in V1, so loading eagerly is simpler than a
  // search-as-you-type endpoint.
  const supabase = createAdminClient();
  const [districtsRes, allBuildings, developersRes] = await Promise.all([
    supabase
      .from('districts')
      .select('id, name, slug, center_latitude, center_longitude')
      .eq('city', 'vahdat')
      .order('display_order', { ascending: true }),
    listBuildings({}),
    supabase.from('developers').select('id, name, display_name').order('name'),
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

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-2 py-5">
          <h1 className="text-h1 font-semibold text-stone-900">Добавить объявление</h1>
          <p className="text-meta text-stone-500">
            Опубликовано сразу после нажатия «Опубликовать».
          </p>
        </AppContainer>
      </section>
      <section className="py-6 pb-20">
        <AppContainer>
          <PostFlow
            districts={districts}
            existingBuildings={allBuildings.map((b) => ({ id: b.id, name: b.name.ru }))}
            developers={developers}
            isFounder={founder}
          />
        </AppContainer>
      </section>
    </>
  );
}
