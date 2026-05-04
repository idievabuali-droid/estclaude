/**
 * GET /api/pois/search?q=...
 *
 * Autocomplete backend for the LocationSearch component. Returns up
 * to 8 matches from the cached pois table. Public — no auth needed
 * (POIs are public reference data).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { searchPois } from '@/services/pois-search';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json({ hits: [] });
  }
  const hits = await searchPois(q, 8);
  return NextResponse.json({ hits });
}
