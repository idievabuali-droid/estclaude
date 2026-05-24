import { ChevronLeft, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton } from '@/components/primitives';
import { ListingCard, LocationSearch, SearchTracker, SaveSearchPrompt, FilterRelaxSuggestion, SortChip, type SortMode } from '@/components/blocks';
import { displayNameFromFilters } from '@/lib/saved-searches/format';
import { listListings } from '@/services/listings';
import { listBuildings, getDeveloperById, getBuildingBySlug } from '@/services/buildings';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { pluralRu } from '@/lib/format';
import type { FinishingType, SourceType } from '@/types/domain';
import { PriceChip } from './PriceChip';
import { SizeChip } from './SizeChip';
import { FloorChip } from './FloorChip';
import { MultiSelectChip } from './MultiSelectChip';
import { MonthlyChip } from './MonthlyChip';
import { KvartiryFilterRail } from './FilterRail';

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
  /** CSV of district slugs (e.g. "gulistan,sharora") — added 2026-05-21
   *  so the home hero District chip applies on /kvartiry too (previously
   *  the chip silently no-op'd here). Mirrors the same param on
   *  /novostroyki. Empty / missing = no district filter. */
  district?: string;
  /** Min total price in TJS (no decimals). */
  price_from?: string;
  /** Max total price in TJS. */
  price_to?: string;
  /** Min apartment size in m² (decimals allowed, e.g. "45.5"). */
  size_from?: string;
  /** Max apartment size in m². */
  size_to?: string;
  /** Apartment floor range (integer). Some buyers want a high floor
   *  (view + breeze), some want a low floor (elderly parents +
   *  strollers), some avoid the top floor (summer heat). */
  floor_from?: string;
  floor_to?: string;
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
  /** Set to "1" by /pomoshch-vybora on completion. Page reads this
   *  and renders the WizardResultBanner so the buyer sees their
   *  match count + a save-as-alert prompt instead of a generic
   *  filter result page. */
  wizard?: string;
  /** Free-text search query — soft `ilike` post-filter on building
   *  name / address / standalone street_address. Set by the home hero
   *  "Найти" button when the buyer typed text that didn't match a
   *  structural pattern. Renders as a "Поиск: «X»" eyebrow above the
   *  result list with a clear-X. */
  q?: string;
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
    district: sp.district?.split(','),
    // Price params arrive as TJS strings ("800000"); convert to dirams
    // (1 TJS = 100 dirams) before handing to the service.
    priceFrom: sp.price_from ? BigInt(parseInt(sp.price_from, 10) * 100) : null,
    priceTo: sp.price_to ? BigInt(parseInt(sp.price_to, 10) * 100) : null,
    sizeFrom: sp.size_from ? parseFloat(sp.size_from) : null,
    sizeTo: sp.size_to ? parseFloat(sp.size_to) : null,
    floorFrom: sp.floor_from ? parseInt(sp.floor_from, 10) : null,
    floorTo: sp.floor_to ? parseInt(sp.floor_to, 10) : null,
    maxMonthlyDirams: sp.monthly_to
      ? BigInt(parseInt(sp.monthly_to, 10) * 100)
      : null,
    buildingId: scopedBuilding?.id,
    nearLat,
    nearLng,
    nearRadiusM: nearRadius,
    sort: sp.sort,
    // Free-text soft filter from the home hero "Найти" button when
    // the buyer typed text that didn't match a structural pattern.
    // Substring match against building.name + building.address +
    // standalone street_address (case-insensitive). Empty no-ops.
    q: sp.q,
  });

  // Pre-fetch building + developer + benchmark for each card. Standalone
  // listings (building_id === null) are skipped here — their cards read
  // district from listing.district_id directly via getEffectiveDistrictId.
  const buildingIds = [
    ...new Set(filtered.map((l) => l.building_id).filter((id): id is string => id != null)),
  ];
  const allBuildings = await listBuildings({});
  const buildingMap = new Map(allBuildings.filter((b) => buildingIds.includes(b.id)).map((b) => [b.id, b]));
  const developerIds = [...new Set([...buildingMap.values()].map((b) => b.developer_id))];
  // District ids come from EITHER the parent building OR the standalone
  // listing's own district_id. Benchmark map needs both.
  const districtIdsFromBuildings = [...buildingMap.values()].map((b) => b.district_id);
  const districtIdsFromStandalone = filtered
    .filter((l) => l.building_id == null)
    .map((l) => l.district_id)
    .filter((id): id is string => id != null);
  const districtIds = [...new Set([...districtIdsFromBuildings, ...districtIdsFromStandalone])];
  // Currency conversion is intentionally /diaspora-only — this list
  // page used to read the cookie + show TJS ≈ £ everywhere, which
  // diluted /diaspora's distinctive value proposition (founder roleplay
  // critique 2026-05-09). Cookie itself still persists for the next
  // /diaspora visit.
  const [developerEntries, benchmarkMap] = await Promise.all([
    Promise.all(developerIds.map(async (id) => [id, await getDeveloperById(id)] as const)),
    getDistrictBenchmarks(districtIds),
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

      {/* ─── PAGE HEADER ────────────────────────────────────────
          Breadcrumb (when scoped) + serif H1 + LocationSearch full-
          width above the two-column body.

          Mobile cut: when unscoped, the h1 just says «Квартиры» —
          restating what the buyer already tapped — and the search
          bar's value on mobile is low (chips do the filtering work).
          Section is `hidden md:block` in the unscoped case so the
          buyer reaches the first listing card faster. Scoped
          (building / near-POI) keeps it everywhere — the back-link
          + scoped h1 carry real context the buyer needs to confirm
          they're in the right view. */}
      <section
        className={
          scopedBuilding || sp.near_label
            ? 'border-b border-stone-200 bg-white'
            : 'hidden border-b border-stone-200 bg-white md:block'
        }
      >
        <AppContainer className="flex flex-col gap-4 py-6 md:py-8">
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
            <h1
              className="text-h1 font-semibold text-stone-900 md:text-display"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {scopedBuilding
                ? `Квартиры в ${scopedBuilding.name.ru}`
                : sp.near_label
                  ? `Рядом с «${sp.near_label}»`
                  : t('apartments')}
            </h1>
          </div>

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
        </AppContainer>
      </section>

      {/* ─── BODY: filter rail + content ─────────────────────────
          Desktop two-column per the senior-design prescription:
          260px filter rail on the left (with installment-emphasized
          treatment), content (above-grid header + grid) on the
          right. Mobile collapses to chip bar above grid. */}
      <AppContainer>
        <div className="flex flex-col gap-6 py-6 md:flex-row md:gap-7 md:py-8">
          <div className="md:sticky md:top-20 md:self-start">
            <KvartiryFilterRail current={sp} basePath={resetHref} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* MOBILE chip bar — preserved for <md.
                Sticky on scroll (top-14 anchors below the SiteHeader's
                h-14) so the buyer can change filters at any scroll
                depth without scrolling back up. Founder critique
                2026-05-11: "the filters should stick on top." z-20 <
                SiteHeader's z-30; bg-white + border-b so cards
                underneath don't bleed through. */}
            <div
              // `top` coordinates with the SiteHeader's hide-on-scroll
              // offset (see ScrollDirectionTracker). Slides up with the
              // header so no gap appears above the chip row.
              style={{ top: 'calc(3.5rem + var(--site-header-y, 0px))' }}
              className="sticky z-20 -mx-4 border-b border-stone-200 bg-white transition-[top] duration-200 md:hidden"
            >
              {/* `relative` so a 32px right-edge fade can hint that
                  more filter chips live behind horizontal scroll —
                  Cian pattern. */}
              <div className="relative">
                <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <MultiSelectChip
                    label="Комнат"
                    paramKey="rooms"
                    options={ROOM_FILTERS.map((r) => ({ value: r, label: r }))}
                    current={sp}
                  />
                  <PriceChip current={sp} />
                  <MonthlyChip current={sp} />
                  <SizeChip current={sp} />
                  <FloorChip current={sp} />
                  <MultiSelectChip
                    label="Отделка"
                    paramKey="finishing"
                    options={FINISHING_FILTERS}
                    current={sp}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
                  aria-hidden
                />
              </div>
            </div>

            {/* "Поиск: «X»" pill — set when the buyer typed free text on
                the home hero and was routed here. Visible above the
                count so they can see what's being soft-filtered and
                clear it with one tap. */}
            {sp.q ? (
              (() => {
                const clearParams = new URLSearchParams();
                for (const [k, v] of Object.entries(sp)) {
                  if (k !== 'q' && typeof v === 'string') clearParams.set(k, v);
                }
                const clearHref = clearParams.toString()
                  ? `/kvartiry?${clearParams.toString()}`
                  : '/kvartiry';
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-meta text-stone-700">
                      <span className="text-stone-500">Поиск:</span>
                      <span className="font-medium">«{sp.q}»</span>
                      <Link
                        href={clearHref}
                        aria-label="Сбросить поиск"
                        className="inline-flex size-5 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <X className="size-3.5" aria-hidden />
                      </Link>
                    </span>
                  </div>
                );
              })()
            ) : null}

            {/* ABOVE-GRID HEADER — count + sort. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <p className="text-body text-stone-700 tabular-nums">
                <span className="font-semibold text-stone-900">{filtered.length}</span>{' '}
                {pluralRu(filtered.length, ['объявление', 'объявления', 'объявлений'])}
                {sp.near_label && nearRadius
                  ? ` · в радиусе ${(nearRadius / 1000).toFixed(1)} км`
                  : ''}
              </p>
              <SortChip pagePath="/kvartiry" current={sp} />
            </div>

            <div className="flex flex-col gap-5">
              {(sp.wizard ||
                countActiveFiltersK(sp) >= 2 ||
                filtered.length === 0) &&
              hasActiveFiltersK(sp) &&
              !scopedBuilding ? (
                <SaveSearchPrompt
                  page="kvartiry"
                  filters={sp}
                  noResults={filtered.length === 0}
                  resultCount={sp.wizard ? filtered.length : undefined}
                  filterSummary={
                    sp.wizard ? displayNameFromFilters('kvartiry', sp) : undefined
                  }
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {filtered.map((l) => {
                    // Two cases: (1) listing has a parent ЖК — resolve
                    // building/dev/benchmark from buildingMap. (2) standalone
                    // listing — building is null, no developer; benchmark
                    // resolves directly from listing.district_id.
                    const building = l.building_id ? buildingMap.get(l.building_id) ?? null : null;
                    const dev = building ? developerMap.get(building.developer_id) : null;
                    const benchmarkDistrictId = building?.district_id ?? l.district_id ?? null;
                    const benchmark = benchmarkDistrictId
                      ? benchmarkMap.get(benchmarkDistrictId)
                      : null;
                    return (
                      <ListingCard
                        key={l.id}
                        listing={l}
                        building={building}
                        developerVerified={dev?.is_verified ?? false}
                        districtMedianPerM2={benchmark ? Number(benchmark.median_per_m2_dirams) : null}
                        districtSampleSize={benchmark?.sample_size ?? 0}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppContainer>
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
      sp.floor_from ||
      sp.floor_to ||
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
  if (sp.floor_from || sp.floor_to) n++;
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
  // by accident. Floor sits next to size/finishing in the "soft
  // preference" tier — easier to give up than rooms or budget.
  const opts: Array<{ paramKey: string; label: string }> = [];
  if (sp.finishing) opts.push({ paramKey: 'finishing', label: 'Отделка' });
  if (sp.floor_from || sp.floor_to) {
    opts.push({ paramKey: sp.floor_to ? 'floor_to' : 'floor_from', label: 'Этаж' });
  }
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
      } else if (opt.paramKey === 'floor_from' || opt.paramKey === 'floor_to') {
        delete next.floor_from;
        delete next.floor_to;
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
        floorFrom: next.floor_from ? parseInt(next.floor_from, 10) : null,
        floorTo: next.floor_to ? parseInt(next.floor_to, 10) : null,
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

