import { BookmarkPlus } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { ListingCard, BuildingCard, ChangeBadge } from '@/components/blocks';
import { getMySavedItems, getRecentChangeEvents } from '@/services/saved';
import { getDistrictBenchmarks } from '@/services/benchmarks';
import type { ChangeEventType } from '@/types/domain';

/**
 * Page 9 — /izbrannoe (Saved).
 * Per UI Spec Page 9: shows buildings + listings the user saved, with
 * ChangeBadge strip showing what's changed since their last visit.
 *
 * V1: this page uses mock data (no auth yet). Once Telegram OTP is
 * wired the access guard kicks in (per Architecture: redirect to /voyti).
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

  const [{ listings: savedListings, buildings: savedBuildings }, changes] = await Promise.all([
    getMySavedItems(),
    getRecentChangeEvents(),
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

          {/* Tabs */}
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

      {/* Что изменилось strip — Page 9 §9.4. JOURNEY-6: each badge links to its source. */}
      {changes.length > 0 ? (
        <section className="bg-stone-50 py-5">
          <AppContainer>
            <div className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold text-stone-900">Что изменилось</h2>
              <div className="flex flex-wrap gap-2">
                {changes.map((c, i) => {
                  const label = `${labelForChange(c.type, c.payload)}${c.context ? ' · ' + c.context : ''}`;
                  return c.href ? (
                    <Link key={i} href={c.href} className="hover:opacity-80">
                      <ChangeBadge type={c.type} label={label} />
                    </Link>
                  ) : (
                    <ChangeBadge key={i} type={c.type} label={label} />
                  );
                })}
              </div>
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* Body */}
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

function labelForChange(type: ChangeEventType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'price_changed': {
      const oldP = Number(payload.old_price_dirams ?? 0) / 100;
      const newP = Number(payload.new_price_dirams ?? 0) / 100;
      const sign = newP < oldP ? 'снижена' : 'выросла';
      return `Цена ${sign} · ${newP.toLocaleString('ru-RU')} TJS`;
    }
    case 'status_changed':
      return `Статус: ${String(payload.to ?? '')}`;
    case 'new_unit_added':
      return 'Появились новые квартиры';
    case 'construction_photo_added': {
      const c = Number(payload.count ?? 1);
      return `Новые фото стройки (${c})`;
    }
    case 'seller_slow_response':
      return 'Продавец отвечает медленно';
    default:
      return 'Что-то изменилось';
  }
}
