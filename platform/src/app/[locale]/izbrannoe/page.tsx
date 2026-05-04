import { BookmarkPlus, Sparkles } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { ListingCard, BuildingCard, MarkSavedItemsSeen, AnonSavedView } from '@/components/blocks';
import { getMySavedItems, type SavedChangeBadge } from '@/services/saved';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { getCurrentUser } from '@/lib/auth/session';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';
import { formatPostedAgo } from '@/lib/format';

/**
 * /izbrannoe — saved buildings + listings.
 *
 * V1 update: switched from MOCK_FOUNDER_USER_ID to the real
 * getCurrentUser(). Three states:
 *
 *   1. Not logged in → friendly prompt with "Войти через Telegram"
 *      CTA. Used to silently render the founder's saves to every
 *      visitor — strictly worse than an honest empty state.
 *
 *   2. Logged in, no saves → empty state per tab (Квартиры / ЖК)
 *      with CTA back to the catalog.
 *
 *   3. Logged in with saves → grid of cards.
 *
 * Removed: the "Что изменилось" change-events strip. Was reading
 * GLOBAL events (not user-specific), and the Telegram notification
 * channel will surface real per-user changes properly via the bot
 * once dispatch is wired in Phase 5. Putting an unfocused fake-
 * retention strip on the page would compete with the real channel.
 */
export default async function IzbrannoePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: 'buildings' | 'listings' }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tNav = await getTranslations('Nav');
  const tab = sp.tab ?? 'listings';

  const user = await getCurrentUser();

  // Not logged in — render the localStorage-backed AnonSavedView
  // (which checks the browser for anon saves and renders cards if any
  // are present), with the original "log in" prompt as a graceful
  // fallback for visitors who have no saves yet. The tab UI mirrors
  // the logged-in branch so muscle memory carries between states.
  if (!user) {
    const anonTab: 'buildings' | 'listings' = sp.tab ?? 'listings';
    return (
      <>
        <section className="border-b border-stone-200 bg-white">
          <AppContainer className="flex flex-col gap-4 py-5">
            <h1 className="text-h1 font-semibold text-stone-900">{tNav('saved')}</h1>
            <div className="inline-flex w-fit items-center rounded-md border border-stone-200 bg-white p-1">
              <Link
                href="/izbrannoe?tab=listings"
                className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium transition-colors ${
                  anonTab === 'listings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Квартиры
              </Link>
              <Link
                href="/izbrannoe?tab=buildings"
                className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium transition-colors ${
                  anonTab === 'buildings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Новостройки
              </Link>
            </div>
          </AppContainer>
        </section>
        <section className="py-6">
          {/* AnonSavedView renders cards if localStorage has anon
              saves, or the "log in to view" empty-prompt otherwise. */}
          <AnonSavedView tab={anonTab} />
        </section>
      </>
    );
  }

  // Logged in — fetch saves + benchmarks + currency in parallel.
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  const [{ listings: savedListings, buildings: savedBuildings }, rates] = await Promise.all([
    getMySavedItems(user.id),
    isDiaspora ? getExchangeRates() : Promise.resolve(null),
  ]);

  const districtIds = [...new Set(savedListings.map((s) => s.building.district_id))];
  const benchmarks = await getDistrictBenchmarks(districtIds);

  // Headline change-summary — "У вас 3 обновления" — gives Madina an
  // immediate "is there anything new for me?" answer without scanning
  // every card. Counts both tabs since the header sits above them.
  const totalChanges =
    savedListings.filter((s) => s.changeBadge).length +
    savedBuildings.filter((s) => s.changeBadge).length;

  return (
    <>
      {/* Fire-and-forget effect: stamp change_badges_seen_at = now() so
          the badges the user is looking at right now don't re-flag
          themselves on the next visit. Page is already rendered, so
          this doesn't affect what the user currently sees. */}
      <MarkSavedItemsSeen />
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-semibold text-stone-900">{tNav('saved')}</h1>
            <p className="text-meta text-stone-500 tabular-nums">
              {savedBuildings.length + savedListings.length} объектов
              {totalChanges > 0
                ? ` · ${totalChanges} ${totalChanges === 1 ? 'обновление' : totalChanges < 5 ? 'обновления' : 'обновлений'} с прошлого визита`
                : ''}
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-md border border-stone-200 bg-white p-1">
            <Link
              href="/izbrannoe?tab=listings"
              className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium transition-colors ${
                tab === 'listings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Квартиры ({savedListings.length})
            </Link>
            <Link
              href="/izbrannoe?tab=buildings"
              className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium transition-colors ${
                tab === 'buildings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Новостройки ({savedBuildings.length})
            </Link>
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer>
          {tab === 'listings' ? (
            savedListings.length === 0 ? (
              <EmptyState
                title="Сохранённых квартир пока нет"
                description="Открывайте интересные квартиры и нажимайте на закладку, чтобы вернуться к ним позже."
                ctaHref="/kvartiry"
                ctaLabel="Смотреть квартиры"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {savedListings.map((s) => {
                  const benchmark = benchmarks.get(s.building.district_id);
                  return (
                    <SavedCardWrapper key={s.listing.id} badge={s.changeBadge}>
                      <ListingCard
                        listing={s.listing}
                        building={s.building}
                        developerVerified={s.developer?.is_verified ?? false}
                        currency={currency}
                        rates={rates}
                        districtMedianPerM2={
                          benchmark ? Number(benchmark.median_per_m2_dirams) : null
                        }
                        districtSampleSize={benchmark?.sample_size ?? 0}
                      />
                    </SavedCardWrapper>
                  );
                })}
              </div>
            )
          ) : savedBuildings.length === 0 ? (
            <EmptyState
              title="Сохранённых ЖК пока нет"
              description="Сохраняйте проекты, чтобы видеть, когда у них появляются новые квартиры или меняются цены."
              ctaHref="/novostroyki"
              ctaLabel="Смотреть новостройки"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {savedBuildings.map((s) => {
                if (!s.developer || !s.district) return null;
                return (
                  <SavedCardWrapper key={s.building.id} badge={s.changeBadge}>
                    <BuildingCard
                      building={s.building}
                      developer={s.developer}
                      district={s.district}
                      matchingUnits={s.matchingUnits}
                      currency={currency}
                      rates={rates}
                    />
                  </SavedCardWrapper>
                );
              })}
            </div>
          )}
        </AppContainer>
      </section>
    </>
  );
}

/**
 * Wraps a saved card in a relative container with an absolute-positioned
 * "Обновлено" pill in the top-left corner. The pill sits above the
 * card's photo with a soft emerald tone — calm trust signal, not a
 * red-alert. When there's no change, the wrapper is a no-op (just the
 * card). Two-line layout (label + relative time) so Madina can tell
 * at a glance whether a change is fresh or week-old.
 */
function SavedCardWrapper({
  badge,
  children,
}: {
  badge: SavedChangeBadge | null;
  children: React.ReactNode;
}) {
  if (!badge) return <>{children}</>;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-1 text-caption font-medium text-white shadow-sm ring-1 ring-emerald-700/30 backdrop-blur-sm">
        <Sparkles className="size-3" aria-hidden />
        {badge.label} · {formatPostedAgo(badge.changedAt)}
      </span>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: '/novostroyki' | '/kvartiry';
  ctaLabel: string;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <BookmarkPlus className="size-8 text-stone-400" aria-hidden />
          <div className="flex flex-col gap-1">
            <h3 className="text-h3 font-semibold text-stone-900">{title}</h3>
            <p className="text-meta text-stone-500">{description}</p>
          </div>
          <Link href={ctaHref}>
            <AppButton variant="primary">{ctaLabel}</AppButton>
          </Link>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
