/**
 * POST /api/saved/migrate-anon
 *
 * Body: { saves: Array<{ type: 'building' | 'listing'; id: string }> }
 *
 * Called from the client right after a successful Telegram login —
 * lifts the visitor's localStorage anon-saves into `saved_items` tied
 * to their user_id. Idempotent on the server (saved_items has unique
 * indexes on (user_id, building_id) and (user_id, listing_id) per
 * migration 0004). Failures are tolerated row-by-row so a bad id
 * doesn't sink the whole batch.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';

interface MigrateBody {
  saves: Array<{ type: 'building' | 'listing'; id: string }>;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: MigrateBody;
  try {
    body = (await req.json()) as MigrateBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!Array.isArray(body.saves)) {
    return NextResponse.json({ error: 'saves array required' }, { status: 400 });
  }
  // Cap at a sensible upper bound — a real anon visitor saves a
  // handful, not thousands. Caps the blast radius of a malicious
  // payload trying to bloat saved_items.
  const saves = body.saves.slice(0, 50);

  const supabase = createAdminClient();
  let migrated = 0;
  let skipped = 0;
  for (const s of saves) {
    if (!s || (s.type !== 'building' && s.type !== 'listing') || !s.id) {
      skipped++;
      continue;
    }
    const row =
      s.type === 'building'
        ? { user_id: user.id, building_id: s.id }
        : { user_id: user.id, listing_id: s.id };
    const { error } = await supabase.from('saved_items').insert(row);
    if (error) {
      // Unique-constraint duplicate is expected on re-migration —
      // doesn't count as a failure.
      const isDup = /duplicate|unique/i.test(error.message);
      if (!isDup) {
        console.error('migrate-anon insert failed:', error.message);
        skipped++;
        continue;
      }
    }
    migrated++;
  }
  return NextResponse.json({ ok: true, migrated, skipped });
}
