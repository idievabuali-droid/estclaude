import { ArrowUpRight, MessageCircle, Globe2, Home, Building2 } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer } from '@/components/primitives';
import {
  BuildingCard,
  CurrencyPicker,
  FeaturedListingsRow,
  HomeSubscribeButton,
  type FeaturedListingsRowItem,
} from '@/components/blocks';
import { HeroSearchRow } from '../HeroSearchRow';
import {
  IllustrationVideoCall,
  IllustrationDocuments,
  IllustrationWorldClock,
} from '@/components/illustrations';
import {
  listFeaturedBuildings,
  listBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { listListings } from '@/services/listings';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { getExchangeRates } from '@/services/currency';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

/**
 * /diaspora — landing page for buyers living abroad.
 *
 * Design pass: this surface is "home + diaspora-specific overlays",
 * NOT a parallel platform. We pull in home's hero search row, nav
 * pill chips (with "Я за границей" in active state since we're on
 * that page), `HomeSubscribeButton`, and the shared
 * `<FeaturedListingsRow>` so the visual grammar matches what a buyer
 * sees on `/`. The diaspora-specific blocks woven in are:
 *
 *   - "Как мы помогаем" trust copy (video tour / docs / timezone),
 *   - currency picker (TJS shown in the buyer's home currency),
 *   - dark-band contact CTA at the bottom (WhatsApp + Telegram for
 *     "talk to a human now" — sits next to the lighter
 *     `HomeSubscribeButton` retention pill higher up which serves the
 *     "alert me passively" intent; mature portals like Cian / Bayut
 *     ship both because they answer different jobs).
 *
 * Honest copy: "Готовы помочь" (no fabricated counts) — the platform
 * is pre-launch; claiming "помогли N families" would burn trust the
 * second a buyer asked which families.
 */
export default async function DiasporaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations('Nav');

  // Currency cookie + rates first — needed for all subsequent card
  // renders to show foreign-currency equivalents.
  const [currency, rates] = await Promise.all([
    readCurrencyCookie(),
    getExchangeRates(),
  ]);

  // Featured buildings — same selection as home page (top 3 featured)
  // so what diaspora visitors see matches what locals see, just
  // priced in their currency.
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

  // Recent listings — same logic as home page. Output is shaped into
  // `FeaturedListingsRowItem[]` so the shared `<FeaturedListingsRow>`
  // can render it identically here and on `/`.
  const recentRaw = (await listListings({})).slice(0, 3);
  const recentBuildingIds = [
    ...new Set(recentRaw.map((l) => l.building_id).filter(Boolean) as string[]),
  ];
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
      ...(recentRaw.map((l) => l.district_id ?? null).filter(Boolean) as string[]),
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

  // Prefilled WhatsApp message — buyer lands in chat with the founder
  // already knowing they're abroad and what they're asking for.
  const whatsappPrefill = encodeURIComponent(
    'Здравствуйте! Пишу из-за границы. Можете сделать видеообзор квартиры?',
  );
  const whatsappHref = `${FOUNDER_CONTACTS.whatsappLink}?text=${whatsappPrefill}`;

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────
          Mirrors the home pattern: pill + Lora serif H1 with italic
          accent + subhead + two action buttons. Same warm gradient
          (terracotta-50/40 → stone-50) so a buyer arriving from /
          doesn't feel a tonal break. */}
      <section className="border-b border-stone-200 bg-gradient-to-b from-terracotta-50/40 via-stone-50 to-stone-50 py-16 md:py-24">
        <AppContainer className="flex flex-col items-center gap-5 text-center md:gap-6">
          {/* Trust pill — same shape as home's hero pill: white bg,
              stone-200 border, green dot, uppercase tracking-wider.
              Honest copy — no fabricated counts. */}
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-caption font-medium uppercase tracking-wider text-stone-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Видеотуры и проверка документов
          </span>

          {/* H1 with italic serif accent — editorial-luxury pattern.
              Whole H1 in Lora serif; accent clause picks up italic +
              terracotta. Inline fontFamily because Tailwind v4's
              default --font-serif overrides our @theme custom one. */}
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] tracking-[-0.01em] text-stone-900 md:text-display"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Покупка квартиры в Вахдате —{' '}
            <em className="italic text-terracotta-700">из любой точки мира.</em>
          </h1>

          {/* Subhead — Inter sans for clarity. Service framing without
              false promises. */}
          <p className="max-w-xl text-meta text-stone-700 md:text-body">
            Видеообзор по WhatsApp, проверка документов и продавца — без
            поездки в Таджикистан. Цены сразу в вашей валюте.
          </p>

          {/* Search row — same `<HeroSearchRow>` as the home page.
              The diaspora buyer searches by district / school / budget
              too; removing the search bar here was the biggest "feels
              like a different product" complaint. The component is
              already a client island so importing it from `../HeroSearchRow`
              works inside this server component. */}
          <HeroSearchRow />

          {/* Diaspora-specific primary action — keep the WhatsApp
              "Запросить видеообзор" CTA in the hero because it's the
              one job this page exists to do. Dark-band contact lower
              on the page is the secondary "talk to a human now"
              entry; this hero CTA is the headline action. */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 text-meta font-semibold text-white transition-colors hover:bg-stone-800"
          >
            <MessageCircle className="size-4" aria-hidden />
            Запросить видеообзор
          </a>

          {/* Quiet nav pill chips — same outlined-pill row as home.
              "Я за границей" is the active surface so it gets a quiet
              filled state (`bg-stone-100 text-stone-900`) so visitors
              know where they are without stripping the affordance. The
              other two chips deep-link to /kvartiry and /novostroyki,
              same destinations as the home version. flex-wrap so the
              row stacks at 375px without horizontal overflow. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/kvartiry"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-meta font-medium text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              <Home className="size-3.5" aria-hidden />
              Все {tNav('apartments').toLowerCase()}
            </Link>
            <Link
              href="/novostroyki"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 text-meta font-medium text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              <Building2 className="size-3.5" aria-hidden />
              Все {tNav('buildings').toLowerCase()}
            </Link>
            <span
              aria-current="page"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-stone-300 bg-stone-100 px-4 text-meta font-medium text-stone-900"
            >
              <Globe2 className="size-3.5" aria-hidden />
              {tNav('diaspora')}
            </span>
          </div>
        </AppContainer>
      </section>

      {/* ─── TRUST BLOCK — 3 icon-tile cards ─────────────────────
          Mirrors home's "Почему Vafo.tj" pattern. Eyebrow + serif H2
          + 3 cards. Diaspora-specific jobs: video tour, document
          check, time-zone flexibility. Replaces the prior bespoke
          inline content list. */}
      <section className="border-b border-stone-200 bg-white py-16 md:py-24">
        <AppContainer className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Как мы помогаем
            </span>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-stone-900 md:text-h1"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Покупка из-за границы — без сюрпризов.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
            <TrustCard
              Illustration={IllustrationVideoCall}
              title="Видеотур по WhatsApp"
              body="Покажем квартиру и стройку в реальном времени."
            />
            <TrustCard
              Illustration={IllustrationDocuments}
              title="Проверка документов"
              body="Сверим продавца, договор и право собственности."
            />
            <TrustCard
              Illustration={IllustrationWorldClock}
              title="Ваш часовой пояс"
              body="Связываемся, когда удобно вам — ОАЭ, Россия, Турция."
            />
          </div>
        </AppContainer>
      </section>

      {/* ─── Currency picker — diaspora-specific, inline ─────── */}
      <section className="border-b border-stone-200 bg-stone-50 py-5">
        <AppContainer>
          <CurrencyPicker initial={currency} sampleRates={rates.rates} />
        </AppContainer>
      </section>

      {/* ─── Featured projects — same surface as home page ──── */}
      {featuredWithRefs.length > 0 ? (
        <section className="py-16 md:py-24">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2
                className="text-h2 font-semibold text-stone-900"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >Рекомендуемые проекты</h2>
              <Link
                href="/novostroyki"
                className="shrink-0 text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
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
                    currency={currency}
                    rates={rates}
                  />
                );
              })}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── Свежие квартиры — shared rail with home page ───────
          Single source of truth via `<FeaturedListingsRow>`. The
          `currency` + `rates` props let each card show TJS in the
          buyer's home currency on this surface. */}
      <FeaturedListingsRow
        title="Свежие квартиры"
        linkHref="/kvartiry"
        linkLabel={`Все ${tNav('apartments').toLowerCase()} →`}
        items={recentItems}
        currency={currency}
        rates={rates}
        sectionClassName="border-t border-stone-200 bg-stone-50"
      />

      {/* ─── RETENTION — same Telegram subscribe pill as home ───
          Diaspora buyers want passive alerts too. Sits above the dark
          contact band so a buyer who's already read the page picks
          their lane: subscribe (passive, "ping me later") OR contact
          (active, "talk now"). Mature portals (Cian, Bayut) ship both
          because they answer different jobs. */}
      <section className="border-t border-stone-200 bg-stone-50 py-12 md:py-16">
        <AppContainer>
          <div className="flex flex-col items-start gap-3 rounded-md border border-stone-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h2
                className="text-h3 font-semibold text-stone-900"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                {recentRaw.length > 0 ? 'Не нашли подходящую?' : 'Узнаете первыми'}
              </h2>
              <p className="text-meta text-stone-700">
                {recentRaw.length > 0
                  ? 'Получайте новые квартиры в Вахдате в Telegram. Без спама — только новые объявления.'
                  : 'Объявления появляются регулярно. Подпишитесь и узнаете первыми, когда появится подходящее.'}
              </p>
            </div>
            <HomeSubscribeButton />
          </div>
        </AppContainer>
      </section>

      {/* ─── DARK BAND — direct contact CTA ──────────────────────
          Mirrors home's diaspora dark band, adapted for this surface:
          instead of pointing back to /diaspora, it surfaces WhatsApp +
          Telegram so an overseas buyer who's read the page can act in
          one tap. Eyebrow + serif H2 in white + stone-300 subline +
          outline white CTA. */}
      <section className="bg-stone-900 py-16 md:py-24">
        <AppContainer className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2 text-caption font-medium uppercase tracking-widest text-stone-400">
              <MessageCircle className="size-4 text-terracotta-400" aria-hidden />
              Готовы начать?
            </div>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-white md:text-h1"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Напишите — подберём квартиру и проверим продавца.
            </h2>
            <p className="text-meta text-stone-300">
              Готовы помочь покупателям из ОАЭ, России, Турции и других стран.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:gap-2 lg:flex-row">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-white px-5 text-meta font-semibold text-white transition-colors hover:bg-white hover:text-stone-900"
            >
              WhatsApp
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
            <a
              href={FOUNDER_CONTACTS.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-white px-5 text-meta font-semibold text-white transition-colors hover:bg-white hover:text-stone-900"
            >
              Telegram
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </AppContainer>
      </section>
    </>
  );
}

/**
 * Trust block card — custom monoline illustration anchor + serif H3
 * title + body. Same pattern as home's TrustCard so a buyer arriving
 * from / sees the same visual vocabulary.
 */
function TrustCard({
  Illustration,
  title,
  body,
}: {
  Illustration: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white p-6">
      <span className="text-terracotta-700">
        <Illustration className="size-14" />
      </span>
      <div className="flex flex-col gap-1">
        <p
          className="text-h3 font-semibold text-stone-900"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {title}
        </p>
        <p className="text-meta text-stone-600">{body}</p>
      </div>
    </div>
  );
}
