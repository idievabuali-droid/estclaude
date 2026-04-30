import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppChip } from '@/components/primitives';
import { ListingCard, MobileFiltersWrapper } from '@/components/blocks';
import { listListings } from '@/services/listings';
import { listBuildings, getDeveloperById } from '@/services/buildings';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { getExchangeRates } from '@/services/currency';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import type { SourceType, FinishingType } from '@/types/domain';

const SOURCE_FILTERS: Array<{ value: SourceType; label: string }> = [
  { value: 'developer', label: 'От застройщика' },
  { value: 'owner', label: 'Собственник' },
  { value: 'intermediary', label: 'Посредник' },
];

const FINISHING_FILTERS: Array<{ value: FinishingType; label: string }> = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

const ROOM_FILTERS = ['1', '2', '3', '4'];

export default async function KvartiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    rooms?: string;
    source?: string;
    finishing?: string;
    price_to?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('Nav');

  // listListings already applies trust-weighted ranking per Tech Spec §9.4
  const filtered = await listListings({
    rooms: sp.rooms?.split(',').map((r) => parseInt(r, 10)),
    source: sp.source?.split(',') as SourceType[] | undefined,
    finishing: sp.finishing?.split(',') as FinishingType[] | undefined,
    priceTo: sp.price_to ? BigInt(parseInt(sp.price_to, 10) * 100) : null,
  });

  // Pre-fetch building + developer + benchmark for each card
  const buildingIds = [...new Set(filtered.map((l) => l.building_id))];
  const allBuildings = await listBuildings({});
  const buildingMap = new Map(allBuildings.filter((b) => buildingIds.includes(b.id)).map((b) => [b.id, b]));
  const developerIds = [...new Set([...buildingMap.values()].map((b) => b.developer_id))];
  const districtIds = [...new Set([...buildingMap.values()].map((b) => b.district_id))];
  const [developerEntries, benchmarkMap, currency, rates] = await Promise.all([
    Promise.all(developerIds.map(async (id) => [id, await getDeveloperById(id)] as const)),
    getDistrictBenchmarks(districtIds),
    readCurrencyCookie(),
    getExchangeRates(),
  ]);
  const developerMap = new Map(developerEntries);

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-semibold text-stone-900">{t('apartments')}</h1>
            <p className="text-meta text-stone-500 tabular-nums">
              {filtered.length} объявлений
            </p>
          </div>

          {/* Filter chips — collapse to bottom-sheet on mobile */}
          <MobileFiltersWrapper
            activeCount={
              (sp.rooms ? sp.rooms.split(',').length : 0) +
              (sp.source ? sp.source.split(',').length : 0) +
              (sp.finishing ? sp.finishing.split(',').length : 0)
            }
          >
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-caption font-medium text-stone-500">Комнат:</span>
              {ROOM_FILTERS.map((r) => {
                const active = sp.rooms?.split(',').includes(r) ?? false;
                return (
                  <Link key={r} href={active ? '/kvartiry' : `/kvartiry?rooms=${r}`}>
                    <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                      {r}
                    </AppChip>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-caption font-medium text-stone-500">Источник:</span>
              {SOURCE_FILTERS.map((s) => {
                const active = sp.source?.split(',').includes(s.value) ?? false;
                return (
                  <Link key={s.value} href={active ? '/kvartiry' : `/kvartiry?source=${s.value}`}>
                    <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                      {s.label}
                    </AppChip>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-caption font-medium text-stone-500">Отделка:</span>
              {FINISHING_FILTERS.map((f) => {
                const active = sp.finishing?.split(',').includes(f.value) ?? false;
                return (
                  <Link
                    key={f.value}
                    href={active ? '/kvartiry' : `/kvartiry?finishing=${f.value}`}
                  >
                    <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                      {f.label}
                    </AppChip>
                  </Link>
                );
              })}
            </div>
          </MobileFiltersWrapper>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-stone-200 bg-white p-7 text-center">
              <p className="text-h3 font-semibold text-stone-900">Ничего не найдено</p>
              <p className="text-meta text-stone-500">
                Попробуйте изменить фильтры или сбросить их.
              </p>
              <Link href="/kvartiry">
                <AppButton variant="secondary">Сбросить фильтры</AppButton>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {filtered.map((l) => {
                const building = buildingMap.get(l.building_id);
                if (!building) return null;
                const dev = developerMap.get(building.developer_id);
                const benchmark = benchmarkMap.get(building.district_id);
                return (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    building={building}
                    developerVerified={dev?.is_verified ?? false}
                    districtMedianPerM2={benchmark ? Number(benchmark.median_per_m2_dirams) : null}
                    districtSampleSize={benchmark?.sample_size ?? 0}
                    currency={currency}
                    rates={rates}
                  />
                );
              })}
            </div>
          )}
        </AppContainer>
      </section>
    </>
  );
}
