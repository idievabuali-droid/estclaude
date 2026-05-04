import { Map as MapIcon, List, ArrowLeft, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton } from '@/components/primitives';
import { BuildingCard, LocationSearch, MapView, SearchTracker, SaveSearchPrompt, FilterRelaxSuggestion } from '@/components/blocks';
import {
  listBuildings,
  getBuildingBySlug,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { getNearbyPOIs } from '@/services/poi';
import type { BuildingStatus } from '@/types/domain';
import type { PoiCategory } from '@/services/poi';
import { buildQuery, type FilterParams } from './filter-state';
import { PriceChip } from './PriceChip';
import { MultiSelectChip } from './MultiSelectChip';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';

const STATUS_FILTERS: Array<{ value: BuildingStatus; label: string }> = [
  // Labels mirror STAGE_INFO from @/lib/building-stages — first stage
  // is "Котлован" (foundation pit), not "Анонс", per Tajik construction
  // legal reality (developers can't sell pre-construction).
  { value: 'announced', label: 'Котлован' },
  { value: 'under_construction', label: 'Строится' },
  { value: 'near_completion', label: 'Почти готов' },
  { value: 'delivered', label: 'Сдан' },
];

const HANDOVER_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'delivered', label: 'Сдан' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028+', label: '2028+' },
];

const AMENITIES_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'parking', label: 'Парковка' },
  { value: 'security', label: 'Охрана' },
  { value: 'elevator', label: 'Лифт' },
  { value: 'playground', label: 'Детская площадка' },
  { value: 'gym', label: 'Фитнес' },
  { value: 'commercial-floor', label: 'Коммерческий этаж' },
];

/** "Что рядом" filters — POI categories within 1km walking distance.
 *  Mosque first per Tajik market relevance. */
const NEARBY_FILTERS: Array<{ value: PoiCategory; label: string; emoji: string }> = [
  { value: 'mosque', label: 'Мечеть', emoji: '🕌' },
  { value: 'school', label: 'Школа', emoji: '🏫' },
  { value: 'kindergarten', label: 'Детский сад', emoji: '👶' },
  { value: 'supermarket', label: 'Магазин', emoji: '🛒' },
  { value: 'hospital', label: 'Поликлиника', emoji: '🏥' },
  { value: 'pharmacy', label: 'Аптека', emoji: '💊' },
  { value: 'transit', label: 'Транспорт', emoji: '🚌' },
  { value: 'park', label: 'Парк', emoji: '🌳' },
];

export default async function NovostroykiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<FilterParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const isMap = sp.view === 'karta';

  const t = await getTranslations('Nav');

  // ─── Focus mode early branch ─────────────────────────────────
  // When "На карте" is clicked from an apartment / building / card,
  // we land here with ?view=karta&focus=<slug>. In that case we skip
  // the filter sheet entirely and render a minimal "you arrived from
  // <X>, here's what's around it" map. The full browse map is one
  // click away via the back link.
  if (isMap && sp.focus) {
    const focused = await getBuildingBySlug(sp.focus);
    if (focused) {
      const pois = await getNearbyPOIs(focused.latitude, focused.longitude);
      // Send the buyer back to the surface they tapped "На карте" from.
      // From an apartment card / detail page → back to that apartment.
      // From a building card / detail page (or unknown source) → back
      // to the building. We DON'T render "Все ЖК на карте" when the
      // source is an apartment because that's a different intent
      // (browsing buildings vs. studying one apartment) and showing
      // it next to the back link makes the user wonder if it's the
      // primary way out.
      const cameFromApartment = sp.from === 'kvartira' && sp.fromSlug;
      const backHref = cameFromApartment
        ? `/kvartira/${sp.fromSlug}`
        : `/zhk/${focused.slug}`;
      const backLabel = cameFromApartment
        ? 'Назад к квартире'
        : `Назад в ${focused.name.ru}`;
      return (
        <>
          <section className="border-b border-stone-200 bg-white">
            <AppContainer className="flex flex-wrap items-center justify-between gap-3 py-3">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-meta font-medium text-stone-700 hover:text-terracotta-700"
              >
                <ArrowLeft className="size-4" />
                <span>{backLabel}</span>
              </Link>
              {!cameFromApartment ? (
                <Link
                  href="/novostroyki?view=karta"
                  className="inline-flex items-center gap-1.5 text-meta font-medium text-stone-700 hover:text-terracotta-700"
                >
                  Все ЖК на карте
                </Link>
              ) : null}
            </AppContainer>
          </section>
          <MapView
            buildings={[]}
            focusedBuilding={focused}
            focusPois={pois}
          />
        </>
      );
    }
    // If the slug doesn't resolve (deleted / typo), fall through to
    // browse mode rather than 404 — the buyer can still find what
    // they were looking for in the list.
  }

  // District filter is hidden in V1 (see filter sheet comment below) but
  // the URL param is still honoured at the service layer so old bookmarks
  // still narrow the result. listDistricts() is no longer needed for
  // rendering since the filter UI is gone.
  const nearLat = sp.near_lat ? parseFloat(sp.near_lat) : null;
  const nearLng = sp.near_lng ? parseFloat(sp.near_lng) : null;
  const nearRadius = sp.radius ? parseInt(sp.radius, 10) : nearLat != null ? 1500 : null;
  const filtered = await listBuildings({
    district: sp.district?.split(','),
    status: sp.status?.split(',') as BuildingStatus[] | undefined,
    // Total-price filters (TJS strings → dirams).
    priceFrom: sp.price_from ? BigInt(parseInt(sp.price_from, 10) * 100) : null,
    priceTo: sp.price_to ? BigInt(parseInt(sp.price_to, 10) * 100) : null,
    // Per-m² range — kept for backwards compat with old saved searches;
    // no UI exposes it after the chip was retargeted to total price.
    pricePerM2From: sp.price_per_m2_from
      ? BigInt(parseInt(sp.price_per_m2_from, 10) * 100)
      : null,
    pricePerM2To: sp.price_per_m2_to
      ? BigInt(parseInt(sp.price_per_m2_to, 10) * 100)
      : null,
    handoverYears: sp.handover?.split(','),
    amenities: sp.amenities?.split(','),
    nearbyCategories: sp.nearby?.split(',') as PoiCategory[] | undefined,
    nearLat,
    nearLng,
    nearRadiusM: nearRadius,
  });

  const cards = await Promise.all(
    filtered.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      return { b, dev, dist, units: units.slice(0, 3), unitsTotal: units.length };
    }),
  );

  // Currency cookie + rates flow into BuildingCard so a diaspora
  // visitor sees per-m² prices in their own currency on the browse
  // list. Rates fetch is skipped for local buyers — fail-soft for
  // the diaspora case (cookie set but rates unavailable).
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  const rates = isDiaspora ? await getExchangeRates() : null;

  return (
    <>
      {/* Fire search_run / search_no_results events for analytics. The
          tracker dedupes via JSON of (filters + count) so React strict
          mode doesn't double-fire, and skips when no filters are set
          (a bare /novostroyki visit is a page_view, not a search). */}
      <SearchTracker page="novostroyki" filters={sp} resultCount={filtered.length} />
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-h1 font-semibold text-stone-900">
                {sp.near_label ? `Рядом с «${sp.near_label}»` : t('buildings')}
              </h1>
              <p className="text-meta text-stone-500 tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'проект' : 'проектов'}
                {sp.near_label && nearRadius
                  ? ` · в радиусе ${(nearRadius / 1000).toFixed(1)} км`
                  : ''}
                {/* Price range hint sets expectation BEFORE he scrolls.
                    Krisha pattern: "от X до Y" in the result-count line. */}
                {priceRangeText(filtered) ? ` · ${priceRangeText(filtered)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isMap ? (
                <Link
                  href={`/novostroyki${buildQuery({ ...sp, view: undefined })}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
                >
                  <List className="size-4" /> Список
                </Link>
              ) : (
                <Link
                  href={`/novostroyki${buildQuery({ ...sp, view: 'karta' })}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
                >
                  <MapIcon className="size-4" /> Карта
                </Link>
              )}
            </div>
          </div>

          {/* Cian-style horizontal filter bar. Single scrollable row with
              all filters as toggleable chips — no sheet, no "Фильтры"
              button, no vertical sections. Inline labels mark each
              group (Стадия / Сдача / Удобства / Что рядом) so buyers
              can scan groups while scrolling.

              Negative horizontal margins + matching inner padding let
              the bar bleed to the screen edge so chips can scroll
              flush with the viewport — important on mobile where the
              scroll affordance is the chip cut off at the right.

              РАЙОН filter is hidden in V1 — Vahdat is small enough
              that splitting 6 buildings across 5 microdistricts makes
              each district filter narrow the result to 1-2 projects,
              which feels broken. District info still shows on every
              building card (address chip), so buyers can see where
              each project is without needing the filter. */}
          {/* LocationSearch — same affordance as the home hero. When a
              POI is already selected the input is pre-populated with the
              label so the visitor sees what they searched for, and a
              one-tap "× убрать место" link strips the radius filter
              without touching the rest of the URL. */}
          <div className="flex flex-col gap-2">
            <LocationSearch
              destinationPath="/novostroyki"
              variant="compact"
              initialQuery={sp.near_label ?? ''}
            />
            {sp.near_label ? (
              <Link
                href={`/novostroyki${buildQuery({
                  ...sp,
                  near_lat: undefined,
                  near_lng: undefined,
                  near_label: undefined,
                  radius: undefined,
                })}`}
                className="inline-flex w-fit items-center gap-1 text-caption text-stone-500 hover:text-terracotta-700"
              >
                <X className="size-3" />
                Убрать «{sp.near_label}»
              </Link>
            ) : null}
          </div>

          {/* Cian-style category chip bar. One chip per filter category
              (Цена / Стадия / Сдача / Удобства / Что рядом). Each chip
              shows its current value summary inline and opens a bottom
              sheet with the full set of options + an Apply button. The
              bar scrolls horizontally on narrow viewports — chips are
              shrink-0 so they keep their natural width. */}
          {/* Chip order: high-decision filters first so the truncation
              edge of the horizontal scroll doesn't hide the chip a
              first-time buyer reaches for. Цена + Что рядом are
              decisive; Стадия/Сдача/Удобства are refinements. */}
          <div className="-mx-4 md:-mx-5 lg:-mx-6">
            <div className="flex items-center gap-2 overflow-x-auto px-4 py-1 md:px-5 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <PriceChip current={sp} />
              <MultiSelectChip
                label="Что рядом"
                paramKey="nearby"
                options={NEARBY_FILTERS}
                current={sp}
              />
              <MultiSelectChip
                label="Стадия"
                paramKey="status"
                options={STATUS_FILTERS}
                current={sp}
              />
              <MultiSelectChip
                label="Сдача"
                paramKey="handover"
                options={HANDOVER_FILTERS}
                current={sp}
              />
              <MultiSelectChip
                label="Удобства"
                paramKey="amenities"
                options={AMENITIES_FILTERS}
                current={sp}
              />
            </div>
          </div>
        </AppContainer>
      </section>

      {isMap && (
        <MapView
          buildings={filtered}
          nearPoi={
            nearLat != null && nearLng != null && sp.near_label && nearRadius
              ? { lat: nearLat, lng: nearLng, label: sp.near_label, radiusM: nearRadius }
              : null
          }
        />
      )}
      {!isMap && (
        <section className="py-6">
          <AppContainer className="flex flex-col gap-5">
            {/* "Save this search" prompt — always rendered when at
                least one filter is active. The 0-results variant is
                bigger and more directive (the buyer literally told us
                what's missing from inventory). */}
            {hasActiveFilters(sp) ? (
              <SaveSearchPrompt
                page="novostroyki"
                filters={sp}
                noResults={filtered.length === 0}
              />
            ) : null}
            {/* Filter-relax: when results are tight (0 or 1) and the
                visitor has 2+ filters active, surface 1-tap relax
                buttons. Faster than scrolling back to the chip bar
                and toggling a filter off manually. */}
            {filtered.length <= 1 && countActiveFilters(sp) >= 2 ? (
              <FilterRelaxSuggestion
                pagePath="/novostroyki"
                currentParams={sp}
                resultCount={filtered.length}
                relaxOptions={buildRelaxOptionsNovostroyki(sp)}
              />
            ) : null}
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
                {cards.map(({ b, dev, dist, units, unitsTotal }) => {
                  if (!dev || !dist) return null;
                  return (
                    <BuildingCard
                      key={b.id}
                      building={b}
                      developer={dev}
                      district={dist}
                      matchingUnits={units}
                      activeListingsCount={unitsTotal}
                      currency={currency}
                      rates={rates}
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

/** Returns "от 168К до 1.2М TJS" given the filtered building list,
 *  or empty string when no buildings have a price set. Uses the
 *  building's cheapest-unit price (price_from_dirams) since that's
 *  the figure each card already displays. */
function priceRangeText(buildings: Array<{ price_from_dirams?: bigint | null }>): string {
  const prices = buildings
    .map((b) => b.price_from_dirams)
    .filter((p): p is bigint => p != null);
  if (prices.length === 0) return '';
  // BigInt min/max (no Math.min on bigints).
  let min = prices[0]!;
  let max = prices[0]!;
  for (const p of prices) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const fmt = (dirams: bigint) => {
    const tjs = Number(dirams) / 100;
    if (tjs >= 1_000_000) return `${(tjs / 1_000_000).toFixed(1).replace(/\.0$/, '')}М`;
    if (tjs >= 1_000) return `${Math.round(tjs / 1_000)}К`;
    return String(Math.round(tjs));
  };
  if (min === max) return `от ${fmt(min)} TJS`;
  return `от ${fmt(min)} до ${fmt(max)} TJS`;
}

/** True when the visitor has narrowed the result set in any way that
 *  could be re-played as a notification trigger. View-mode toggles
 *  (?view=karta) and focus pins (?focus=...) are navigation, not
 *  search criteria, so they don't count. */
function hasActiveFilters(sp: FilterParams): boolean {
  return Boolean(
    sp.district ||
      sp.status ||
      sp.handover ||
      sp.amenities ||
      sp.nearby ||
      sp.price_from ||
      sp.price_to ||
      sp.price_per_m2_from ||
      sp.price_per_m2_to,
  );
}

/** Counts the number of distinct filter dimensions the visitor has
 *  set. Used to decide whether the FilterRelaxSuggestion is worth
 *  surfacing — one filter has nothing to relax that doesn't reset
 *  the whole search. */
function countActiveFilters(sp: FilterParams): number {
  let n = 0;
  if (sp.district) n++;
  if (sp.status) n++;
  if (sp.handover) n++;
  if (sp.amenities) n++;
  if (sp.nearby) n++;
  if (sp.price_from || sp.price_to) n++;
  if (sp.price_per_m2_from || sp.price_per_m2_to) n++;
  return n;
}

/** Per-filter human label for the relax suggestion. Order = priority:
 *  the filters most likely to be over-narrow appear first. */
function buildRelaxOptionsNovostroyki(
  sp: FilterParams,
): Array<{ paramKey: string; label: string }> {
  // Order = "least likely to be the user's hard constraint first" so
  // we don't prompt Faridun to drop his price ceiling. Amenities/nearby
  // tend to be soft preferences; price/district are hard.
  const opts: Array<{ paramKey: string; label: string }> = [];
  if (sp.amenities) opts.push({ paramKey: 'amenities', label: 'Удобства' });
  if (sp.nearby) opts.push({ paramKey: 'nearby', label: 'Что рядом' });
  if (sp.handover) opts.push({ paramKey: 'handover', label: 'Сдача' });
  if (sp.status) opts.push({ paramKey: 'status', label: 'Стадия' });
  if (sp.district) opts.push({ paramKey: 'district', label: 'Район' });
  if (sp.price_from || sp.price_to) opts.push({ paramKey: 'price_to', label: 'Цена' });
  if (sp.price_per_m2_from || sp.price_per_m2_to) {
    opts.push({ paramKey: 'price_per_m2_to', label: 'Цена за м²' });
  }
  return opts.slice(0, 3);
}

