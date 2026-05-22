/**
 * POST /api/districts/create
 *
 * Create a new district inline from the /post form when the seller
 * picks "+ Создать новый район" in the district dropdown. Any phone-
 * verified user can submit one; the row is inserted immediately so
 * the seller can keep filling the building form without breaking flow.
 *
 * Body shape:
 *   { name: string, center_latitude?: number, center_longitude?: number }
 *
 * Defaults:
 *   - city = 'vahdat' (single-city V1 — see ACTIVE_CITY in services/buildings.ts)
 *   - slug = slugified name (Cyrillic → Latin, lowercase, hyphens)
 *   - center_latitude / center_longitude → Vahdat town centre when not provided
 *
 * Returns:
 *   { id, name, center_lat, center_lng } — enough for the client to
 *   append to its in-memory districts list and auto-select the new id.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

interface CreateDistrictBody {
  name: string;
  center_latitude?: number;
  center_longitude?: number;
}

const VAHDAT_FALLBACK_COORDS = { lat: 38.5511, lng: 69.0214 };
const ACTIVE_CITY = 'vahdat';

/** Slugify Russian name → URL-safe lowercase ASCII. Same algo as
 *  `slugify()` in services/buildings.ts — duplicated here to avoid
 *  pulling the buildings service into a districts route. */
function slugify(input: string): string {
  const cyr = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const lat = [
    'a', 'b', 'v', 'g', 'd', 'e', 'yo', 'zh', 'z', 'i', 'y', 'k', 'l', 'm',
    'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'c', 'ch', 'sh', 'sch', '',
    'y', '', 'e', 'yu', 'ya',
  ];
  const lower = input.toLowerCase();
  let result = '';
  for (const ch of lower) {
    const idx = cyr.indexOf(ch);
    if (idx >= 0) result += lat[idx];
    else result += ch;
  }
  return (
    result
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'rayon'
  );
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: CreateDistrictBody;
  try {
    body = (await req.json()) as CreateDistrictBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  // Validate optional coords. Reject NaN / out-of-range gracefully so a
  // bad client payload doesn't insert garbage. Range is loose (-90/90,
  // -180/180) — anything tighter is the founder's review job.
  let centerLatitude = VAHDAT_FALLBACK_COORDS.lat;
  let centerLongitude = VAHDAT_FALLBACK_COORDS.lng;
  if (
    typeof body.center_latitude === 'number' &&
    Number.isFinite(body.center_latitude) &&
    body.center_latitude >= -90 &&
    body.center_latitude <= 90
  ) {
    centerLatitude = body.center_latitude;
  }
  if (
    typeof body.center_longitude === 'number' &&
    Number.isFinite(body.center_longitude) &&
    body.center_longitude >= -180 &&
    body.center_longitude <= 180
  ) {
    centerLongitude = body.center_longitude;
  }

  const supabase = createAdminClient();

  // Generate a unique slug. Districts have UNIQUE (city, slug) — on
  // collision suffix with 4-char random and retry. Mirrors createBuilding.
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from('districts')
      .select('id')
      .eq('city', ACTIVE_CITY)
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  const { data, error } = await supabase
    .from('districts')
    .insert({
      city: ACTIVE_CITY,
      name: { ru: name, tg: name },
      slug,
      center_latitude: centerLatitude,
      center_longitude: centerLongitude,
    })
    .select('id, name, center_latitude, center_longitude')
    .single();
  if (error || !data) {
    console.error('createDistrict failed:', error);
    return NextResponse.json(
      { error: 'create failed', detail: error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id as string,
    name: (data.name as { ru: string }).ru,
    center_lat: data.center_latitude as number,
    center_lng: data.center_longitude as number,
  });
}
