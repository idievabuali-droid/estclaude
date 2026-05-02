import { ChevronLeft } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton } from '@/components/primitives';
import { ListingCard } from '@/components/blocks';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';
import { listListings } from '@/services/listings';
import { listBuildings, getDeveloperById, getBuildingBySlug } from '@/services/buildings';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { pluralRu } from '@/lib/format';
import type { FinishingType, SourceType } from '@/types/domain';
import { PriceChip } from './PriceChip';
import { SizeChip } from './SizeChip';
import { MultiSelectChip } from './MultiSelectChip';

// Source filter (developer/owner/intermediary) hidden in V1 — every
// listing currently comes from the founder, so the filter has nothing
// to filter. Will return when real seller diversity exists.

const FINISHING_FILTERS: Array<{ value: FinishingType; label: string }> = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

const ROOM_FILTERS = ['1', '2', '3', '4'];

type SearchParams = {
  rooms?: string;
  source?: string;
  finishing?: string;
  /** Min total price in TJS (no decimals). */
  price_from?: string;
  /** Max total price in TJS. */
  price_to?: string;
  /** Min apartment size in m² (decimals allowed, e.g. "45.5"). */
  size_from?: string;
  /** Max apartment size in m². */
  size_to?: string;
  /** Building scope — when set, /kvartiry shows only this building's
   *  apartments. Used by the "Посмотреть все N квартир" CTA on the
   *  building detail page. The header changes to "Квартиры в ЖК X"
   *  and a breadcrumb back to /zhk/<slug> appears. */
  building?: string;
};

export default async function KvartiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('Nav');

  // Building scope — when ?building=<slug> is set we look up the
  // building by slug so we can (a) pass its UUID into listListings as
  // a building filter and (b) render the building name in the header.
  const scopedBuilding = sp.building ? await getBuildingBySlug(sp.building) : null;

  // listListings already applies trust-weighted ranking per Tech Spec §9.4
  const filtered = await listListings({
    rooms: sp.rooms?.split(',').map((r) => parseInt(r, 10)),
    source: sp.source?.split(',') as SourceType[] | undefined,
    finishing: sp.finishing?.split(',') as FinishingType[] | undefined,
    // Price params arrive as TJS strings ("800000"); convert to dirams
    // (1 TJS = 100 dirams) before handing to the service.
    priceFrom: sp.price_from ? BigInt(parseInt(sp.price_from, 10) * 100) : null,
    priceTo: sp.price_to ? BigInt(parseInt(sp.price_to, 10) * 100) : null,
    sizeFrom: sp.size_from ? parseFloat(sp.size_from) : null,
    sizeTo: sp.size_to ? parseFloat(sp.size_to) : null,
    buildingId: scopedBuilding?.id,
  });

  // Pre-fetch building + developer + benchmark for each card
  const buildingIds = [...new Set(filtered.map((l) => l.building_id))];
  const allBuildings = await listBuildings({});
  const buildingMap = new Map(allBuildings.filter((b) => buildingIds.includes(b.id)).map((b) => [b.id, b]));
  const developerIds = [...new Set([...buildingMap.values()].map((b) => b.developer_id))];
  const districtIds = [...new Set([...buildingMap.values()].map((b) => b.district_id))];
  // Currency cookie + rates flow through to ListingCard so a diaspora
  // visitor sees prices in their own currency on this list too. Local
  // buyers (cookie unset or TJS) see no extra noise — PriceConversion
  // returns null for TJS or missing rate.
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  const [developerEntries, benchmarkMap, rates] = await Promise.all([
    Promise.all(developerIds.map(async (id) => [id, await getDeveloperById(id)] as const)),
    getDistrictBenchmarks(districtIds),
    isDiaspora ? getExchangeRates() : Promise.resolve(null),
  ]);
  const developerMap = new Map(developerEntries);

  // Reset URL preserves building scope so "Сбросить фильтры" inside a
  // building scope returns to "all apartments in this building" rather
  // than the global apartments list.
  const resetHref = scopedBuilding ? `/kvartiry?building=${scopedBuilding.slug}` : '/kvartiry';

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          {/* Breadcrumb back to the building detail page — only shown
              when the page is scoped to a single building. Lets buyers
              return to the project context after browsing apartments. */}
          {scopedBuilding ? (
            <Link
              href={`/zhk/${scopedBuilding.slug}`}
              className="inline-flex w-fit items-center gap-1 text-meta text-stone-500 hover:text-terracotta-600"
            >
              <ChevronLeft className="size-4" />
              Назад к {scopedBuilding.name.ru}
            </Link>
          ) : null}

          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-semibold text-stone-900">
              {scopedBuilding
                ? `Квартиры в ${scopedBuilding.name.ru}`
                : t('apartments')}
            </h1>
            <p className="text-meta text-stone-500 tabular-nums">
              {filtered.length}{' '}
              {pluralRu(filtered.length, ['объявление', 'объявления', 'объявлений'])}
            </p>
          </div>

          {/* Cian-style category chip bar. One chip per filter category
              (Комнат / Цена / Отделка); each chip shows its current
              value summary inline and opens a bottom sheet with the
              options + an Apply button. Building scope is preserved
              across applies because each chip rebuilds the URL with
              the full param set (see PriceChip / MultiSelectChip).

              Source filter hidden in V1 — every listing currently
              comes from the founder so the filter has nothing to
              filter. Returns when real seller diversity exists. */}
          <div className="-mx-4 md:-mx-5 lg:-mx-6">
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-1 md:px-5 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MultiSelectChip
                label="Комнат"
                paramKey="rooms"
                options={ROOM_FILTERS.map((r) => ({ value: r, label: r }))}
                current={sp}
              />
              <PriceChip current={sp} />
              <SizeChip current={sp} />
              <MultiSelectChip
                label="Отделка"
                paramKey="finishing"
                options={FINISHING_FILTERS}
                current={sp}
              />
            </div>
          </div>
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
              <Link href={resetHref}>
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
                    currency={currency}
                    rates={rates}
                    districtMedianPerM2={benchmark ? Number(benchmark.median_per_m2_dirams) : null}
                    districtSampleSize={benchmark?.sample_size ?? 0}
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

