/**
 * POST /api/listings/[id]/delete
 *
 * Soft-delete: stamps `deleted_at` so the listing vanishes from
 * every public + dashboard query (all reads filter on
 * `is('deleted_at', null)`) without actually dropping the row.
 * Keeps referential integrity for any saves / contact_requests
 * that might still point at it.
 *
 * Permission: founder OR listing owner. No body required.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listingOwnedBy, softDeleteListing } from '@/services/listings';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { id } = await params;

  const founder = await isFounder(user.id);
  if (!founder) {
    const owner = await listingOwnedBy(id, user.id);
    if (!owner) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  try {
    await softDeleteListing(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('softDeleteListing failed:', err);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
