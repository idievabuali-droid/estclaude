import { Sparkles, ArrowUpRight } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { BuildingCard, LocationSearch, HomeSubscribeButton } from '@/components/blocks';
import { Link } from '@/i18n/navigation';
import {
  listFeaturedBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { listListings } from '@/services/listings';
import { formatPriceNumber } from '@/lib/format';

/**
 * Home page (V1, first-5-seconds redesign).
 *
 * Mobile-first, ≤5 visible elements above the fold. Buyer is in
 * 5-second-judgment mode: identity → trust → action → benefit, in
 * that order. Every surface earns its place against "what does this
 * solve at this exact moment in their journey?" — anything that
 * forces a decision before the buyer has decided to engage is cut.
 *
 * Section order:
 *   1. Hero — H1 + 1-line trust subhead + LocationSearch + magic
 *      moment affordability chip
 *   2. Featured ЖК — 3 BuildingCards (curated by featured_rank)
 *   3. §R Retention — one-tap Vahdat-wide Telegram subscribe
 *   4. Footer-band — quiet seller CTA, de-emphasised
 *
 * Cut from prior version (deliberate, see plan file):
 *   - 3 USP cards (verified devs / construction photos / diaspora) —
 *     folded into a single subhead line under H1.
 *   - 3 direction chips (новостройки / квартиры / диаспора) —
 *     redundant with the site header nav.
 *   - Recent listings (3 cards) — overlapped Featured at our V1
 *     inventory scale; Featured wins on quality. Re-add post-launch
 *     when the freshness signal carries real activity.
 *   - "Хотите разместить?" banner from middle position — moved to a
 *     quiet footer-band line so it doesn't compete with buyer funnel.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Homepage');
  const tNav = await getTranslations('Nav');

  // Featured buildings — top 3 marked is_featured, with their
  // developer + district + first 2 unit previews each.
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

  // Magic moment data — cheapest active listing in the city + the
  // cheapest installment monthly across listings. listListings({})
  // already enforces ACTIVE_CITY + status='active' server-side; we
  // reduce client-side here. Negligible compute at V1 inventory.
  const allListings = await listListings({});
  const minTotalDirams =
    allListings.length > 0
      ? allListings.reduce(
          (min, l) => (l.price_total_dirams < min ? l.price_total_dirams : min),
          allListings[0]!.price_total_dirams,
        )
      : null;
  const monthlyVals = allListings
    .filter((l) => l.installment_available && l.installment_monthly_amount_dirams != null)
    .map((l) => l.installment_monthly_amount_dirams as bigint);
  const minMonthlyDirams =
    monthlyVals.length > 0 ? monthlyVals.reduce((a, b) => (a < b ? a : b)) : null;
  // Chip is INFORMATIONAL — text describes the city's price floor.
  // Tap → /kvartiry (no filter applied). Earlier version pre-filtered
  // by `?maxMonthly={cheapest}` which trapped mid-budget buyers in
  // a tier narrower than their actual interest. Filter dropped on
  // purpose; buyers refine on /kvartiry themselves.
  const chipHref = '/kvartiry';

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────
          ≤5 visible elements: H1 + trust subhead + LocationSearch +
          search-help inline link + magic moment chip. Mobile first
          viewport reads as: identity → trust → action → benefit. */}
      <section className="border-b border-stone-200 bg-stone-50 py-6 md:py-8">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
              {t('heroTitle')}
            </h1>
            {/* Trust subhead — replaces the 3 USP cards. Same
                content (verified developers / real construction
                photos / diaspora support) compressed to one line so
                the buyer reads identity + trust in 3 seconds without
                scanning three card layouts. */}
            <p className="text-meta text-stone-700 md:text-body">
              Только проверенные застройщики. Реальные фото со стройки. Команда вычитывает каждое объявление.
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl">
            <LocationSearch destinationPath="/novostroyki" variant="hero" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-caption text-stone-500">
                Введите район, ЖК, школу, мечеть или адрес — покажем новостройки рядом.
              </p>
              <Link
                href="/pomoshch-vybora"
                className="inline-flex items-center gap-1 text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
              >
                <Sparkles className="size-3.5" />
                Первый раз? Поможем подобрать за 2 минуты
              </Link>
            </div>
            {/* Quiet navigation strip — recovers the 1-tap path to
                /kvartiry (Faridun: unit-shopping intent), /diaspora
                (Saidakbar: remote-buying intent), and the "browse
                without typing" path to /novostroyki. Visually
                subordinate text-links replace the previous 3 styled
                chip-buttons that crowded the hero. Functional access
                preserved without the visual noise. */}
            {/* Nav-strip links: stone-700 at rest, terracotta only on
                hover. Engagement-triggered colour, not at-rest
                decoration — the eye should land on the search bar +
                magic moment chip first, not on every link competing
                for attention. */}
            <p className="text-caption text-stone-500">
              <span className="text-stone-400">или:</span>{' '}
              <Link
                href="/kvartiry"
                className="font-medium text-stone-700 hover:text-terracotta-700 hover:underline"
              >
                Все квартиры
              </Link>
              <span className="text-stone-400" aria-hidden> · </span>
              <Link
                href="/novostroyki"
                className="font-medium text-stone-700 hover:text-terracotta-700 hover:underline"
              >
                Все новостройки
              </Link>
              <span className="text-stone-400" aria-hidden> · </span>
              <Link
                href="/diaspora"
                className="font-medium text-stone-700 hover:text-terracotta-700 hover:underline"
              >
                {tNav('diaspora')}
              </Link>
            </p>
            {/* Magic moment — affordability chip. "Is this site in my
                budget?" answered in 5 seconds. Tappable: lands Faridun
                on /kvartiry?maxMonthly=Y filtered results in one tap.
                For Madina it's a calm trust signal (not out of reach).
                Hides if 0 listings; monthly half hides if no
                installment exists. Same lever + visual styling as
                /kvartira §2 and /zhk §B. */}
            {minTotalDirams != null ? (
              <Link
                href={chipHref}
                /* Stone-only chip with terracotta arrow as the single
                   brand moment. Earlier green attempt added a third
                   hue and read as "two random greens picked from
                   nowhere"; the role-coding logic was over-applied
                   versus the senior premium-brand rule (Linear /
                   Compass / Sonder all run a 1-accent palette).
                   Emphasis here is positional (right under the
                   search) and typographic (bold tabular price), not
                   hue-driven. */
                className="inline-flex w-fit items-center gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 text-meta transition-colors hover:border-stone-400 hover:bg-stone-50"
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>
                    <span className="text-stone-500">От </span>
                    <span className="font-semibold tabular-nums text-stone-900">
                      {formatPriceNumber(minTotalDirams)} TJS
                    </span>
                  </span>
                  {minMonthlyDirams != null ? (
                    <span className="text-stone-700">
                      Рассрочка от{' '}
                      <span className="tabular-nums">{formatPriceNumber(minMonthlyDirams)} TJS / мес</span>
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-terracotta-700" aria-hidden />
              </Link>
            ) : null}
          </div>
        </AppContainer>
      </section>

      {/* ─── FEATURED ЖК ──────────────────────────────────────────
          Curated by founder via `featured_rank`. Trust by quality.
          At V1 scale (3 cards) this is the only listings showcase
          on home — Recent listings cut (overlapped at our scale). */}
      {featuredWithRefs.length > 0 ? (
        <section className="py-7">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Рекомендуемые проекты</h2>
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

      {/* ─── §R RETENTION ────────────────────────────────────────
          One-tap Telegram subscribe to all new Vahdat listings.
          Always renders — empty inventory is exactly when subscribing
          carries the most value (capture intent now, deliver later
          when listings exist). Reuses the saved-search → Telegram
          pipeline; displayNameFromFilters({}) returns "Сохранённый
          поиск" as a sensible empty-filter dashboard label. */}
      <section className="border-t border-stone-200 bg-stone-50 py-7">
        <AppContainer>
          <div className="flex flex-col items-start gap-3 rounded-md border border-stone-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-h3 font-semibold text-stone-900">
                {allListings.length > 0 ? 'Не нашли подходящую?' : 'Узнаете первыми'}
              </h2>
              <p className="text-meta text-stone-700">
                {allListings.length > 0
                  ? 'Получайте новые квартиры в Вахдате в Telegram. Без спама — только новые объявления.'
                  : 'Объявления появляются регулярно. Подпишитесь и узнаете первыми, когда появится подходящее.'}
              </p>
            </div>
            <HomeSubscribeButton />
          </div>
        </AppContainer>
      </section>

      {/* ─── FOOTER-BAND SELLER CTA ──────────────────────────────
          Moved here from a prominent middle-of-page banner. Sellers
          landing on home still find /post; buyers stop seeing a
          competing CTA in their decision zone. Quiet 1-line strip,
          terracotta link styling — recoverable, not banner-loud. */}
      <section className="border-t border-stone-200 py-5">
        <AppContainer>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-meta text-stone-600">
              Хотите разместить квартиру в Вахдате?
            </p>
            <Link
              href="/post"
              className="inline-flex items-center gap-1 text-meta font-medium text-stone-700 hover:text-terracotta-700"
            >
              Свяжитесь с нами
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </AppContainer>
      </section>
    </>
  );
}
