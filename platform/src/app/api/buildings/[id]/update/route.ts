/**
 * POST /api/buildings/[id]/update
 *
 * Edit an existing building. Permission gating: founder only in V1 —
 * buildings are typically owned by developers, not the sellers who
 * created them via /post, and ongoing edits (progress photos, status
 * changes, amenity additions) are a founder responsibility.
 *
 * Body shape mirrors the building portion of /api/inventory/create's
 * payload, with everything optional (only set keys are updated).
 * Slug is intentionally NOT regenerated on rename — see updateBuilding's
 * doc-comment in src/services/buildings.ts.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { updateBuilding } from '@/services/buildings';
import {
  attachAndSetCover,
  deletePhotos,
  type PendingPhoto,
} from '@/services/photos';
import type { BuildingStatus } from '@/types/domain';

interface UpdateBody {
  name?: string;
  address?: string;
  district_id?: string;
  developer_id?: string;
  status?: BuildingStatus;
  total_floors?: number;
  total_units?: number;
  handover_quarter?: string | null;
  description?: string | null;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  /** Photos already uploaded to Storage by /api/storage/upload —
   *  attached to this building as new `photos` rows. Each PendingPhoto
   *  carries its own `kind`, so exterior + progress photos can be
   *  sent in one array. */
  pendingPhotos?: PendingPhoto[];
  /** photos.id values the founder marked for removal. Both the row
   *  and the Storage object are deleted; if any was the cover, the
   *  parent's cover_photo_id is cleared first to avoid an FK violation
   *  (handled inside deletePhotos). */
  removePhotoIds?: string[];
}

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
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  try {
    const result = await updateBuilding(id, {
      name: body.name?.trim() || undefined,
      address: body.address?.trim() || undefined,
      districtId: body.district_id,
      developerId: body.developer_id,
      status: body.status,
      totalFloors: body.total_floors,
      totalUnits: body.total_units,
      handoverQuarter:
        body.handover_quarter === undefined
          ? undefined
          : body.handover_quarter?.trim() || null,
      description:
        body.description === undefined
          ? undefined
          : body.description?.trim() || null,
      amenities: body.amenities,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // Photo edits run AFTER the field update so we don't mutate photos
    // for a building that failed validation. Failures here are logged
    // but don't roll back the field changes — same pattern as
    // /api/listings/[id]/update.
    if (body.removePhotoIds && body.removePhotoIds.length > 0) {
      try {
        await deletePhotos(body.removePhotoIds);
      } catch (err) {
        console.error('deletePhotos failed (non-fatal):', err);
      }
    }
    if (body.pendingPhotos && body.pendingPhotos.length > 0) {
      try {
        await attachAndSetCover('building', id, body.pendingPhotos, {
          uploaderId: user.id,
        });
      } catch (err) {
        console.error('attaching new photos failed (non-fatal):', err);
      }
    }

    return NextResponse.json({ ok: true, slug: result.slug });
  } catch (err) {
    console.error('updateBuilding failed:', err);
    return NextResponse.json(
      { error: 'update failed', detail: String(err) },
      { status: 500 },
    );
  }
}
