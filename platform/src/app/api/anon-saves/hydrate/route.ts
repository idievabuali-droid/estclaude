/**
 * POST /api/anon-saves/hydrate
 *
 * Body: { saves: { type: 'building'|'listing', id: string }[] }
 *
 * Returns the same SavedListing/SavedBuilding shape /izbrannoe uses,
 * for items kept in the visitor's localStorage (no auth, no DB write).
 *
 * Why this exists: anonymous saves were silently invisible on
 * /izbrannoe — the heart icon stuck on the card, but the saved page
 * kept showing "Войдите чтобы видеть сохранённое". Faridun thinks his
 * save failed and bounces. This endpoint lets a client component
 * render the same cards the logged-in flow renders, without forcing a
 * login first. Items still migrate to the user's account on first
 * Telegram login (handled elsewhere by migrateAnonSavesToUser).
 *
 * Public: no auth required by design. Worst case: someone POSTs random
 * UUIDs and gets back partial null results. Service-role read only.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapListing,
  rowToBuilding,
  type BuildingRowWithJoins,
  BUILDING_SELECT,
  LISTING_SELECT,
} from '@/services/buildings';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';

interface SaveRef {
  type: 'building' | 'listing';
  id: string;
}

const MAX_ITEMS = 100;

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

export async function POST(req: Request): Promise<Response> {
  let payload: { saves?: SaveRef[] };
  try {
    payload = (await req.json()) as { saves?: SaveRef[] };
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const saves = (payload.saves ?? []).slice(0, MAX_ITEMS);
  if (saves.length === 0) {
    return NextResponse.json({ listings: [], buildings: [] });
  }

  const buildingIds = saves.filter((s) => s.type === 'building').map((s) => s.id);
  const listingIds = saves.filter((s) => s.type === 'listing').map((s) => s.id);
  // bigint UUIDs only — anything that's not a UUID we silently drop
  // since localStorage was likely tampered with.
  const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
  const cleanBuildingIds = buildingIds.filter(isUuid);
  const cleanListingIds = listingIds.filter(isUuid);

  const supabase = createAdminClient();

  const [bRes, lRes] = await Promise.all([
    cleanBuildingIds.length
      ? supabase.from('buildings').select(BUILDING_SELECT).in('id', cleanBuildingIds)
      : Promise.resolve({ data: [], error: null }),
    cleanListingIds.length
      ? supabase.from('listings').select(LISTING_SELECT).in('id', cleanListingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (bRes.error || lRes.error) {
    console.error('hydrate failed:', bRes.error ?? lRes.error);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }

  const buildingsRaw = bRes.data ?? [];
  const listingsRaw = lRes.data ?? [];

  // Pull all referenced developers + districts + parent buildings for
  // listings in one batch (mirrors getMySavedItems shape).
  const listingBuildingIds = [...new Set(listingsRaw.map((l) => l.building_id))];
  const allBuildingIds = [
    ...new Set([...buildingsRaw.map((b) => b.id), ...listingBuildingIds]),
  ];

  const allBuildings = allBuildingIds.length
    ? (await supabase.from('buildings').select(BUILDING_SELECT).in('id', allBuildingIds))
        .data ?? []
    : [];

  const allDevIds = [...new Set(allBuildings.map((b) => b.developer_id))];
  const districtIds = [...new Set(buildingsRaw.map((b) => b.district_id))];

  const [devRes, distRes] = await Promise.all([
    allDevIds.length
      ? supabase.from('developers').select('*').in('id', allDevIds)
      : Promise.resolve({ data: [], error: null }),
    districtIds.length
      ? supabase.from('districts').select('*').in('id', districtIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const buildingMap = new Map(
    (allBuildings as BuildingRowWithJoins[]).map((b) => [b.id, rowToBuilding(b)] as const),
  );
  const devMap = new Map(
    (devRes.data ?? []).map((d) => [
      d.id,
      {
        id: d.id,
        name: d.name,
        display_name: d.display_name,
        is_verified: d.status === 'active' && d.verified_at != null,
        verified_at: d.verified_at,
        has_female_agent: d.has_female_agent,
        years_active: d.years_active,
        projects_completed_count: d.projects_completed_count,
      } as MockDeveloper,
    ]),
  );
  const distMap = new Map(
    (distRes.data ?? []).map((d) => [
      d.id,
      {
        id: d.id,
        city: d.city as 'dushanbe' | 'vahdat',
        name: d.name,
        slug: d.slug,
      } as MockDistrict,
    ]),
  );

  // Matching units for each saved building (cheapest 3, mirroring the
  // logged-in /izbrannoe behaviour).
  const matchingUnitsMap = new Map<string, MockListing[]>();
  for (const b of buildingsRaw) {
    const { data: units } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('building_id', b.id)
      .eq('status', 'active')
      .order('price_total_dirams', { ascending: true })
      .limit(3);
    matchingUnitsMap.set(b.id, (units ?? []).map(mapListing));
  }

  const savedAtFor = (id: string, kind: 'building' | 'listing') =>
    saves.find((s) => s.type === kind && s.id === id)?.id
      ? new Date().toISOString()
      : new Date().toISOString();

  const listings: AnonSavedListing[] = listingsRaw.map((l) => {
    const listing = mapListing(l);
    const building = buildingMap.get(listing.building_id)!;
    return {
      kind: 'listing' as const,
      saved_at: savedAtFor(listing.id, 'listing'),
      listing,
      building,
      developer: devMap.get(building.developer_id) ?? null,
    };
  });

  const buildings: AnonSavedBuilding[] = buildingsRaw.map((b) => {
    const building = buildingMap.get(b.id)!;
    return {
      kind: 'building' as const,
      saved_at: savedAtFor(b.id, 'building'),
      building,
      developer: devMap.get(building.developer_id) ?? null,
      district: distMap.get(building.district_id) ?? null,
      matchingUnits: matchingUnitsMap.get(b.id) ?? [],
    };
  });

  // MockListing/MockBuilding have bigint fields; NextResponse.json
  // can't serialize them, so we stringify via a replacer first and
  // hand back a plain JSON Response. The client needs to know that
  // bigint-shaped fields arrive as strings (the card components
  // already accept string|bigint for price columns).
  const body = JSON.stringify(
    { listings, buildings },
    (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
  );
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
