import { ChevronLeft, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton } from '@/components/primitives';
import { ListingCard, LocationSearch, SearchTracker, SaveSearchPrompt, FilterRelaxSuggestion, SortChip, type SortMode } from '@/components/blocks';
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
import { MonthlyChip } from './MonthlyChip';

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
  /** LocationSearch radius filter — see filter-state.ts on /novostroyki
   *  for the same field set. Defaults to 1500m when near_lat is set
   *  but radius is missing. */
  near_lat?: string;
  near_lng?: string;
  near_label?: string;
  radius?: string;
  /** Max monthly installment payment in TJS — installment-decisive
   *  buyers think in monthly, not total. */
  monthly_to?: string;
  /** Sort mode — see SortChip / ListingFilters.sort. */
  sort?: SortMode;
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
  const nearLat = sp.near_lat ? parseFloat(sp.near_lat) : null;
  const nearLng = sp.near_lng ? parseFloat(sp.near_lng) : null;
  const nearRadius = sp.radius ? parseInt(sp.radius, 10) : nearLat != null ? 1500 : null;
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
    maxMonthlyDirams: sp.monthly_to
      ? BigInt(parseInt(sp.monthly_to, 10) * 100)
      : null,
    buildingId: scopedBuilding?.id,
    nearLat,
    nearLng,
    nearRadiusM: nearRadius,
    sort: sp.sort,
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
      {/* Same purpose as the SearchTracker on /novostroyki — fires
          search_run + search_no_results when the user lands on a
          filtered URL. Skips bare /kvartiry visits (page_view covers
          those). */}
      <SearchTracker page="kvartiry" filters={sp} resultCount={filtered.length} />
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
                : sp.near_label
                  ? `Рядом с «${sp.near_label}»`
                  : t('apartments')}
            </h1>
            <p className="text-meta text-stone-500 tabular-nums">
              {filtered.length}{' '}
              {pluralRu(filtered.length, ['объявление', 'объявления', 'объявлений'])}
              {sp.near_label && nearRadius
                ? ` · в радиусе ${(nearRadius / 1000).toFixed(1)} км`
                : ''}
            </p>
          </div>

          {/* LocationSearch — same pattern as /novostroyki. Hidden when
              the page is scoped to a building (the buyer is already
              inside that project's units, location filter is moot). */}
          {!scopedBuilding ? (
            <div className="flex flex-col gap-2">
              <LocationSearch
                destinationPath="/kvartiry"
                variant="compact"
                initialQuery={sp.near_label ?? ''}
              />
              {sp.near_label ? (
                <Link
                  href={`/kvartiry${buildKvartiryQueryWithoutNear(sp)}`}
                  className="inline-flex w-fit items-center gap-1 text-caption text-stone-500 hover:text-terracotta-700"
                >
                  <X className="size-3" />
                  Убрать «{sp.near_label}»
                </Link>
              ) : null}
            </div>
          ) : null}

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
              <MonthlyChip current={sp} />
              <SizeChip current={sp} />
              <MultiSelectChip
                label="Отделка"
                paramKey="finishing"
                options={FINISHING_FILTERS}
                current={sp}
              />
              <SortChip pagePath="/kvartiry" current={sp} />
            </div>
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer className="flex flex-col gap-5">
          {/* "Save this search" prompt — same affordance as on
              /novostroyki. Skip when no filters are active (a bare
              /kvartiry visit isn't a search worth saving) and when
              the page is scoped to a single building (the buyer is
              already on that building's set). */}
          {/* Same deferral as /novostroyki — only show this when the
              search is "serious" (≥2 filters or 0 results), so single-
              chip browsing isn't interrupted. Building scope is treated
              as navigation, not a filter (already excluded). */}
          {(countActiveFiltersK(sp) >= 2 || filtered.length === 0) &&
          hasActiveFiltersK(sp) &&
          !scopedBuilding ? (
            <SaveSearchPrompt
              page="kvartiry"
              filters={sp}
              noResults={filtered.length === 0}
            />
          ) : null}
          {filtered.length <= 1 && countActiveFiltersK(sp) >= 2 ? (
            <FilterRelaxSuggestion
              pagePath="/kvartiry"
              currentParams={sp}
              resultCount={filtered.length}
              relaxOptions={await buildRelaxOptionsKvartiryWithCounts(sp, scopedBuilding?.id)}
            />
          ) : null}
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

/** True when the visitor has narrowed the result set in a way that's
 *  worth saving as an alert. The `building` scope is treated as
 *  navigation, not a search criterion (see the call-site filter). */
function hasActiveFiltersK(sp: SearchParams): boolean {
  return Boolean(
    sp.rooms ||
      sp.source ||
      sp.finishing ||
      sp.price_from ||
      sp.price_to ||
      sp.size_from ||
      sp.size_to ||
      sp.monthly_to,
  );
}

function countActiveFiltersK(sp: SearchParams): number {
  let n = 0;
  if (sp.rooms) n++;
  if (sp.source) n++;
  if (sp.finishing) n++;
  if (sp.price_from || sp.price_to) n++;
  if (sp.size_from || sp.size_to) n++;
  if (sp.monthly_to) n++;
  return n;
}

/** Strips the LocationSearch params from the current URL while
 *  preserving every other filter, building scope, etc. Used by the
 *  "× Убрать «X»" link under the search input. */
function buildKvartiryQueryWithoutNear(sp: SearchParams): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (!v) continue;
    if (k === 'near_lat' || k === 'near_lng' || k === 'near_label' || k === 'radius') continue;
    search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

function buildRelaxOptionsKvartiry(
  sp: SearchParams,
): Array<{ paramKey: string; label: string }> {
  // Same priority as /novostroyki — soft preferences before hard
  // constraints (price/rooms). Faridun won't relax his price ceiling
  // by accident.
  const opts: Array<{ paramKey: string; label: string }> = [];
  if (sp.finishing) opts.push({ paramKey: 'finishing', label: 'Отделка' });
  if (sp.size_from || sp.size_to) {
    opts.push({ paramKey: sp.size_to ? 'size_to' : 'size_from', label: 'Площадь' });
  }
  if (sp.monthly_to) opts.push({ paramKey: 'monthly_to', label: 'В рассрочку' });
  if (sp.source) opts.push({ paramKey: 'source', label: 'Источник' });
  if (sp.rooms) opts.push({ paramKey: 'rooms', label: 'Комнат' });
  if (sp.price_from || sp.price_to) {
    opts.push({ paramKey: sp.price_to ? 'price_to' : 'price_from', label: 'Цена' });
  }
  return opts.slice(0, 3);
}

/** Same as buildRelaxOptionsKvartiry but each option also includes
 *  the result count after dropping that filter — Krisha pattern.
 *  Runs a per-option listListings query (~3 extra queries on a relax
 *  prompt, fine at V1 scale). The count is the listings the visitor
 *  would see if they tapped the relax option. */
async function buildRelaxOptionsKvartiryWithCounts(
  sp: SearchParams,
  scopedBuildingId?: string,
): Promise<Array<{ paramKey: string; label: string; count?: number }>> {
  const base = buildRelaxOptionsKvartiry(sp);
  const counts = await Promise.all(
    base.map(async (opt) => {
      const next: SearchParams = { ...sp };
      // Drop both halves of any range param so the relax UX matches
      // what the chip's X actually does (clears both bounds).
      if (opt.paramKey === 'price_from' || opt.paramKey === 'price_to') {
        delete next.price_from;
        delete next.price_to;
      } else if (opt.paramKey === 'size_from' || opt.paramKey === 'size_to') {
        delete next.size_from;
        delete next.size_to;
      } else {
        delete (next as Record<string, unknown>)[opt.paramKey];
      }
      const list = await listListings({
        rooms: next.rooms?.split(',').map((r) => parseInt(r, 10)),
        source: next.source?.split(',') as SourceType[] | undefined,
        finishing: next.finishing?.split(',') as FinishingType[] | undefined,
        priceFrom: next.price_from ? BigInt(parseInt(next.price_from, 10) * 100) : null,
        priceTo: next.price_to ? BigInt(parseInt(next.price_to, 10) * 100) : null,
        sizeFrom: next.size_from ? parseFloat(next.size_from) : null,
        sizeTo: next.size_to ? parseFloat(next.size_to) : null,
        maxMonthlyDirams: next.monthly_to ? BigInt(parseInt(next.monthly_to, 10) * 100) : null,
        buildingId: scopedBuildingId,
        nearLat: next.near_lat ? parseFloat(next.near_lat) : null,
        nearLng: next.near_lng ? parseFloat(next.near_lng) : null,
        nearRadiusM: next.radius ? parseInt(next.radius, 10) : next.near_lat ? 1500 : null,
      });
      return { ...opt, count: list.length };
    }),
  );
  return counts;
}

