/**
 * GET /api/saved/status?type=building&id=...
 *
 * Returns whether the current user has saved the given item. Used by
 * SaveToggle to render its initial filled/unfilled icon state without
 * requiring the page to pre-pass the saved-set in.
 *
 * Returns { saved: false } for unauthenticated users — the toggle
 * still renders, just empty, and the click prompts a login.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ saved: false, authenticated: false });

  const type = req.nextUrl.searchParams.get('type');
  const id = req.nextUrl.searchParams.get('id');
  if ((type !== 'building' && type !== 'listing') || !id) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const column = type === 'building' ? 'building_id' : 'listing_id';
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq(column, id)
    .maybeSingle();

  return NextResponse.json({ saved: !!data, authenticated: true });
}
