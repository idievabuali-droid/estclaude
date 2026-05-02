import { BookmarkPlus, MessageCircle } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { ListingCard, BuildingCard } from '@/components/blocks';
import { getMySavedItems } from '@/services/saved';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import { getCurrentUser } from '@/lib/auth/session';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';

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

  // Not logged in — show the prompt; don't fetch anything else.
  if (!user) {
    return (
      <>
        <section className="border-b border-stone-200 bg-white">
          <AppContainer className="py-5">
            <h1 className="text-h1 font-semibold text-stone-900">{tNav('saved')}</h1>
          </AppContainer>
        </section>
        <section className="py-6">
          <AppContainer>
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <BookmarkPlus className="size-10 text-stone-400" aria-hidden />
                  <div className="flex max-w-md flex-col gap-2">
                    <h2 className="text-h2 font-semibold text-stone-900">
                      Войдите, чтобы видеть сохранённое
                    </h2>
                    <p className="text-meta text-stone-600">
                      Сохраняйте квартиры и ЖК, которые вам интересны. Мы пришлём
                      сообщение в Telegram, когда у них изменится цена или появятся
                      новые квартиры.
                    </p>
                  </div>
                  <Link href="/voyti?redirect=/izbrannoe">
                    <AppButton variant="primary" size="lg">
                      <MessageCircle className="size-4" /> Войти через Telegram
                    </AppButton>
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          </AppContainer>
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

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-semibold text-stone-900">{tNav('saved')}</h1>
            <p className="text-meta text-stone-500 tabular-nums">
              {savedBuildings.length + savedListings.length} объектов
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
                    <ListingCard
                      key={s.listing.id}
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
                  <BuildingCard
                    key={s.building.id}
                    building={s.building}
                    developer={s.developer}
                    district={s.district}
                    matchingUnits={s.matchingUnits}
                    currency={currency}
                    rates={rates}
                  />
                );
              })}
            </div>
          )}
        </AppContainer>
      </section>
    </>
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
