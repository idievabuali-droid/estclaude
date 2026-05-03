/**
 * POST /api/listings/[id]/status
 * body: { status: 'active' | 'hidden' | 'sold' }
 *
 * Lifecycle action — hide / show / mark-sold the listing. Founder OR
 * the listing owner only. Pending_review and rejected statuses are
 * managed via /api/listings/moderate (founder-only); this endpoint
 * stays out of moderation logic.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import {
  listingOwnedBy,
  setListingStatus,
  type ListingLifecycleStatus,
} from '@/services/listings';

interface StatusBody {
  status: ListingLifecycleStatus;
}

const ALLOWED: ListingLifecycleStatus[] = ['active', 'hidden', 'sold'];

export async function POST(
  req: NextRequest,
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

  let body: StatusBody;
  try {
    body = (await req.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  if (!ALLOWED.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of ${ALLOWED.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    await setListingStatus(id, body.status);
    return NextResponse.json({ ok: true, status: body.status });
  } catch (err) {
    console.error('setListingStatus failed:', err);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
}
