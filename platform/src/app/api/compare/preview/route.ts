/**
 * POST /api/compare/preview
 * body: { type: 'buildings' | 'listings', ids: string[] }
 *
 * Returns a slim list of {id, name} for the items in the user's
 * compare set. Used by CompareBar to show real names instead of UUID
 * stubs — buyers can't tell what's in their set without this.
 *
 * Public endpoint (no auth needed) because the compare set is
 * client-side only (sessionStorage), and the data we expose here is
 * either the building name (publicly visible) or a synthesised
 * "ЖК Name · 2-комн" listing label built from already-public listing
 * data.
 *
 * Returns items in the SAME ORDER as `ids` so the bar can render
 * chips in the order the buyer added them.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface PreviewBody {
  type: 'buildings' | 'listings';
  ids: string[];
}

export interface PreviewItem {
  id: string;
  name: string;
}

export async function POST(req: NextRequest) {
  let body: PreviewBody;
  try {
    body = (await req.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (
    (body.type !== 'buildings' && body.type !== 'listings') ||
    !Array.isArray(body.ids) ||
    body.ids.length === 0
  ) {
    return NextResponse.json({ items: [] });
  }
  // Cap at compare-store's max so a malicious caller can't ask for
  // 10 000 ids and force a giant join.
  const ids = body.ids.slice(0, 4);

  const supabase = createAdminClient();

  if (body.type === 'buildings') {
    const { data } = await supabase
      .from('buildings')
      .select('id, name')
      .in('id', ids);
    const map = new Map<string, string>(
      (data ?? []).map((r) => [r.id as string, (r.name as { ru: string }).ru]),
    );
    const items: PreviewItem[] = ids
      .filter((id) => map.has(id))
      .map((id) => ({ id, name: map.get(id) ?? '—' }));
    return NextResponse.json({ items });
  }

  // Listings: name is `<Building short> · N-комн` so the chip reads
  // meaningfully even when several apartments come from the same project.
  const { data: listings } = await supabase
    .from('listings')
    .select('id, rooms_count, building_id')
    .in('id', ids);
  const buildingIds = [
    ...new Set((listings ?? []).map((l) => l.building_id as string)),
  ];
  const { data: buildings } = buildingIds.length
    ? await supabase
        .from('buildings')
        .select('id, name')
        .in('id', buildingIds)
    : { data: [] };
  const buildingNames = new Map<string, string>(
    (buildings ?? []).map((b) => [
      b.id as string,
      (b.name as { ru: string }).ru.replace(/^ЖК\s+/i, ''),
    ]),
  );
  const labelMap = new Map<string, string>();
  for (const l of listings ?? []) {
    const buildingName = buildingNames.get(l.building_id as string) ?? '—';
    labelMap.set(
      l.id as string,
      `${buildingName} · ${l.rooms_count}-комн`,
    );
  }
  const items: PreviewItem[] = ids
    .filter((id) => labelMap.has(id))
    .map((id) => ({ id, name: labelMap.get(id) ?? '—' }));
  return NextResponse.json({ items });
}
