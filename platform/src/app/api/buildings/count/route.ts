/**
 * GET /api/buildings/count
 *
 * Thin count endpoint that returns the number of /novostroyki buildings
 * matching a given filter set. Powers the live "Показать N новостроек"
 * CTA on the home hero chip row.
 *
 * Mirrors the param-to-filter mapping in
 * `src/app/[locale]/novostroyki/page.tsx`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { listBuildings } from '@/services/buildings';
import type { BuildingStatus } from '@/types/domain';
import type { PoiCategory } from '@/services/poi';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const nearLat = sp.get('near_lat') ? parseFloat(sp.get('near_lat')!) : null;
  const nearLng = sp.get('near_lng') ? parseFloat(sp.get('near_lng')!) : null;
  const nearRadius = sp.get('radius')
    ? parseInt(sp.get('radius')!, 10)
    : nearLat != null
      ? 1500
      : null;

  const results = await listBuildings({
    district: sp.get('district')?.split(','),
    status: sp.get('status')?.split(',') as BuildingStatus[] | undefined,
    developerId: sp.get('developer') ?? null,
    priceFrom: sp.get('price_from')
      ? BigInt(parseInt(sp.get('price_from')!, 10) * 100)
      : null,
    priceTo: sp.get('price_to')
      ? BigInt(parseInt(sp.get('price_to')!, 10) * 100)
      : null,
    handoverYears: sp.get('handover')?.split(','),
    amenities: sp.get('amenities')?.split(','),
    nearbyCategories: sp.get('nearby')?.split(',') as
      | PoiCategory[]
      | undefined,
    nearLat,
    nearLng,
    nearRadiusM: nearRadius,
    q: sp.get('q') ?? undefined,
    roomsIn: sp
      .get('rooms')
      ?.split(',')
      .map((r) => parseInt(r, 10))
      .filter((n) => Number.isFinite(n) && n > 0),
    sizeFromApt: sp.get('size_from') ? parseFloat(sp.get('size_from')!) : null,
    sizeToApt: sp.get('size_to') ? parseFloat(sp.get('size_to')!) : null,
    floorFromApt: sp.get('floor_from')
      ? parseInt(sp.get('floor_from')!, 10)
      : null,
    floorToApt: sp.get('floor_to') ? parseInt(sp.get('floor_to')!, 10) : null,
  });

  return NextResponse.json(
    { count: results.length },
    {
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
