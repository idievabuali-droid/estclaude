import { Map as MapIcon, List } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppChip } from '@/components/primitives';
import { BuildingCard, MapView, MobileFiltersWrapper } from '@/components/blocks';
import {
  listBuildings,
  listDistricts,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import type { BuildingStatus } from '@/types/domain';

const STATUS_FILTERS: Array<{ value: BuildingStatus; label: string }> = [
  { value: 'announced', label: 'Анонсирован' },
  { value: 'under_construction', label: 'Строится' },
  { value: 'near_completion', label: 'Почти готов' },
  { value: 'delivered', label: 'Сдан' },
];

export default async function NovostroykiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ district?: string; status?: string; price_to?: string; view?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const isMap = sp.view === 'karta';

  const t = await getTranslations('Nav');

  // Apply filters from URL state (matches nuqs pattern in spec)
  const [filtered, mockDistricts] = await Promise.all([
    listBuildings({
      district: sp.district?.split(','),
      status: sp.status?.split(',') as BuildingStatus[] | undefined,
      priceTo: sp.price_to ? BigInt(parseInt(sp.price_to, 10) * 100) : null,
    }),
    listDistricts(),
  ]);

  // Pre-fetch developer + district + units for each card
  const cards = await Promise.all(
    filtered.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      return { b, dev, dist, units: units.slice(0, 3) };
    }),
  );

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 font-semibold text-stone-900">{t('buildings')}</h1>
              <p className="text-meta text-stone-500 tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'проект' : 'проектов'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isMap ? (
                <Link
                  href="/novostroyki"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
                >
                  <List className="size-4" /> Список
                </Link>
              ) : (
                <Link
                  href="/novostroyki?view=karta"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
                >
                  <MapIcon className="size-4" /> Карта
                </Link>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <MobileFiltersWrapper
            activeCount={
              (sp.district ? sp.district.split(',').length : 0) +
              (sp.status ? sp.status.split(',').length : 0)
            }
          >
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-caption font-medium text-stone-500">Район:</span>
              {mockDistricts.map((d) => {
                const active = sp.district?.split(',').includes(d.slug) ?? false;
                return (
                  <Link
                    key={d.id}
                    href={active ? '/novostroyki' : `/novostroyki?district=${d.slug}`}
                  >
                    <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                      {d.name.ru}
                    </AppChip>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-caption font-medium text-stone-500">Статус:</span>
              {STATUS_FILTERS.map((s) => {
                const active = sp.status?.split(',').includes(s.value) ?? false;
                return (
                  <Link
                    key={s.value}
                    href={active ? '/novostroyki' : `/novostroyki?status=${s.value}`}
                  >
                    <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                      {s.label}
                    </AppChip>
                  </Link>
                );
              })}
            </div>
          </MobileFiltersWrapper>
        </AppContainer>
      </section>

      {isMap && <MapView buildings={filtered} />}
      {!isMap && (
        <section className="py-6">
          <AppContainer>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-stone-200 bg-white p-7 text-center">
                <p className="text-h3 font-semibold text-stone-900">Ничего не найдено</p>
                <p className="text-meta text-stone-500">
                  Попробуйте изменить фильтры или сбросить их.
                </p>
                <Link href="/novostroyki">
                  <AppButton variant="secondary">Сбросить фильтры</AppButton>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {cards.map(({ b, dev, dist, units }) => {
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
            )}
          </AppContainer>
        </section>
      )}
    </>
  );
}
