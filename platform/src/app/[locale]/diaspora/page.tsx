import { ArrowRight } from 'lucide-react';
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

/**
 * /diaspora — landing page for buyers living abroad.
 *
 * Consistency principle: this page reuses the SAME building / listing
 * cards, headers, container rhythm, and section pattern as the home
 * page. Diaspora users get the same shopping surface as anyone else,
 * just with two extra affordances they specifically need:
 *
 *   1. CurrencyPicker — pick RUB / USD / EUR / GBP / KZT / TRY and
 *      every BuildingCard / ListingCard renders a foreign-currency
 *      equivalent under the TJS price (cookie-driven, persists across
 *      pages).
 *
 *   2. Help-center link instead of fake contact info. The previous
 *      version of this page hardcoded `+992 90 000 00 00` and
 *      `@example_bot` as "real" diaspora-team contacts — that's
 *      worse than no contact, because a buyer who taps WhatsApp gets
 *      a dead chat and concludes the platform is fake.
 *
 * Removed in this V1 pass (was bespoke to /diaspora and inconsistent
 * with the rest of the site):
 *   - Long bespoke hero (pre-title pill + paragraph + 2 CTAs)
 *   - "Trust pillars" 3-card row — same info already shown via the
 *     verified / source / tier badges on every card
 *   - "Quick filters" chip row — duplicated /novostroyki's filter bar
 *     and one of the chips (`?installment=true` on /kvartiry) linked
 *     to a filter that doesn't exist
 *   - Three big contact-channel cards with placeholder phone numbers
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

  return (
    <>
      {/* ─── Slim hero, matching home page ────────────────────── */}
      <section className="border-b border-stone-200 bg-stone-50 py-5">
        <AppContainer className="flex flex-col gap-4">
          <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
            Покупка квартиры из-за границы
          </h1>
          <p className="text-body text-stone-700">
            Видеообзор, проверка документов — без поездки в Таджикистан.
            Цены сразу в вашей валюте.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/novostroyki"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-terracotta-300 bg-terracotta-50 px-3 text-meta font-medium text-terracotta-800 transition-colors hover:border-terracotta-500 hover:bg-terracotta-100"
            >
              {tNav('buildings')}
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/kvartiry"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100"
            >
              {tNav('apartments')}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* ─── Currency picker — diaspora-specific, inline ─────── */}
      <section className="border-b border-stone-200 bg-white py-5">
        <AppContainer>
          <CurrencyPicker initial={currency} sampleRates={rates.rates} />
        </AppContainer>
      </section>

      {/* ─── Featured projects — same surface as home page ──── */}
      {featuredWithRefs.length > 0 ? (
        <section className="py-7">
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
        <section className="border-t border-stone-200 bg-stone-50 py-7">
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

      {/* ─── Help-center link ─────────────────────────────────
           Replaces the previous three contact-channel cards that all
           pointed to placeholder numbers (+992 90 000 00 00,
           @example_bot, etc.). Showing a fake-functional contact UI
           is worse than showing a single honest help link, because
           the buyer taps and gets nothing — and concludes the
           platform is abandoned. Wire real diaspora-team contacts
           into the help center when they exist. */}
      <section className="border-t border-stone-200 py-7 pb-9">
        <AppContainer className="flex flex-col items-start gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Нужна помощь?</h2>
          <p className="text-body text-stone-700">
            Опишите, что ищете, и наша команда поможет подобрать квартиру и
            проверить продавца.
          </p>
          <Link
            href="/tsentr-pomoshchi"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-meta font-medium text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-100"
          >
            Открыть центр помощи
            <ArrowRight className="size-3.5" />
          </Link>
        </AppContainer>
      </section>
    </>
  );
}
