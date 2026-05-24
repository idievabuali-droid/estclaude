import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { supabasePublicUrl } from '@/services/photos';
import { EditBuildingForm, type EditBuildingInitial } from './EditBuildingForm';

/**
 * /post/edit/building/[id] — edit a single existing building.
 *
 * Permission: founder only. Buildings are typically owned by
 * developers (not the sellers who created them via /post), and
 * ongoing edits like progress-photo uploads and status changes are
 * a founder responsibility. Non-founder edits could be added later
 * with the same re-moderation pattern apartments use.
 *
 * Form covers everything the create form does (name, address, district,
 * developer, status, floors, units, handover, description, amenities,
 * coords) plus separate galleries for exterior + progress photos with
 * inline remove on existing photos.
 */
export default async function EditBuildingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent(`/post/edit/building/${id}`)}`);
  }

  const founder = await isFounder(user.id);
  if (!founder) {
    // Non-founders shouldn't even know which buildings exist by id —
    // 404 instead of 403 so we don't leak existence.
    notFound();
  }

  const supabase = createAdminClient();

  // Fetch building row + existing photos (split by kind) + districts +
  // developers + apartments-in-this-ЖК in parallel — the form needs
  // all of them to render.
  const [
    { data: building },
    { data: exteriorPhotoRows },
    { data: progressPhotoRows },
    { data: districtRows },
    { data: developerRows },
    { data: apartmentRows },
  ] = await Promise.all([
    supabase
      .from('buildings')
      .select(
        'id, slug, name, address, district_id, developer_id, status, total_floors, total_units, handover_estimated_quarter, description, amenities, latitude, longitude',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('photos')
      .select('id, storage_path')
      .eq('building_id', id)
      .neq('kind', 'progress')
      .order('display_order', { ascending: true }),
    supabase
      .from('photos')
      .select('id, storage_path, taken_at')
      .eq('building_id', id)
      .eq('kind', 'progress')
      .order('display_order', { ascending: true }),
    supabase
      .from('districts')
      .select('id, name, center_latitude, center_longitude')
      .eq('city', 'vahdat')
      .order('slug'),
    supabase
      .from('developers')
      .select(
        'id, name, display_name, years_active, projects_completed_count, projects_announced_count, projects_under_construction_count, projects_near_completion_count, description',
      )
      .order('name'),
    // Apartments under this ЖК — for the «Квартиры в этом ЖК» card.
    // Sorted by floor then rooms so the founder skims top-down. Soft-
    // deleted rows excluded. status drives the per-row badge.
    supabase
      .from('listings')
      .select(
        'id, rooms_count, floor_number, size_m2, price_total_dirams, status',
      )
      .eq('building_id', id)
      .is('deleted_at', null)
      .order('floor_number', { ascending: true })
      .order('rooms_count', { ascending: true }),
  ]);

  if (!building) notFound();

  // Hydrate display URLs for existing photos so the form can render
  // removable thumbnails. Same shape EditApartmentForm uses.
  const exteriorPhotos = (exteriorPhotoRows ?? [])
    .map((p) => ({
      id: p.id as string,
      url: supabasePublicUrl(p.storage_path as string),
    }))
    .filter((p): p is { id: string; url: string } => p.url != null);
  const progressPhotos = (progressPhotoRows ?? [])
    .map((p) => ({
      id: p.id as string,
      url: supabasePublicUrl(p.storage_path as string),
      // ISO timestamp the photo was taken. Null for legacy rows uploaded
      // before the `withDate` PhotoPicker mode shipped — the form shows
      // an empty date input so the founder can backfill it.
      taken_at: (p.taken_at as string | null) ?? null,
    }))
    .filter((p): p is { id: string; url: string; taken_at: string | null } =>
      p.url != null,
    );

  const districts = (districtRows ?? []).map((d) => ({
    id: d.id as string,
    name: ((d.name as { ru: string }) ?? { ru: '' }).ru,
    center_lat: Number(d.center_latitude ?? 38.5511),
    center_lng: Number(d.center_longitude ?? 69.0214),
  }));
  const developers = (developerRows ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    display_name_ru:
      ((d.display_name as { ru?: string }) ?? {}).ru ?? (d.name as string),
    years_active: (d.years_active as number | null) ?? null,
    projects_completed_count: (d.projects_completed_count as number | null) ?? null,
    projects_announced_count: (d.projects_announced_count as number | null) ?? null,
    projects_under_construction_count:
      (d.projects_under_construction_count as number | null) ?? null,
    projects_near_completion_count:
      (d.projects_near_completion_count as number | null) ?? null,
    description_ru:
      ((d.description as { ru?: string } | null) ?? {}).ru ?? null,
  }));

  // Apartment summaries for the «Квартиры в этом ЖК» card. Price is
  // pre-converted from dirams → TJS so the form doesn't repeat the
  // math. price_total_dirams is a bigint that arrives as a string from
  // PostgREST, so we coerce.
  const apartments = (apartmentRows ?? []).map((a) => ({
    id: a.id as string,
    rooms_count: (a.rooms_count as number | null) ?? 0,
    floor_number: (a.floor_number as number | null) ?? 0,
    size_m2: Number(a.size_m2 ?? 0),
    price_tjs: Math.round(Number(a.price_total_dirams ?? 0) / 100),
    status: a.status as
      | 'active'
      | 'hidden'
      | 'sold'
      | 'pending_review'
      | 'rejected'
      | 'draft'
      | 'expired',
  }));

  const initial: EditBuildingInitial = {
    id: building.id as string,
    slug: building.slug as string,
    name: ((building.name as { ru: string }) ?? { ru: '' }).ru,
    address: ((building.address as { ru: string }) ?? { ru: '' }).ru,
    district_id: building.district_id as string,
    developer_id: building.developer_id as string,
    status: building.status as EditBuildingInitial['status'],
    total_floors: (building.total_floors as number | null) ?? 0,
    total_units: (building.total_units as number | null) ?? 0,
    handover_quarter: (building.handover_estimated_quarter as string | null) ?? '',
    description:
      ((building.description as { ru?: string } | null) ?? {}).ru ?? '',
    amenities: (building.amenities as string[] | null) ?? [],
    latitude: building.latitude as number | null,
    longitude: building.longitude as number | null,
  };

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-1.5 py-8 md:py-10">
          <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
            Редактирование
          </span>
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Редактировать ЖК
          </h1>
          <p className="text-meta text-stone-500">{initial.name}</p>
        </AppContainer>
      </section>
      <section className="py-6 pb-20">
        <AppContainer>
          <EditBuildingForm
            initial={initial}
            districts={districts}
            developers={developers}
            existingExteriorPhotos={exteriorPhotos}
            existingProgressPhotos={progressPhotos}
            apartments={apartments}
          />
        </AppContainer>
      </section>
    </>
  );
}
