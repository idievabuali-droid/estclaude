import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Calendar, Layers, Users, Camera, ArrowUpRight, BadgeCheck, MessageCircle } from 'lucide-react';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';
import { buildContactLinks } from '@/lib/contact-links';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppChip,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import {
  BuildingCard,
  NearbyChips,
  BuildingStageProgress,
  PriceConversion,
  ShareButton,
  SaveToggle,
  BuildingStickyContact,
  RoomTypeFilter,
} from '@/components/blocks';
import type { PoiCategory } from '@/services/poi';
import { getBuilding, getDeveloperById, getDeveloperStats, listBuildings } from '@/services/buildings';
import type { MockDeveloper } from '@/lib/mock';
import { getDistrictBenchmark } from '@/services/benchmarks';
import { getNearbyPOIs } from '@/services/poi';
import { getBuildingProgress } from '@/services/progress';
import { supabasePublicUrl } from '@/services/photos';
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
 * Section order — each block answers ONE buying-decision question for
 * a project-level decision (vs the unit-level decision on /kvartira):
 *
 *   1. Hero — visual fit + name + address + developer (verified pill)
 *   2. Sticky sub-nav — anchor jumps to sections below
 *   3. §A Стадия + ключевая статистика — what kind of building, when
 *   4. §B В этом ЖК — affordability hook (от X TJS · рассрочка от Y/мес)
 *      [magic moment: anchors to #units]
 *   5. §C Доступные квартиры — the funnel, with room-type chip filter
 *      (Cian-pattern; chips render only when inventory is varied)
 *   6. §D Ход строительства — inline preview of latest progress photos
 *      (only for under-construction projects with uploaded photos)
 *   7. §E О проекте — description + amenities chips
 *   8. §F Расположение — interactive nearby POIs + mini-map
 *   9. §G Застройщик — single consolidated trust card with stats
 *  10. §H Похожие ЖК — escape hatch (same developer, same district fallback)
 *
 * Cuts preserved from prior cleanup:
 *   - Trust info in two places only: small "Проверенный" pill in the
 *     hero (visual confirmation) + full developer card §G (deep info).
 *   - The standalone "Trust block" between stats and description that
 *     used to triplicate verified info — removed long ago.
 *
 * Cut from this restructure:
 *   - "Что значит отделка" finishing legend at the bottom — apartment
 *     cards already carry finishing chips with hover/tap tooltip; the
 *     legend was filler in the footer slot.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBuilding(slug);
  if (!data) return {};
  const { building, developer, district } = data;
  // Title carries enough info for a useful WhatsApp/Telegram preview:
  // building name + district + price floor (if known) tells Hilola
  // whether to bother opening the link.
  const priceFromTjs = building.price_from_dirams
    ? Math.round(Number(building.price_from_dirams) / 100)
    : null;
  const priceFmt = priceFromTjs
    ? new Intl.NumberFormat('ru-RU').format(priceFromTjs)
    : null;
  const title = priceFmt
    ? `${building.name.ru} · ${district.name.ru} · от ${priceFmt} TJS`
    : `${building.name.ru} · ${district.name.ru}`;
  const description = `${developer.display_name.ru}${
    developer.is_verified ? ' (проверенный застройщик)' : ''
  }. ${building.address.ru}.`;
  const ogImages = building.cover_photo_url ? [{ url: building.cover_photo_url }] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images: ogImages, type: 'website' },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages?.map((i) => i.url),
    },
  };
}

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getBuilding(slug);
  if (!data) notFound();
  const { building, developer, district, listings } = data;
  // Parallel batch — including the new §D progress lookup and §H
  // similar-buildings queries. Two listBuildings() calls so we have
  // both same-developer and same-district candidates ready at merge
  // time without another sequential roundtrip.
  const [benchmark, pois, devStats, progressMonths, sameDevBuildings, sameDistrictBuildings] =
    await Promise.all([
      getDistrictBenchmark(district.id),
      getNearbyPOIs(building.latitude, building.longitude),
      getDeveloperStats(developer.id),
      getBuildingProgress(building.id),
      listBuildings({ developerId: developer.id }),
      listBuildings({ district: [district.slug] }),
    ]);
  const median = benchmark
    ? { median: Number(benchmark.median_per_m2_dirams), sample: benchmark.sample_size }
    : null;

  // §B affordability hook — cheapest total price + cheapest installment
  // monthly across active listings. building.price_from_dirams is
  // sometimes null on /zhk because services/buildings.ts only runs
  // fillPriceFrom() in listBuildings(), not getBuilding(). Compute
  // both here from the listings array as a single source of truth.
  const totalDiramsValues = listings.map((l) => l.price_total_dirams);
  const minPriceTotalDirams =
    building.price_from_dirams ??
    (totalDiramsValues.length > 0
      ? totalDiramsValues.reduce((a, b) => (a < b ? a : b))
      : null);
  const monthlyDiramsValues = listings
    .filter((l) => l.installment_available && l.installment_monthly_amount_dirams != null)
    .map((l) => l.installment_monthly_amount_dirams as bigint);
  const minMonthlyDirams =
    monthlyDiramsValues.length > 0
      ? monthlyDiramsValues.reduce((a, b) => (a < b ? a : b))
      : null;

  // §D progress preview — render only for projects that are actually
  // building, AND only when at least one progress photo has been
  // uploaded. Mock projects without photos hide the section cleanly.
  const showProgressPreview =
    (building.status === 'under_construction' || building.status === 'near_completion') &&
    progressMonths.length > 0 &&
    progressMonths[0]!.photos.length > 0;
  const latestProgressMonth = showProgressPreview ? progressMonths[0]! : null;
  const progressTotalCount = showProgressPreview
    ? progressMonths.reduce((sum, m) => sum + m.photos.length, 0)
    : 0;

  // §H Похожие ЖК — prefer same developer, fall back to same district.
  // Dedupe by id and exclude the current building.
  const similarSeen = new Set<string>([building.id]);
  const similarBuildings: typeof sameDevBuildings = [];
  for (const b of [...sameDevBuildings, ...sameDistrictBuildings]) {
    if (similarSeen.has(b.id)) continue;
    similarSeen.add(b.id);
    similarBuildings.push(b);
    if (similarBuildings.length >= 3) break;
  }
  // Fetch the real developer for each unique developer_id used in the
  // similar buildings, so the BuildingCard's verified-badge attribution
  // is correct (BuildingCard renders the badge based on
  // developer.is_verified). Up to 3 small queries — fired in parallel.
  // Same-developer-fallback case has 1 unique id; same-district may
  // have more.
  const similarDevIds = [...new Set(similarBuildings.map((b) => b.developer_id))];
  const similarDevs = await Promise.all(similarDevIds.map((id) => getDeveloperById(id)));
  const similarDevsMap = new Map<string, MockDeveloper>();
  for (const d of similarDevs) {
    if (d != null) similarDevsMap.set(d.id, d);
  }
  // Currency conversion for diaspora visitors. Skip the rates fetch
  // entirely for local buyers (cookie unset or TJS) so we don't pay
  // for an HTTP roundtrip nobody will see.
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  const rates = isDiaspora ? await getExchangeRates() : null;

  return (
    <>
      {/* ─── 1. HERO (clean photo, no text overlay) ─────────────
          Same pattern as /kvartira after the recent cleanup: photos
          read cleanest without text fighting them. The name + address
          + developer line moved into a dedicated header section right
          below the photo. Stage badge and Save/Share stay overlaid as
          small chips — they don't compete with the image. */}
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
        <div className="absolute left-3 top-3 md:left-5 md:top-5">
          <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-white/90 px-2 py-1 text-caption font-medium text-stone-900 backdrop-blur">
            {STAGE_INFO[building.status].label}
          </span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2 md:right-5 md:top-5">
          <ShareButton
            compact
            text={`ЖК ${building.name.ru} · ${district.name.ru}`}
            title={building.name.ru}
          />
          <SaveToggle type="building" id={building.id} />
        </div>
      </div>

      {/* ─── 1.5 HEADER (the title block, lifted out of the photo) ─
          What the photo overlay used to carry: building name, address
          (linked to map), and the "от Developer" + verified pill.
          Cleaner here as solid text on white than fighting a dark
          gradient over the photo. */}
      <section className="border-b border-stone-200 bg-white py-4">
        <AppContainer className="flex flex-col gap-2">
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display"
            style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
          >
            {building.name.ru}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/novostroyki?view=karta&focus=${building.slug}`}
              className="group inline-flex items-center gap-1 rounded-sm text-meta text-stone-700 transition-colors hover:text-terracotta-600"
              aria-label={`Показать на карте: ${building.name.ru}`}
            >
              <MapPin className="size-3.5" />
              <span>{district.name.ru} · {building.address.ru}</span>
              <ArrowUpRight className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
            </Link>
            <a
              href="#developer"
              className="inline-flex items-center gap-1.5 text-meta text-stone-700 hover:text-terracotta-600"
            >
              <span>от {developer.display_name.ru}</span>
              {developer.is_verified ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-caption font-medium text-stone-700"
                  title="Проверенный застройщик"
                >
                  <span
                    className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                    aria-hidden
                  />
                  Проверенный
                </span>
              ) : null}
            </a>
          </div>
        </AppContainer>
      </section>

      {/* ─── 2. STICKY SUB-NAV ──────────────────────────────────── */}
      {/* Outer wrapper hosts the right-edge fade gradient — without it
          the last tab gets clipped at 375px and buyers don't realise
          there's more to scroll to (Что рядом + Застройщик were
          getting silently dropped off the screen). The fade is
          pointer-events-none so taps on the last visible tab still
          work normally. */}
      <nav
        aria-label="Разделы"
        className="sticky top-14 z-20 border-b border-stone-200 bg-white/95 backdrop-blur"
      >
        <AppContainer className="relative">
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
          {/* Right-edge fade — visual cue that the tab row scrolls
              horizontally. md:hidden because at desktop widths every
              tab fits and the gradient would just look like clipping. */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white/95 to-transparent md:hidden"
          />
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

      {/* ─── §B В ЭТОМ ЖК (affordability hook, magic moment) ──
           Quiet strip between stats and the apartments grid that
           tells the buyer "you can enter this project from X TJS /
           Y TJS-per-month" before they scroll through individual
           units. Same lever as the affordability line on /kvartira
           but project-scoped. Anchors to #units. */}
      {minPriceTotalDirams != null ? (
        <section className="border-t border-stone-200 bg-white py-5">
          <AppContainer className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-caption text-stone-500">Квартиры в этом ЖК</span>
              <span className="text-h2 font-semibold tabular-nums text-stone-900">
                от {formatPriceNumber(minPriceTotalDirams)} TJS
              </span>
            </div>
            {minMonthlyDirams != null ? (
              <a
                href="#units"
                className="inline-flex w-fit items-center gap-1.5 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
              >
                Рассрочка от{' '}
                <span className="tabular-nums">{formatPriceNumber(minMonthlyDirams)} TJS / мес</span>
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §C AVAILABLE APARTMENTS (the funnel, with room-type filter) ─
           Moved up from the previous position 7 — competitors all put
           apartments within the first scroll-and-a-half because that's
           why buyers came to the page. Now grouped by room-type via
           the RoomTypeFilter chip row (Cian-pattern). Chips render
           only when inventory is varied (≥3 listings AND ≥2 distinct
           room counts); single-room buildings keep the flat grid. */}
      <section id="units" className="scroll-mt-28 border-t border-stone-200 bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Квартиры
              </span>
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
              <RoomTypeFilter
                listings={listings.slice(0, APARTMENTS_PREVIEW_LIMIT)}
                building={building}
                developer={developer}
                districtMedianPerM2={median?.median ?? null}
                districtSampleSize={median?.sample ?? 0}
                currency={currency}
                rates={rates}
              />
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

      {/* ─── §D ХОД СТРОИТЕЛЬСТВА (inline progress preview) ──
           Strongest trust signal for under-construction projects:
           dated photos showing the building actually growing. Only
           renders for under-construction / near-completion projects
           that have at least one uploaded progress photo. Tap a thumb
           or the "Все альбомы" link to drill into the full timeline
           on /zhk/[slug]/progress. */}
      {showProgressPreview && latestProgressMonth ? (
        <section id="stroyka" className="scroll-mt-28 border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                  Стройка
                </span>
                <h2 className="text-h2 font-semibold text-stone-900">Ход строительства</h2>
                <p className="text-meta text-stone-500">
                  Обновлено: {latestProgressMonth.label} · {progressTotalCount} фото
                </p>
              </div>
              <Link
                href={`/zhk/${building.slug}/progress`}
                className="inline-flex items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
              >
                Все альбомы
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {latestProgressMonth.photos.slice(0, 4).map((p) => {
                const url = supabasePublicUrl(p.storage_path);
                return (
                  <Link
                    key={p.id}
                    href={`/zhk/${building.slug}/progress`}
                    className="group relative aspect-square overflow-hidden rounded-md bg-stone-100"
                    aria-label="Открыть альбом стройки"
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Стройка · ${latestProgressMonth.label}`}
                        className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                        <Camera className="size-6" aria-hidden />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── 5. ABOUT / DESCRIPTION ──────────────────────────────── */}
      <section id="about" className="scroll-mt-28 py-6">
        <AppContainer className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Описание
            </span>
            <h2 className="text-h2 font-semibold text-stone-900">О проекте</h2>
          </div>
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
      {/* Same interactive map+chip pattern as /kvartira: tapping a
          POI category drops a star on the mini-map and re-fits the
          camera so the buyer sees WHERE the school / mosque / etc
          actually is. The earlier static MiniMap + plain list let
          buyers see the categories but not the spatial relationship
          ("which side of the building is the school on?"), so they'd
          still tap "На карте" to enter focus mode. Now the answer
          is one tap inline. The "Все рядом" link still drops them
          into the immersive focus map for the building. */}
      <section id="nearby" className="scroll-mt-28 border-t border-stone-200 py-6">
        <AppContainer>
          <NearbyChips
            anchorLat={building.latitude}
            anchorLng={building.longitude}
            anchorLabel={building.name.ru}
            mapHeight={260}
            items={(
              [
                'mosque',
                'school',
                'kindergarten',
                'hospital',
                'supermarket',
                'transit',
                'park',
                'pharmacy',
              ] as PoiCategory[]
            )
              .map((cat) => ({ cat, item: pois[cat][0] ?? null }))
              .filter((x) => x.item != null)
              .map((x) => ({
                cat: x.cat,
                name: x.item!.name,
                latitude: x.item!.lat,
                longitude: x.item!.lng,
                distanceM: x.item!.distanceM,
              }))}
            allNearbyHref={`/novostroyki?view=karta&focus=${building.slug}`}
          />
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
                  {/* Two CTAs side-by-side. "Связаться" is the new
                      primary action — was missing entirely; Saidakbar
                      had no path to ask the developer a pre-purchase
                      question without leaving the page. WhatsApp tap
                      with prefilled building context. "Все проекты"
                      gets fixed (was dead) in the next commit when the
                      developer filter ships on /novostroyki. */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`${FOUNDER_CONTACTS.whatsappLink}?text=${encodeURIComponent(
                        `Здравствуйте! Интересует ЖК ${building.name.ru} от ${developer.display_name.ru}. Можете подсказать?`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <AppButton variant="primary">
                        <MessageCircle className="size-4" /> Связаться с застройщиком
                      </AppButton>
                    </a>
                    {/* Was a dead <button> with no href / no onClick.
                        Now links to /novostroyki?developer={id}, which
                        reads the param server-side, scopes the result
                        list, and renders "Проекты от {Кофарнихон
                        Девелопмент}" as the page title. */}
                    <Link href={`/novostroyki?developer=${developer.id}`}>
                      <AppButton variant="secondary">Все проекты застройщика</AppButton>
                    </Link>
                  </div>
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

      {/* ─── §H ПОХОЖИЕ ЖК (escape hatch, conditional) ───────────
           When the buyer doesn't pick this project, the next thing
           they want is "what other projects are like this?" — Cian
           and Rightmove both finish with this. Same-developer first,
           same-district as fallback. Hides cleanly when none.
           Extra bottom padding clears the BuildingStickyContact bar
           on mobile (~64px sticky + iOS safe-area inset). */}
      {similarBuildings.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6 pb-24 md:pb-7">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Альтернативы
              </span>
              <h2 className="text-h2 font-semibold text-stone-900">Похожие ЖК</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {similarBuildings.map((b) => (
                <BuildingCard
                  key={b.id}
                  building={b}
                  developer={similarDevsMap.get(b.developer_id) ?? developer}
                  district={district}
                  currency={currency}
                  rates={rates}
                />
              ))}
            </div>
          </AppContainer>
        </section>
      ) : (
        // No similar projects to show — keep the bottom padding so the
        // mobile sticky contact bar doesn't cover the developer card.
        <div className="pb-24 md:pb-0" aria-hidden />
      )}

      {/* Mobile sticky contact bar — see BuildingStickyContact for
          the layout rationale. Anchored at the bottom across every
          section so the buyer always has a one-tap path to ask the
          founder about THIS specific building. */}
      <BuildingStickyContact
        buildingName={building.name.ru}
        buildingAddress={`${district.name.ru} · ${building.address.ru}`}
        whatsappLink={FOUNDER_CONTACTS.whatsappLink}
        telegramLink={FOUNDER_CONTACTS.telegramLink}
        imoHref={buildContactLinks(FOUNDER_CONTACTS.phone).imo}
        phone={FOUNDER_CONTACTS.phone}
      />
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
