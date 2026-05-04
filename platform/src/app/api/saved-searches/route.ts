/**
 * GET  /api/saved-searches            — list saved searches owned by
 *                                       the current user (login required).
 * DELETE /api/saved-searches?id=...   — delete a saved search you own.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('saved_searches')
    .select('id, page, filters, display_name, notify_chat_id, notify_phone, active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('saved_searches list failed:', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const supabase = createAdminClient();
  // Scope by user_id so a leaked id doesn't let someone else's row
  // be deleted. (Founder admin tooling can use the admin client
  // directly without going through this route.)
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('saved_searches delete failed:', error);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
