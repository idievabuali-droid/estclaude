/**
 * POST /api/listings/[id]/update
 * body: same shape as ApartmentInput in /api/inventory/create
 *
 * Edit an existing listing. Permission gating: must be the listing's
 * owner OR a founder. Re-moderation policy is enforced inside the
 * service (updateListing) — non-founders editing previously-active
 * listings hit pending_review when changing price ≥ 10% / rooms /
 * size > 5 m².
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { listingOwnedBy, updateListing } from '@/services/listings';
import {
  attachAndSetCover,
  deletePhotos,
  type PendingPhoto,
} from '@/services/photos';
import type { FinishingType } from '@/types/domain';

interface UpdateBody {
  rooms_count?: number;
  size_m2?: number;
  floor_number?: number;
  price_tjs?: number;
  finishing_type?: FinishingType;
  bathroom_separate?: boolean | null;
  description?: string | null;
  installment?: {
    monthly_tjs: number;
    first_payment_percent: number;
    term_months: number;
  } | null;
  /** Photos already uploaded to Storage by /api/storage/upload —
   *  attached to this listing as new `photos` rows. */
  pendingPhotos?: PendingPhoto[];
  /** photos.id values the seller marked for removal. Both the row and
   *  the Storage object are deleted; if any was the cover, the parent's
   *  cover_photo_id is cleared first to avoid an FK violation. */
  removePhotoIds?: string[];
}

const TJS_TO_DIRAMS = 100n;

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

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  try {
    const result = await updateListing(
      id,
      {
        roomsCount: body.rooms_count,
        sizeM2: body.size_m2,
        floorNumber: body.floor_number,
        priceTotalDirams:
          body.price_tjs != null
            ? BigInt(Math.round(body.price_tjs)) * TJS_TO_DIRAMS
            : undefined,
        finishingType: body.finishing_type,
        bathroomSeparate: body.bathroom_separate,
        description: body.description,
        installment:
          body.installment === undefined
            ? undefined
            : body.installment === null
              ? null
              : {
                  monthlyDirams:
                    BigInt(Math.round(body.installment.monthly_tjs)) * TJS_TO_DIRAMS,
                  firstPaymentPercent: body.installment.first_payment_percent,
                  termMonths: body.installment.term_months,
                },
      },
      { editorIsFounder: founder },
    );
    // Photo edits run AFTER the field update so we don't mutate
    // photos for a listing that failed validation. Failures here are
    // logged but don't roll back the field changes — the seller can
    // retry photo edits without losing their other edits.
    if (body.removePhotoIds && body.removePhotoIds.length > 0) {
      try {
        await deletePhotos(body.removePhotoIds);
      } catch (err) {
        console.error('deletePhotos failed (non-fatal):', err);
      }
    }
    if (body.pendingPhotos && body.pendingPhotos.length > 0) {
      try {
        await attachAndSetCover('listing', id, body.pendingPhotos, {
          uploaderId: user.id,
        });
      } catch (err) {
        console.error('attaching new photos failed (non-fatal):', err);
      }
    }

    return NextResponse.json({ ok: true, re_moderated: result.reModerated });
  } catch (err) {
    console.error('updateListing failed:', err);
    return NextResponse.json(
      { error: 'update failed', detail: String(err) },
      { status: 500 },
    );
  }
}
