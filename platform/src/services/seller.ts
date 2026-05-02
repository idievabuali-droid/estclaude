/**
 * Seller-side queries for the /kabinet dashboard.
 *
 * Uses the admin (service-role) Supabase client because RLS on
 * listings + notifications is `auth.uid() = seller_user_id` /
 * `user_id`, but our cookie-session auth doesn't set auth.uid(), so
 * the regular client returns zero rows. Caller must verify the user
 * via getCurrentUser() before passing userId.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { MockBuilding, MockListing } from '@/lib/mock';
import { mapListing } from './buildings';
import type { NotificationType } from '@/types/domain';

// Founder seed user id — kept ONLY for the dashboard-stats query
// that intentionally aggregates platform-wide data, not a current
// user. All user-scoped queries below take an explicit userId arg.
export const MOCK_FOUNDER_USER_ID = '33333333-3333-3333-3333-333333333301';

export type SellerListing = MockListing & { building: MockBuilding | null };

export type SellerNotification = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export async function listMyListings(userId = MOCK_FOUNDER_USER_ID): Promise<SellerListing[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const listings = (data ?? []).map(mapListing);

  if (listings.length === 0) return [];

  // Pull buildings in one query
  const buildingIds = [...new Set(listings.map((l) => l.building_id))];
  const { data: bRows } = await supabase
    .from('buildings')
    .select('*')
    .in('id', buildingIds);

  const buildingMap = new Map<string, MockBuilding>();
  for (const r of bRows ?? []) {
    buildingMap.set(r.id, {
      id: r.id,
      slug: r.slug,
      developer_id: r.developer_id,
      district_id: r.district_id,
      city: r.city as 'dushanbe' | 'vahdat',
      name: r.name,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      status: r.status,
      handover_estimated_quarter: r.handover_estimated_quarter,
      total_units: r.total_units ?? 0,
      total_floors: r.total_floors ?? 0,
      amenities: r.amenities ?? [],
      cover_color: 'oklch(0.704 0.14 40)',
      price_from_dirams: r.price_from_dirams != null ? BigInt(r.price_from_dirams) : null,
      price_per_m2_from_dirams:
        r.price_per_m2_from_dirams != null ? BigInt(r.price_per_m2_from_dirams) : null,
      description: r.description ?? { ru: '', tg: '' },
    });
  }

  return listings.map((l) => ({ ...l, building: buildingMap.get(l.building_id) ?? null }));
}

export async function getMyNotifications(userId = MOCK_FOUNDER_USER_ID): Promise<SellerNotification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as SellerNotification[];
}

export async function getMyDashboardStats(userId = MOCK_FOUNDER_USER_ID): Promise<{
  active: number;
  totalViews: number;
  newRequests: number;
  visitsScheduled: number;
}> {
  const supabase = createAdminClient();
  const [listingsRes, requestsRes, visitsRes] = await Promise.all([
    supabase
      .from('listings')
      .select('view_count, status')
      .eq('seller_user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .in(
        'listing_id',
        // subselect alternative: pull seller's listings first
        (
          await supabase
            .from('listings')
            .select('id')
            .eq('seller_user_id', userId)
        ).data?.map((l) => l.id) ?? [],
      ),
    supabase
      .from('verification_visits')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by_user_id', userId)
      .in('status', ['scheduled', 'requested']),
  ]);

  const listings = listingsRes.data ?? [];
  const active = listings.filter((l) => l.status === 'active').length;
  const totalViews = listings.reduce((acc, l) => acc + (l.view_count ?? 0), 0);

  return {
    active,
    totalViews,
    newRequests: requestsRes.count ?? 0,
    visitsScheduled: visitsRes.count ?? 0,
  };
}
