/**
 * GET /api/listings/count
 *
 * Thin count endpoint that returns the number of /kvartiry listings
 * matching a given filter set. Used by the home hero chip row to show
 * a live "Показать N квартир" CTA — buyers feel the chips are
 * calibrated when the number moves as they pick.
 *
 * Accepts the same URL params /kvartiry accepts, so a query built for
 * the destination page works here unchanged. Mirrors the param-to-filter
 * mapping in `src/app/[locale]/kvartiry/page.tsx`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { listListings } from '@/services/listings';
import type { FinishingType, SourceType } from '@/types/domain';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const nearLat = sp.get('near_lat') ? parseFloat(sp.get('near_lat')!) : null;
  const nearLng = sp.get('near_lng') ? parseFloat(sp.get('near_lng')!) : null;
  const nearRadius = sp.get('radius')
    ? parseInt(sp.get('radius')!, 10)
    : nearLat != null
      ? 1500
      : null;

  const results = await listListings({
    rooms: sp.get('rooms')?.split(',').map((r) => parseInt(r, 10)),
    source: sp.get('source')?.split(',') as SourceType[] | undefined,
    finishing: sp.get('finishing')?.split(',') as FinishingType[] | undefined,
    district: sp.get('district')?.split(','),
    priceFrom: sp.get('price_from')
      ? BigInt(parseInt(sp.get('price_from')!, 10) * 100)
      : null,
    priceTo: sp.get('price_to')
      ? BigInt(parseInt(sp.get('price_to')!, 10) * 100)
      : null,
    sizeFrom: sp.get('size_from') ? parseFloat(sp.get('size_from')!) : null,
    sizeTo: sp.get('size_to') ? parseFloat(sp.get('size_to')!) : null,
    floorFrom: sp.get('floor_from')
      ? parseInt(sp.get('floor_from')!, 10)
      : null,
    floorTo: sp.get('floor_to') ? parseInt(sp.get('floor_to')!, 10) : null,
    maxMonthlyDirams: sp.get('monthly_to')
      ? BigInt(parseInt(sp.get('monthly_to')!, 10) * 100)
      : null,
    nearLat,
    nearLng,
    nearRadiusM: nearRadius,
    q: sp.get('q') ?? null,
  });

  return NextResponse.json(
    { count: results.length },
    {
      headers: {
        // Counts move slowly; 30s edge cache reduces load when a buyer
        // taps several chips in quick succession.
        'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
