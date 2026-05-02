/**
 * POST /api/saved/toggle
 * body: { type: 'building' | 'listing', id: <uuid> }
 *
 * Toggles the current user's save state for a building or listing.
 * Returns the new state so the client can update its UI without
 * refetching. Requires authentication — returns 401 otherwise.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

interface ToggleBody {
  type: 'building' | 'listing';
  id: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: ToggleBody;
  try {
    body = (await req.json()) as ToggleBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if ((body.type !== 'building' && body.type !== 'listing') || !body.id) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const column = body.type === 'building' ? 'building_id' : 'listing_id';

  // Look for existing save first.
  const { data: existing } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq(column, body.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_items').delete().eq('id', existing.id);
    return NextResponse.json({ saved: false });
  }

  await supabase.from('saved_items').insert({
    user_id: user.id,
    [column]: body.id,
  });
  return NextResponse.json({ saved: true });
}
