import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listDistricts, listBuildings } from '@/services/buildings';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostFlow } from './PostFlow';

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

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/post')}`);
  }

  const founder = await isFounder(user.id);

  // Pre-fetch reference data the form needs:
  //  - districts → dropdown for new buildings
  //  - existing buildings → dropdown for "apartment in existing"
  //  - developers → dropdown for new buildings
  // All small lists in V1, so loading eagerly is simpler than a
  // search-as-you-type endpoint.
  const supabase = createAdminClient();
  const [districts, allBuildings, developersRes] = await Promise.all([
    listDistricts(),
    listBuildings({}),
    supabase.from('developers').select('id, name, display_name').order('name'),
  ]);
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
            {founder
              ? 'Опубликовано сразу после нажатия «Опубликовать».'
              : 'После заполнения объявление пойдёт на модерацию — мы проверим и опубликуем в течение 1-2 дней.'}
          </p>
        </AppContainer>
      </section>
      <section className="py-6 pb-20">
        <AppContainer>
          <PostFlow
            districts={districts.map((d) => ({ id: d.id, name: d.name.ru }))}
            existingBuildings={allBuildings.map((b) => ({ id: b.id, name: b.name.ru }))}
            developers={developers}
            isFounder={founder}
          />
        </AppContainer>
      </section>
    </>
  );
}
