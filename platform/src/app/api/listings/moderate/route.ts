/**
 * POST /api/listings/moderate
 * body: { listing_id: string, action: 'approve' | 'reject' }
 *
 * Founder-only endpoint. Flips a pending listing to 'active' (approve)
 * or 'rejected' (reject). Sends a Telegram notification to the
 * submitter so they know the outcome — closes the moderation loop
 * without requiring them to refresh the dashboard.
 *
 * Auth gating: getCurrentUser() must succeed AND isFounder() must
 * return true. Non-founders trying to call this get 403.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram/bot';

interface ModerateBody {
  listing_id: string;
  action: 'approve' | 'reject';
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!(await isFounder(user.id))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: ModerateBody;
  try {
    body = (await req.json()) as ModerateBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!body.listing_id || (body.action !== 'approve' && body.action !== 'reject')) {
    return NextResponse.json({ error: 'bad params' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up the listing + its submitter so we can notify them.
  const { data: listing } = await supabase
    .from('listings')
    .select('id, slug, status, seller_user_id, rooms_count, building_id')
    .eq('id', body.listing_id)
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: 'listing not found' }, { status: 404 });
  }
  if (listing.status !== 'pending_review') {
    return NextResponse.json(
      { error: `listing is in status '${listing.status}', not 'pending_review'` },
      { status: 409 },
    );
  }

  const newStatus = body.action === 'approve' ? 'active' : 'rejected';
  const { error: updateErr } = await supabase
    .from('listings')
    .update({
      status: newStatus,
      published_at:
        body.action === 'approve' ? new Date().toISOString() : null,
    })
    .eq('id', listing.id);
  if (updateErr) {
    console.error('moderation update failed:', updateErr);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  // Auto-publish the parent building when its first listing gets
  // approved. Non-founders create buildings as is_published=false so
  // they don't show up on /novostroyki until at least one listing has
  // been vetted; without this step the building would stay invisible
  // forever even after we approve listings inside it. Cheap extra
  // UPDATE — single founder click, no concurrency.
  if (body.action === 'approve') {
    const { data: bld } = await supabase
      .from('buildings')
      .select('id, is_published')
      .eq('id', listing.building_id)
      .maybeSingle();
    if (bld && bld.is_published === false) {
      const { error: pubErr } = await supabase
        .from('buildings')
        .update({ is_published: true })
        .eq('id', bld.id);
      if (pubErr) {
        console.error('building auto-publish failed (non-fatal):', pubErr);
      }
    }
  }

  // Notify the submitter via Telegram if they have a chat_id linked.
  // Fire-and-forget — don't block the API response on Telegram outage.
  try {
    const { data: seller } = await supabase
      .from('users')
      .select('tg_chat_id, notifications_enabled')
      .eq('id', listing.seller_user_id)
      .maybeSingle();
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', listing.building_id)
      .maybeSingle();
    const buildingName =
      (building?.name as { ru: string } | undefined)?.ru ?? 'ЖК';

    if (seller?.tg_chat_id != null && seller.notifications_enabled !== false) {
      const text =
        body.action === 'approve'
          ? `✓ Ваше объявление опубликовано: ${buildingName} · ${listing.rooms_count}-комн.`
          : `Ваше объявление не прошло модерацию: ${buildingName} · ${listing.rooms_count}-комн. Свяжитесь с поддержкой, если нужны детали.`;
      void sendMessage(seller.tg_chat_id as number, text);
    }
  } catch (err) {
    console.error('notification dispatch failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true, status: newStatus, slug: listing.slug });
}
