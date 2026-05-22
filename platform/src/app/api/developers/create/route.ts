/**
 * POST /api/developers/create
 *
 * Suggest a new developer from the /post form. Any phone-verified
 * user can submit one; the row is inserted with status='pending'
 * (verified_at=null), so the new developer can immediately be
 * attached to a building but won't show the "Проверенный" badge
 * until the founder verifies it from the admin queue.
 *
 * Body shape:
 *   { name: string, phone: string, description?: string }
 *
 * Returns { id, name, display_name_ru } — enough for the client to
 * append to its in-memory developer list and auto-select the new id.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

interface CreateDeveloperBody {
  name: string;
  phone: string;
  description?: string;
  /** Years the developer has been operating. Optional — column is
   *  nullable on the developers table (migration 0002). Surfaces on
   *  /zhk/[slug] as a trust signal. */
  years_active?: number;
  /** Number of projects the developer has completed (handed over).
   *  Optional, nullable column. Surfaces on /zhk/[slug] too. */
  projects_completed_count?: number;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: CreateDeveloperBody;
  try {
    body = (await req.json()) as CreateDeveloperBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  // Schema requires primary_contact_phone NOT NULL — keep the form's
  // requirement aligned so we never insert a useless contact-less
  // developer that nobody can reach.
  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  // Portfolio fields — both optional, nullable columns. Reject
  // negative / non-integer values defensively (the modal already
  // validates client-side, but a hand-crafted API call could bypass).
  const yearsActive =
    typeof body.years_active === 'number' &&
    Number.isInteger(body.years_active) &&
    body.years_active >= 0
      ? body.years_active
      : null;
  const projectsCompleted =
    typeof body.projects_completed_count === 'number' &&
    Number.isInteger(body.projects_completed_count) &&
    body.projects_completed_count >= 0
      ? body.projects_completed_count
      : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('developers')
    .insert({
      name,
      display_name: { ru: name, tg: name },
      primary_contact_phone: phone,
      description: body.description?.trim()
        ? { ru: body.description.trim(), tg: body.description.trim() }
        : null,
      years_active: yearsActive,
      projects_completed_count: projectsCompleted,
      // 'pending' is the enum default but spelled out for clarity —
      // founder approves later from /kabinet (queue work, not this round).
      status: 'pending',
      verified_at: null,
    })
    .select('id, name, display_name')
    .single();
  if (error || !data) {
    console.error('createDeveloper failed:', error);
    return NextResponse.json(
      { error: 'create failed', detail: error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id as string,
    name: data.name as string,
    display_name_ru: (data.display_name as { ru: string }).ru,
  });
}
