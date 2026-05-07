import { Sparkles, ArrowUpRight, Globe2 } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { BuildingCard, LocationSearch, HomeSubscribeButton } from '@/components/blocks';
import {
  IllustrationBuilding,
  IllustrationCamera,
  IllustrationCompass,
} from '@/components/illustrations';
import { Link } from '@/i18n/navigation';
import {
  listFeaturedBuildings,
  getDeveloperById,
  getDistrictById,
  getListingsForBuildingId,
} from '@/services/buildings';
import { listListings } from '@/services/listings';

/**
 * Home page (V1, mockup-aligned redesign).
 *
 * Section order (top to bottom):
 *   1. Hero — pill + serif H1 with italic accent + subhead +
 *      search-with-button + "или подобрать" sparkle link + nav strip
 *   2. Trust block — "Почему ЖК.tj" eyebrow + H2 statement + 3 icon
 *      cards (verified visits / real photos / 2-min match)
 *   3. Featured ЖК — 3 BuildingCards (curated by featured_rank)
 *   4. Retention — one-tap Vahdat-wide Telegram subscribe
 *   5. Diaspora dark band — service framing for overseas buyers
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

  // Listings count drives the retention strip's loaded vs empty copy.
  const allListings = await listListings({});
  const hasListings = allListings.length > 0;

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────
          Mockup-aligned: pill / H1 with italic serif accent / subhead /
          search + "Найти" button / "или подобрать" sparkle / nav strip.
          Faint warm gradient (terracotta-50/40 → stone-50) reads as
          warm publication paper — atmosphere without competing visually. */}
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
              block section below). */}
          <p className="max-w-xl text-meta text-stone-700 md:text-body">
            Реальные фото со стройки, а не рендеры. Помогаем выбрать за 2 минуты.
          </p>

          {/* Search row — input + button. Mobile: stacked, button
              full-width below. Desktop: button inline at right edge.
              Button is a Link to /novostroyki (LocationSearch's
              destination) so even with empty input the CTA browses
              all projects. The search input itself still submits via
              its own behaviour on Enter or result selection. */}
          <div className="flex w-full max-w-2xl flex-col gap-2 md:flex-row md:items-stretch">
            <div className="flex-1">
              <LocationSearch destinationPath="/novostroyki" variant="hero" />
            </div>
            <Link
              href="/novostroyki"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-stone-900 px-6 text-meta font-semibold text-white transition-colors hover:bg-stone-800"
            >
              Найти
            </Link>
          </div>

          {/* "Или подобрать за 2 минуты" — quiet sparkle link to the
              guided picker. Sparkle micro-rotates on hover (motion-safe). */}
          <Link
            href="/pomoshch-vybora"
            className="group inline-flex items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
          >
            <Sparkles className="size-3.5 transition-transform duration-200 ease-out motion-safe:group-hover:rotate-[6deg]" />
            или подобрать за 2 минуты
          </Link>

          {/* Quiet nav strip — preserves 1-tap mobile access to
              /kvartiry, /novostroyki, /diaspora. Mobile bottom nav
              doesn't yet carry these (separate pass), so we keep this
              row for navigation coverage. Stone-700 default, terracotta
              on hover. */}
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
        </AppContainer>
      </section>

      {/* ─── TRUST BLOCK — "Почему ЖК.tj" ─────────────────────────
          First-class section between hero and Featured. Eyebrow label
          + H2 statement + 3 icon cards. Replaces the prior in-hero
          USP cards — better placement, single-job heading, breathable. */}
      <section className="border-b border-stone-200 bg-white py-16 md:py-24">
        <AppContainer className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Почему ЖК.tj
            </span>
            <h2
              className="text-h2 font-semibold leading-[var(--leading-h2)] text-stone-900 md:text-h1"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Покупка — это серьёзно. Мы относимся так же.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
            <TrustCard
              Illustration={IllustrationBuilding}
              title="Каждый ЖК посетили"
              body="Команда выезжает на стройку лично."
            />
            <TrustCard
              Illustration={IllustrationCamera}
              title="Реальные фото, не рендеры"
              body="Обновляем еженедельно."
            />
            <TrustCard
              Illustration={IllustrationCompass}
              title="Подбор за 2 минуты"
              body="Покажем подходящие именно вам."
            />
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

/**
 * Trust block card — custom monoline illustration anchor + serif H3
 * title + body. The illustration sits large at the top (size-14)
 * rendered in terracotta-700 line, no tile background — Linear /
 * Stripe / Notion pattern where the illustration IS the visual
 * anchor, not contained inside a tile.
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
