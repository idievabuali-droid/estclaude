import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { EditApartmentForm, type EditApartmentInitial } from './EditApartmentForm';

/**
 * /post/edit/[id] — edit a single existing listing.
 *
 * Permission: founder OR the listing's owner. We enforce this server-
 * side here (404 on no-permission so the unauthorised never know the
 * listing exists) AND in the underlying API endpoints.
 *
 * Re-moderation policy is in updateListing(): non-founders editing a
 * previously-active listing trigger pending_review status when they
 * change price ≥ 10% / rooms / size > 5 m². Form copy below tells
 * the seller this upfront.
 */
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent(`/post/edit/${id}`)}`);
  }

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id, slug, building_id, seller_user_id, status, rooms_count, size_m2, floor_number, price_total_dirams, finishing_type, bathroom_separate, unit_description, installment_available, installment_monthly_amount_dirams, installment_first_payment_percent, installment_term_months',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!listing) notFound();

  const founder = await isFounder(user.id);
  if (!founder && listing.seller_user_id !== user.id) {
    notFound();
  }

  const { data: building } = await supabase
    .from('buildings')
    .select('name, slug')
    .eq('id', listing.building_id)
    .maybeSingle();

  // Convert dirams (1 TJS = 100 dirams) → TJS for the form. The form
  // collects + the API converts back on save. Bigint columns come
  // back as strings from PostgREST so we coerce.
  const priceTjs = Math.round(Number(listing.price_total_dirams) / 100);
  const installmentMonthlyTjs = listing.installment_monthly_amount_dirams
    ? Math.round(Number(listing.installment_monthly_amount_dirams) / 100)
    : null;

  const initial: EditApartmentInitial = {
    id: listing.id as string,
    rooms_count: listing.rooms_count as number,
    size_m2: Number(listing.size_m2),
    floor_number: listing.floor_number as number,
    price_tjs: priceTjs,
    finishing_type: listing.finishing_type as
      | 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated',
    bathroom_separate: listing.bathroom_separate as boolean | null,
    description: ((listing.unit_description as { ru: string } | null) ?? null)?.ru ?? '',
    installment_enabled: !!listing.installment_available,
    installment_monthly_tjs: installmentMonthlyTjs,
    installment_first_payment_percent:
      (listing.installment_first_payment_percent as number | null) ?? null,
    installment_term_months: (listing.installment_term_months as number | null) ?? null,
  };

  const buildingName =
    (building?.name as { ru: string } | undefined)?.ru ?? '—';
  const buildingSlug = (building?.slug as string | undefined) ?? null;

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-2 py-5">
          <h1 className="text-h1 font-semibold text-stone-900">
            Редактировать квартиру
          </h1>
          <p className="text-meta text-stone-500">
            {buildingName} · {listing.rooms_count}-комн
          </p>
          {!founder ? (
            <p className="text-caption text-stone-500">
              Изменения описания, отделки или санузла применятся сразу. Заметные
              изменения цены, площади или количества комнат отправят квартиру на
              повторную модерацию.
            </p>
          ) : null}
        </AppContainer>
      </section>
      <section className="py-6 pb-20">
        <AppContainer>
          <EditApartmentForm
            initial={initial}
            buildingName={buildingName}
            buildingSlug={buildingSlug}
          />
        </AppContainer>
      </section>
    </>
  );
}
