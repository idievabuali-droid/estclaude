import { notFound } from 'next/navigation';
import { MapPin, Calendar, Layers, Users, Shield, Camera } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppChip,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import {
  ListingCard,
  NearbyPois,
  VerifiedDeveloperButton,
} from '@/components/blocks';
import { getBuilding } from '@/services/buildings';
import { getDistrictBenchmark } from '@/services/benchmarks';
import { getNearbyPOIs } from '@/services/poi';
import { formatPriceNumber } from '@/lib/format';
import type { BuildingStatus } from '@/types/domain';

const STATUS_LABEL: Record<BuildingStatus, string> = {
  announced: 'Анонсирован',
  under_construction: 'Строится',
  near_completion: 'Почти готов',
  delivered: 'Сдан',
};

export async function generateStaticParams() {
  // For static generation across all locales
  return [];
}

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tFinishing = await getTranslations('Finishing');

  const data = await getBuilding(slug);
  if (!data) notFound();
  const { building, developer, district, listings } = data;
  const [benchmark, pois] = await Promise.all([
    getDistrictBenchmark(district.id),
    getNearbyPOIs(building.latitude, building.longitude),
  ]);
  const median = benchmark
    ? { median: Number(benchmark.median_per_m2_dirams), sample: benchmark.sample_size }
    : null;

  return (
    <>
      {/* Hero / cover — compact on mobile (16:9 too tall on small phones), wider on desktop */}
      <div
        className="relative aspect-[2/1] w-full md:aspect-[21/9]"
        style={{ backgroundColor: building.cover_color }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/20 to-transparent" />
        {/* Status chip at top — replaces the decorative centered icon (REMOVE-1) */}
        <div className="absolute left-3 top-3">
          <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-caption font-medium text-stone-900">
            {STATUS_LABEL[building.status]}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <AppContainer className="pb-4 md:pb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-white md:text-display">
                  {building.name.ru}
                </h1>
                <span className="inline-flex items-center gap-1 text-meta text-white/90">
                  <MapPin className="size-3.5" />
                  {district.name.ru} · {building.address.ru}
                </span>
              </div>
              {developer.is_verified ? (
                <VerifiedDeveloperButton
                  developerName={developer.display_name.ru}
                  verifiedAt={developer.verified_at}
                  yearsActive={developer.years_active}
                  projectsCompleted={developer.projects_completed_count}
                />
              ) : null}
            </div>
          </AppContainer>
        </div>
      </div>

      {/* JOURNEY-4: sticky section nav so users can jump straight to apartments / about / contact */}
      <nav
        aria-label="Разделы"
        className="sticky top-14 z-20 border-b border-stone-200 bg-white/95 backdrop-blur"
      >
        <AppContainer>
          <div className="-mx-1 flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <a
              href="#units"
              className="inline-flex h-9 shrink-0 items-center rounded-sm bg-stone-100 px-3 text-meta font-medium text-stone-900 hover:bg-stone-200"
            >
              Квартиры ({listings.length})
            </a>
            {(building.status === 'under_construction' || building.status === 'near_completion') ? (
              <Link
                href={`/zhk/${building.slug}/progress`}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-sm bg-amber-50 px-3 text-meta font-medium text-[color:var(--color-badge-tier-developer)] hover:bg-amber-100"
              >
                <Camera className="size-3.5" /> Ход стройки
              </Link>
            ) : null}
            <a
              href="#about"
              className="inline-flex h-9 shrink-0 items-center rounded-sm px-3 text-meta font-medium text-stone-700 hover:bg-stone-100"
            >
              Описание
            </a>
            <a
              href="#nearby"
              className="inline-flex h-9 shrink-0 items-center rounded-sm px-3 text-meta font-medium text-stone-700 hover:bg-stone-100"
            >
              Что рядом
            </a>
            <a
              href="#developer"
              className="inline-flex h-9 shrink-0 items-center rounded-sm px-3 text-meta font-medium text-stone-700 hover:bg-stone-100"
            >
              Застройщик
            </a>
          </div>
        </AppContainer>
      </nav>

      {/* Identity row + key stats — 3-col on mobile too (BUG-9) */}
      <section className="border-b border-stone-200 bg-white py-5">
        <AppContainer className="grid grid-cols-3 gap-3 md:gap-5">
          <Stat
            icon={<Layers className="size-4 text-stone-500" />}
            label="Этажей"
            value={String(building.total_floors)}
          />
          <Stat
            icon={<Users className="size-4 text-stone-500" />}
            label="Квартир"
            value={String(building.total_units)}
          />
          {building.handover_estimated_quarter ? (
            <Stat
              icon={<Calendar className="size-4 text-stone-500" />}
              label="Сдача"
              value={building.handover_estimated_quarter}
            />
          ) : (
            <Stat icon={<Calendar className="size-4 text-stone-500" />} label="Сдача" value="Сдан" />
          )}
        </AppContainer>
      </section>

      {/* Trust block */}
      {developer.is_verified ? (
        <section className="bg-amber-50/60 py-5">
          <AppContainer>
            <AppCard className="border-amber-200/60">
              <AppCardContent>
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 size-5 text-[color:var(--color-badge-tier-developer)]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-h3 font-semibold text-stone-900">
                      Проверенный застройщик: {developer.display_name.ru}
                    </span>
                    <span className="text-meta text-stone-700">
                      Команда платформы подтвердила застройщика по телефону их офиса.
                      {developer.years_active ? ` ${developer.years_active} лет на рынке.` : ''}
                      {developer.projects_completed_count
                        ? ` ${developer.projects_completed_count} сданных проектов.`
                        : ''}
                    </span>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </AppContainer>
        </section>
      ) : null}

      {/* About */}
      <section id="about" className="scroll-mt-28 py-6">
        <AppContainer className="flex flex-col gap-4">
          <h2 className="text-h2 font-semibold text-stone-900">О проекте</h2>
          <p className="text-body text-stone-700">{building.description.ru}</p>
          <div className="flex flex-wrap gap-2">
            {building.amenities.map((a) => (
              <AppChip key={a} asStatic tone="neutral">
                {amenityLabel(a)}
              </AppChip>
            ))}
          </div>
        </AppContainer>
      </section>

      {/* Available units */}
      <section id="units" className="scroll-mt-28 border-t border-stone-200 bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2 font-semibold text-stone-900">
                Доступные квартиры
              </h2>
              <p className="text-meta text-stone-500 tabular-nums">{listings.length} объявлений</p>
            </div>
            {building.price_from_dirams ? (
              <div className="flex flex-col items-end">
                <span className="text-caption text-stone-500">от</span>
                <span className="text-h3 font-semibold tabular-nums text-stone-900">
                  {formatPriceNumber(building.price_from_dirams)} TJS
                </span>
              </div>
            ) : null}
          </div>

          {listings.length === 0 ? (
            <AppCard>
              <AppCardContent>
                <p className="text-body text-stone-700">
                  Сейчас нет активных объявлений по этому ЖК.
                </p>
              </AppCardContent>
            </AppCard>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  building={building}
                  developerVerified={developer.is_verified}
                  districtMedianPerM2={median?.median ?? null}
                  districtSampleSize={median?.sample ?? 0}
                  hideBuildingName
                />
              ))}
            </div>
          )}
        </AppContainer>
      </section>

      {/* WEDGE-2: "Что рядом" — POI section with mosque/school/hospital/etc. */}
      <section id="nearby" className="scroll-mt-28 border-t border-stone-200 py-6">
        <AppContainer>
          <NearbyPois pois={pois} />
        </AppContainer>
      </section>

      {/* Developer block */}
      <section id="developer" className="scroll-mt-28 border-t border-stone-200 py-6">
        <AppContainer>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-caption font-medium text-stone-500">Застройщик</span>
                  <h3 className="text-h3 font-semibold text-stone-900">
                    {developer.display_name.ru}
                  </h3>
                  {developer.years_active || developer.projects_completed_count ? (
                    <span className="text-meta text-stone-500 tabular-nums">
                      {developer.years_active ? `${developer.years_active} лет на рынке` : ''}
                      {developer.years_active && developer.projects_completed_count ? ' · ' : ''}
                      {developer.projects_completed_count
                        ? `${developer.projects_completed_count} сданных проектов`
                        : ''}
                    </span>
                  ) : null}
                </div>
                <AppButton variant="secondary">Все проекты застройщика</AppButton>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>

      {/* Bottom finishing legend */}
      <section className="bg-stone-50 py-6 pb-9 md:pb-7">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold text-stone-900">Что значит отделка</h2>
          <div className="flex flex-wrap gap-2">
            <AppChip asStatic tone="finishing-no-finish">
              {tFinishing('no_finish')}
            </AppChip>
            <AppChip asStatic tone="finishing-pre-finish">
              {tFinishing('pre_finish')}
            </AppChip>
            <AppChip asStatic tone="finishing-full-finish">
              {tFinishing('full_finish')}
            </AppChip>
            <AppChip asStatic tone="finishing-owner-renovated">
              {tFinishing('owner_renovated')}
            </AppChip>
          </div>
        </AppContainer>
      </section>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-md border border-stone-200 bg-white p-3 md:flex-row md:items-center md:gap-3 md:p-4">
      <span className="text-stone-500">{icon}</span>
      <div className="flex flex-col">
        <span className="text-caption text-stone-500">{label}</span>
        <span className="text-meta font-semibold tabular-nums text-stone-900 md:text-h3">{value}</span>
      </div>
    </div>
  );
}

function amenityLabel(key: string) {
  const map: Record<string, string> = {
    parking: 'Паркинг',
    playground: 'Детская площадка',
    security: 'Охрана',
    elevator: 'Лифт',
    gym: 'Фитнес',
    'commercial-floor': 'Коммерческие помещения',
  };
  return map[key] ?? key;
}
