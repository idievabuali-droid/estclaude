import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppCard,
  AppCardContent,
  AppBadge,
} from '@/components/primitives';
import { SourceChip, VerificationBadge } from '@/components/blocks';
import { listMyListings } from '@/services/seller';
import { getDeveloperById } from '@/services/buildings';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ListingStatus } from '@/types/domain';
import { AccountSettings } from './AccountSettings';
import { ModerationList, type PendingListingRow } from './ModerationList';
import { ListingActions } from './ListingActions';

const STATUS_BADGE: Record<
  ListingStatus,
  { label: string; tone: 'tier-3' | 'tier-2' | 'tier-1' | 'neutral' }
> = {
  active: { label: 'Активно', tone: 'tier-3' },
  draft: { label: 'Черновик', tone: 'neutral' },
  pending_review: { label: 'На проверке', tone: 'tier-2' },
  hidden: { label: 'Скрыто', tone: 'neutral' },
  sold: { label: 'Продано', tone: 'neutral' },
  expired: { label: 'Срок истёк', tone: 'neutral' },
  rejected: { label: 'Отклонено', tone: 'neutral' },
};

/**
 * /kabinet — user account + seller dashboard.
 *
 * V1 update (Telegram auth landed): page now requires login; redirects
 * unauthenticated visitors to /voyti. Two layered concerns:
 *
 *   - ACCOUNT SETTINGS (every user): identity row, notifications
 *     toggle, logout. Lives at the top of the page, always present.
 *
 *   - SELLER DASHBOARD (only users who have posted listings): stats,
 *     listings table, internal notifications inbox. Conditionally
 *     rendered — buyers won't see an empty seller pane.
 *
 * The "Новое объявление" CTA in the header stays — V1 only the founder
 * posts, but the affordance is part of the platform we're building
 * toward and shouldn't disappear just because most visitors are buyers.
 */
export default async function KabinetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/kabinet')}`);
  }

  const founder = await isFounder(user.id);

  // Founder gets the moderation queue. We fetch pending listings + the
  // submitter's phone + the parent building's name in one go so the
  // queue renders without per-row roundtrips.
  let pendingRows: PendingListingRow[] = [];
  if (founder) {
    const supabase = createAdminClient();
    const { data: pending } = await supabase
      .from('listings')
      .select(
        'id, rooms_count, size_m2, floor_number, price_total_dirams, building_id, seller_user_id, created_at',
      )
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(50);
    const rows = pending ?? [];
    if (rows.length > 0) {
      const buildingIds = [...new Set(rows.map((r) => r.building_id as string))];
      const sellerIds = [...new Set(rows.map((r) => r.seller_user_id as string))];
      const [bRes, sRes] = await Promise.all([
        supabase.from('buildings').select('id, name').in('id', buildingIds),
        supabase.from('users').select('id, phone').in('id', sellerIds),
      ]);
      const buildingNames = new Map(
        (bRes.data ?? []).map((b) => [
          b.id as string,
          (b.name as { ru: string }).ru,
        ]),
      );
      const sellerPhones = new Map(
        (sRes.data ?? []).map((u) => [u.id as string, u.phone as string]),
      );
      pendingRows = rows.map((r) => ({
        id: r.id as string,
        rooms_count: r.rooms_count as number,
        size_m2: Number(r.size_m2),
        floor_number: r.floor_number as number,
        price_total_dirams: BigInt(r.price_total_dirams as string | number),
        building_name: buildingNames.get(r.building_id as string) ?? '—',
        seller_phone: sellerPhones.get(r.seller_user_id as string) ?? '—',
        created_at: r.created_at as string,
      }));
    }
  }

  const myListings = await listMyListings(user.id);

  const isSeller = myListings.length > 0;

  const developerIds = [
    ...new Set(myListings.map((l) => l.building?.developer_id).filter(Boolean)),
  ] as string[];
  const developerEntries = await Promise.all(
    developerIds.map(async (id) => [id, await getDeveloperById(id)] as const),
  );
  const developerMap = new Map(developerEntries);

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 font-semibold text-stone-900">Кабинет</h1>
            </div>
            {isSeller ? (
              <Link href="/post">
                <AppButton variant="primary" size="md">
                  <Plus className="size-4" />
                  Новое объявление
                </AppButton>
              </Link>
            ) : null}
          </div>
        </AppContainer>
      </section>

      {/* Account settings — identity, notifications, logout. Available
          to every authenticated user regardless of seller status. */}
      <section className="bg-stone-50 py-5">
        <AppContainer>
          <AppCard>
            <AppCardContent>
              <AccountSettings
                initialNotificationsEnabled={user.notifications_enabled}
                phone={user.phone}
                tgFirstName={user.tg_first_name}
                tgUsername={user.tg_username}
              />
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>

      {/* Moderation queue — founder-only. Renders right after the
          account section so it's the first thing the founder sees on
          login. Hidden entirely for non-founders (the queue is internal
          to the platform team). */}
      {founder ? (
        <section className="bg-white py-5">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-h2 font-semibold text-stone-900">
                На модерации
              </h2>
              <span className="text-meta tabular-nums text-stone-500">
                {pendingRows.length}
              </span>
            </div>
            <ModerationList rows={pendingRows} />
          </AppContainer>
        </section>
      ) : null}

      {/* My listings.
          V1 cleanup: dropped the fake-zero stats grid (no code path
          ever increments view_count, inserts contact_requests, or
          schedules visits, so the dashboard always read 0/0/0/0) and
          the always-empty notifications inbox (no insert pipeline
          existed). Action buttons (Edit / Hide / Mark Sold / Delete)
          replaced with real wired-up versions in <ListingActions />. */}
      <section className="py-6 pb-9">
        <AppContainer className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <h2 className="text-h2 font-semibold text-stone-900">Мои объявления</h2>
            <span className="text-meta text-stone-500 tabular-nums">
              {myListings.length} {myListings.length === 1 ? 'объявление' : 'объявлений'}
            </span>
          </div>

          {myListings.length === 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Plus className="size-8 text-stone-400" aria-hidden />
                  <h3 className="text-h3 font-semibold text-stone-900">
                    У вас пока нет объявлений
                  </h3>
                  <p className="text-meta text-stone-500">
                    Разместите первое объявление за 3 минуты — нужен только номер телефона.
                  </p>
                  <Link href="/post">
                    <AppButton variant="primary">Разместить</AppButton>
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          ) : (
            <div className="flex flex-col gap-3">
              {myListings.map((l) => {
                const building = l.building;
                if (!building) return null;
                const dev = developerMap.get(building.developer_id);
                const status = STATUS_BADGE[l.status];

                return (
                  <AppCard key={l.id}>
                    <AppCardContent>
                      <div className="flex items-start gap-3 md:gap-4">
                        <div
                          className="size-16 shrink-0 overflow-hidden rounded-md md:size-24"
                          style={{ backgroundColor: l.cover_color }}
                          aria-hidden
                        />

                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Link
                              href={`/kvartira/${l.slug}`}
                              className="text-h3 font-semibold text-stone-900 hover:text-terracotta-600"
                            >
                              {l.rooms_count}-комн · {formatM2(l.size_m2)} · этаж{' '}
                              {formatFloor(l.floor_number, l.total_floors)}
                            </Link>
                            <AppBadge variant={status.tone}>{status.label}</AppBadge>
                          </div>

                          <span className="text-meta text-stone-500">
                            {building.name.ru} · {building.address.ru}
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            <SourceChip source={l.source_type} />
                            <VerificationBadge
                              tier={l.verification_tier}
                              developerVerified={
                                l.source_type === 'developer' && (dev?.is_verified ?? false)
                              }
                            />
                          </div>

                          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-stone-100 pt-2">
                            <span className="text-h3 font-semibold tabular-nums text-stone-900">
                              {formatPriceNumber(l.price_total_dirams)} TJS
                            </span>
                          </div>

                          <ListingActions listingId={l.id} status={l.status} />
                        </div>
                      </div>
                    </AppCardContent>
                  </AppCard>
                );
              })}
            </div>
          )}
        </AppContainer>
      </section>
    </>
  );
}

