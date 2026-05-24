import { ArrowUpRight, Globe2, Home, Building2 } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import {
  BuildingCard,
  HomeSubscribeButton,
  FeaturedListingsRow,
  type FeaturedListingsRowItem,
} from '@/components/blocks';
import { HeroChipRow } from './HeroChipRow';
import { Link } from '@/i18n/navigation';
import {
  listFeaturedBuildings,
  listBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { listListings } from '@/services/listings';
import { getDistrictBenchmarks } from '@/services/benchmarks';

/**
 * Home page (V1, mockup-aligned redesign).
 *
 * Section order (top to bottom):
 *   1. Hero — pill + serif H1 with italic accent + subhead + HeroChipRow
 *      (segmented type tabs + 3 base chips + Ещё фильтры expander +
 *      live-count Показать CTA) + 3 browse pills (only above-fold paths
 *      to /kvartiry, /novostroyki, /diaspora on mobile — header nav is
 *      hidden below 768px so these pills are the discovery layer)
 *   2. Featured ЖК — 3 BuildingCards (curated by featured_rank)
 *   3. Featured apartments — 3 ListingCards (trust-tier cascade) via
 *      shared <FeaturedListingsRow> (single source of truth between
 *      home and /diaspora). Mirrors Cian / Avito / Bayut, where the
 *      home stacks projects above units. Ordering note: ЖК are curated
 *      by founder (`featured_rank`), apartments are surfaced by
 *      trust-tier (verified-developer first → tier-3 → recency) — the
 *      mental-model divergence is intentional for V1 (see service
 *      doc-comments in `services/buildings.ts` + `services/listings.ts`).
 *   4. Retention — one-tap Vahdat-wide Telegram subscribe
 *   5. Diaspora dark band — service framing for overseas buyers
 *
 * Cut 2026-05-24 (mobile-first audit): the «Почему Vafo.tj» trust-
 * columns section between hero and Featured. Three cards restated the
 * hero pill + subline + a hollow «найдёте за минуты» claim; on mobile
 * they stacked vertically into ~1 full screen of redundant scroll
 * before the first real building card. Trust is asserted once in the
 * hero pill, then earned via real photos on the actual cards — the
 * pattern Cian / Avito / Bayut / Yandex Недвижимость mobile homes
 * all use.
 *
 * Editorial-luxury typography pattern: Lora serif (regular + italic)
 * for H1 + the accent clause "проверенные вручную"; Inter sans for
 * body, subheads, button labels, captions. Single-accent terracotta
 * brand color, used sparingly. Stone for everything else.
 *
 * Cuts from prior version:
 *   - 3 USP cards in hero zone — replaced by the dedicated Trust
 *     block section (correct placement, breathable, single-job head).
 *   - Magic moment affordability chip — Featured cards already carry
 *     price info. Hero stays focused on identity + trust + action.
 *   - Footer-band seller CTA — sellers reach /post via SiteHeader's
 *     "Разместить" + footer column. Replaced by the Diaspora band.
 *
 * Honest copy discipline: pill says "Каждый ЖК посетили лично"
 * (no fabricated count), diaspora subline says "Готовы помочь" (no
 * false "помогли 80+ семьям" claim — pre-launch state).
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Homepage');
  const tNav = await getTranslations('Nav');

  // Featured buildings — top 3 marked is_featured.
  const featured = await listFeaturedBuildings(3);
  const featuredWithRefs = await Promise.all(
    featured.map(async (b) => {
      const [dev, dist, units] = await Promise.all([
        getDeveloperById(b.developer_id),
        getDistrictById(b.district_id),
        getListingsForBuildingId(b.id),
      ]);
      return { b, dev, dist, units: units.slice(0, 2), unitsTotal: units.length };
    }),
  );

  // Listings drive two surfaces:
  //   1. Retention strip copy (loaded vs empty).
  //   2. The new "Свежие квартиры" rail (top 3 in trust-tier order).
  // Single fetch, sliced for the rail. `listListings({})` defaults to
  // sort='recommended' — the trust-tier cascade documented in
  // `services/listings.ts`.
  const allListings = await listListings({});
  const hasListings = allListings.length > 0;
  const recentRaw = allListings.slice(0, 3);

  // Resolve building / developer / district-benchmark for each card
  // the rail will render. Mirrors the same join pattern /diaspora
  // already uses, so the shared component sees identical data shape.
  const recentBuildingIds = [...new Set(recentRaw.map((l) => l.building_id).filter(Boolean) as string[])];
  const allBuildings = recentBuildingIds.length > 0 ? await listBuildings({}) : [];
  const recentBuildingMap = new Map(
    allBuildings.filter((b) => recentBuildingIds.includes(b.id)).map((b) => [b.id, b]),
  );
  const recentDeveloperIds = [
    ...new Set([...recentBuildingMap.values()].map((b) => b.developer_id)),
  ];
  const recentDistrictIds = [
    ...new Set([
      ...[...recentBuildingMap.values()].map((b) => b.district_id),
      ...recentRaw.map((l) => l.district_id ?? null).filter(Boolean) as string[],
    ]),
  ];
  const [recentDeveloperEntries, recentBenchmarkMap] = await Promise.all([
    Promise.all(
      recentDeveloperIds.map(async (id) => [id, await getDeveloperById(id)] as const),
    ),
    getDistrictBenchmarks(recentDistrictIds),
  ]);
  const recentDeveloperMap = new Map(recentDeveloperEntries);
  const recentItems: FeaturedListingsRowItem[] = recentRaw.map((l) => {
    const building = l.building_id ? recentBuildingMap.get(l.building_id) ?? null : null;
    const dev = building ? recentDeveloperMap.get(building.developer_id) : null;
    const benchmark = recentBenchmarkMap.get(building?.district_id ?? l.district_id ?? '');
    return {
      listing: l,
      building,
      developerVerified: dev?.is_verified ?? false,
      districtMedianPerM2: benchmark ? Number(benchmark.median_per_m2_dirams) : null,
      districtSampleSize: benchmark?.sample_size ?? 0,
    };
  });

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────
          Trust pill + serif H1 with italic accent + 1-line subhead +
          HeroChipRow (segmented type tabs + 3 base chips + Ещё фильтры
          expander + live-count Показать CTA) + 3 browse pills (one-tap
          paths to /kvartiry, /novostroyki, /diaspora — these are the
          only above-fold entry points to those pages, especially
          Diaspora which has no header nav). Faint warm gradient
          (terracotta-50/40 → stone-50) reads as warm publication paper
          — atmosphere without competing visually. */}
      <section className="border-b border-stone-200 bg-gradient-to-b from-terracotta-50/40 via-stone-50 to-stone-50 py-16 md:py-24">
        <AppContainer className="flex flex-col items-center gap-5 text-center md:gap-6">
          {/* Trust pill — green dot + uppercase tracking-wider claim.
              Honest copy: no fabricated count. */}
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-caption font-medium uppercase tracking-wider text-stone-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Каждый ЖК посетили лично
          </span>

          {/* H1 with italic serif accent — editorial-luxury pattern.
              Whole H1 in Lora serif for cohesion; accent clause picks
              up italic + terracotta. Inline fontFamily because
              Tailwind v4's default --font-serif overrides our @theme
              custom one — bypassing via direct var reference is the
              reliable path. */}
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] tracking-[-0.01em] text-stone-900 md:text-display"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            {t('heroTitle')}{' '}
            <em className="italic text-terracotta-700">{t('heroTitleAccent')}</em>
          </h1>

          {/* Subhead — Inter sans for clarity. Replaces the prior
              3-claim trust line (now folded into the dedicated trust
              block section below). The earlier "а не рендеры" framing
              read as in-the-weeds for a buyer who isn't already
              comparing renders to photos — we just stake the positive
              claim now (founder critique 2026-05-09). */}
          <p className="max-w-xl text-meta text-stone-700 md:text-body">
            Свежие фото со стройки.
          </p>

          {/* Hero chip row — segmented [Новостройки | Квартиры] + three
              always-visible base chips (Комнат / Цена / Район) + an
              "Ещё фильтры" expander for four type-aware extras + live-
              count "Показать N" CTA. Drives the filtered-browse path. */}
          <HeroChipRow />

          {/* Quiet nav strip — three browse entry points (all
              apartments / all new builds / diaspora) for visitors who
              want to skip the search box and look directly. These are
              the only above-fold entry points to those pages, especially
              Diaspora which has no nav link in the header or bottom-nav.
              Outlined pill chips matching the trust pill above + the
              FilterRail chips on /novostroyki and /kvartiry. Each gets
              a small leading icon for instant recognition. flex-wrap so
              on a 375px viewport the three chips stack to two rows
              instead of forcing horizontal overflow. justify-center
              keeps the visual centre line of the hero stack. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/kvartiry"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-meta font-medium text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              <Home className="size-3.5" aria-hidden />
              Все квартиры
            </Link>
            <Link
              href="/novostroyki"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-meta font-medium text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              <Building2 className="size-3.5" aria-hidden />
              Все новостройки
            </Link>
            <Link
              href="/diaspora"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-meta font-medium text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              <Globe2 className="size-3.5" aria-hidden />
              {tNav('diaspora')}
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* ─── FEATURED ЖК ──────────────────────────────────────────
          Curated by founder via featured_rank. Card redesign per
          mockup deferred — shared BuildingCard touches /izbrannoe +
          /novostroyki and warrants a separate variant pass. */}
      {featuredWithRefs.length > 0 ? (
        <section className="py-16 md:py-24">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2
                className="text-h2 font-semibold text-stone-900 md:text-h1"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                Рекомендуемые проекты
              </h2>
              <Link
                href="/novostroyki"
                className="shrink-0 text-meta font-medium text-stone-700 hover:text-terracotta-700"
              >
                Все {tNav('buildings').toLowerCase()} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {featuredWithRefs.map(({ b, dev, dist, units, unitsTotal }) => {
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
          </AppContainer>
        </section>
      ) : null}

      {/* ─── FEATURED APARTMENTS ──────────────────────────────────
          Companion rail to "Рекомендуемые проекты" above. Mirrors what
          Cian / Avito / Bayut do — home stacks projects above units so
          buyers who care about "which building" and buyers who care
          about "which apartment" both find an entry within one scroll.
          Defaults to the trust-tier cascade (verified-developer first
          → tier-3 → recency); copy reads "Свежие квартиры" rather than
          "Рекомендуемые квартиры" because nothing is hand-picked yet —
          we don't claim curation we don't perform. Hidden when there's
          nothing to show (no orphan header). */}
      {/* `border-t` only — no stone-50 background, because the
          Retention strip below already provides the next stone-50
          break and stacking two stone sections would merge them
          visually into one long zone. The hairline keeps the Featured
          ЖК / Featured apartments seam readable without changing the
          paper colour. */}
      <FeaturedListingsRow
        title="Свежие квартиры"
        linkHref="/kvartiry"
        linkLabel={`Все ${tNav('apartments').toLowerCase()} →`}
        items={recentItems}
        sectionClassName="border-t border-stone-200"
      />

      {/* ─── RETENTION ────────────────────────────────────────────
          One-tap Telegram subscribe. Always renders — empty inventory
          is exactly when subscribing carries the most value. Copy
          adapts based on listings count. */}
      <section className="border-t border-stone-200 bg-stone-50 py-12 md:py-16">
        <AppContainer>
          <div className="flex flex-col items-start gap-3 rounded-md border border-stone-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h2
                className="text-h3 font-semibold text-stone-900"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                {hasListings ? 'Не нашли подходящую?' : 'Узнаете первыми'}
              </h2>
              <p className="text-meta text-stone-700">
                {hasListings
                  ? 'Получайте новые квартиры в Вахдате в Telegram. Без спама — только новые объявления.'
                  : 'Объявления появляются регулярно. Подпишитесь и узнаете первыми, когда появится подходящее.'}
              </p>
            </div>
            <HomeSubscribeButton />
          </div>
        </AppContainer>
      </section>

      {/* ─── DIASPORA DARK BAND ──────────────────────────────────
          Premium-dark section before footer. Eyebrow + Globe icon +
          headline + honest service-framing subline + outline CTA.
          Replaces the prior footer-band seller CTA — sellers reach
          /post via SiteHeader's "Разместить" + footer column. */}
      <section className="bg-stone-900 py-16 md:py-24">
        <AppContainer className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2 text-caption font-medium uppercase tracking-widest text-stone-400">
              <Globe2 className="size-4 text-terracotta-400" aria-hidden />
              Покупаете из-за границы?
            </div>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-white md:text-h1"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Видеотуры, проверка документов, звонки в вашем часовом поясе.
            </h2>
            <p className="text-meta text-stone-300">
              Готовы помочь покупателям из ОАЭ, России, Турции.
            </p>
          </div>
          <Link
            href="/diaspora"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-white px-5 text-meta font-semibold text-white transition-colors hover:bg-white hover:text-stone-900"
          >
            Узнать как
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        </AppContainer>
      </section>
    </>
  );
}

