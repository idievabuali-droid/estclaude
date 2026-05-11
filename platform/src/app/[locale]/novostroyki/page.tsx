import { Map as MapIcon, List, ArrowLeft, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton } from '@/components/primitives';
import { BuildingCard, LocationSearch, MapView, SearchTracker, SaveSearchPrompt, FilterRelaxSuggestion, SortChip } from '@/components/blocks';
import { displayNameFromFilters } from '@/lib/saved-searches/format';
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
import { SizeChip } from './SizeChip';
import { FloorChip } from './FloorChip';
import { MultiSelectChip, type PoiIconKey } from './MultiSelectChip';
import { NovostroykiFilterRail } from './FilterRail';

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

/** Apartment-criteria rooms options (mobile chip-bar). 1/2/3/4 — matches
 *  the /kvartiry rooms chip set + the desktop FilterRail's ROOM_FILTERS. */
const ROOM_FILTERS_MOBILE: Array<{ value: string; label: string }> = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

/** "Что рядом" mobile chip filters — POI categories within 1km walking
 *  distance. Mosque first per Tajik market relevance. Each entry pairs
 *  the POI value with a serialisable iconKey (string) — the matching
 *  illustration is resolved inside MultiSelectChip's POI_ICONS map.
 *  Plain strings can cross the Server→Client boundary; raw component
 *  refs cannot, which crashed Next.js with "Functions cannot be passed
 *  directly to Client Components." */
const NEARBY_FILTERS: Array<{
  value: PoiCategory;
  label: string;
  iconKey: PoiIconKey;
}> = [
  { value: 'mosque', label: 'Мечеть', iconKey: 'mosque' },
  { value: 'school', label: 'Школа', iconKey: 'school' },
  { value: 'kindergarten', label: 'Детский сад', iconKey: 'kindergarten' },
  { value: 'supermarket', label: 'Магазин', iconKey: 'supermarket' },
  { value: 'hospital', label: 'Поликлиника', iconKey: 'hospital' },
  { value: 'pharmacy', label: 'Аптека', iconKey: 'pharmacy' },
  { value: 'transit', label: 'Транспорт', iconKey: 'transit' },
  { value: 'park', label: 'Парк', iconKey: 'park' },
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
  // Developer scope — when ?developer={id} is set, narrow to that
  // developer's projects. Looked up server-side so we can render
  // their display name in the contextual header. Anything that
  // doesn't resolve falls back to no-filter (better than 404).
  const scopedDeveloper = sp.developer ? await getDeveloperById(sp.developer) : null;

  const filtered = await listBuildings({
    district: sp.district?.split(','),
    status: sp.status?.split(',') as BuildingStatus[] | undefined,
    developerId: scopedDeveloper?.id,
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
    sort: sp.sort,
    // Free-text soft filter from the home hero "Найти" button. When
    // the buyer typed text that didn't match a structural pattern
    // (e.g. "Гулистон Резиденс"), we pass it through as a substring
    // match against the building name. The eyebrow above the result
    // list reflects the active query so the buyer can clear it.
    q: sp.q,
    // Apartment-criteria filters — service layer keeps only buildings
    // with at least one active listing matching these. URL params
    // match /kvartiry conventions (`rooms`, `size_from`, `size_to`).
    roomsIn: sp.rooms?.split(',').map((r) => parseInt(r, 10)).filter((n) => Number.isFinite(n) && n > 0),
    sizeFromApt: sp.size_from ? parseFloat(sp.size_from) : null,
    sizeToApt: sp.size_to ? parseFloat(sp.size_to) : null,
    floorFromApt: sp.floor_from ? parseInt(sp.floor_from, 10) : null,
    floorToApt: sp.floor_to ? parseInt(sp.floor_to, 10) : null,
  });

  // Parse the same apartment-criteria the gating filter above used,
  // so we can also narrow the inline unit preview on each card to
  // matching units only. Founder critique 2026-05-11: the building
  // card's inline list ("3-комн · 11 м² · 12 эт ...") was ignoring
  // the filter — buyer with `?rooms=2` saw the building card (because
  // the building has ≥1 2-room unit, gating works) but the 3 unit
  // rows shown were not 2-room ones, which felt broken.
  const aptRooms = sp.rooms?.split(',').map((r) => parseInt(r, 10)).filter((n) => Number.isFinite(n) && n > 0) ?? [];
  const aptSizeFrom = sp.size_from ? parseFloat(sp.size_from) : null;
  const aptSizeTo = sp.size_to ? parseFloat(sp.size_to) : null;
  const aptFloorFrom = sp.floor_from ? parseInt(sp.floor_from, 10) : null;
  const aptFloorTo = sp.floor_to ? parseInt(sp.floor_to, 10) : null;
  const hasAptFilter =
    aptRooms.length > 0 ||
    aptSizeFrom != null ||
    aptSizeTo != null ||
    aptFloorFrom != null ||
    aptFloorTo != null;

  const cards = await Promise.all(
    filtered.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      // Apply the apartment-criteria filter to the unit list so the
      // preview rows visible on the card match what the buyer asked
      // for. Same predicate as the service-layer building gate +
      // /zhk detail page filter — keeps semantics consistent across
      // all three surfaces.
      const filteredUnits = hasAptFilter
        ? units.filter((u) => {
            if (aptRooms.length && !aptRooms.includes(u.rooms_count)) return false;
            if (aptSizeFrom != null && Number(u.size_m2) < aptSizeFrom) return false;
            if (aptSizeTo != null && Number(u.size_m2) > aptSizeTo) return false;
            if (aptFloorFrom != null && u.floor_number < aptFloorFrom) return false;
            if (aptFloorTo != null && u.floor_number > aptFloorTo) return false;
            return true;
          })
        : units;
      return {
        b,
        dev,
        dist,
        units: filteredUnits.slice(0, 3),
        unitsTotal: filteredUnits.length,
      };
    }),
  );

  // Currency conversion is intentionally /diaspora-only — this list
  // page used to read the cookie + show TJS ≈ £ on every BuildingCard,
  // which diluted /diaspora's distinctive value proposition (founder
  // roleplay critique 2026-05-09). Cookie itself still persists for
  // the next /diaspora visit.

  return (
    <>
      {/* Fire search_run / search_no_results events for analytics. */}
      <SearchTracker page="novostroyki" filters={sp} resultCount={filtered.length} />

      {/* ─── PAGE HEADER ────────────────────────────────────────
          H1 + LocationSearch full-width above the two-column body.
          Mirrors the editorial-luxury voice from the rest of the
          platform: serif H1 in display size on a generous header
          band before the dense filter+grid body. */}
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-6 md:py-8">
          <div className="flex flex-col gap-1">
            <h1
              className="text-h1 font-semibold text-stone-900 md:text-display"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {scopedDeveloper
                ? `Проекты от ${scopedDeveloper.display_name.ru}`
                : sp.near_label
                  ? `Рядом с «${sp.near_label}»`
                  : t('buildings')}
            </h1>
          </div>
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
        </AppContainer>
      </section>

      {/* ─── BODY: filter rail + content ─────────────────────────
          Desktop two-column per the senior-design prescription:
          260px filter rail on the left, content (above-grid header
          + grid OR map) on the right. Mobile collapses to a single
          column with the existing chip bar pattern at the top of
          the content area. */}
      <AppContainer>
        <div className="flex flex-col gap-6 py-6 md:flex-row md:gap-7 md:py-8">
          {/* DESKTOP RAIL — hidden <md, shows the new eyebrow-grouped
              filter UI. Sticky so it follows the buyer down the
              grid rather than scrolling off-screen. */}
          <div className="md:sticky md:top-20 md:self-start">
            <NovostroykiFilterRail current={sp} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* MOBILE chip bar — preserved for <md. The new desktop
                rail covers md+. The "Фильтры" full-screen sheet
                pattern (also in the prescription) is deferred to a
                follow-up polish pass.

                Order matches the desktop rail: apartment-criteria
                chips (Комнат / Площадь / Цена) first since they're
                the most decisive, then building-level chips. Founder
                critique 2026-05-11: buyers shop by "I want a 2-bedroom
                around 60 m² under 200K" — those filters need to be
                front-loaded.

                Sticky on scroll (top-14 anchors below the SiteHeader's
                h-14) so the buyer can change filters at any scroll
                depth without scrolling back up. Founder critique
                2026-05-11 second pass: "the filters should stick on
                top — anytime we want to change them we should be able
                to do it." z-20 < SiteHeader's z-30 so the header still
                overlaps if any visual collision; bg-white + border-b
                so the cards underneath don't bleed through. */}
            <div className="sticky top-14 z-20 -mx-4 border-b border-stone-200 bg-white md:hidden">
              <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <MultiSelectChip
                  label="Комнат"
                  paramKey="rooms"
                  options={ROOM_FILTERS_MOBILE}
                  current={sp}
                />
                <SizeChip current={sp} />
                <FloorChip current={sp} />
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

            {/* "Поиск: «X»" pill — set when the buyer typed free text on
                the home hero and was routed here. Visible above the
                count so they can see what's being soft-filtered and
                clear it with one tap. */}
            {sp.q ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-meta text-stone-700">
                  <span className="text-stone-500">Поиск:</span>
                  <span className="font-medium">«{sp.q}»</span>
                  <Link
                    href={`/novostroyki${buildQuery({ ...sp, q: undefined })}`}
                    aria-label="Сбросить поиск"
                    className="inline-flex size-5 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  >
                    <X className="size-3.5" aria-hidden />
                  </Link>
                </span>
              </div>
            ) : null}

            {/* ABOVE-GRID HEADER — single line "X проектов в Вахдате"
                + sort dropdown + Карта/Список tab toggle. Per the
                prescription this row sits above the grid and gives
                the buyer scan-context (count + range) before they
                read individual cards. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <p className="text-body text-stone-700 tabular-nums">
                <span className="font-semibold text-stone-900">{filtered.length}</span>{' '}
                {filtered.length === 1 ? 'проект' : 'проектов'} в Вахдате
                {sp.near_label && nearRadius
                  ? ` · в радиусе ${(nearRadius / 1000).toFixed(1)} км`
                  : ''}
                {priceRangeText(filtered) ? ` · ${priceRangeText(filtered)}` : ''}
              </p>
              <div className="flex items-center gap-2">
                <SortChip pagePath="/novostroyki" current={sp} />
                {/* Карта/Список tab toggle — single button that
                    flips view-mode. Per the prescription this sits
                    above the grid as the user's primary view choice. */}
                <Link
                  href={`/novostroyki${buildQuery({
                    ...sp,
                    view: isMap ? undefined : 'karta',
                  })}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 hover:bg-stone-100"
                >
                  {isMap ? (
                    <>
                      <List className="size-4" /> Список
                    </>
                  ) : (
                    <>
                      <MapIcon className="size-4" /> Карта
                    </>
                  )}
                </Link>
              </div>
            </div>

            {isMap ? (
              <div className="-mx-4 md:mx-0">
                <MapView
                  buildings={filtered}
                  nearPoi={
                    nearLat != null && nearLng != null && sp.near_label && nearRadius
                      ? { lat: nearLat, lng: nearLng, label: sp.near_label, radiusM: nearRadius }
                      : null
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {(sp.wizard ||
                  countActiveFilters(sp) >= 2 ||
                  filtered.length === 0) &&
                hasActiveFilters(sp) ? (
                  <SaveSearchPrompt
                    page="novostroyki"
                    filters={sp}
                    noResults={filtered.length === 0}
                    resultCount={sp.wizard ? filtered.length : undefined}
                    filterSummary={
                      sp.wizard ? displayNameFromFilters('novostroyki', sp) : undefined
                    }
                  />
                ) : null}
                {filtered.length <= 1 && countActiveFilters(sp) >= 2 ? (
                  <FilterRelaxSuggestion
                    pagePath="/novostroyki"
                    currentParams={sp}
                    resultCount={filtered.length}
                    relaxOptions={await buildRelaxOptionsNovostroykiWithCounts(sp)}
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
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
                          // Forward the apartment-criteria filters to
                          // the /zhk detail page so its inline preview
                          // narrows to matching units. Building-level
                          // filters (status / handover / amenities /
                          // nearby) are dropped — those don't apply
                          // unit-by-unit inside one project. Founder
                          // critique 2026-05-11: "when I filter
                          // apartments and open a building, it should
                          // show those apartments — not just any."
                          forwardFilterParams={{
                            rooms: sp.rooms,
                            size_from: sp.size_from,
                            size_to: sp.size_to,
                            floor_from: sp.floor_from,
                            floor_to: sp.floor_to,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AppContainer>
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

/** Adds per-option count previews. Per-option listBuildings re-runs
 *  with the relax param dropped — small N, V1 OK. */
async function buildRelaxOptionsNovostroykiWithCounts(
  sp: FilterParams,
): Promise<Array<{ paramKey: string; label: string; count?: number }>> {
  const base = buildRelaxOptionsNovostroyki(sp);
  const counts = await Promise.all(
    base.map(async (opt) => {
      const next: FilterParams = { ...sp };
      if (opt.paramKey === 'price_to' || opt.paramKey === 'price_from') {
        delete next.price_from;
        delete next.price_to;
      } else if (
        opt.paramKey === 'price_per_m2_to' ||
        opt.paramKey === 'price_per_m2_from'
      ) {
        delete next.price_per_m2_from;
        delete next.price_per_m2_to;
      } else {
        delete (next as Record<string, unknown>)[opt.paramKey];
      }
      const list = await listBuildings({
        district: next.district?.split(','),
        status: next.status?.split(',') as BuildingStatus[] | undefined,
        priceFrom: next.price_from ? BigInt(parseInt(next.price_from, 10) * 100) : null,
        priceTo: next.price_to ? BigInt(parseInt(next.price_to, 10) * 100) : null,
        pricePerM2From: next.price_per_m2_from
          ? BigInt(parseInt(next.price_per_m2_from, 10) * 100)
          : null,
        pricePerM2To: next.price_per_m2_to
          ? BigInt(parseInt(next.price_per_m2_to, 10) * 100)
          : null,
        handoverYears: next.handover?.split(','),
        amenities: next.amenities?.split(','),
        nearbyCategories: next.nearby?.split(',') as PoiCategory[] | undefined,
        nearLat: next.near_lat ? parseFloat(next.near_lat) : null,
        nearLng: next.near_lng ? parseFloat(next.near_lng) : null,
        nearRadiusM: next.radius ? parseInt(next.radius, 10) : next.near_lat ? 1500 : null,
      });
      return { ...opt, count: list.length };
    }),
  );
  return counts;
}

