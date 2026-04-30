import { Search, Building, Home as HomeIcon, Globe2, ArrowRight } from 'lucide-react';
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

  // Featured projects from Supabase. Currency conversion is intentionally
  // scoped to /diaspora only — the home page targets local buyers and
  // shouldn't leak foreign-currency clutter into their experience.
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

        </AppContainer>
      </section>

      {/* Direction picker. Three primary entry points — pomoshch-vybora
          is hidden until the concierge mode is built (currently it's
          just a wrapper around filters and not pulling its weight). */}
      <section className="border-b border-stone-200 bg-white py-6">
        <AppContainer className="flex flex-col gap-4">
          <h2 className="text-h2 font-semibold text-stone-900">Куда идём</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <DirectionCard
              href="/novostroyki"
              Icon={Building}
              title="Новостройки"
              subtitle="ЖК, застройщики, ход стройки"
              tone="terracotta"
            />
            <DirectionCard
              href="/kvartiry"
              Icon={HomeIcon}
              title="Квартиры"
              subtitle="Готовые объявления с фильтрами"
              tone="stone"
            />
            <DirectionCard
              href="/diaspora"
              Icon={Globe2}
              title="Из-за рубежа"
              subtitle="Покупка удалённо, доверенность"
              tone="stone"
            />
          </div>
        </AppContainer>
      </section>

      {/* Featured projects — Block C per UI Spec Page 1 §1.6 */}
      <section className="py-7">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <h2 className="text-h2 font-semibold text-stone-900">Рекомендуемые проекты</h2>
              <span className="text-meta text-stone-500">Проверенные застройщики и активные объявления</span>
            </div>
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

type DirectionTone = 'terracotta' | 'stone' | 'amber';

const DIRECTION_TONE: Record<DirectionTone, { card: string; icon: string; iconBg: string }> = {
  terracotta: {
    card: 'border-terracotta-200 bg-terracotta-50/60 hover:border-terracotta-300 hover:bg-terracotta-50',
    icon: 'text-terracotta-700',
    iconBg: 'bg-terracotta-100',
  },
  stone: {
    card: 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
    icon: 'text-stone-700',
    iconBg: 'bg-stone-100',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-50',
    icon: 'text-[color:var(--color-badge-tier-developer)]',
    iconBg: 'bg-amber-100',
  },
};

function DirectionCard({
  href,
  Icon,
  title,
  subtitle,
  tone,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: DirectionTone;
}) {
  const t = DIRECTION_TONE[tone];
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-md border p-4 transition-colors ${t.card}`}
    >
      <span className={`inline-flex size-10 items-center justify-center rounded-md ${t.iconBg}`}>
        <Icon className={`size-5 ${t.icon}`} />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-h3 font-semibold text-stone-900">{title}</span>
        <span className="text-meta text-stone-600">{subtitle}</span>
      </div>
      <span className={`mt-1 inline-flex items-center gap-1 text-meta font-medium ${t.icon}`}>
        Открыть <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
