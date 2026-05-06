import { notFound } from 'next/navigation';
import { MapPin, ArrowUpRight, BadgeCheck, Calendar, Layers, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppChip, AppCard, AppCardContent } from '@/components/primitives';
import { InstallmentDisplay, ListingCard, ListingTrustSignals, PriceConversion, CallbackWidget, SaveToggle, ShareButton, NearbyChips, PhotoGallery } from '@/components/blocks';
import { getListingStats } from '@/services/listing-stats';
import { getCurrentUser } from '@/lib/auth/session';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgo } from '@/lib/format';
import { getListing } from '@/services/listings';
import { getNearbyPOIs, type PoiCategory } from '@/services/poi';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';
import { createAdminClient } from '@/lib/supabase/admin';
import { supabasePublicUrl } from '@/services/photos';
import { ContactBarWithModal } from './ContactBarWithModal';

const FINISHING_TONE = {
  no_finish: 'finishing-no-finish',
  pre_finish: 'finishing-pre-finish',
  full_finish: 'finishing-full-finish',
  owner_renovated: 'finishing-owner-renovated',
} as const;

/** Categories shown in the compact nearby preview on the apartment
 *  page. The full 8-category list lives on the building detail page —
 *  buyers reach it via the "Все рядом" link. These four cover what
 *  family buyers ask about first. */
const COMPACT_POI_CATEGORIES: PoiCategory[] = [
  'mosque',
  'school',
  'supermarket',
  'hospital',
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getListing(slug);
  if (!data) return {};
  const { listing, building } = data;
  // Title carries the price up front — WhatsApp/Telegram link previews
  // are most useful when the price is visible without tapping. Saidakbar
  // forwards to Hilola; the preview itself should answer "is this in
  // budget?" before she opens the link.
  const priceTjs = Math.round(Number(listing.price_total_dirams) / 100);
  const priceFmt = new Intl.NumberFormat('ru-RU').format(priceTjs);
  const title = `${listing.rooms_count}-комн ${formatM2(listing.size_m2)} · ${priceFmt} TJS · ${building.name.ru}`;
  const description = listing.unit_description.ru || `${listing.rooms_count}-комн в ${building.name.ru}, ${formatM2(listing.size_m2)}, ${formatFloor(listing.floor_number, listing.total_floors)}.`;
  // OG image: cover photo when uploaded, falls back to nothing (the
  // chat client will use its default behaviour). next-intl + Next 16
  // resolve relative URLs against the metadataBase, so an absolute URL
  // is needed here for cross-app previews.
  const ogImages = listing.cover_photo_url ? [{ url: listing.cover_photo_url }] : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages?.map((i) => i.url),
    },
  };
}

/**
 * Apartment detail page (/kvartira/[slug]).
 *
 * Section order — each block answers ONE buying-decision question:
 *
 *   1. Hero gallery (visual fit)
 *   2. Breadcrumbs
 *   3. §1 Заголовок — what + where + when (lean: H1, building, handover)
 *   4. §2 Цена — how much (total + per-m² + foreign + magic-moment monthly)
 *   5. §3 Контакт — how to reach the seller
 *   6. §4 Об этой квартире — what's inside (finishing, bathroom layout,
 *                                            orientation, view_notes)
 *   7. §5 Планировка — apartment layout image (when set)
 *   8. §6 Описание — seller's free text (when set)
 *   9. §7 Рассрочка — financing (anchor target for §2 magic-moment link)
 *  10. §8 О доме — building context + "all units in this building" CTA
 *  11. §9 О застройщике — developer trust depth (only when populated)
 *  12. §10 Что рядом — location proof
 *  13. §11 Похожие — alternatives in the same building
 *  14. §12 CallbackWidget — anonymous-friendly fallback (logged-out only)
 *  15. §13 Meta — quiet posted-ago + view counter
 *
 * Mobile sticky contact bar is rendered by ContactBarWithModal in §3.
 *
 * Cuts preserved from prior iterations:
 *   - No stage chip in the title — the handover line implies "ещё не сдан"
 *   - No bathroom count — Tajik market doesn't shop on it (only the layout)
 *   - No heavy 5-fact specs grid — §4 is a small pill row, not a grid
 *   - No balcony / ceiling-height pills — not real shopper signals here
 *   - No special-offer chip — no realistic V1 use case
 */
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tFinishing = await getTranslations('Finishing');

  // getListing is the only blocker for the rest — we need its
  // building lat/lng + listing id before the parallel batch.
  const data = await getListing(slug);
  if (!data) notFound();
  const { listing, building, developer, district, similar, sellerPhone } = data;
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';

  // Parallelise the rest. Was sequential before — the slowest single
  // call (getNearbyPOIs hits Overpass live, ~1-3s) blocked everything
  // after it, multiplying perceived latency on Tajik mobile networks.
  const [visitor, rates, pois, stats] = await Promise.all([
    getCurrentUser(),
    isDiaspora ? getExchangeRates() : Promise.resolve(null),
    getNearbyPOIs(building.latitude, building.longitude),
    getListingStats(listing.id, listing.slug),
  ]);

  // Pre-compute the compact nearby rows so the JSX stays readable.
  const compactNearby = COMPACT_POI_CATEGORIES.map((cat) => ({
    cat,
    item: pois[cat][0] ?? null,
  })).filter((x) => x.item != null);

  // Pull every photo for this listing so we can render the gallery.
  // Same query also feeds the floor-plan lookup below — single
  // round-trip. Admin client because RLS on `photos` is locked to
  // the uploader.
  const photoSupabase = createAdminClient();
  const { data: photoRows } = await photoSupabase
    .from('photos')
    .select('id, storage_path')
    .eq('listing_id', listing.id)
    .order('display_order', { ascending: true });
  const photoUrls = (photoRows ?? [])
    .map((p) => ({ id: p.id as string, url: supabasePublicUrl(p.storage_path as string) }))
    .filter((p): p is { id: string; url: string } => p.url != null);

  // §5 Планировка: pick the photo whose id matches floor_plan_photo_id.
  // Reuses the photoUrls list — no extra round-trip. Hides the section
  // when the seller hasn't tagged a layout image.
  const floorPlanUrl = listing.floor_plan_photo_id
    ? (photoUrls.find((p) => p.id === listing.floor_plan_photo_id)?.url ?? null)
    : null;

  // §8 О доме: total active listings in this building drives the
  // "Все квартиры в этом доме (N) →" CTA. The `similar` list is
  // capped at 3 by getListing(), so we need a separate count query
  // for the accurate total. `head: true` skips the row payload.
  const { count: buildingUnitCount } = await photoSupabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', listing.building_id)
    .eq('status', 'active');

  // §9 О застройщике renders only when the developer has trust depth
  // (years on the market or a project count). Without those, the card
  // would be an empty shell that adds visual noise without signal.
  const showDeveloperCard =
    developer.years_active != null || developer.projects_completed_count != null;

  // §4 view_notes line — locale 'ru' for now (Tajik translations
  // optional in the schema). Trim avoids rendering whitespace-only.
  const viewNotesText = listing.view_notes?.ru?.trim() || null;

  return (
    <>
      {/* ─── HERO + PHOTO GALLERY ───────────────────────────────── */}
      {/* Hero IS the gallery. Mobile: full-bleed scroll-snap carousel
          (swipe right/left between photos, tap any to fullscreen).
          Desktop: hero photo + 4-thumb strip below. The Save/Share
          actions overlay the hero on both. */}
      {photoUrls.length > 0 ? (
        <div className="relative">
          <PhotoGallery
            photos={photoUrls}
            alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} в ${building.name.ru}`}
            heroAspect="21/9"
          />
          <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 md:right-5 md:top-5">
            <div className="pointer-events-auto">
              <ShareButton
                compact
                text={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} в ${building.name.ru}`}
                title={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
              />
            </div>
            <div className="pointer-events-auto">
              <SaveToggle type="listing" id={listing.id} />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative aspect-[16/9] w-full bg-stone-100 md:aspect-[21/9]"
          style={{ backgroundColor: listing.cover_color }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/15 to-transparent" />
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2 md:right-5 md:top-5">
            <ShareButton
              compact
              text={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} в ${building.name.ru}`}
              title={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
            />
            <SaveToggle type="listing" id={listing.id} />
          </div>
        </div>
      )}

      {/* ─── BREADCRUMBS ────────────────────────────────────────── */}
      <nav aria-label="Хлебные крошки" className="border-b border-stone-200 bg-stone-50">
        <AppContainer>
          <ol className="flex items-center gap-1 overflow-x-auto py-2 text-caption text-stone-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li className="shrink-0">
              <Link href="/kvartiry" className="hover:text-terracotta-600">
                Квартиры
              </Link>
            </li>
            <li aria-hidden className="shrink-0">›</li>
            <li className="shrink-0">
              <Link href={`/zhk/${building.slug}`} className="hover:text-terracotta-600">
                {building.name.ru}
              </Link>
            </li>
            <li aria-hidden className="shrink-0">›</li>
            <li className="shrink-0 text-stone-900">
              {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
            </li>
          </ol>
        </AppContainer>
      </nav>

      {/* ─── §1 ЗАГОЛОВОК (lean — what + where + when only) ─────── */}
      {/* Title block carries only the orientation answers. Finishing,
          bathroom layout, and meta (posted-ago, views) used to live
          here too; they've moved to §4 and §13 so the title reads as
          a single coherent "this is what apartment, in which building,
          when ready" block. */}
      <section className="border-b border-stone-200 bg-white py-4">
        <AppContainer className="flex flex-col gap-3">
          <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
            {listing.rooms_count}-комн · {formatM2(listing.size_m2)} · {formatFloor(listing.floor_number, listing.total_floors)} эт
          </h1>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                href={`/zhk/${building.slug}`}
                className="inline-flex items-center gap-1 text-meta text-stone-700 hover:text-terracotta-600"
              >
                <MapPin className="size-3.5" />
                <span className="font-medium text-stone-900">{building.name.ru}</span>
                <span className="text-stone-500">· {district.name.ru}</span>
              </Link>
              {developer.is_verified ? (
                <Link
                  href="/tsentr-pomoshchi#verified-developer"
                  className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-caption font-medium text-amber-800 hover:bg-amber-100"
                  title="Что значит «Проверенный»?"
                >
                  <BadgeCheck className="size-3" aria-hidden />
                  Проверенный
                </Link>
              ) : null}
              <Link
                href={`/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${slug}`}
                className="group inline-flex items-center gap-1 rounded-sm border border-stone-200 bg-stone-50 px-2 py-0.5 text-caption font-medium text-stone-700 transition-colors hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700"
                aria-label="Показать на карте"
              >
                <MapPin className="size-3 text-terracotta-600" />
                <span>На карте</span>
                <ArrowUpRight className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
              </Link>
            </div>
            {building.status === 'delivered' ? (
              <span className="text-caption font-medium text-stone-900">
                Готов к заселению
              </span>
            ) : building.handover_estimated_quarter ? (
              <span className="inline-flex items-center gap-1 text-caption text-stone-700">
                <Calendar className="size-3 text-stone-500" aria-hidden />
                Сдача {building.handover_estimated_quarter}
              </span>
            ) : null}
          </div>
        </AppContainer>
      </section>

      {/* ─── §2 ЦЕНА (with magic-moment monthly line) ──────────── */}
      <section className="border-b border-stone-200 bg-white py-4">
        <AppContainer className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-display font-semibold tabular-nums text-stone-900">
              {formatPriceNumber(listing.price_total_dirams)} TJS
            </span>
            {isDiaspora && rates ? (
              <PriceConversion
                priceDirams={listing.price_total_dirams}
                target={currency}
                rates={rates}
                variant="block"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-meta text-stone-500 tabular-nums">
              {formatPriceNumber(listing.price_per_m2_dirams)} TJS / м²
            </span>
            {isDiaspora && rates ? (
              <PriceConversion
                priceDirams={listing.price_per_m2_dirams}
                target={currency}
                rates={rates}
                perM2
              />
            ) : null}
          </div>
          {/* Magic moment: the affordability glance. Buyer's "can I
              actually afford this monthly?" answered before they
              scroll. Anchors to the full Рассрочка section below for
              term details. Renders only when installment is offered. */}
          {listing.installment_available && listing.installment_monthly_amount_dirams ? (
            <a
              href="#rassrochka"
              className="inline-flex w-fit items-center gap-1.5 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
            >
              <span>
                Ежемесячно от{' '}
                <span className="tabular-nums">
                  {formatPriceNumber(listing.installment_monthly_amount_dirams)} TJS
                </span>
              </span>
              {listing.installment_term_months ? (
                <span className="text-stone-500"> · рассрочка {listing.installment_term_months} мес</span>
              ) : null}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ) : null}
          {/* Contact cluster — desktop renders inline here (channels +
              intent button); mobile renders nothing inline and pins
              the same actions to a sticky bottom bar via the
              component's own portal. Folded into the price section so
              the contact buttons sit immediately next to the price on
              desktop and we don't add an empty wrapper section on
              mobile (the inline desktop layout uses `hidden md:flex`). */}
          <ContactBarWithModal
            listingTitle={`${listing.rooms_count}-комн в ${building.name.ru}`}
            sellerPhone={sellerPhone}
            isDiaspora={isDiaspora}
          />
        </AppContainer>
      </section>

      {/* ─── §4 ОБ ЭТОЙ КВАРТИРЕ (pill row + view_notes line) ──── */}
      {/* Per-apartment details that aren't in the title. Only finishing
          + bathroom + orientation + view_notes — balcony, ceiling, and
          bathroom-count are deliberately not surfaced (Tajik market
          doesn't shop on them). Pills hide individually when their
          source field is null. Finishing is NOT NULL in the schema, so
          the section always renders with at least the finishing row. */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Об этой квартире</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <AppChip asStatic tone={FINISHING_TONE[listing.finishing_type]}>
              {tFinishing(listing.finishing_type)}
            </AppChip>
            <span className="text-caption text-stone-500">
              {finishingDescription(listing.finishing_type)}
            </span>
          </div>
          {(listing.bathroom_separate != null || listing.orientation) ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {listing.bathroom_separate != null ? (
                <AppChip asStatic tone="neutral">
                  Санузел {listing.bathroom_separate ? 'раздельный' : 'совмещённый'}
                </AppChip>
              ) : null}
              {listing.orientation ? (
                <AppChip asStatic tone="neutral">
                  Окна: {listing.orientation}
                </AppChip>
              ) : null}
            </div>
          ) : null}
          {viewNotesText ? (
            <p className="text-meta text-stone-700">{viewNotesText}</p>
          ) : null}
        </AppContainer>
      </section>

      {/* ─── §5 ПЛАНИРОВКА (only when floor_plan_photo_id is set) ─ */}
      {floorPlanUrl ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Планировка</h2>
            {/* Tap opens the original photo in a new tab — full-size
                viewing without an extra lightbox dependency. cursor-
                zoom-in hints the affordance. */}
            <a
              href={floorPlanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md bg-white"
              title="Открыть планировку в полный размер"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={floorPlanUrl}
                alt={`Планировка квартиры ${listing.rooms_count}-комн в ${building.name.ru}`}
                className="block w-full cursor-zoom-in object-contain"
              />
            </a>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §6 ОПИСАНИЕ (only if seller wrote text) ────────────── */}
      {listing.unit_description.ru?.trim() ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Описание</h2>
            <p className="text-body text-stone-700">{listing.unit_description.ru}</p>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §7 РАССРОЧКА (anchor target for §2 magic-moment line) ─ */}
      {/* scroll-mt-20 stops the heading from landing flush against the
          top of the viewport when the magic-moment anchor jumps here. */}
      {listing.installment_available && listing.installment_monthly_amount_dirams ? (
        <section id="rassrochka" className="scroll-mt-20 border-t border-stone-200 bg-white py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Рассрочка от застройщика</h2>
            <InstallmentDisplay
              monthlyDirams={listing.installment_monthly_amount_dirams}
              firstPaymentPercent={listing.installment_first_payment_percent ?? 30}
              termMonths={listing.installment_term_months ?? 84}
              totalPriceDirams={listing.price_total_dirams}
              currency={currency}
              rates={rates}
            />
            <p className="text-meta text-stone-500">
              Без скрытых процентов. Условия фиксируются в договоре.
            </p>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §8 О ДОМЕ ──────────────────────────────────────────── */}
      {/* Building context card. Visual identity (cover photo) + key
          facts (handover, floors, total units) + a primary escape to
          the full unit list scoped to this building. The CTA includes
          the live count so the buyer knows whether it's worth tapping. */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">О доме</h2>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
                <div
                  className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-stone-100 md:aspect-[4/3] md:w-48 md:shrink-0"
                  style={building.cover_photo_url ? undefined : { backgroundColor: building.cover_color }}
                >
                  {building.cover_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={building.cover_photo_url}
                      alt={building.name.ru}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 md:flex-1">
                  <Link
                    href={`/zhk/${building.slug}`}
                    className="text-h3 font-semibold text-stone-900 hover:text-terracotta-700"
                  >
                    {building.name.ru}
                  </Link>
                  <span className="text-meta text-stone-500">
                    {district.name.ru} · {building.address.ru}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-stone-700">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5 text-stone-500" aria-hidden />
                      {building.status === 'delivered'
                        ? 'Сдан'
                        : `Сдача ${building.handover_estimated_quarter ?? '—'}`}
                    </span>
                    {building.total_floors > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3.5 text-stone-500" aria-hidden />
                        {building.total_floors} {pluralFloors(building.total_floors)}
                      </span>
                    ) : null}
                    {building.total_units > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-stone-500" aria-hidden />
                        {building.total_units} {pluralApartments(building.total_units)}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/kvartiry?building=${building.slug}`}
                    className="mt-1 inline-flex w-fit items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                  >
                    Все квартиры в этом доме
                    {buildingUnitCount != null ? ` (${buildingUnitCount})` : ''}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>

      {/* ─── §9 О ЗАСТРОЙЩИКЕ (only if dev has trust depth) ────── */}
      {/* A small card surfacing developer track record. /zhk has the
          fuller version with project-status breakdown; this one is
          intentionally lighter — apartment buyers want the summary
          here, the depth on the building page. */}
      {showDeveloperCard ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">О застройщике</h2>
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h3 className="inline-flex flex-wrap items-center gap-2 text-h3 font-semibold text-stone-900">
                    {developer.display_name.ru}
                    {developer.is_verified ? (
                      <Link
                        href="/tsentr-pomoshchi#verified-developer"
                        className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-caption font-medium text-amber-800 hover:bg-amber-100"
                        title="Что значит «Проверенный»?"
                      >
                        <BadgeCheck className="size-3" aria-hidden />
                        Проверенный
                      </Link>
                    ) : null}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-stone-700">
                    {developer.years_active != null ? (
                      <span className="tabular-nums">
                        {developer.years_active} {pluralYears(developer.years_active)} на рынке
                      </span>
                    ) : null}
                    {developer.years_active != null && developer.projects_completed_count != null ? (
                      <span className="text-stone-400" aria-hidden>·</span>
                    ) : null}
                    {developer.projects_completed_count != null ? (
                      <span className="tabular-nums">
                        {developer.projects_completed_count} {pluralProjects(developer.projects_completed_count)}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/novostroyki?developer=${developer.id}`}
                    className="inline-flex w-fit items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                  >
                    Все проекты застройщика
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §10 ЧТО РЯДОМ (compact 4-POI preview + mini-map) ──── */}
      {/* Tapping a chip drops a star on the map at that POI's location
          and re-fits the camera. NearbyChips renders its own h3 "Что
          рядом" heading internally, so we don't add another h2 here —
          would have duplicated the section title. */}
      {compactNearby.length > 0 ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer>
            <NearbyChips
              anchorLat={building.latitude}
              anchorLng={building.longitude}
              anchorLabel={building.name.ru}
              items={compactNearby.map((c) => ({
                cat: c.cat,
                name: c.item!.name,
                latitude: c.item!.lat,
                longitude: c.item!.lng,
                distanceM: c.item!.distanceM,
              }))}
              allNearbyHref={`/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${listing.slug}`}
            />
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §11 ПОХОЖИЕ В ЭТОМ ЖК ──────────────────────────────── */}
      {/* The "Все квартиры в ЖК →" header link is GONE — the same
          escape lives in §8 above with the live count. Single source
          of truth for that CTA. */}
      {similar.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-5">
            <h2 className="text-h2 font-semibold text-stone-900">Похожие в этом ЖК</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {similar.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  building={building}
                  developerVerified={developer.is_verified}
                  currency={currency}
                  rates={rates}
                  hideBuildingName
                />
              ))}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §12 CallbackWidget (anonymous-friendly fallback) ──── */}
      {/* Logged-in visitors already have ContactBarWithModal as the
          primary surface; this widget is for visitors without a
          Telegram session who want to leave a phone for the founder. */}
      {!visitor ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer>
            <CallbackWidget listingId={listing.id} />
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §13 META (quiet posted-ago + view counter) ─────────── */}
      {/* Pulled out of the title block — these answer "how stale is
          this?" not "what is this apartment". Bottom of the page is
          the right place. pb-24 clears the mobile sticky contact
          bar; desktop drops back to its smaller padding. */}
      <section className="border-t border-stone-200 py-4 pb-24 md:pb-7">
        <AppContainer className="flex flex-col gap-1">
          <span className="text-caption text-stone-400">
            Опубликовано {formatPostedAgo(listing.published_at)}
          </span>
          <ListingTrustSignals stats={stats} />
        </AppContainer>
      </section>

      {/* Mobile sticky contact bar is rendered by ContactBarWithModal
          in §3 — it floats fixed regardless of scroll position. */}
    </>
  );
}

function finishingDescription(t: string): string {
  switch (t) {
    case 'no_finish':
      return 'квартира без отделки, готова для вашего ремонта';
    case 'pre_finish':
      return 'базовая отделка, готова к завершающему ремонту';
    case 'full_finish':
      return 'полная отделка от застройщика, готова к заселению';
    case 'owner_renovated':
      return 'отремонтировано владельцем, осмотрите лично';
    default:
      return '';
  }
}

function pluralYears(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (last > 1 && last < 5) return 'года';
  if (last === 1) return 'год';
  return 'лет';
}

function pluralProjects(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'проектов';
  if (last > 1 && last < 5) return 'проекта';
  if (last === 1) return 'проект';
  return 'проектов';
}

function pluralFloors(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'этажей';
  if (last > 1 && last < 5) return 'этажа';
  if (last === 1) return 'этаж';
  return 'этажей';
}

function pluralApartments(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'квартир';
  if (last > 1 && last < 5) return 'квартиры';
  if (last === 1) return 'квартира';
  return 'квартир';
}
