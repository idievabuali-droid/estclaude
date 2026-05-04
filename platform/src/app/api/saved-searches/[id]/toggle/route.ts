/**
 * PATCH /api/saved-searches/[id]/toggle
 *
 * Flip the `active` flag on a saved search owned by the current user.
 * Inactive searches don't fire notifications but stay in the table so
 * the user can re-enable later without re-creating.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  const supabase = createAdminClient();
  // Read current state, flip it, write back.
  const { data: row } = await supabase
    .from('saved_searches')
    .select('active')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const next = !row.active;
  const { error } = await supabase
    .from('saved_searches')
    .update({ active: next })
    .eq('id', id);
  if (error) {
    console.error('saved_searches toggle failed:', error);
    return NextResponse.json({ error: 'toggle failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, active: next });
}
