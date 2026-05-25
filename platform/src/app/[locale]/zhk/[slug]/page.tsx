import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Calendar, Layers, Users, Camera, ArrowUpRight } from 'lucide-react';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';
import { buildContactLinks } from '@/lib/contact-links';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppChip,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import {
  BuildingCard,
  ListingCard,
  NearbyChips,
  BuildingStageProgress,
  BuildingStickyContact,
  MessagingPopoverButton,
  CardPhotoCarousel,
  ScrollSpyTabs,
  DetailPageActions,
  ImageWithFallback,
} from '@/components/blocks';
import type { PoiCategory } from '@/services/poi';
import { getBuilding, getDeveloperById, getDeveloperStats, listBuildings } from '@/services/buildings';
import type { MockDeveloper } from '@/lib/mock';
import { getDistrictBenchmark } from '@/services/benchmarks';
import { getNearbyPOIs } from '@/services/poi';
import { getBuildingProgress } from '@/services/progress';
import { supabasePublicUrl } from '@/services/photos';
import { formatPriceNumber, formatHandoverQuarter, pluralRu } from '@/lib/format';
import { STAGE_INFO } from '@/lib/building-stages';

// APARTMENTS_PREVIEW_LIMIT was the slice cap before — sliced 6 of N
// listings into RoomTypeFilter while the page header + bottom CTA
// still showed N. Result: "Квартиры (12)" + "Все (6)" + "Посмотреть
// все 12" all on one screen, three different counts pointing at the
// same set (founder critique 2026-05-09). Removed; we now render all
// listings inline so the filter chips, page header, and any preview
// counts share a single source of truth (`listings.length`). The
// "Посмотреть все" jump-out is gone — the inline RoomTypeFilter
// already serves the same narrowing job. If a single ЖК ever holds
// hundreds of listings the right answer is in-section pagination,
// not a separate count.

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

/**
 * Apartment-criteria URL params forwarded from /novostroyki — when the
 * buyer clicks a building card while a filter is active, /zhk applies
 * those same filters to its inline "Доступные квартиры" preview. So a
 * buyer who came in from /novostroyki?rooms=3 sees only 3-room units
 * inside this building, not the random first 3 listings. Param names
 * match the /kvartiry conventions exactly so the "Все квартиры" link
 * below can forward them through to /kvartiry?building=<slug>&… and
 * the filter rail there picks them up natively.
 */
interface ApartmentCriteriaParams {
  rooms?: string;
  size_from?: string;
  size_to?: string;
  floor_from?: string;
  floor_to?: string;
}

export default async function BuildingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<ApartmentCriteriaParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const data = await getBuilding(slug);
  if (!data) notFound();
  const { building, developer, district, listings: allListings } = data;

  // Parse the apartment-criteria filters from the URL. When the buyer
  // came in from /novostroyki with filters applied, narrow the inline
  // preview to matching units. JS-side filter on the in-memory listings
  // array — fast, and the buyer is already on this building's page so
  // the candidate set is small.
  const filterRooms = sp.rooms
    ?.split(',')
    .map((r) => parseInt(r, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const filterSizeFrom = sp.size_from ? parseFloat(sp.size_from) : null;
  const filterSizeTo = sp.size_to ? parseFloat(sp.size_to) : null;
  const filterFloorFrom = sp.floor_from ? parseInt(sp.floor_from, 10) : null;
  const filterFloorTo = sp.floor_to ? parseInt(sp.floor_to, 10) : null;
  const hasAptFilter =
    (filterRooms?.length ?? 0) > 0 ||
    filterSizeFrom != null ||
    filterSizeTo != null ||
    filterFloorFrom != null ||
    filterFloorTo != null;
  const listings = hasAptFilter
    ? allListings.filter((l) => {
        if (filterRooms?.length && !filterRooms.includes(l.rooms_count)) return false;
        if (filterSizeFrom != null && Number(l.size_m2) < filterSizeFrom) return false;
        if (filterSizeTo != null && Number(l.size_m2) > filterSizeTo) return false;
        if (filterFloorFrom != null && l.floor_number < filterFloorFrom) return false;
        if (filterFloorTo != null && l.floor_number > filterFloorTo) return false;
        return true;
      })
    : allListings;

  // Build the query-string suffix once so the "Все квартиры" jump-out
  // below + any future "снять фильтры" link can reuse it. Empty when
  // no apartment filter is active so we don't pollute the kvartiry URL.
  const aptFilterQs = (() => {
    if (!hasAptFilter) return '';
    const search = new URLSearchParams();
    if (sp.rooms) search.set('rooms', sp.rooms);
    if (sp.size_from) search.set('size_from', sp.size_from);
    if (sp.size_to) search.set('size_to', sp.size_to);
    if (sp.floor_from) search.set('floor_from', sp.floor_from);
    if (sp.floor_to) search.set('floor_to', sp.floor_to);
    const s = search.toString();
    return s ? `&${s}` : '';
  })();
  // Parallel batch — including the new §D progress lookup and §H
  // similar-buildings queries. Two listBuildings() calls so we have
  // both same-developer and same-district candidates ready at merge
  // time without another sequential roundtrip.
  const [benchmark, pois, devStats, progressDays, sameDevBuildings, sameDistrictBuildings] =
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
    progressDays.length > 0 &&
    progressDays[0]!.photos.length > 0;
  const latestProgressDay = showProgressPreview ? progressDays[0]! : null;
  const progressTotalCount = showProgressPreview
    ? progressDays.reduce((sum, m) => sum + m.photos.length, 0)
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
  // Currency conversion is intentionally /diaspora-only — this detail
  // page used to read the cookie + show TJS ≈ £ inline + pass through
  // to similar BuildingCards, which diluted /diaspora's distinctive
  // value (founder roleplay critique 2026-05-09). Cookie itself
  // persists for the next /diaspora visit.

  return (
    <>
      {/* Save + Share portalled into the SiteHeader chrome — see
          DetailPageActions for the slot mechanism. Replaces the
          earlier hero-photo overlay AND the floating island. One
          source of these actions, always visible because SiteHeader
          is sticky. */}
      <DetailPageActions
        type="building"
        id={building.id}
        shareText={`ЖК ${building.name.ru} · ${district.name.ru}`}
        shareTitle={building.name.ru}
      />

      {/* ─── 1. GALLERY HERO ────────────────────────────────────
          Premium-real-estate pattern (Knight Frank, The Modern House,
          Sotheby's): full-width photograph at 60vh on desktop, 40vh
          on mobile. Photography is the product — give it the room it
          deserves.

          Was a static single-image hero before — even when buildings
          had multiple photos, the buyer could only see the cover and
          had no way to swipe through the rest (founder critique
          2026-05-11: "I cannot swipe photo even if we have several").
          Now reuses CardPhotoCarousel with `heightClassName` so the
          full-bleed hero gets the same scroll-snap swipe gesture +
          desktop arrow controls + counter chip that listing cards
          have. Falls back to a single static frame when the building
          has 0 or 1 photo (the carousel handles all three modes
          itself). */}
      <CardPhotoCarousel
        photos={building.photo_urls ?? []}
        aspect="16/9" /* ignored — heightClassName below overrides */
        heightClassName="h-[40vh] w-full md:h-[60vh]"
        alt={building.name.ru}
        className="bg-stone-100"
        style={
          (building.photo_urls?.length ?? 0) > 0
            ? undefined
            : { backgroundColor: building.cover_color }
        }
        persistentOverlay={
          /* Persistent overlays sit ABOVE every slide so they don't
             disappear when the buyer swipes. Includes the soft top/
             bottom gradient (chip legibility on bright photos), the
             stage badge top-left, share/save top-right, and the
             "Ход стройки" link bottom-right. */
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/0 to-black/20"
            />
            <div className="absolute left-3 top-3 md:left-5 md:top-5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-2.5 py-1 text-caption font-medium text-stone-700 backdrop-blur">
                <span className="size-1.5 rounded-full bg-terracotta-600" aria-hidden />
                {STAGE_INFO[building.status].label}
              </span>
            </div>
            {/* Hero photo no longer carries its own Save + Share
                overlay — those moved into the SiteHeader chrome via
                <DetailPageActions> + the `#site-header-actions` slot,
                so the actions are always visible at any scroll depth
                AND visually integrated with the rest of the top
                chrome (founder critique 2026-05-11 second pass:
                "floating island doesn't make sense, it's not
                connected"). Single source of these actions on the
                page; no double-icon, no floating debris. */}
            {/* "Ход стройки" sends under-construction-project buyers
                straight to the timeline (the strongest trust signal
                we have). Positioned bottom-right; the counter chip
                CardPhotoCarousel renders is top-left so they don't
                collide. */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 md:bottom-5 md:right-5">
              {(building.status === 'under_construction' || building.status === 'near_completion') ? (
                <Link
                  href={`/zhk/${building.slug}/progress`}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white/95 px-2.5 py-1 text-caption font-medium text-stone-700 backdrop-blur hover:bg-white"
                >
                  <Camera className="size-3.5" /> Ход стройки
                </Link>
              ) : null}
            </div>
          </>
        }
      />

      {/* ─── 1.5 SUMMARY BAND ────────────────────────────────────
          Two-column layout below the gallery hero per the senior-
          design prescription. Left column carries identity (H1 +
          metadata + dual pills); right column carries action (price
          block + dual CTAs). Stacks on mobile so action lands below
          identity rather than competing with it.

          On desktop the right column is a contained card so the price
          + CTAs read as a single "decision module" — the editorial-
          luxury pattern Knight Frank and The Modern House use for
          their property hero summaries. */}
      <section className="border-b border-stone-200 bg-white py-6 md:py-10">
        <AppContainer className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
          {/* LEFT: identity */}
          <div className="flex flex-col gap-3 md:flex-1">
            <h1
              className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {building.name.ru}
            </h1>
            {/* Address as a quiet single-line link to the map. No
                chip border now — the H1 carries the visual weight,
                the address is metadata. Building edit lives in
                /kabinet → Новостройки (operator surface), never on
                this buyer-facing page. */}
            <Link
              href={`/novostroyki?view=karta&focus=${building.slug}`}
              className="group inline-flex w-fit items-center gap-1 text-meta text-stone-600 transition-colors hover:text-terracotta-700"
              aria-label={`Показать на карте: ${building.name.ru}`}
            >
              <MapPin className="size-3.5" />
              <span>{district.name.ru} · {building.address.ru}</span>
              <ArrowUpRight className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
            </Link>
            {/* Trust pill + developer attribution. The status badge
                used to live here too (a second copy of «Почти готов»
                etc.) but it duplicates the cover-photo overlay at
                line ~321, where the status pill is paired with the
                stage carousel image — that's the canonical spot.
                Removed here so the row stays focused: trust (verified)
                + attribution (от Developer →). Cleaner scan. */}
            <div className="flex flex-wrap items-center gap-2">
              {developer.is_verified ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-caption font-medium text-stone-700"
                  title="Проверенный застройщик"
                >
                  <span
                    className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                    aria-hidden
                  />
                  Проверенный застройщик
                </span>
              ) : null}
              <a
                href="#developer"
                className="inline-flex items-center gap-1 text-caption text-stone-500 hover:text-terracotta-700"
              >
                от {developer.display_name.ru}
              </a>
            </div>
          </div>

          {/* RIGHT: price block + CTAs (decision module) */}
          {minPriceTotalDirams != null ? (
            <div className="flex flex-col gap-4 rounded-md border border-stone-200 bg-stone-50/60 p-5 md:w-[22rem] md:shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-caption text-stone-500">от</span>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-display font-semibold tabular-nums text-stone-900">
                    {formatPriceNumber(minPriceTotalDirams)} TJS
                  </span>
                </div>
                {minMonthlyDirams != null ? (
                  <a
                    href="#units"
                    className="inline-flex w-fit items-center gap-1 rounded-full bg-terracotta-50 px-2.5 py-1 text-caption font-semibold text-terracotta-800 tabular-nums hover:bg-terracotta-100"
                  >
                    Рассрочка от {formatPriceNumber(minMonthlyDirams)} TJS / мес
                  </a>
                ) : null}
              </div>
              {/* Single contact CTA — was a stack of two before:
                  "Связаться с застройщиком" (WhatsApp-only) +
                  "Запросить визит" (broken anchor scrolling to #units,
                  no real visit-request flow). Founder critique
                  2026-05-09: "shows too many places to contact …
                  Запросить визит is taking today wrong place." Now one
                  button → popover with all 3 channels.

                  The `id="zhk-inline-contact"` is a sentinel for the
                  mobile sticky bar below — it watches this element via
                  IntersectionObserver and stays hidden while this
                  button is in view, then slides up once the buyer
                  scrolls past. Keeps mobile from showing two contact
                  CTAs at the same scroll position (founder critique
                  2026-05-11, second pass). */}
              <div id="zhk-inline-contact" className="flex flex-col gap-2">
                <MessagingPopoverButton
                  variant="primary-lg"
                  label="Связаться с застройщиком"
                  whatsappHref={`${FOUNDER_CONTACTS.whatsappLink}?text=${encodeURIComponent(
                    `Здравствуйте! Интересует ЖК ${building.name.ru}. Можете подсказать?`,
                  )}`}
                  telegramHref={FOUNDER_CONTACTS.telegramLink}
                  imoHref={buildContactLinks(FOUNDER_CONTACTS.phone).imo}
                />
              </div>
            </div>
          ) : null}
        </AppContainer>
      </section>

      {/* ─── 2. STICKY SUB-NAV ──────────────────────────────────── */}
      {/* Outer wrapper hosts the right-edge fade gradient — without it
          the last tab gets clipped at 375px and buyers don't realise
          there's more to scroll to (Что рядом + Застройщик were
          getting silently dropped off the screen). The fade is
          pointer-events-none so taps on the last visible tab still
          work normally. */}
      {/* Sub-nav with scroll-spy — active tab follows the section
          currently in view. Founder critique 2026-05-11: "the shadow
          that shows where we are stays only on apartments, doesn't
          move through stages." Mature-platform pattern (Cian, Avito,
          Rightmove project detail pages): IntersectionObserver flips
          the active class as the user scrolls or clicks-and-scrolls.
          See ScrollSpyTabs for the observer math.

          The "Ход стройки" tab is a route change to /zhk/<slug>/progress
          rather than an in-page anchor; rendered with externalHref so
          it's exempt from scroll-spy (never gets active state, has its
          amber-pill visual treatment to mark it as a route jump). */}
      <ScrollSpyTabs
        ariaLabel="Разделы"
        tabs={[
          { id: 'units', label: `Квартиры (${listings.length})` },
          { id: 'stage', label: 'Стадия' },
          ...(building.status === 'under_construction' || building.status === 'near_completion'
            ? [
                {
                  id: 'progress-ext',
                  label: 'Ход стройки',
                  externalHref: `/zhk/${building.slug}/progress`,
                  externalClassName:
                    'bg-amber-50 text-[color:var(--color-badge-tier-developer)] hover:bg-amber-100',
                  icon: <Camera className="size-3.5" />,
                },
              ]
            : []),
          { id: 'about', label: 'О проекте' },
          { id: 'nearby', label: 'Что рядом' },
          { id: 'developer', label: 'Застройщик' },
        ]}
      />

      {/* ─── 3. STAGE + KEY STATS (combined) ─────────────────────
           Two related sub-blocks in one section. Buyers asking "what
           kind of building is this and when can I move in" get a
           single answer here without scrolling. */}
      <section id="stage" className="scroll-mt-28 border-b border-stone-200 bg-white py-5">
        <AppContainer className="flex flex-col gap-5">
          <BuildingStageProgress
            status={building.status}
            lastUpdatedISO={building.updated_at}
          />
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
              value={formatHandoverQuarter(building.handover_estimated_quarter) ?? 'Сдан'}
            />
          </div>
        </AppContainer>
      </section>

      {/* ─── §C AVAILABLE APARTMENTS (preview + drill-down) ─────────
           Mature-platform pattern (Cian, Avito, Bayut new-project pages):
           show a SMALL inline preview of available units (~3 cards),
           then a "Посмотреть все N квартир →" link to the dedicated
           listing page filtered by this building. The full filter
           rail (rooms / price / size / finishing) lives on
           /kvartiry?building=<slug>, not here.

           Earlier this section used RoomTypeFilter for inline filtering
           but founder critique 2026-05-11 was that (a) showing every
           listing inline clutters the project page and (b) inline
           filtering on a previewed subset creates count mismatches
           (founder originally saw "12 / 6 / 12" across three places).
           The clean answer is one preview here + one full list there,
           with the count on this page matching `listings.length` end-
           to-end. */}
      <section id="units" className="scroll-mt-28 border-t border-stone-200 bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Квартиры
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                Доступные квартиры
              </h2>
              {/* Count line shows the filtered total when the buyer
                  came in from /novostroyki with apartment-criteria
                  filters active, with the unfiltered project total
                  appended in parens for context ("из N в ЖК"). When
                  no filter is active it's a simple "N объявлений". */}
              <p className="text-meta text-stone-500 tabular-nums">
                {hasAptFilter
                  ? `${listings.length} ${pluralRu(listings.length, ['объявление', 'объявления', 'объявлений'])} по вашим фильтрам · из ${allListings.length} в ЖК`
                  : `${listings.length} ${pluralRu(listings.length, ['объявление', 'объявления', 'объявлений'])}`}
              </p>
            </div>
            {building.price_per_m2_from_dirams ? (
              <div className="flex flex-col items-end">
                <span className="text-caption text-stone-500">от</span>
                <div className="flex flex-wrap items-baseline justify-end gap-x-2">
                  <span className="text-h3 font-semibold tabular-nums text-stone-900">
                    {formatPriceNumber(building.price_per_m2_from_dirams)} TJS / м²
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {listings.length === 0 ? (
            /* Two distinct empty states:
               - No listings AT ALL in this ЖК → original "Сейчас нет
                 активных объявлений" copy.
               - Filtered out → tell the buyer the FILTER produced
                 zero results inside this building, and offer a quick
                 link to drop the filter so they can still see what's
                 here. Trust-first — don't leave the buyer wondering
                 if the ЖК is empty when it's actually filter-induced. */
            hasAptFilter && allListings.length > 0 ? (
              <AppCard>
                <AppCardContent>
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-body text-stone-700">
                      В этом ЖК нет квартир, подходящих под выбранные фильтры.
                      Всего в ЖК {allListings.length}{' '}
                      {pluralRu(allListings.length, ['квартира', 'квартиры', 'квартир'])}.
                    </p>
                    <Link
                      href={`/zhk/${building.slug}`}
                      className="inline-flex items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                    >
                      Показать все квартиры в этом ЖК
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </AppCardContent>
              </AppCard>
            ) : (
              <AppCard>
                <AppCardContent>
                  <p className="text-body text-stone-700">
                    Сейчас нет активных объявлений по этому ЖК.
                  </p>
                </AppCardContent>
              </AppCard>
            )
          ) : (
            <>
              {/* 3-card preview. Cian / Avito / Bayut all cap project-
                  page apartment previews around this number — enough
                  to feel the inventory, not so many it overwhelms the
                  project narrative. `hideBuildingName` because every
                  card is in THIS building; the name would be redundant. */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {listings.slice(0, 3).map((l) => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    building={building}
                    developerVerified={developer.is_verified}
                    districtMedianPerM2={median?.median ?? null}
                    districtSampleSize={median?.sample ?? 0}
                    hideBuildingName
                  />
                ))}
              </div>
              {listings.length > 3 ? (
                /* "Посмотреть все" jump-out forwards the apartment-
                   criteria filters to /kvartiry so its filter rail
                   comes up pre-applied. Buyer's mental model stays
                   intact across navigation. */
                <Link
                  href={`/kvartiry?building=${building.slug}${aptFilterQs}`}
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
      {showProgressPreview && latestProgressDay ? (
        <section id="stroyka" className="scroll-mt-28 border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                  Стройка
                </span>
                <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Ход строительства</h2>
                <p className="text-meta text-stone-500">
                  Обновлено: {latestProgressDay.label} · {progressTotalCount} фото
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
              {latestProgressDay.photos.slice(0, 4).map((p) => {
                const url = supabasePublicUrl(p.storage_path);
                return (
                  <Link
                    key={p.id}
                    href={`/zhk/${building.slug}/progress`}
                    className="group relative aspect-square overflow-hidden rounded-md bg-stone-100"
                    aria-label="Открыть альбом стройки"
                  >
                    <ImageWithFallback
                      src={url}
                      alt={`Стройка · ${latestProgressDay.label}`}
                      className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      fallback={
                        <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                          <Camera className="size-6" aria-hidden />
                        </div>
                      }
                    />
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
            <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>О проекте</h2>
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
        <AppContainer className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Кто строит
            </span>
            <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>О застройщике</h2>
          </div>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-5">
                {/* Avatar + name + metadata header. Avatar is a
                    terracotta-soft circle with the developer's
                    initials in serif — gives the section a
                    portrait-like anchor (Knight Frank's "About the
                    seller" pattern) without requiring a real photo
                    asset for every developer. */}
                <div className="flex flex-wrap items-start gap-4">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-h3 font-semibold text-terracotta-700"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                    aria-hidden
                  >
                    {developerInitials(developer.display_name.ru)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3
                      className="inline-flex flex-wrap items-center gap-2 text-h3 font-semibold text-stone-900"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                    >
                      {developer.display_name.ru}
                      {developer.is_verified ? (
                        <Link
                          href="/tsentr-pomoshchi#verified-developer"
                          className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-caption font-medium text-stone-700 hover:border-stone-300"
                          title="Что значит «Проверенный»?"
                        >
                          <span
                            className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                            aria-hidden
                          />
                          Проверенный
                        </Link>
                      ) : null}
                    </h3>
                    {developer.years_active ? (
                      <span className="text-meta text-stone-600 tabular-nums">
                        На рынке {developer.years_active}{' '}
                        {pluralYears(developer.years_active)}
                        {` · с ${new Date().getFullYear() - developer.years_active} года`}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Short company description (developer.description.ru),
                    captured via NewDeveloperModal's "Краткое описание"
                    field. Quiet paragraph — sets the company's voice
                    before the verification + stats blocks below. */}
                {developer.description?.ru ? (
                  <p className="text-meta text-stone-700">
                    {developer.description.ru}
                  </p>
                ) : null}

                {/* Verification trust block — given visual prominence
                    per the prescription. The copy ("Команда платформы
                    подтвердила...") is good and earns the highlighted
                    treatment. Soft terracotta tint + check icon reads
                    as a quiet stamp of approval. */}
                {developer.is_verified ? (
                  <div className="flex items-start gap-3 rounded-md border border-terracotta-100 bg-terracotta-50/50 p-4">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-fairness-great)] text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <p className="text-meta text-stone-700">
                      Команда платформы подтвердила застройщика по телефону их офиса.
                    </p>
                  </div>
                ) : null}

                {/* Career portfolio — the single portfolio block on
                    this card. One DevStat cell per BuildingStatus stage,
                    but ONLY stages with a non-zero count: a developer
                    with just "25 сдано" shows one cell, not three "0"
                    cells beside it (which read as broken). Hidden
                    entirely when every stage is zero/unset. Captured via
                    the "Портфолио застройщика" section in the building
                    create + edit forms (developer row, migration 0023).
                    The on-Vafo count is NOT a second grid — it rides
                    inside the "Все проекты застройщика" link below. */}
                {(() => {
                  const allCells: Array<{
                    label: string;
                    value: number;
                    accent?: 'amber' | 'green';
                  }> = [
                    {
                      label: 'Котлован',
                      value: developer.projects_announced_count ?? 0,
                    },
                    {
                      label: 'Строится',
                      value: developer.projects_under_construction_count ?? 0,
                      accent: 'amber',
                    },
                    {
                      label: 'Почти готов',
                      value: developer.projects_near_completion_count ?? 0,
                    },
                    {
                      label: 'Сдано',
                      value: developer.projects_completed_count ?? 0,
                      accent: 'green',
                    },
                  ];
                  const cells = allCells.filter((c) => c.value > 0);
                  if (cells.length === 0) return null;
                  return (
                    <div className="flex flex-col gap-2">
                      <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                        По портфолио
                      </span>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                        {cells.map((c) => (
                          <DevStat
                            key={c.label}
                            label={c.label}
                            value={c.value}
                            accent={c.accent}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Developer card is intentionally a TRUST-SIGNAL block,
                    not a second contact funnel. The price-card popover
                    higher on the page (and the mobile sticky bar) cover
                    the contact intent; a second "Связаться" here is
                    redundant. Founder critique 2026-05-11: "still too
                    many places to contact." Cian / Avito / Bayut all
                    keep their developer-info card pure trust info — no
                    duplicated CTA.

                    Single portfolio block only: the «По портфолио» grid
                    above is the developer's real career breakdown. The
                    second auto-computed «Проекты на Vafo» grid was cut
                    2026-05-22 — it duplicated the same shape with the
                    platform's internal on-Vafo count, which the buyer
                    doesn't need as a peer block. That count now rides
                    inside the link below as "(N)". */}

                {devStats.total > 0 ? (
                  <Link
                    href={`/novostroyki?developer=${developer.id}`}
                    className="inline-flex w-fit items-center gap-1 self-start text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                  >
                    Все проекты застройщика на Vafo ({devStats.total})
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                ) : (
                  <p className="text-caption text-stone-500">
                    Данные о других проектах застройщика появятся, как только они будут опубликованы.
                  </p>
                )}
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
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Похожие ЖК</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {similarBuildings.map((b) => (
                <BuildingCard
                  key={b.id}
                  building={b}
                  developer={similarDevsMap.get(b.developer_id) ?? developer}
                  district={district}
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
          founder about THIS specific building. Now carries the price
          on the left + Связаться on the right per the senior-design
          prescription, instead of two channel buttons that competed
          for visual weight. */}
      <BuildingStickyContact
        buildingName={building.name.ru}
        buildingAddress={`${district.name.ru} · ${building.address.ru}`}
        priceFromDirams={minPriceTotalDirams}
        whatsappLink={FOUNDER_CONTACTS.whatsappLink}
        telegramLink={FOUNDER_CONTACTS.telegramLink}
        imoHref={buildContactLinks(FOUNDER_CONTACTS.phone).imo}
        phone={FOUNDER_CONTACTS.phone}
        // Hide the sticky bar while the inline contact button up top
        // is in view — Cian / Avito / Bayut mobile pattern. The id
        // is the sentinel wrapper around the price-card MessagingPopover.
        hideUntilElementHiddenId="zhk-inline-contact"
      />
    </>
  );
}

/** Build a 1-2 letter avatar string from a developer name. "Ситора
 *  Девелопмент" → "СД"; single-word "Ситора" → "С". Strips quotes
 *  and the leading "ООО"/"ОАО" suffixes that don't carry identity. */
function developerInitials(name: string): string {
  const cleaned = name
    .replace(/["«»“”]/g, '')
    .replace(/\b(ООО|ОАО|ЗАО|АО|LLC|Ltd)\b\.?/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
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
