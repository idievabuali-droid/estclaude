import { notFound } from 'next/navigation';
import { MapPin, ArrowUpRight, BadgeCheck, Calendar } from 'lucide-react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppChip } from '@/components/primitives';
import { InstallmentDisplay, ListingCard, ListingTrustSignals, PriceConversion, CallbackWidget, SaveToggle, ShareButton, NearbyChips, PhotoGallery } from '@/components/blocks';
import { getListingStats } from '@/services/listing-stats';
import { getCurrentUser } from '@/lib/auth/session';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgoLong } from '@/lib/format';
import { getListing } from '@/services/listings';
import { getNearbyPOIs, type PoiCategory } from '@/services/poi';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
import { getExchangeRates } from '@/services/currency';
import { createAdminClient } from '@/lib/supabase/admin';
import { supabasePublicUrl } from '@/services/photos';
import { STAGE_INFO } from '@/lib/building-stages';
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
 * Section order follows the convergent pattern across Avito, Cian,
 * Krisha, Bayut, Zillow:
 *
 *   1. Hero (cover + rooms·m² overlay)
 *   2. Breadcrumbs
 *   3. Title + price + posted-ago + contact bar (the "what is this and
 *      how do I reach the seller" zone — everything above the fold)
 *   4. Specs grid + finishing (the "stats" zone — Площадь, Этаж,
 *      Санузлов, Потолок, Балкон + finishing chip with 1-line note)
 *   5. Installment (if available) — placed adjacent to price because
 *      it modifies affordability
 *   6. Description — seller's free-text
 *   7. Building summary card — link to the parent /zhk page
 *   8. Compact nearby (4 POIs + "Все рядом" link to building's full POI list)
 *   9. Similar listings in the same building
 *
 * Removed from the previous structure:
 *   - Standalone "Отделка" section (folded into the specs zone)
 *   - Dead help button next to the finishing chip (had no behaviour)
 *   - Always-null fairness indicator conditional (the signal is
 *     globally disabled in V1, so the JSX block was dead code)
 *   - Full nearby POI list (replaced with a compact 4-chip preview;
 *     the building page is the source of truth for the full list)
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
  // Promise.all collapses them to max(individual) instead of sum.
  // - getCurrentUser: cookie + 1-2 DB lookups
  // - getExchangeRates: cached 24h, only fired for diaspora
  // - getNearbyPOIs: now properly cached (24h via unstable_cache)
  // - getListingStats: events table aggregations
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

  // Pull every photo for this listing so we can render the gallery
  // beneath the hero. Ordered by display_order so the seller's chosen
  // sequence (currently: cover first, then upload order) is preserved.
  // Admin client because RLS on `photos` is locked to the uploader.
  const photoSupabase = createAdminClient();
  const { data: photoRows } = await photoSupabase
    .from('photos')
    .select('id, storage_path')
    .eq('listing_id', listing.id)
    .order('display_order', { ascending: true });
  const photoUrls = (photoRows ?? [])
    .map((p) => ({ id: p.id as string, url: supabasePublicUrl(p.storage_path as string) }))
    .filter((p): p is { id: string; url: string } => p.url != null);

  return (
    <>
      {/* ─── 1. HERO + PHOTO GALLERY ─────────────────────────────── */}
      {/* Hero IS the gallery. Mobile: full-bleed scroll-snap carousel
          (swipe right/left between photos, tap any to fullscreen).
          Desktop: hero photo + 4-thumb strip below. The title +
          Save/Share actions overlay the hero on both. Replaces the
          previous static grid that pushed the price below the fold. */}
      {photoUrls.length > 0 ? (
        <div className="relative">
          <PhotoGallery
            photos={photoUrls}
            alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} в ${building.name.ru}`}
            heroAspect="21/9"
          />
          {/* Top-right actions: same Save + Share affordance as before,
              now positioned over the gallery. pointer-events-auto so
              taps on the buttons don't open the lightbox. */}
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
          {/* Title overlay removed — it duplicated the same rooms+m²
              that now sits in the body H1 below the breadcrumb, AND
              competed visually with the photo. Photos read cleanest
              without any text overlay (Cian / Avito do this too); the
              first body section under the breadcrumb is the right
              place for the title. */}
        </div>
      ) : (
        // No-photo fallback: source-coded coloured hero. Single photo
        // listings still go through the gallery above (single slide,
        // no counter, lightbox optional).
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
          {/* No-photo hero — title now lives in the body section
              below the breadcrumb, same as the with-photo path. The
              coloured block + gradient still reads as "this is the
              hero space" so the layout doesn't collapse to zero
              height when no photos are uploaded. */}
        </div>
      )}

      {/* ─── 2. BREADCRUMBS ─────────────────────────────────────── */}
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

      {/* ─── 3. TITLE + PRICE + CONTACT (the "above the fold" zone) ─ */}
      <section className="border-b border-stone-200 bg-white py-4">
        <AppContainer className="flex flex-col gap-3">
          {/* Page H1 — moved here from the photo overlay. Carries the
              three buyer-distinctive specs (rooms / m² / floor) so the
              listing has a proper name before the price block. Without
              this, removing the hero overlay left the page jumping
              straight from breadcrumb to a building name + price with
              no explicit title. */}
          <h1 className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display">
            {listing.rooms_count}-комн · {formatM2(listing.size_m2)} · {formatFloor(listing.floor_number, listing.total_floors)} эт
          </h1>

          {/* Building name link → /zhk; small "На карте" pill → map.
              Below: stage + handover quarter (when can I move in?)
              and developer name + verified badge (is this developer
              trustworthy?). Both questions earlier required clicking
              through to /zhk to answer — they belong on the apartment
              page too because they shape the buyer's decision before
              they make contact. */}
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
            {/* Stage + handover line — answers "когда сдача?" without
                making the buyer drill into the building page. For
                delivered buildings we show "Сдан" alone (the quarter
                is in the past and irrelevant); under-construction
                buildings show stage + quarter. */}
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-stone-600">
              <span className="font-medium text-stone-900">
                {STAGE_INFO[building.status].label}
              </span>
              {building.status !== 'delivered' && building.handover_estimated_quarter ? (
                <span className="inline-flex items-center gap-1 text-stone-600">
                  <Calendar className="size-3 text-stone-500" aria-hidden />
                  Сдача {building.handover_estimated_quarter}
                </span>
              ) : null}
            </span>
            {/* Developer line — verified badge inline so the trust
                signal appears together with the developer name, not
                only on /zhk. Compact: small icon + "Проверенный"
                wording so it reads as one element next to the name. */}
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-stone-500">
              <span>Застройщик: {developer.display_name.ru}</span>
              {developer.is_verified ? (
                <Link
                  href="/tsentr-pomoshchi#verified-developer"
                  className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
                  title="Что значит «Проверенный»?"
                >
                  <BadgeCheck className="size-3" aria-hidden />
                  Проверенный
                </Link>
              ) : null}
            </span>
          </div>

          {/* Price block. Each TJS amount is paired with its ≈
              foreign equivalent INLINE on the same baseline — buyer
              reads "180 000 TJS  ≈ 1 800 000 ₽" as one unit, no
              ambiguity about which conversion goes with which price.
              flex-wrap drops the conversion to the next line on
              narrow viewports rather than overflow. Local buyers
              (currency=TJS or no cookie) see only the TJS amounts,
              no clutter. */}
          <div className="flex flex-col gap-1">
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
          </div>

          {/* Finishing — small chip + 1-line caption. Used to live in
              its own "stats" section below; promoting it here puts it
              next to the price where buying-decision attributes
              belong. Carrying the descriptor inline ("полная отделка
              от застройщика, готова к заселению") means buyers don't
              have to scroll past 5 redundant facts cards just to find
              what condition the apartment is actually in.
              Bathroom-layout (раздельный/совмещённый) reads on the
              same line — it's a layout attribute, not a number; the
              bathroom COUNT was dropped per the founder's call (Tajik
              market doesn't shop by it; buyers who care about more
              than one bathroom mention it in the description). */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AppChip asStatic tone={FINISHING_TONE[listing.finishing_type]}>
                {tFinishing(listing.finishing_type)}
              </AppChip>
              <span className="text-caption text-stone-500">
                {finishingDescription(listing.finishing_type)}
              </span>
            </div>
            {listing.bathroom_separate != null ? (
              <span className="text-caption text-stone-500">
                Санузел {listing.bathroom_separate ? 'раздельный' : 'совмещённый'}
              </span>
            ) : null}
          </div>

          {/* Tertiary signal — small + muted so it doesn't compete with
              price or building info above. */}
          <span className="text-caption text-stone-400">
            Опубликовано {formatPostedAgoLong(listing.published_at)}
          </span>

          {/* Trust signals: view count + most-recent price change.
              Renders nothing when both are absent so a brand-new
              listing doesn't look stale. */}
          <ListingTrustSignals stats={stats} />

          {/* Contact bar: 4 channels + 1 intent CTA. Same client
              component renders the desktop layout here AND the mobile
              sticky bar at the bottom of the viewport. */}
          <ContactBarWithModal
            listingTitle={`${listing.rooms_count}-комн в ${building.name.ru}`}
            sellerPhone={sellerPhone}
            isDiaspora={isDiaspora}
          />
          {/* CallbackWidget moved BELOW the description (see end of
              page) so it doesn't interrupt the price → specs flow.
              A second contact prompt above the fold competes with
              the primary ContactBarWithModal anyway. */}
        </AppContainer>
      </section>


      {/* ─── 5. INSTALLMENT (only when offered) ─────────────────── */}
      {listing.installment_available && listing.installment_monthly_amount_dirams ? (
        <section className="border-t border-stone-200 bg-white py-6">
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

      {/* ─── 6. DESCRIPTION (seller's free-text) ────────────────── */}
      {/* Hide the entire section when the seller didn't write
          anything. An empty "Описание:" header followed by a blank
          paragraph reads as a broken page; better to skip the section
          entirely than render the heading with no content. */}
      {listing.unit_description.ru?.trim() ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Описание</h2>
            <p className="text-body text-stone-700">{listing.unit_description.ru}</p>
          </AppContainer>
        </section>
      ) : null}

      {/* Anonymous-friendly callback widget. Logged-in visitors already
          have ContactBarWithModal as the primary surface and we'd
          rather not double up; this widget exists so a random visitor
          without a Telegram session can leave a phone for the founder
          to follow up on WhatsApp. Lives BELOW the description so it
          doesn't interrupt the price → specs flow above. */}
      {!visitor ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer>
            <CallbackWidget listingId={listing.id} />
          </AppContainer>
        </section>
      ) : null}

      {/* Building summary card removed — the title block at the top
          already has the building name (clickable to /zhk), the "На
          карте" pill, AND the developer name. A repeat card here was
          duplicate visual real estate. */}

      {/* ─── 7. COMPACT NEARBY (interactive chips + mini-map) ─────
          Tapping a chip now drops an orange star on the map at that
          POI's location and re-fits the camera. Tapping the same
          chip again clears the highlight. Closes the "I see chips
          but can't see WHERE" gap the user flagged on real iPhone. */}
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
              // "Все рядом" → focus map of this building. Buyer sees
              // the building as the orange pin AND can tap a POI
              // category chip on the map to drop pins for every nearby
              // mosque / school / etc, then tap a pin for details.
              // Was previously /zhk#nearby — sent the buyer back to a
              // STATIC list on a different detail page, defeating the
              // "show me where the things are" question.
              allNearbyHref={`/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${listing.slug}`}
            />
          </AppContainer>
        </section>
      ) : null}

      {/* ─── 9. SIMILAR IN THIS BUILDING ────────────────────────── */}
      {similar.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6 pb-24 md:pb-7">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h2 font-semibold text-stone-900">Похожие в этом ЖК</h2>
              {/* Krisha pattern — when buyer is interested in this
                  building, give them an instant escape to the full
                  list with the building scope already applied. The
                  building-scoped /kvartiry shows the count + filter
                  chips so they can narrow further. */}
              <Link
                href={`/kvartiry?building=${building.slug}`}
                className="shrink-0 text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Все квартиры в ЖК →
              </Link>
            </div>
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

      {/* Mobile sticky contact bar is rendered by ContactBarWithModal
          in section 3 — it floats fixed regardless of scroll position. */}
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
