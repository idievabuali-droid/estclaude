/**
 * GET /api/search?q=<query>
 *
 * Unified autocomplete search backing the LocationSearch component
 * on the home + /novostroyki + /kvartiry pages. Returns mixed
 * results across districts, buildings, developers and POIs so a
 * buyer typing "Гулистон" sees the district, the ЖК, the rynok
 * and the school all at once and picks the one they actually
 * meant.
 */
import { NextResponse } from 'next/server';
import { searchAll } from '@/services/search';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const results = await searchAll(q);
  return NextResponse.json(results);
}
