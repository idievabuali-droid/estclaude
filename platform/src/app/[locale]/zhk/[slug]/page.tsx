import { notFound } from 'next/navigation';
import { MapPin, Calendar, Layers, Users, Camera, ArrowUpRight, BadgeCheck } from 'lucide-react';
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
  BuildingStageProgress,
  PriceConversion,
} from '@/components/blocks';
import { getBuilding, getDeveloperStats } from '@/services/buildings';
import { getDistrictBenchmark } from '@/services/benchmarks';
import { getNearbyPOIs } from '@/services/poi';
import { getExchangeRates } from '@/services/currency';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { formatPriceNumber, pluralRu } from '@/lib/format';
import { STAGE_INFO } from '@/lib/building-stages';

/** Max apartment cards rendered inline on the building detail page.
 *  When more exist, a "Посмотреть все N" CTA links to the filtered
 *  /kvartiry?building=<slug> page where buyers can drill down. */
const APARTMENTS_PREVIEW_LIMIT = 6;

/**
 * Building detail page (/zhk/[slug]).
 *
 * Section order follows the convergent pattern across Krisha, Cian,
 * Bayut, Realestate.com.au, and Zillow:
 *
 *   1. Hero (name, address, developer name as a small text link)
 *   2. Sticky sub-nav (anchors to sections below)
 *   3. Stage + key stats — what is this building, when ready
 *   4. Available apartments — the buying funnel, brought up close to top
 *   5. About / description — project narrative
 *   6. Location & nearby POIs
 *   7. Developer (single consolidated surface — was previously
 *      duplicated across hero badge + standalone trust block + this card)
 *   8. Finishing legend (small footer)
 *
 * Trust info appears in TWO places only:
 *   - Hero: small "Проверенный застройщик" pill inline next to the
 *     developer name (visual confirmation, one line)
 *   - Developer card: full deep info (stats, "all projects" link)
 *
 * The standalone "Trust block" that used to sit between the stats
 * and description was removed — three surfaces of the same info read
 * as defensive, and "Trust block" duplicated the developer card below.
 */
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
  const [benchmark, pois, devStats] = await Promise.all([
    getDistrictBenchmark(district.id),
    getNearbyPOIs(building.latitude, building.longitude),
    getDeveloperStats(developer.id),
  ]);
  const median = benchmark
    ? { median: Number(benchmark.median_per_m2_dirams), sample: benchmark.sample_size }
    : null;
  // Currency conversion for diaspora visitors. Skip the rates fetch
  // entirely for local buyers (cookie unset or TJS) so we don't pay
  // for an HTTP roundtrip nobody will see.
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  const rates = isDiaspora ? await getExchangeRates() : null;

  return (
    <>
      {/* ─── 1. HERO ────────────────────────────────────────────── */}
      {/* Hero uses the uploaded cover photo when present, else the
          status-coded color block. The dark-bottom gradient stays in
          both modes so the white title stays readable. */}
      <div
        className="relative aspect-[2/1] w-full bg-stone-100 md:aspect-[21/9]"
        style={building.cover_photo_url ? undefined : { backgroundColor: building.cover_color }}
      >
        {building.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={building.cover_photo_url}
            alt={building.name.ru}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/20 to-transparent" />
        <div className="absolute left-3 top-3">
          <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-caption font-medium text-stone-900">
            {STAGE_INFO[building.status].label}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <AppContainer className="pb-4 md:pb-5">
            <div className="flex flex-col gap-2">
              <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-white md:text-display">
                {building.name.ru}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {/* Address opens the map with this building's pin
                    pre-selected — same affordance as cards. */}
                <Link
                  href={`/novostroyki?view=karta&focus=${building.slug}`}
                  className="group inline-flex items-center gap-1 rounded-sm text-meta text-white/90 transition-colors hover:text-white"
                  aria-label={`Показать на карте: ${building.name.ru}`}
                >
                  <MapPin className="size-3.5" />
                  <span>{district.name.ru} · {building.address.ru}</span>
                  <ArrowUpRight className="size-3 opacity-70 transition-opacity group-hover:opacity-100" />
                </Link>
                {/* Developer name as a text link to the consolidated
                    section below — small "Проверенный" pill inline if
                    developer is verified. This replaces the previous
                    big VerifiedDeveloperButton in the hero corner.
                    Single visual confirmation, full info lives below. */}
                <a
                  href="#developer"
                  className="inline-flex items-center gap-1.5 text-meta text-white/90 hover:text-white"
                >
                  <span>от {developer.display_name.ru}</span>
                  {developer.is_verified ? (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-sm bg-amber-50 px-1.5 py-0.5 text-caption font-medium text-[color:var(--color-badge-tier-developer)]"
                      title="Проверенный застройщик"
                    >
                      <BadgeCheck className="size-3" aria-hidden />
                      Проверенный
                    </span>
                  ) : null}
                </a>
              </div>
            </div>
          </AppContainer>
        </div>
      </div>

      {/* ─── 2. STICKY SUB-NAV ──────────────────────────────────── */}
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
            <a
              href="#stage"
              className="inline-flex h-9 shrink-0 items-center rounded-sm px-3 text-meta font-medium text-stone-700 hover:bg-stone-100"
            >
              Стадия
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
              О проекте
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

      {/* ─── 3. STAGE + KEY STATS (combined) ─────────────────────
           Two related sub-blocks in one section. Buyers asking "what
           kind of building is this and when can I move in" get a
           single answer here without scrolling. */}
      <section id="stage" className="scroll-mt-28 border-b border-stone-200 bg-white py-5">
        <AppContainer className="flex flex-col gap-5">
          <BuildingStageProgress status={building.status} />
          <div className="grid grid-cols-3 gap-3 md:gap-5">
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
            <Stat
              icon={<Calendar className="size-4 text-stone-500" />}
              label="Сдача"
              value={building.handover_estimated_quarter ?? 'Сдан'}
            />
          </div>
        </AppContainer>
      </section>

      {/* ─── 4. AVAILABLE APARTMENTS (the funnel) ────────────────
           Moved up from the previous position 7 — competitors all put
           apartments within the first scroll-and-a-half because that's
           why buyers came to the page. */}
      <section id="units" className="scroll-mt-28 border-t border-stone-200 bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2 font-semibold text-stone-900">
                Доступные квартиры
              </h2>
              <p className="text-meta text-stone-500 tabular-nums">{listings.length} объявлений</p>
            </div>
            {building.price_per_m2_from_dirams ? (
              <div className="flex flex-col items-end">
                <span className="text-caption text-stone-500">от</span>
                {/* Inline pair: TJS price + foreign-currency
                    conversion on the same baseline, right-aligned to
                    match the parent column's alignment. */}
                <div className="flex flex-wrap items-baseline justify-end gap-x-2">
                  <span className="text-h3 font-semibold tabular-nums text-stone-900">
                    {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
                  </span>
                  {isDiaspora && rates ? (
                    <PriceConversion
                      priceDirams={building.price_per_m2_from_dirams}
                      target={currency}
                      rates={rates}
                      perM2
                    />
                  ) : null}
                </div>
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
            <>
              {/* Show only the first APARTMENTS_PREVIEW_LIMIT cards
                  inline. Full list lives on /kvartiry?building=<slug>
                  with all the filters — competitors all do this so
                  buyers don't have to scroll past 50+ apartments to
                  reach the description / nearby / developer sections. */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {listings.slice(0, APARTMENTS_PREVIEW_LIMIT).map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    building={building}
                    developerVerified={developer.is_verified}
                    districtMedianPerM2={median?.median ?? null}
                    districtSampleSize={median?.sample ?? 0}
                    currency={currency}
                    rates={rates}
                    hideBuildingName
                  />
                ))}
              </div>
              {listings.length > APARTMENTS_PREVIEW_LIMIT ? (
                <Link
                  href={`/kvartiry?building=${building.slug}`}
                  className="inline-flex w-fit items-center gap-1 self-end text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                >
                  Посмотреть все {listings.length}{' '}
                  {pluralRu(listings.length, ['квартиру', 'квартиры', 'квартир'])}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </>
          )}
        </AppContainer>
      </section>

      {/* ─── 5. ABOUT / DESCRIPTION ──────────────────────────────── */}
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

      {/* ─── 6. LOCATION + NEARBY POIs ───────────────────────────── */}
      <section id="nearby" className="scroll-mt-28 border-t border-stone-200 py-6">
        <AppContainer>
          <NearbyPois pois={pois} />
        </AppContainer>
      </section>

      {/* ─── 7. DEVELOPER (single consolidated surface) ───────────
           This is the ONE place with deep developer info: verified
           status, name, years, project counts, "all projects" CTA.
           The hero shows only a name link + small "Проверенный" pill;
           the previous separate "Trust block" was deleted to avoid
           the same info appearing three times. */}
      <section id="developer" className="scroll-mt-28 border-t border-stone-200 py-6">
        <AppContainer>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-caption font-medium text-stone-500">Застройщик</span>
                    <h3 className="inline-flex flex-wrap items-center gap-2 text-h3 font-semibold text-stone-900">
                      {developer.display_name.ru}
                      {developer.is_verified ? (
                        <Link
                          href="/tsentr-pomoshchi#verified-developer"
                          className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-0.5 text-caption font-medium text-[color:var(--color-badge-tier-developer)] hover:bg-amber-100"
                          title="Что значит «Проверенный»?"
                        >
                          <BadgeCheck className="size-3.5" aria-hidden />
                          Проверенный
                        </Link>
                      ) : null}
                    </h3>
                    {developer.years_active ? (
                      <span className="text-meta text-stone-500 tabular-nums">
                        На рынке {developer.years_active}{' '}
                        {pluralYears(developer.years_active)}
                        {developer.years_active
                          ? ` · с ${new Date().getFullYear() - developer.years_active} года`
                          : ''}
                      </span>
                    ) : null}
                    {developer.is_verified ? (
                      <span className="text-caption text-stone-500">
                        Команда платформы подтвердила застройщика по телефону их офиса.
                      </span>
                    ) : null}
                  </div>
                  <AppButton variant="secondary">Все проекты застройщика</AppButton>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  <DevStat label="Всего проектов" value={devStats.total} />
                  <DevStat
                    label="Сдано"
                    value={devStats.delivered}
                    accent="green"
                    href="/novostroyki?status=delivered"
                  />
                  <DevStat
                    label="Строится"
                    value={devStats.underConstruction}
                    accent="amber"
                    href="/novostroyki?status=under_construction"
                  />
                  <DevStat
                    label="Котлован"
                    value={devStats.announced}
                    href="/novostroyki?status=announced"
                  />
                </div>

                {devStats.total === 0 ? (
                  <p className="text-caption text-stone-500">
                    Данные о других проектах застройщика появятся, как только они будут опубликованы.
                  </p>
                ) : null}
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>

      {/* ─── 8. FINISHING LEGEND (footer) ────────────────────────── */}
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

function DevStat({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent?: 'green' | 'amber';
  /** Optional drill-down — the stat becomes a Link to a filtered
   *  /novostroyki view (e.g. status=delivered for "Сдано"). When the
   *  stat is zero we render a non-clickable card since there's nothing
   *  to drill into. */
  href?: string;
}) {
  const valueClass =
    accent === 'green'
      ? 'text-[color:var(--color-fairness-great)]'
      : accent === 'amber'
      ? 'text-[color:var(--color-badge-tier-developer)]'
      : 'text-stone-900';
  const inner = (
    <>
      <span className="text-caption text-stone-500">{label}</span>
      <span className={`text-h3 font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </>
  );
  if (href && value > 0) {
    return (
      <Link
        href={href}
        className="flex flex-col gap-1 rounded-md border border-stone-200 bg-stone-50 p-3 transition-colors hover:border-terracotta-300 hover:bg-terracotta-50"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-1 rounded-md border border-stone-200 bg-stone-50 p-3">
      {inner}
    </div>
  );
}

function pluralYears(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (last > 1 && last < 5) return 'года';
  if (last === 1) return 'год';
  return 'лет';
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
