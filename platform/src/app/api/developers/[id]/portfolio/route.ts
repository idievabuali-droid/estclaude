/**
 * POST /api/developers/[id]/portfolio
 *
 * Update the structured portfolio fields on a developer row:
 *   - years_active                          ("Лет на рынке")
 *   - projects_completed_count              ("Сдано" / 'delivered')
 *   - projects_announced_count              ("Котлован" / 'announced')
 *   - projects_under_construction_count     ("Строится")
 *   - projects_near_completion_count        ("Почти готов")
 *
 * Called by PostFlow's «Портфолио застройщика» section when the user
 * publishes a building — the section captures these via number-stepper
 * inputs bound to the selected developer, then this endpoint persists
 * them. Captured here, not in NewDeveloperModal, so the founder fills
 * everything in one flow (DECISIONS 2026-05-22).
 *
 * Permissions: any phone-verified user (mirrors /api/developers/create's
 * V1 policy). Founder moderates developer rows as a separate workflow.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

interface UpdatePortfolioBody {
  years_active?: number | null;
  projects_completed_count?: number | null;
  projects_announced_count?: number | null;
  projects_under_construction_count?: number | null;
  projects_near_completion_count?: number | null;
  /** Updates developers.description JSONB — the Russian short company
   *  description shown on the «О застройщике» card. Pass empty string
   *  or null to clear. The endpoint wraps to { ru, tj:null }. */
  description?: string | null;
}

const COLUMNS = [
  'years_active',
  'projects_completed_count',
  'projects_announced_count',
  'projects_under_construction_count',
  'projects_near_completion_count',
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  let body: UpdatePortfolioBody;
  try {
    body = (await req.json()) as UpdatePortfolioBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  // Build patch — accept null (clear) and non-negative integers; reject
  // garbage. Skip any column the caller didn't explicitly set so we
  // don't accidentally clear values they don't know about.
  type PatchValue = number | null | { ru: string; tj: string | null };
  const patch: Record<string, PatchValue> = {};
  for (const col of COLUMNS) {
    if (!(col in body)) continue;
    const v = body[col];
    if (v === null) {
      patch[col] = null;
      continue;
    }
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
      return NextResponse.json(
        { error: `${col} must be a non-negative integer or null` },
        { status: 400 },
      );
    }
    patch[col] = v;
  }

  // Description — JSONB column. Empty string clears (writes null) so
  // the founder can wipe a description without leaving an orphan
  // empty-string row.
  if ('description' in body) {
    const d = body.description;
    if (d !== null && typeof d !== 'string') {
      return NextResponse.json(
        { error: 'description must be string or null' },
        { status: 400 },
      );
    }
    const trimmed = typeof d === 'string' ? d.trim() : null;
    patch.description = trimmed ? { ru: trimmed, tj: null } : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('developers')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('update developer portfolio failed:', error);
    return NextResponse.json(
      { error: 'update failed', detail: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updated: true });
}
