/**
 * POST /api/inventory/create
 *
 * Combined endpoint that creates a building + N apartments in one
 * call. Two flows:
 *
 *   1. NEW BUILDING + N apartments: body.building has all the fields
 *      to create a fresh building. We create it, then create each
 *      apartment with its building_id.
 *
 *   2. EXISTING BUILDING + N apartments: body.building.id is set to
 *      a UUID. We skip building creation, just create apartments.
 *
 * Status logic — driven by user role:
 *   - Founder (admin/staff role) → buildings.is_published = true,
 *     listings.status = 'active'. Goes live immediately.
 *   - Phone-verified user (no role) → is_published = false,
 *     status = 'pending_review'. Goes to founder's moderation queue.
 *
 * Atomicity: V1 doesn't wrap in a transaction. If the building creates
 * but apartment 3 of 5 fails, the user sees an error and can retry
 * the failing apartment. Adding transactions later would require a
 * Postgres function or supabase.rpc() — out of V1 scope.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createBuilding } from '@/services/buildings';
import { createListing } from '@/services/listings';
import { attachAndSetCover, type PendingPhoto } from '@/services/photos';
import { notifyMatchingListing } from '@/lib/saved-searches/match';
import { notifyPendingListing } from '@/lib/analytics/founder-notify';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BuildingStatus, FinishingType, SourceType } from '@/types/domain';

interface ApartmentInput {
  rooms_count: number;
  size_m2: number;
  floor_number: number;
  /** Total price in TJS (the form collects this; we convert to dirams). */
  price_tjs: number;
  finishing_type: FinishingType;
  total_floors?: number;
  /**
   * Russian RE convention: true = раздельный (separate toilet from
   * bath), false = совмещённый (combined). Most Tajik apartments
   * have one bathroom, so capturing the type is enough.
   */
  bathroom_separate?: boolean;
  description?: string;
  installment?: {
    monthly_tjs: number;
    first_payment_percent: number;
    term_months: number;
  };
  /** Photos already uploaded to Storage by /api/storage/upload. */
  pendingPhotos?: PendingPhoto[];
}

interface CreateInventoryBody {
  building:
    | {
        id: string; // Existing building.
      }
    | {
        // New building fields.
        name: string;
        address: string;
        /** Optional landmark — appended to the description because we
         *  don't have a dedicated DB column yet. Locals use these
         *  ("напротив рынка Дусти") more than formal addresses. */
        landmark?: string;
        district_id: string;
        developer_id: string;
        status: BuildingStatus;
        total_floors: number;
        total_units: number;
        handover_quarter?: string;
        description?: string;
        amenities?: string[];
        latitude?: number;
        longitude?: number;
        /** Building cover photos (already uploaded to Storage). */
        pendingPhotos?: PendingPhoto[];
      };
  apartments: ApartmentInput[];
}

const TJS_TO_DIRAMS = 100n;

/**
 * Translate the most-likely Postgres constraint / Supabase errors into
 * Russian copy the seller can act on. Falls back to the raw message so
 * we never hide a debug-useful detail.
 *
 * The list is intentionally narrow — every entry corresponds to a
 * named DB constraint or a known Supabase failure mode that a real
 * seller might hit. Adding "best effort fallback" translations beyond
 * this would risk masking new bugs we should fix at the source.
 */
function humaniseListingError(raw: string): string {
  // listings_owner_renovated_only_resale (migration 0003): the founder
  // accidentally picked "Отремонтировано владельцем" while we still
  // mark the listing as a developer source. Now defended client-side
  // by resolveSourceType, but kept here in case a future code path
  // bypasses it.
  if (raw.includes('listings_owner_renovated_only_resale')) {
    return 'Отделка «Отремонтировано владельцем» доступна только для частных продавцов — выберите другой вариант или войдите как обычный пользователь.';
  }
  // listings_size_positive / _price_positive / _rooms_min — basic
  // sanity checks. The form prevents these but a copy-paste API call
  // could still hit them.
  if (raw.includes('listings_size_positive')) {
    return 'Площадь должна быть больше нуля.';
  }
  if (raw.includes('listings_price_positive')) {
    return 'Цена должна быть больше нуля.';
  }
  if (raw.includes('listings_rooms_min')) {
    return 'Минимум 1 комната.';
  }
  // listings_slug_unique — extremely rare after the slug-collision
  // retry loop, but not impossible.
  if (raw.includes('listings_slug_unique')) {
    return 'Похожее объявление уже существует — измените площадь или этаж и попробуйте ещё раз.';
  }
  // Foreign-key violations on building_id / seller_user_id are usually
  // a bug, not a seller mistake. Surface a cleaner string anyway.
  if (raw.includes('listings_building_id_fkey')) {
    return 'ЖК не найден. Обновите страницу и выберите ЖК заново.';
  }
  return raw;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: CreateInventoryBody;
  try {
    body = (await req.json()) as CreateInventoryBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!Array.isArray(body.apartments) || body.apartments.length === 0) {
    return NextResponse.json(
      { error: 'at least one apartment is required' },
      { status: 400 },
    );
  }

  const founder = await isFounder(user.id);
  const initialStatus = founder ? 'active' : 'pending_review';
  // Source-type derivation:
  //  - Non-founder always = 'owner' (they're posting their own apartment).
  //  - Founder defaults to 'developer' (they post on behalf of a builder).
  //  - But: the schema enforces a CHECK constraint
  //      `listings_owner_renovated_only_resale`:
  //        finishing_type='owner_renovated' ⇒ source_type ∈ {owner, intermediary}
  //    So if the apartment is "Отремонтировано владельцем" we force
  //    'owner' regardless of who's typing — by definition that's a
  //    private-owner listing, even when the founder is data-entering it.
  //  We resolve sourceType per-apartment rather than once-per-request
  //  because a single submission can mix new-build (developer) and
  //  resale (owner) units (rare today, but the constraint is per-row).
  const baseSourceType: 'developer' | 'owner' = founder ? 'developer' : 'owner';
  const resolveSourceType = (finishing: FinishingType): SourceType =>
    finishing === 'owner_renovated' ? 'owner' : baseSourceType;

  // Resolve building — either create new or use existing id.
  let buildingId: string;
  let buildingSlug: string | null = null;
  if ('id' in body.building) {
    buildingId = body.building.id;
  } else {
    const b = body.building;
    // Minimal validation. The DB will reject malformed enum values
    // and missing FKs (district_id, developer_id) with helpful errors.
    if (!b.name?.trim() || !b.address?.trim() || !b.district_id || !b.developer_id) {
      return NextResponse.json(
        { error: 'missing required building fields' },
        { status: 400 },
      );
    }
    try {
      // If the seller supplied a landmark, glue it onto the description
      // until we add a dedicated `landmark` column. Format keeps it
      // distinguishable for future migration to a structured field.
      const composedDescription = [
        b.description?.trim() || null,
        b.landmark?.trim() ? `Ориентир: ${b.landmark.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined;

      const created = await createBuilding({
        name: b.name.trim(),
        address: b.address.trim(),
        districtId: b.district_id,
        developerId: b.developer_id,
        status: b.status,
        totalFloors: b.total_floors,
        totalUnits: b.total_units,
        handoverQuarter: b.handover_quarter,
        description: composedDescription,
        amenities: b.amenities,
        latitude: b.latitude,
        longitude: b.longitude,
        publishImmediately: founder,
      });
      buildingId = created.id;
      buildingSlug = created.slug;

      // Attach building cover photos if the user uploaded any. Sets
      // cover_photo_id on the new building so cards/hero can show
      // the real image instead of the colored placeholder.
      if (b.pendingPhotos && b.pendingPhotos.length > 0) {
        try {
          await attachAndSetCover('building', buildingId, b.pendingPhotos, {
            uploaderId: user.id,
          });
        } catch (err) {
          console.error('attaching building photos failed (non-fatal):', err);
        }
      }
    } catch (err) {
      console.error('createBuilding failed:', err);
      return NextResponse.json(
        { error: 'failed to create building', detail: String(err) },
        { status: 500 },
      );
    }
  }

  // Create apartments sequentially (low volume; <10 per submission).
  // Track per-apartment outcomes so the client can show "5 of 7
  // created, 2 failed" rather than blanket failure.
  const created: Array<{ id: string; slug: string }> = [];
  const failed: Array<{ index: number; error: string }> = [];
  for (let i = 0; i < body.apartments.length; i++) {
    const apt = body.apartments[i]!;
    if (
      !apt.rooms_count ||
      !apt.size_m2 ||
      !apt.floor_number ||
      !apt.price_tjs ||
      !apt.finishing_type
    ) {
      failed.push({ index: i, error: 'missing required apartment fields' });
      continue;
    }
    try {
      const c = await createListing({
        buildingId,
        sellerUserId: user.id,
        sourceType: resolveSourceType(apt.finishing_type),
        roomsCount: apt.rooms_count,
        sizeM2: apt.size_m2,
        floorNumber: apt.floor_number,
        totalFloors: apt.total_floors,
        priceTotalDirams: BigInt(Math.round(apt.price_tjs)) * TJS_TO_DIRAMS,
        finishingType: apt.finishing_type,
        bathroomSeparate: apt.bathroom_separate,
        description: apt.description,
        installment: apt.installment
          ? {
              monthlyDirams:
                BigInt(Math.round(apt.installment.monthly_tjs)) * TJS_TO_DIRAMS,
              firstPaymentPercent: apt.installment.first_payment_percent,
              termMonths: apt.installment.term_months,
            }
          : undefined,
        initialStatus,
      });
      created.push(c);

      // Attach apartment photos. Same pattern as buildings — failures
      // here don't roll back the listing creation (caller can edit and
      // re-add photos).
      if (apt.pendingPhotos && apt.pendingPhotos.length > 0) {
        try {
          await attachAndSetCover('listing', c.id, apt.pendingPhotos, {
            uploaderId: user.id,
          });
        } catch (err) {
          console.error(`attaching photos for listing #${i} failed:`, err);
        }
      }
    } catch (err) {
      // Verbose server log so dev / Vercel logs surface the actual
      // Supabase error (PG code, hint, details) — `String(err)` on a
      // Postgrest error reads as "[object Object]" which is useless
      // when debugging from the client side.
      const detail =
        err && typeof err === 'object'
          ? JSON.stringify({
              message: (err as { message?: unknown }).message,
              code: (err as { code?: unknown }).code,
              details: (err as { details?: unknown }).details,
              hint: (err as { hint?: unknown }).hint,
            })
          : String(err);
      console.error(`createListing #${i} failed:`, detail, err);
      // Translate the most-likely Supabase/Postgres error reasons into
      // friendlier Russian; fall back to the raw message otherwise. The
      // raw message stays in the dev log above for engineering debug.
      const errMsg =
        err && typeof err === 'object' ? (err as { message?: string }).message : null;
      const raw = typeof errMsg === 'string' && errMsg.length > 0 ? errMsg : String(err);
      const clientMsg = humaniseListingError(raw);
      failed.push({ index: i, error: clientMsg });
    }
  }

  // Saved-search match-on-publish: only fires when the listing is
  // active immediately (founder path). Non-founders post pending →
  // the moderate endpoint handles notify after approval. Best-effort
  // — failure here doesn't roll back the publish.
  if (founder && created.length > 0) {
    const origin = req.nextUrl.origin;
    void Promise.all(
      created.map((c) =>
        notifyMatchingListing(c.id, { origin }).catch((err) =>
          console.error(`notifyMatchingListing failed for ${c.id}:`, err),
        ),
      ),
    );
  }

  // Founder notification — when a non-founder submits, we ping the
  // founder on Telegram so they can call the seller and review the
  // listing without polling /kabinet. Best-effort: never blocks the
  // API response.
  if (!founder && created.length > 0) {
    void (async () => {
      try {
        // Resolve building name (jsonb {ru, tg}) for the alert message.
        const supabase = createAdminClient();
        const { data: bld } = await supabase
          .from('buildings')
          .select('name')
          .eq('id', buildingId)
          .maybeSingle();
        const buildingName =
          (bld?.name as { ru?: string } | undefined)?.ru ?? 'ЖК';
        await notifyPendingListing({
          buildingName,
          apartmentCount: created.length,
          sellerPhone: user.phone,
          origin: req.nextUrl.origin,
        });
      } catch (err) {
        console.error('notifyPendingListing failed:', err);
      }
    })();
  }

  return NextResponse.json({
    building_id: buildingId,
    building_slug: buildingSlug,
    created,
    failed,
    moderation_required: !founder,
  });
}
