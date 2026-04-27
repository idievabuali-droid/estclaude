import { Search } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppContainer, AppButton, AppInput } from '@/components/primitives';
import { BuildingCard } from '@/components/blocks';
import { Link } from '@/i18n/navigation';
import {
  listFeaturedBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Homepage');
  const tCommon = await getTranslations('Common');
  const tNav = await getTranslations('Nav');

  // Featured projects from Supabase
  const featured = await listFeaturedBuildings(3);
  const featuredWithRefs = await Promise.all(
    featured.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      return { b, dev, dist, units: units.slice(0, 2) };
    }),
  );

  return (
    <>
      {/* Hero — Block A per UI Spec Page 1 §1.4. BUG-11: trimmed so featured projects peek above the fold on mobile. */}
      <section className="border-b border-stone-200 bg-stone-50 py-5 md:py-7">
        <AppContainer className="flex flex-col gap-3 md:gap-4 lg:max-w-3xl">
          <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
            {t('heroTitle')}
          </h1>
          <p className="hidden text-body text-stone-600 md:block">{t('heroSubtitle')}</p>

          <form className="flex flex-col gap-2 md:flex-row md:gap-3" action="/novostroyki" method="get">
            <div className="flex-1">
              <AppInput
                name="q"
                type="search"
                placeholder={t('searchPlaceholder')}
                leftSlot={<Search className="size-4" />}
                aria-label={t('searchPlaceholder')}
              />
            </div>
            <AppButton type="submit" size="md" className="md:size-lg md:w-auto">
              {tCommon('search')}
            </AppButton>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pomoshch-vybora"
              className="inline-flex h-9 items-center rounded-sm bg-terracotta-100 px-3 text-meta font-medium text-terracotta-800 hover:bg-terracotta-200"
            >
              {t('guidedFinder')}
            </Link>
            <Link
              href="/novostroyki"
              className="inline-flex h-9 items-center rounded-sm bg-stone-100 px-3 text-meta font-medium text-stone-700 hover:bg-stone-200"
            >
              {t('browseProjects')}
            </Link>
            <Link
              href="/kvartiry"
              className="inline-flex h-9 items-center rounded-sm bg-stone-100 px-3 text-meta font-medium text-stone-700 hover:bg-stone-200"
            >
              {t('browseApartments')}
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* Featured projects — Block C per UI Spec Page 1 §1.6 */}
      <section className="py-7">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Рекомендуемые проекты</h2>
            <Link
              href="/novostroyki"
              className="text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              Все {tNav('buildings').toLowerCase()} →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {featuredWithRefs.map(({ b, dev, dist, units }) => {
              if (!dev || !dist) return null;
              return (
                <BuildingCard
                  key={b.id}
                  building={b}
                  developer={dev}
                  district={dist}
                  matchingUnits={units}
                />
              );
            })}
          </div>
        </AppContainer>
      </section>
    </>
  );
}
