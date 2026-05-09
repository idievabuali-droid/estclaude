/**
 * POST /api/admin/test-match
 *
 * Founder-only smoke-test endpoint for the save-search → Telegram
 * delivery loop. The pipeline is hard to validate end-to-end without
 * actually publishing a real listing in production, so this endpoint
 * is the one-tap shortcut:
 *
 *   1. Inserts a fresh active 2-комн / без ремонта / monthly ≤ 4 000
 *      listing in the first available Vahdat building. The criteria
 *      deliberately overlap with the typical wizard-installment search
 *      so most active saved_searches will match.
 *   2. Calls notifyMatchingListing for it — same code path
 *      /api/inventory/create takes when the founder publishes via /post.
 *   3. Returns the listing id + slug.
 *
 * The actual delivery (Telegram message arriving) is observable on the
 * founder's @-handle (relay path for WhatsApp subscribers) or the
 * @VafoTjBot conversation (direct path for Telegram subscribers).
 *
 * Cleanup: GET this endpoint to remove all test listings inserted by
 * prior runs (slug starts with "test-match-").
 *
 * Auth: founder role required. No CRON_SECRET — the founder will hit
 * this from their browser while logged in.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { notifyMatchingListing } from '@/lib/saved-searches/match';

async function requireFounder() {
  const user = await getCurrentUser();
  if (!user) return { error: 'auth required', status: 401 as const };
  const founder = await isFounder(user.id);
  if (!founder) return { error: 'founder only', status: 403 as const };
  return { user };
}

export async function POST(req: NextRequest) {
  const guard = await requireFounder();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const supabase = createAdminClient();

  // First Vahdat published building — wherever the test listing lands
  // doesn't matter for matching (saved-search filters care about
  // rooms / finishing / monthly cap, not the building slug).
  const { data: building } = await supabase
    .from('buildings')
    .select('id, slug, total_floors')
    .eq('city', 'vahdat')
    .eq('is_published', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!building) {
    return NextResponse.json({ error: 'no published vahdat building' }, { status: 500 });
  }

  const ts = Date.now().toString(36);
  const slug = `test-match-${ts}`;
  const priceTotalTjs = 198_000;
  const monthlyTjs = 2_400;

  const { data: inserted, error: insertErr } = await supabase
    .from('listings')
    .insert({
      slug,
      building_id: building.id,
      seller_user_id: guard.user.id,
      source_type: 'developer',
      status: 'active',
      rooms_count: 2,
      size_m2: 55,
      floor_number: 4,
      total_floors: building.total_floors ?? 7,
      price_total_dirams: (priceTotalTjs * 100).toString(),
      finishing_type: 'no_finish',
      installment_available: true,
      installment_monthly_amount_dirams: (monthlyTjs * 100).toString(),
      installment_first_payment_percent: 30,
      installment_term_months: 84,
      published_at: new Date().toISOString(),
      unit_description: {
        ru: `[TEST ${ts}] Тестовая квартира для проверки уведомлений saved-search.`,
        tg: `[TEST ${ts}]`,
      },
    })
    .select('id, slug')
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: 'insert failed', detail: insertErr?.message },
      { status: 500 },
    );
  }

  // Fire the notify pipeline. Errors logged but not surfaced — the
  // listing exists either way, so the founder can re-trigger by
  // calling notifyMatchingListing again via this endpoint or by
  // watching production logs to see what happened.
  const origin = req.nextUrl.origin;
  try {
    await notifyMatchingListing(inserted.id, { origin });
  } catch (err) {
    console.error('test-match notify failed:', err);
    return NextResponse.json({
      ok: true,
      listing_id: inserted.id,
      slug: inserted.slug,
      notify_error: err instanceof Error ? err.message : 'unknown',
    });
  }

  return NextResponse.json({
    ok: true,
    listing_id: inserted.id,
    slug: inserted.slug,
    note: 'Notify pipeline ran. Check Telegram (your @-handle for WhatsApp-subscribed searches; @VafoTjBot for Telegram-subscribed).',
  });
}

export async function GET() {
  // Cleanup all test listings.
  const guard = await requireFounder();
  if ('error' in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from('listings')
    .select('id, slug')
    .ilike('slug', 'test-match-%');
  for (const r of rows ?? []) {
    await supabase.from('listings').delete().eq('id', r.id);
  }
  return NextResponse.json({ ok: true, deleted: rows?.length ?? 0 });
}
