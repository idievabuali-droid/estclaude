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
import type { BuildingStatus, FinishingType } from '@/types/domain';

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
      };
  apartments: ApartmentInput[];
}

const TJS_TO_DIRAMS = 100n;

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
  // Founder posts on behalf of developers → 'developer' source.
  // Other phone-verified users → 'owner' (they're posting their own).
  const sourceType = founder ? 'developer' : 'owner';

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
      const created = await createBuilding({
        name: b.name.trim(),
        address: b.address.trim(),
        districtId: b.district_id,
        developerId: b.developer_id,
        status: b.status,
        totalFloors: b.total_floors,
        totalUnits: b.total_units,
        handoverQuarter: b.handover_quarter,
        description: b.description,
        amenities: b.amenities,
        latitude: b.latitude,
        longitude: b.longitude,
        publishImmediately: founder,
      });
      buildingId = created.id;
      buildingSlug = created.slug;
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
        sourceType,
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
    } catch (err) {
      console.error(`createListing #${i} failed:`, err);
      failed.push({ index: i, error: String(err) });
    }
  }

  return NextResponse.json({
    building_id: buildingId,
    building_slug: buildingSlug,
    created,
    failed,
    moderation_required: !founder,
  });
}
