/**
 * Saved-items service. Per Data Model §5.7, registration is required to
 * save (user_id NOT NULL). Telegram-based auth landed in 0008; pass
 * the current user's id from `getCurrentUser()` — never default to a
 * mock id, that previously leaked the founder's saves to every visitor.
 */
import { createClient } from '@/lib/supabase/server';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import { mapListing } from './buildings';
import type { ChangeEventType } from '@/types/domain';

export type SavedListing = {
  kind: 'listing';
  saved_at: string;
  listing: MockListing;
  building: MockBuilding;
  developer: MockDeveloper | null;
};

export type SavedBuilding = {
  kind: 'building';
  saved_at: string;
  building: MockBuilding;
  developer: MockDeveloper | null;
  district: MockDistrict | null;
  matchingUnits: MockListing[];
};

export type SavedChange = {
  type: ChangeEventType;
  payload: Record<string, unknown>;
  listing_id: string | null;
  building_id: string | null;
  /** Slug of the linked listing or building so the badge can render as a Link (JOURNEY-6). */
  href: string | null;
  /** Short label of the linked item ("ЖК Vahdat Park · 2-комн") for display. */
  context: string | null;
  created_at: string;
};

function mapBuilding(r: {
  id: string; slug: string; developer_id: string; district_id: string; city: string;
  name: { ru: string; tg?: string }; address: { ru: string; tg?: string };
  latitude: number; longitude: number; description: { ru: string; tg?: string } | null;
  status: MockBuilding['status']; handover_estimated_quarter: string | null;
  total_units: number | null; total_floors: number | null; amenities: string[] | null;
  price_from_dirams: number | null; price_per_m2_from_dirams: number | null;
}): MockBuilding {
  return {
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
  };
}

function mapDev(r: {
  id: string; name: string; display_name: { ru: string; tg?: string };
  has_female_agent: boolean; status: string; verified_at: string | null;
  years_active: number | null; projects_completed_count: number | null;
}): MockDeveloper {
  return {
    id: r.id,
    name: r.name,
    display_name: r.display_name,
    is_verified: r.status === 'active' && r.verified_at != null,
    verified_at: r.verified_at,
    has_female_agent: r.has_female_agent,
    years_active: r.years_active,
    projects_completed_count: r.projects_completed_count,
  };
}

function mapDistrict(r: {
  id: string; city: string; name: { ru: string; tg?: string }; slug: string;
}): MockDistrict {
  return {
    id: r.id,
    city: r.city as 'dushanbe' | 'vahdat',
    name: r.name,
    slug: r.slug,
  };
}

export async function getMySavedItems(userId: string): Promise<{
  listings: SavedListing[];
  buildings: SavedBuilding[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_items')
    .select('saved_at, building_id, listing_id')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;

  const buildingIds = (data ?? []).map((r) => r.building_id).filter(Boolean) as string[];
  const listingIds = (data ?? []).map((r) => r.listing_id).filter(Boolean) as string[];

  const [bRes, lRes] = await Promise.all([
    buildingIds.length
      ? supabase.from('buildings').select('*').in('id', buildingIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? supabase.from('listings').select('*').in('id', listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (bRes.error || lRes.error) throw bRes.error ?? lRes.error;

  const buildingsRaw = bRes.data ?? [];
  const listingsRaw = lRes.data ?? [];

  // Pull all referenced developers + districts in one batch
  const devIds = [...new Set(buildingsRaw.map((b) => b.developer_id))];
  const districtIds = [...new Set(buildingsRaw.map((b) => b.district_id))];
  // For listing's building too
  const listingBuildingIds = [...new Set(listingsRaw.map((l) => l.building_id))];
  const allBuildingIds = [...new Set([...buildingsRaw.map((b) => b.id), ...listingBuildingIds])];

  const { data: extraBuildings } = listingBuildingIds.length
    ? await supabase.from('buildings').select('*').in('id', allBuildingIds)
    : { data: buildingsRaw };
  const allBuildings = extraBuildings ?? [];

  const allDevIds = [...new Set([...devIds, ...allBuildings.map((b) => b.developer_id)])];

  const [devRes, distRes] = await Promise.all([
    allDevIds.length
      ? supabase.from('developers').select('*').in('id', allDevIds)
      : Promise.resolve({ data: [], error: null }),
    districtIds.length
      ? supabase.from('districts').select('*').in('id', districtIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const devMap = new Map((devRes.data ?? []).map((d) => [d.id, mapDev(d)]));
  const distMap = new Map((distRes.data ?? []).map((d) => [d.id, mapDistrict(d)]));
  const buildingMap = new Map(allBuildings.map((b) => [b.id, mapBuilding(b)]));

  // matching units for each saved building
  const matchingUnitsMap = new Map<string, MockListing[]>();
  for (const b of buildingsRaw) {
    const { data: units } = await supabase
      .from('listings')
      .select('*')
      .eq('building_id', b.id)
      .eq('status', 'active')
      .limit(3);
    matchingUnitsMap.set(b.id, (units ?? []).map(mapListing));
  }

  const savedAtFor = (id: string, kind: 'building' | 'listing') =>
    (data ?? []).find((r) =>
      kind === 'building' ? r.building_id === id : r.listing_id === id,
    )?.saved_at ?? new Date().toISOString();

  const listings: SavedListing[] = listingsRaw.map((l) => {
    const listing = mapListing(l);
    const building = buildingMap.get(listing.building_id)!;
    return {
      kind: 'listing',
      saved_at: savedAtFor(listing.id, 'listing'),
      listing,
      building,
      developer: devMap.get(building.developer_id) ?? null,
    };
  });

  const buildings: SavedBuilding[] = buildingsRaw.map((b) => {
    const building = buildingMap.get(b.id)!;
    return {
      kind: 'building',
      saved_at: savedAtFor(b.id, 'building'),
      building,
      developer: devMap.get(building.developer_id) ?? null,
      district: distMap.get(building.district_id) ?? null,
      matchingUnits: matchingUnitsMap.get(b.id) ?? [],
    };
  });

  return { listings, buildings };
}

export async function getRecentChangeEvents(): Promise<SavedChange[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('change_events')
    .select('type, payload, listing_id, building_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  const rows = data ?? [];

  // JOURNEY-6: resolve slugs so each badge can be a Link to its source
  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean) as string[])];
  const buildingIds = [...new Set(rows.map((r) => r.building_id).filter(Boolean) as string[])];

  const [lRes, bRes] = await Promise.all([
    listingIds.length
      ? supabase.from('listings').select('id, slug, building_id, rooms_count, size_m2').in('id', listingIds)
      : Promise.resolve({ data: [] }),
    buildingIds.length
      ? supabase.from('buildings').select('id, slug, name').in('id', buildingIds)
      : Promise.resolve({ data: [] }),
  ]);
  const listingMap = new Map((lRes.data ?? []).map((l) => [l.id, l]));
  const buildingMap = new Map((bRes.data ?? []).map((b) => [b.id, b]));

  // Also need listing's parent building for context
  const parentBuildingIds = [...new Set([...listingMap.values()].map((l) => l.building_id))];
  const { data: parents } = parentBuildingIds.length
    ? await supabase.from('buildings').select('id, name').in('id', parentBuildingIds)
    : { data: [] };
  const parentMap = new Map((parents ?? []).map((b) => [b.id, b]));

  return rows.map((r) => {
    let href: string | null = null;
    let context: string | null = null;
    if (r.listing_id) {
      const l = listingMap.get(r.listing_id);
      if (l) {
        href = `/kvartira/${l.slug}`;
        const parent = parentMap.get(l.building_id);
        context = parent ? `${parent.name.ru} · ${l.rooms_count}-комн` : `${l.rooms_count}-комн`;
      }
    } else if (r.building_id) {
      const b = buildingMap.get(r.building_id);
      if (b) {
        href = `/zhk/${b.slug}`;
        context = b.name.ru;
      }
    }
    return {
      type: r.type as ChangeEventType,
      payload: r.payload as Record<string, unknown>,
      listing_id: r.listing_id,
      building_id: r.building_id,
      href,
      context,
      created_at: r.created_at,
    };
  });
}
