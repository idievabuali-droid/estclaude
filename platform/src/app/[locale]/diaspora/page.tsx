import { ArrowRight, ArrowUpRight, Video, FileCheck2, Clock4, MessageCircle } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer } from '@/components/primitives';
import { BuildingCard, ListingCard, CurrencyPicker } from '@/components/blocks';
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
 * Design pass: brought into the home page's editorial-luxury voice.
 * Hero now matches: pill + Lora serif H1 with italic accent + subhead
 * + two action buttons. Trust block: 3 icon-tile cards (Видеотур /
 * Проверка документов / Часовой пояс). Dark band before footer
 * surfaces WhatsApp/Telegram contact (the action this surface is
 * actually for). Same BuildingCard / ListingCard rhythm as the home
 * page so a diaspora visitor sees a coherent product, not an outlier.
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

  // Recent listings — same logic as home page. ListingCard handles
  // currency display when given the cookie + rates.
  const recentRaw = (await listListings({})).slice(0, 3);
  const recentBuildingIds = [...new Set(recentRaw.map((l) => l.building_id))];
  const allBuildings = await listBuildings({});
  const recentBuildingMap = new Map(
    allBuildings.filter((b) => recentBuildingIds.includes(b.id)).map((b) => [b.id, b]),
  );
  const recentDeveloperIds = [
    ...new Set([...recentBuildingMap.values()].map((b) => b.developer_id)),
  ];
  const recentDistrictIds = [
    ...new Set([...recentBuildingMap.values()].map((b) => b.district_id)),
  ];
  const [recentDeveloperEntries, recentBenchmarkMap] = await Promise.all([
    Promise.all(
      recentDeveloperIds.map(async (id) => [id, await getDeveloperById(id)] as const),
    ),
    getDistrictBenchmarks(recentDistrictIds),
  ]);
  const recentDeveloperMap = new Map(recentDeveloperEntries);

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
      <section className="border-b border-stone-200 bg-gradient-to-b from-terracotta-50/40 via-stone-50 to-stone-50 py-10 md:py-16">
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
            style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
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

          {/* Two action buttons — primary terracotta + neutral
              secondary. Same hierarchy as home's "Найти" + sparkle
              link. Primary opens WhatsApp with prefilled context;
              secondary browses inventory. */}
          <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-center">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-terracotta-600 px-6 text-meta font-semibold text-white transition-colors hover:bg-terracotta-700"
            >
              <MessageCircle className="size-4" aria-hidden />
              Запросить видеообзор
            </a>
            <Link
              href="/novostroyki"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-6 text-meta font-semibold text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-100"
            >
              Смотреть {tNav('buildings').toLowerCase()}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* ─── TRUST BLOCK — 3 icon-tile cards ─────────────────────
          Mirrors home's "Почему ЖК.tj" pattern. Eyebrow + serif H2
          + 3 cards. Diaspora-specific jobs: video tour, document
          check, time-zone flexibility. Replaces the prior bespoke
          inline content list. */}
      <section className="border-b border-stone-200 bg-white py-10 md:py-14">
        <AppContainer className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Как мы помогаем
            </span>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-stone-900 md:text-h1"
              style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
            >
              Покупка из-за границы — без сюрпризов.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
            <TrustCard
              Icon={Video}
              title="Видеотур по WhatsApp"
              body="Покажем квартиру и стройку в реальном времени."
            />
            <TrustCard
              Icon={FileCheck2}
              title="Проверка документов"
              body="Сверим продавца, договор и право собственности."
            />
            <TrustCard
              Icon={Clock4}
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
        <section className="py-10 md:py-14">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Рекомендуемые проекты</h2>
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

      {/* ─── Свежие квартиры — same surface as home page ────── */}
      {recentRaw.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-10 md:py-14">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Свежие квартиры</h2>
              <Link
                href="/kvartiry"
                className="shrink-0 text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Все {tNav('apartments').toLowerCase()} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {recentRaw.map((l) => {
                const building = recentBuildingMap.get(l.building_id);
                if (!building) return null;
                const dev = recentDeveloperMap.get(building.developer_id);
                const benchmark = recentBenchmarkMap.get(building.district_id);
                return (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    building={building}
                    developerVerified={dev?.is_verified ?? false}
                    districtMedianPerM2={
                      benchmark ? Number(benchmark.median_per_m2_dirams) : null
                    }
                    districtSampleSize={benchmark?.sample_size ?? 0}
                    currency={currency}
                    rates={rates}
                  />
                );
              })}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── DARK BAND — direct contact CTA ──────────────────────
          Mirrors home's diaspora dark band, adapted for this surface:
          instead of pointing back to /diaspora, it surfaces WhatsApp +
          Telegram so an overseas buyer who's read the page can act in
          one tap. Eyebrow + serif H2 in white + stone-300 subline +
          outline white CTA. */}
      <section className="bg-stone-900 py-10 md:py-14">
        <AppContainer className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2 text-caption font-medium uppercase tracking-widest text-stone-400">
              <MessageCircle className="size-4 text-terracotta-400" aria-hidden />
              Готовы начать?
            </div>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-white md:text-h1"
              style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
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
 * Trust block card — icon in a tinted square + title + body. Reuses
 * the home page's terracotta-50 + terracotta-700 icon-tile pattern
 * for visual cohesion between the two surfaces.
 */
function TrustCard({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-5">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-terracotta-50 text-terracotta-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-meta font-semibold text-stone-900">{title}</p>
        <p className="text-caption text-stone-600">{body}</p>
      </div>
    </div>
  );
}
