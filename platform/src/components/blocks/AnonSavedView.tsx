'use client';

import { useEffect, useState } from 'react';
import { Smartphone, MessageCircle, BookmarkPlus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppButton, AppContainer, AppCard, AppCardContent } from '@/components/primitives';
import { ListingCard } from './ListingCard';
import { BuildingCard } from './BuildingCard';
import { listAnonSaves } from '@/lib/anon-saves';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';

interface AnonSavedListing {
  kind: 'listing';
  saved_at: string;
  listing: MockListing;
  building: MockBuilding;
  developer: MockDeveloper | null;
}
interface AnonSavedBuilding {
  kind: 'building';
  saved_at: string;
  building: MockBuilding;
  developer: MockDeveloper | null;
  district: MockDistrict | null;
  matchingUnits: MockListing[];
}

/**
 * Renders the anonymous user's saved cards on /izbrannoe by reading
 * localStorage and POSTing to /api/anon-saves/hydrate. Was missing
 * before — anon saves persisted to localStorage (so the heart stuck
 * on cards) but /izbrannoe still showed "Войдите чтобы видеть
 * сохранённое", making Faridun think his save failed.
 *
 * Three states render here:
 *   - loading: subtle spinner placeholder (skips skeleton — page is
 *     mostly empty anyway, and a flash of nothing is fine on local
 *     reads)
 *   - has saves: device-only banner (with login CTA) + Квартиры/Новостройки
 *     tab + cards using the same ListingCard / BuildingCard primitives
 *     the logged-in path uses
 *   - empty: render nothing — the parent page falls back to the
 *     standard "log in to view" empty state
 *
 * On Telegram login the items migrate up to saved_items via
 * migrateAnonSavesToUser (existing flow). After migration this
 * component is mounted but reads zero items and renders nothing —
 * the logged-in branch of /izbrannoe takes over.
 */
export function AnonSavedView({ tab }: { tab: 'buildings' | 'listings' }) {
  // Lazy initialiser reads localStorage once at mount so the synchronous
  // "empty" decision doesn't have to happen inside an effect (lint rule
  // react-hooks/set-state-in-effect). SSR renders 'loading' since
  // window is undefined; client always renders the right initial state.
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'empty' }
    | { kind: 'ready'; listings: AnonSavedListing[]; buildings: AnonSavedBuilding[] }
  >(() => {
    if (typeof window === 'undefined') return { kind: 'loading' };
    return listAnonSaves().length === 0 ? { kind: 'empty' } : { kind: 'loading' };
  });

  useEffect(() => {
    const saves = listAnonSaves();
    if (saves.length === 0) {
      // Already 'empty' from the lazy initialiser; nothing to fetch.
      return;
    }
    let cancelled = false;
    void fetch('/api/anon-saves/hydrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        saves: saves.map((s) => ({ type: s.type, id: s.id })),
      }),
    })
      .then((r) => r.json())
      .then((data: { listings: AnonSavedListing[]; buildings: AnonSavedBuilding[] }) => {
        if (cancelled) return;
        // Server stringifies bigint price columns to make JSON
        // serialisable; revive them so MockListing/MockBuilding line
        // up with what the card components expect at runtime.
        const reviveListing = (l: MockListing): MockListing => ({
          ...l,
          price_total_dirams: BigInt(l.price_total_dirams as unknown as string),
          price_per_m2_dirams: BigInt(l.price_per_m2_dirams as unknown as string),
          installment_monthly_amount_dirams: l.installment_monthly_amount_dirams != null
            ? BigInt(l.installment_monthly_amount_dirams as unknown as string)
            : null,
        });
        const reviveBuilding = (b: MockBuilding): MockBuilding => ({
          ...b,
          price_from_dirams: b.price_from_dirams != null
            ? BigInt(b.price_from_dirams as unknown as string)
            : null,
          price_per_m2_from_dirams: b.price_per_m2_from_dirams != null
            ? BigInt(b.price_per_m2_from_dirams as unknown as string)
            : null,
        });
        const listings = (data.listings ?? []).map((s) => ({
          ...s,
          listing: reviveListing(s.listing),
          building: reviveBuilding(s.building),
        }));
        const buildings = (data.buildings ?? []).map((s) => ({
          ...s,
          building: reviveBuilding(s.building),
          matchingUnits: s.matchingUnits.map(reviveListing),
        }));
        if (listings.length + buildings.length === 0) {
          setState({ kind: 'empty' });
        } else {
          setState({ kind: 'ready', listings, buildings });
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network blip — render empty so the parent's "log in" prompt
        // shows. Better than a permanent skeleton.
        setState({ kind: 'empty' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <AppContainer>
        <div className="h-32 animate-pulse rounded-md bg-stone-100" aria-hidden />
      </AppContainer>
    );
  }
  if (state.kind === 'empty') {
    // No anon saves on this device — show the original "log in to
    // view" prompt. We keep this inside AnonSavedView so the parent
    // page doesn't need to coordinate two localStorage readers.
    return (
      <AppContainer>
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <BookmarkPlus className="size-10 text-stone-400" aria-hidden />
              <div className="flex max-w-md flex-col gap-2">
                <h2 className="text-h2 font-semibold text-stone-900">
                  Сохраняйте интересные варианты
                </h2>
                <p className="text-meta text-stone-600">
                  Нажмите на закладку на любой карточке — мы запомним выбор.
                  А войдя через Telegram, вы получите уведомления о смене цены
                  и новых квартирах.
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
    );
  }

  const visibleListings = tab === 'listings' ? state.listings : [];
  const visibleBuildings = tab === 'buildings' ? state.buildings : [];

  return (
    <AppContainer className="flex flex-col gap-5">
      {/* Device-only banner: prominent enough to read, calm enough not
          to scream. The Telegram-login CTA is the conversion path for
          anonymous savers — once they tap it, migrateAnonSavesToUser
          picks the items up server-side. */}
      <AppCard className="border-amber-200 bg-amber-50/60">
        <AppCardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
              <div className="flex flex-col gap-1">
                <p className="text-meta font-medium text-stone-900">
                  Сохранения только в этом браузере
                </p>
                <p className="text-caption text-stone-600">
                  Войдите в Telegram — мы перенесём их в ваш аккаунт и пришлём
                  сообщение, когда у них изменится цена или появятся новые квартиры.
                </p>
              </div>
            </div>
            <Link href="/voyti?redirect=/izbrannoe" className="shrink-0">
              <AppButton variant="primary" size="sm">
                <MessageCircle className="size-4" /> Войти через Telegram
              </AppButton>
            </Link>
          </div>
        </AppCardContent>
      </AppCard>

      {tab === 'listings' && visibleListings.length === 0 ? (
        <p className="text-meta text-stone-500">
          В этом браузере не сохранено ни одной квартиры.
        </p>
      ) : null}
      {tab === 'buildings' && visibleBuildings.length === 0 ? (
        <p className="text-meta text-stone-500">
          В этом браузере не сохранено ни одного ЖК.
        </p>
      ) : null}

      {visibleListings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {visibleListings.map((s) => (
            <ListingCard
              key={s.listing.id}
              listing={s.listing}
              building={s.building}
              developerVerified={s.developer?.is_verified ?? false}
              districtMedianPerM2={null}
              districtSampleSize={0}
            />
          ))}
        </div>
      ) : null}

      {visibleBuildings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {visibleBuildings.map((s) => {
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
      ) : null}
    </AppContainer>
  );
}
