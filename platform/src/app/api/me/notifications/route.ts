/**
 * POST /api/me/notifications
 * body: { enabled: boolean }
 *
 * Toggles the current user's Telegram notification opt-in. Used by
 * the /kabinet settings page.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase
    .from('users')
    .update({ notifications_enabled: body.enabled })
    .eq('id', user.id);

  return NextResponse.json({ enabled: body.enabled });
}
