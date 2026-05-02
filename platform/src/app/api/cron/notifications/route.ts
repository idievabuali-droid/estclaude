/**
 * GET /api/cron/notifications
 *
 * Vercel Cron target. Processes pending change_events and sends
 * Telegram notifications to users who saved the affected items.
 *
 * Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET> on
 * every scheduled invocation. We verify against the env var so the
 * endpoint can't be abused by anyone hitting the URL directly.
 *
 * Schedule registered in vercel.json (every 5 minutes).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { dispatchPendingNotifications } from '@/services/notifications';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await dispatchPendingNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('cron/notifications error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
