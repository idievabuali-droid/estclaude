import { Building, Home as HomeIcon, Globe2, Sparkles } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { BuildingCard, ListingCard, LocationSearch } from '@/components/blocks';
import { Link } from '@/i18n/navigation';
import {
  listFeaturedBuildings,
  listBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { listListings } from '@/services/listings';
import { getDistrictBenchmarks } from '@/services/benchmarks';

/**
 * Home page (V1, tight). Above-the-fold goal: title + 3 nav chips +
 * the first featured project card visible on a typical mobile screen.
 *
 * Removed in this V1 pass (was bloating the page):
 *   - Hero subtitle (only rendered on desktop anyway)
 *   - Search input (free-text search across 6 buildings is overkill;
 *     filters on /novostroyki cover the real use cases — re-add when
 *     project count crosses ~30)
 *   - "Куда идём" section heading (the chips speak for themselves)
 *   - Big direction CARDS (icon + title + subtitle + "Открыть →" each)
 *     compressed into a single inline chip row
 *   - Featured-projects subtitle (the cards' own verified badges +
 *     listing counts already say what the subtitle was restating)
 *
 * Added: a "Свежие квартиры" section so buyers shopping by individual
 * unit see actual listings on the home page instead of having to drill
 * into /kvartiry first.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Homepage');
  const tNav = await getTranslations('Nav');

  // Featured buildings — top 3 marked is_featured.
  const featured = await listFeaturedBuildings(3);
  const featuredWithRefs = await Promise.all(
    featured.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      return { b, dev, dist, units: units.slice(0, 2), unitsTotal: units.length };
    }),
  );

  // Recent listings — listListings already sorts by trust tier first,
  // then published_at DESC, so slicing the top 3 gives the freshest
  // high-trust apartments. Need the parent buildings + benchmarks for
  // ListingCard's price-fairness rendering, batch-fetched once.
  const recentRaw = (await listListings({})).slice(0, 3);
  const recentBuildingIds = [...new Set(recentRaw.map((l) => l.building_id))];
  const allBuildings = await listBuildings({});
  const recentBuildingMap = new Map(
    allBuildings.filter((b) => recentBuildingIds.includes(b.id)).map((b) => [b.id, b]),
  );
  const recentDeveloperIds = [
    ...new Set([...recentBuildingMap.values()].map((b) => b.developer_id)),
  ];
  const recentDistrictIds = [
    ...new Set([...recentBuildingMap.values()].map((b) => b.district_id)),
  ];
  const [recentDeveloperEntries, recentBenchmarkMap] = await Promise.all([
    Promise.all(
      recentDeveloperIds.map(async (id) => [id, await getDeveloperById(id)] as const),
    ),
    getDistrictBenchmarks(recentDistrictIds),
  ]);
  const recentDeveloperMap = new Map(recentDeveloperEntries);

  return (
    <>
      {/* ─── Hero — title + LocationSearch as the primary entry
           point. The Madina walkthrough showed buyers got stuck on
           "what's the difference between Новостройки and Квартиры?"
           when those were the only entry points. The search box
           cuts straight to "I want a place near X" which is how
           buyers actually think. The 3 direction chips remain as a
           secondary "browse" row underneath for visitors who don't
           know what to type. */}
      <section className="border-b border-stone-200 bg-stone-50 py-6 md:py-8">
        <AppContainer className="flex flex-col gap-5">
          <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
            {t('heroTitle')}
          </h1>
          <div className="max-w-2xl">
            <LocationSearch destinationPath="/novostroyki" variant="hero" />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-caption text-stone-500">
                Введите район, ЖК, школу, мечеть или адрес — покажем квартиры рядом.
              </p>
              {/* Surfaces /pomoshch-vybora — the 5-step wizard buyers
                  never found because the home had no link to it. The
                  "Первый раз?" framing speaks to the same buyer that
                  needs the most help. */}
              <Link
                href="/pomoshch-vybora"
                className="inline-flex items-center gap-1 text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
              >
                <Sparkles className="size-3.5" />
                Первый раз? Поможем подобрать за 2 минуты
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-caption font-medium text-stone-500">или просто:</span>
            <DirectionChip
              href="/novostroyki"
              Icon={Building}
              label="Все новостройки"
              tone="terracotta"
            />
            <DirectionChip href="/kvartiry" Icon={HomeIcon} label="Все квартиры" tone="stone" />
            <DirectionChip href="/diaspora" Icon={Globe2} label={tNav('diaspora')} tone="stone" />
          </div>
        </AppContainer>
      </section>

      {/* ─── Featured projects ─────────────────────────────────── */}
      {featuredWithRefs.length > 0 ? (
        <section className="py-7">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Рекомендуемые проекты</h2>
              <Link
                href="/novostroyki"
                className="shrink-0 text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Все {tNav('buildings').toLowerCase()} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {featuredWithRefs.map(({ b, dev, dist, units, unitsTotal }) => {
                if (!dev || !dist) return null;
                return (
                  <BuildingCard
                    key={b.id}
                    building={b}
                    developer={dev}
                    district={dist}
                    matchingUnits={units}
                    activeListingsCount={unitsTotal}
                  />
                );
              })}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── "Хотите разместить?" CTA — V1 publishes everything
           through the founder, so this banner points sellers to the
           contact card instead of a self-serve form they can't use. */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer>
          <div className="flex flex-col items-start gap-3 rounded-md border border-terracotta-200 bg-terracotta-50/60 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-h3 font-semibold text-stone-900">
                Хотите разместить квартиру?
              </h2>
              <p className="text-meta text-stone-700">
                Напишите нам — зададим несколько вопросов и опубликуем за вас.
              </p>
            </div>
            <Link
              href="/post"
              className="inline-flex h-11 shrink-0 items-center rounded-md bg-terracotta-600 px-4 text-meta font-medium text-white transition-colors hover:bg-terracotta-700"
            >
              Связаться с нами
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* ─── Свежие квартиры — recent apartment listings ─────── */}
      {recentRaw.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-7">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Свежие квартиры</h2>
              <Link
                href="/kvartiry"
                className="shrink-0 text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Все {tNav('apartments').toLowerCase()} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {recentRaw.map((l) => {
                const building = recentBuildingMap.get(l.building_id);
                if (!building) return null;
                const dev = recentDeveloperMap.get(building.developer_id);
                const benchmark = recentBenchmarkMap.get(building.district_id);
                return (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    building={building}
                    developerVerified={dev?.is_verified ?? false}
                    districtMedianPerM2={
                      benchmark ? Number(benchmark.median_per_m2_dirams) : null
                    }
                    districtSampleSize={benchmark?.sample_size ?? 0}
                  />
                );
              })}
            </div>
          </AppContainer>
        </section>
      ) : null}
    </>
  );
}

type DirectionTone = 'terracotta' | 'stone';

const DIRECTION_TONE: Record<DirectionTone, string> = {
  terracotta:
    'border-terracotta-300 bg-terracotta-50 text-terracotta-800 hover:border-terracotta-500 hover:bg-terracotta-100',
  stone:
    'border-stone-300 bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-100',
};

function DirectionChip({
  href,
  Icon,
  label,
  tone,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: DirectionTone;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-meta font-medium transition-colors ${DIRECTION_TONE[tone]}`}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Link>
  );
}
