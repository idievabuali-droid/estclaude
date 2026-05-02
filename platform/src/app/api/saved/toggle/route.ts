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
  const { data: existing, error: selectErr } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq(column, body.id)
    .maybeSingle();

  if (selectErr) {
    console.error('saved/toggle select failed:', selectErr);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }

  if (existing) {
    const { error: deleteErr } = await supabase
      .from('saved_items')
      .delete()
      .eq('id', existing.id);
    if (deleteErr) {
      console.error('saved/toggle delete failed:', deleteErr);
      return NextResponse.json({ error: 'delete failed' }, { status: 500 });
    }
    return NextResponse.json({ saved: false });
  }

  // Insert. Previously this was fire-and-forget — silent failures
  // returned saved:true to the client even when nothing was actually
  // written. Now we surface the error so SaveToggle reverts its
  // optimistic flip and shows a proper toast.
  const { error: insertErr } = await supabase.from('saved_items').insert({
    user_id: user.id,
    [column]: body.id,
  });
  if (insertErr) {
    console.error('saved/toggle insert failed:', insertErr);
    return NextResponse.json(
      { error: 'insert failed', detail: insertErr.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ saved: true });
}
