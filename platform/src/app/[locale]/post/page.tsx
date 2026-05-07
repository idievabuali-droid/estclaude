import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listBuildings } from '@/services/buildings';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostFlow } from './PostFlow';
import { ContactCard } from './ContactCard';
import {
  IllustrationChatBubble,
  IllustrationClipboard,
  IllustrationHouseSparkle,
} from '@/components/illustrations';

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
        {/* ─── HERO ─────────────────────────────────────────────
            Editorial seller-pitch hero on warm canvas. Treats /post
            as a sales page (the prescription's framing): convince
            the seller to use us instead of Somon.tj, by leading
            with the manual-vetting promise. */}
        <section className="border-b border-stone-200 bg-gradient-to-b from-terracotta-50/30 via-stone-50 to-stone-50 py-12 md:py-20">
          <AppContainer className="flex flex-col items-center gap-4 text-center">
            <h1
              className="text-h1 font-semibold leading-[var(--leading-h1)] tracking-[-0.01em] text-stone-900 md:text-display"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Разместите квартиру через нас
            </h1>
            <p className="max-w-xl text-body text-stone-600">
              На старте платформы мы публикуем каждое объявление вручную —
              читаем, помогаем с фото и отвечаем покупателям, пока вы
              заняты другим.
            </p>
          </AppContainer>
        </section>

        {/* ─── 3-STEP ILLUSTRATED PROCESS ──────────────────────
            Monoline illustrations + serif H3 + body. Turns a
            "what do I do?" list into a visual story per the
            prescription. */}
        <section className="border-b border-stone-200 bg-white py-12 md:py-16">
          <AppContainer className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Как это работает
              </span>
              <h2
                className="text-h2 font-semibold text-stone-900 md:text-h1"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                Три шага до публикации.
              </h2>
            </div>
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
              <ProcessStep
                step="01"
                Illustration={IllustrationChatBubble}
                title="Напишите нам"
                body="WhatsApp, Telegram или звонок — выберите удобный канал."
              />
              <ProcessStep
                step="02"
                Illustration={IllustrationClipboard}
                title="Зададим 5 коротких вопросов"
                body="Адрес, площадь, цена, отделка, фото. Это всё."
              />
              <ProcessStep
                step="03"
                Illustration={IllustrationHouseSparkle}
                title="Опубликуем с фото"
                body="Объявление выходит в течение дня и ищет покупателей за вас."
              />
            </ol>
          </AppContainer>
        </section>

        {/* ─── CONTACT CARD + CHECKLIST ───────────────────────── */}
        <section className="py-12 pb-16 md:py-16">
          <AppContainer>
            <ContactCard />
          </AppContainer>
        </section>

        {/* ─── BOTTOM TINTED BLOCK ────────────────────────────
            "Бесплатно для продавцов на старте платформы" — soft
            terracotta band per the prescription. Honest framing:
            this is a launch-period offer, not forever-free. */}
        <section className="border-t border-stone-200 bg-terracotta-50/60 py-8 md:py-10">
          <AppContainer className="flex flex-col items-center gap-2 text-center">
            <span className="text-caption font-medium uppercase tracking-widest text-terracotta-800">
              На старте платформы
            </span>
            <p
              className="text-h3 font-semibold text-stone-900 md:text-h2"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Бесплатно для продавцов.
            </p>
            <p className="max-w-md text-meta text-stone-600">
              Платформа в стадии запуска — нам важнее, чтобы вы попробовали,
              чем заработать на размещении.
            </p>
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

/**
 * Single step card for the 3-step seller process. Step number in the
 * top corner (eyebrow-style "01 / 02 / 03"), monoline illustration
 * size-12 in terracotta-700 line, serif H3 title, body description.
 */
function ProcessStep({
  step,
  Illustration,
  title,
  body,
}: {
  step: string;
  Illustration: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-terracotta-700">
          <Illustration className="size-12" />
        </span>
        <span className="text-caption font-medium uppercase tracking-widest text-stone-400 tabular-nums">
          {step}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className="text-h3 font-semibold text-stone-900"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {title}
        </h3>
        <p className="text-meta text-stone-600">{body}</p>
      </div>
    </li>
  );
}
