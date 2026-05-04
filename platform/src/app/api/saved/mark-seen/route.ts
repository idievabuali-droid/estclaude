/**
 * POST /api/saved/mark-seen
 *
 * Stamps `change_badges_seen_at = now()` on every saved_items row for
 * the current user. Called from a small client effect after /izbrannoe
 * renders so that the next visit only flags items that have changed
 * AGAIN since this visit, not since the user first saved them.
 *
 * Idempotent — safe to call repeatedly.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { markSavedItemsSeen } from '@/services/saved';

export async function POST(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await markSavedItemsSeen(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('mark-seen failed:', err);
    return NextResponse.json({ error: 'Internal' }, { status: 500 });
  }
}
