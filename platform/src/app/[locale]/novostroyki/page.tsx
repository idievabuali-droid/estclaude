import { Map as MapIcon, List, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppChip } from '@/components/primitives';
import { BuildingCard, MapView, MobileFiltersWrapper } from '@/components/blocks';
import {
  listBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import type { BuildingStatus } from '@/types/domain';
import type { PoiCategory } from '@/services/poi';
import {
  buildQuery,
  countActive,
  csvSet,
  hasAdvancedActive,
  removeHref,
  toggleHref,
  type FilterParams,
} from './filter-state';
import { PriceRangeFilter } from './PriceRangeFilter';
import { AdvancedFiltersToggle } from './AdvancedFiltersToggle';

const STATUS_FILTERS: Array<{ value: BuildingStatus; label: string }> = [
  { value: 'announced', label: 'Анонсирован' },
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

  // District filter is hidden in V1 (see filter sheet comment below) but
  // the URL param is still honoured at the service layer so old bookmarks
  // still narrow the result. listDistricts() is no longer needed for
  // rendering since the filter UI is gone.
  const filtered = await listBuildings({
    district: sp.district?.split(','),
    status: sp.status?.split(',') as BuildingStatus[] | undefined,
    // Per-m² filters arrive as TJS strings ("4000"); convert to dirams.
    pricePerM2From: sp.price_per_m2_from
      ? BigInt(parseInt(sp.price_per_m2_from, 10) * 100)
      : null,
    pricePerM2To: sp.price_per_m2_to
      ? BigInt(parseInt(sp.price_per_m2_to, 10) * 100)
      : null,
    handoverYears: sp.handover?.split(','),
    amenities: sp.amenities?.split(','),
    nearbyCategories: sp.nearby?.split(',') as PoiCategory[] | undefined,
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

  // Lookup maps for active-filter pills' display labels.
  const statusLabelByValue = new Map(STATUS_FILTERS.map((s) => [s.value, s.label]));
  const amenityLabelByValue = new Map(AMENITIES_FILTERS.map((a) => [a.value, a.label]));
  const nearbyLabelByValue = new Map(NEARBY_FILTERS.map((n) => [n.value, n.label]));

  const activeCount = countActive(sp);
  const advancedActiveCount =
    csvSet(sp.amenities).size + csvSet(sp.nearby).size;

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

          {/* Filter sheet — grouped sections inside MobileFiltersWrapper.
              Same component renders inline on desktop, bottom-sheet on
              mobile. activeCount drives the badge on the trigger button.

              РАЙОН filter is hidden in V1 — Vahdat is small enough that
              splitting 6 buildings across 5 microdistricts means each
              district filter narrows the result to 1-2 projects, which
              feels broken. District info still shows on every building
              card (address chip), so buyers can see where each project
              is without needing the filter. Re-enable when we have ~30+
              buildings and per-district volume justifies it. */}
          <MobileFiltersWrapper activeCount={activeCount}>
            <FilterSection title="Цена за м²">
              <PriceRangeFilter current={sp} />
            </FilterSection>

            <FilterSection title="Стадия">
              <ChipRow>
                {STATUS_FILTERS.map((s) => {
                  const active = csvSet(sp.status).has(s.value);
                  return (
                    <Link key={s.value} href={toggleHref(sp, 'status', s.value)}>
                      <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                        {s.label}
                      </AppChip>
                    </Link>
                  );
                })}
              </ChipRow>
            </FilterSection>

            <FilterSection title="Срок сдачи">
              <ChipRow>
                {HANDOVER_FILTERS.map((h) => {
                  const active = csvSet(sp.handover).has(h.value);
                  return (
                    <Link key={h.value} href={toggleHref(sp, 'handover', h.value)}>
                      <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                        {h.label}
                      </AppChip>
                    </Link>
                  );
                })}
              </ChipRow>
            </FilterSection>

            {/* Advanced filters — collapsed by default, opens with one tap.
                Auto-opens when the user landed with any advanced filter
                already active so they always see what's filtering. */}
            <AdvancedFiltersToggle
              defaultOpen={hasAdvancedActive(sp)}
              activeCount={advancedActiveCount}
            >
              <FilterSection title="Удобства дома">
                <ChipRow>
                  {AMENITIES_FILTERS.map((a) => {
                    const active = csvSet(sp.amenities).has(a.value);
                    return (
                      <Link key={a.value} href={toggleHref(sp, 'amenities', a.value)}>
                        <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                          {a.label}
                        </AppChip>
                      </Link>
                    );
                  })}
                </ChipRow>
              </FilterSection>

              <FilterSection title="Что рядом (≤ 1 км)">
                <ChipRow>
                  {NEARBY_FILTERS.map((n) => {
                    const active = csvSet(sp.nearby).has(n.value);
                    return (
                      <Link key={n.value} href={toggleHref(sp, 'nearby', n.value)}>
                        <AppChip asStatic tone={active ? 'terracotta' : 'neutral'} selected={active}>
                          <span className="mr-1" aria-hidden>{n.emoji}</span>
                          {n.label}
                        </AppChip>
                      </Link>
                    );
                  })}
                </ChipRow>
              </FilterSection>
            </AdvancedFiltersToggle>
          </MobileFiltersWrapper>

          {/* Active-filter pill row — visible above results so buyers
              always know what's filtering, with one-tap remove per pill
              and an 'Очистить всё' fallback. */}
          {activeCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
              <span className="text-caption font-medium text-stone-500">Активно:</span>
              {/* District pills hidden in V1 — filter UI is gone, see
                  filter sheet comment. URL param still narrows the
                  result for old links but isn't surfaced visually. */}
              {Array.from(csvSet(sp.status)).map((value) => (
                <ActivePill
                  key={`s-${value}`}
                  label={statusLabelByValue.get(value as BuildingStatus) ?? value}
                  href={removeHref(sp, 'status', value)}
                />
              ))}
              {sp.price_per_m2_from || sp.price_per_m2_to ? (
                <ActivePill
                  label={priceRangeLabel(sp.price_per_m2_from, sp.price_per_m2_to)}
                  href={`/novostroyki${buildQuery({
                    ...sp,
                    price_per_m2_from: undefined,
                    price_per_m2_to: undefined,
                  })}`}
                />
              ) : null}
              {Array.from(csvSet(sp.handover)).map((value) => (
                <ActivePill
                  key={`h-${value}`}
                  label={
                    HANDOVER_FILTERS.find((h) => h.value === value)?.label ?? value
                  }
                  href={removeHref(sp, 'handover', value)}
                />
              ))}
              {Array.from(csvSet(sp.amenities)).map((value) => (
                <ActivePill
                  key={`a-${value}`}
                  label={amenityLabelByValue.get(value) ?? value}
                  href={removeHref(sp, 'amenities', value)}
                />
              ))}
              {Array.from(csvSet(sp.nearby)).map((value) => (
                <ActivePill
                  key={`n-${value}`}
                  label={(nearbyLabelByValue.get(value as PoiCategory) ?? value) + ' рядом'}
                  href={removeHref(sp, 'nearby', value)}
                />
              ))}
              <Link
                href="/novostroyki"
                className="ml-auto text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
              >
                Очистить всё
              </Link>
            </div>
          ) : null}
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

/** Section wrapper for the filter sheet — gives every filter group a
 *  consistent label + spacing. */
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
        {title}
      </span>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/** One active-filter pill with an X. Tap removes that single value
 *  while keeping every other filter intact. */
function ActivePill({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-sm border border-terracotta-200 bg-terracotta-50 px-2 py-1 text-caption font-medium text-terracotta-800 hover:bg-terracotta-100"
      aria-label={`Убрать фильтр: ${label}`}
    >
      {label}
      <X className="size-3" aria-hidden />
    </Link>
  );
}

/** Compact human label for the price-range pill. */
function priceRangeLabel(from?: string, to?: string): string {
  if (from && to) return `${from} – ${to} TJS / м²`;
  if (from) return `от ${from} TJS / м²`;
  if (to) return `до ${to} TJS / м²`;
  return '';
}
