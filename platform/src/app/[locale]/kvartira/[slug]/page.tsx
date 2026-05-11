import { notFound } from 'next/navigation';
import { MapPin, ArrowUpRight, Calendar, Layers, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppChip, AppCard, AppCardContent } from '@/components/primitives';
import { ListingCard, ListingTrustSignals, CallbackWidget, SaveToggle, ShareButton, NearbyChips, PhotoGallery, DetailPageActions } from '@/components/blocks';
import { getListingStats } from '@/services/listing-stats';
import { getCurrentUser } from '@/lib/auth/session';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgo, formatHandoverQuarter } from '@/lib/format';
import { getListing } from '@/services/listings';
import { getDeveloperStats } from '@/services/buildings';
import { getNearbyPOIs, type PoiCategory } from '@/services/poi';
import { readCurrencyCookie } from '@/lib/currency-cookie-server';
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
  // Standalone listings (no parent ЖК) use street address as the
  // location anchor in the title; ЖК listings use the project name.
  const locationAnchor = building?.name.ru ?? listing.street_address ?? '—';
  const title = `${listing.rooms_count}-комн ${formatM2(listing.size_m2)} · ${priceFmt} TJS · ${locationAnchor}`;
  const description = listing.unit_description.ru || `${listing.rooms_count}-комн в ${locationAnchor}, ${formatM2(listing.size_m2)}, ${formatFloor(listing.floor_number, listing.total_floors)}.`;
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
  // We still read the cookie to know "did this visitor pick a non-TJS
  // currency on /diaspora?" — that flag toggles the contact bar's
  // "Запросить онлайн-показ" vs "Запросить визит" label (an
  // accessibility affordance for buyers who can't physically visit
  // Vahdat). We no longer USE the rates here for inline price
  // conversion — that's /diaspora-only now (founder critique 2026-05-09).
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';

  // Standalone vs in-ЖК split. JSX below guards each building-using
  // section directly (`{building ? ... : ...}`); the locals here are
  // the per-listing coords + label that work for both shapes — building
  // value when in a ЖК, listing value when standalone.
  const effectiveLat = building?.latitude ?? listing.latitude;
  const effectiveLng = building?.longitude ?? listing.longitude;
  const locationLabel = building?.name.ru ?? listing.street_address ?? '';

  // Parallelise the rest. Was sequential before — the slowest single
  // call (getNearbyPOIs hits Overpass live, ~1-3s) blocked everything
  // after it, multiplying perceived latency on Tajik mobile networks.
  // devStats is a quick `count(*) by status` on the developer's
  // buildings — used by the developer card below to show "Сдано N ·
  // Строится M" instead of an opaque lifetime project count.
  const [visitor, pois, stats, devStats] = await Promise.all([
    getCurrentUser(),
    // Skip POI fetch when we have no coords (standalone seller didn't
    // drop the pin). The compact-nearby section silently hides below.
    effectiveLat != null && effectiveLng != null
      ? getNearbyPOIs(effectiveLat, effectiveLng)
      : Promise.resolve({} as Awaited<ReturnType<typeof getNearbyPOIs>>),
    getListingStats(listing.id, listing.slug),
    developer
      ? getDeveloperStats(developer.id)
      : Promise.resolve({ total: 0, delivered: 0, underConstruction: 0, announced: 0 }),
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
  // Skipped entirely for standalone listings — there's no parent
  // building to count siblings under.
  let buildingUnitCount: number | null = null;
  if (listing.building_id) {
    const { count } = await photoSupabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', listing.building_id)
      .eq('status', 'active');
    buildingUnitCount = count ?? null;
  }

  // §9 О застройщике renders only when the developer has trust depth
  // (years on the market or a project count). Without those, the card
  // would be an empty shell that adds visual noise without signal.
  // Standalone listings have no developer at all.
  const showDeveloperCard =
    developer != null &&
    (developer.years_active != null || developer.projects_completed_count != null);

  // §4 view_notes line — locale 'ru' for now (Tajik translations
  // optional in the schema). Trim avoids rendering whitespace-only.
  const viewNotesText = listing.view_notes?.ru?.trim() || null;

  return (
    <>
      {/* Persistent Save + Share floating island. Slides in once the
          hero's own overlay icons scroll out of view. Founder critique
          2026-05-11: "those buttons should be seen all the time, like
          the contact button." Reveal anchor id matches both hero
          variants below (photo-gallery + colour-placeholder). */}
      <DetailPageActions
        type="listing"
        id={listing.id}
        shareText={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
        shareTitle={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
        revealAfterId="kvartira-hero-actions"
      />

      {/* ─── HERO + PHOTO GALLERY ───────────────────────────────── */}
      {/* Hero IS the gallery. Mobile: full-bleed scroll-snap carousel
          (swipe right/left between photos, tap any to fullscreen).
          Desktop: hero photo + 4-thumb strip below. The Save/Share
          actions overlay the hero on both. */}
      {photoUrls.length > 0 ? (
        <div className="relative">
          <PhotoGallery
            photos={photoUrls}
            alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
            heroAspect="21/9"
          />
          {/* id="kvartira-hero-actions" anchors the persistent
              floating DetailPageActions island — when this overlay
              scrolls off, the island slides in. */}
          <div
            id="kvartira-hero-actions"
            className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 md:right-5 md:top-5"
          >
            <div className="pointer-events-auto">
              <ShareButton
                compact
                text={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
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
          <div
            id="kvartira-hero-actions"
            className="absolute right-3 top-3 z-10 flex items-center gap-2 md:right-5 md:top-5"
          >
            <ShareButton
              compact
              text={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)} ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
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
            {/* Standalone listings have no project page — show district
                name in the breadcrumb instead of a /zhk link. */}
            {building ? (
              <>
                <li className="shrink-0">
                  <Link href={`/zhk/${building.slug}`} className="hover:text-terracotta-600">
                    {building.name.ru}
                  </Link>
                </li>
                <li aria-hidden className="shrink-0">›</li>
              </>
            ) : (
              <>
                <li className="shrink-0 text-stone-500">{district.name.ru}</li>
                <li aria-hidden className="shrink-0">›</li>
              </>
            )}
            <li className="shrink-0 text-stone-900">
              {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
            </li>
          </ol>
        </AppContainer>
      </nav>

      {/* ─── SUMMARY BAND ────────────────────────────────────────
          Two-column layout below the gallery hero per the senior-
          design prescription. Left column carries identity (H1 in
          serif + ЖК link in serif italic + verified pill + На карте);
          right column carries action (price block + dual CTAs).
          Stacks on mobile so identity reads above action.

          Replaces the prior split §1 (title) + §2 (price+CTAs)
          sections — they were stacked but disconnected. The unified
          summary band reads as a single decision module and matches
          /zhk's hero-summary pattern. */}
      <section className="border-b border-stone-200 bg-white py-6 md:py-10">
        <AppContainer className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
          {/* LEFT: identity */}
          <div className="flex flex-col gap-3 md:flex-1">
            <h1
              className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900 md:text-display"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {listing.rooms_count}-комн · {formatM2(listing.size_m2)} · {formatFloor(listing.floor_number, listing.total_floors)} эт
            </h1>
            {/* ЖК name in serif italic (per prescription) + verified pill
                + map link. The italic serif reads as editorial
                attribution — "this apartment is in [italic project name]"
                — same vocabulary as the listing card's chevron-link. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* In-ЖК variant: italic project name + verified pill +
                  На карте link. Standalone variant: address line +
                  small "Без ЖК" tag, no /zhk link. */}
              {building ? (
                <Link
                  href={`/zhk/${building.slug}`}
                  className="group inline-flex items-center gap-1 text-meta text-stone-700 transition-colors hover:text-terracotta-700"
                >
                  <span
                    className="italic"
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                  >
                    {building.name.ru}
                  </span>
                  <span className="text-stone-500">· {district.name.ru}</span>
                  <ArrowUpRight className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-meta text-stone-700">
                  <span className="inline-flex items-center rounded-sm bg-stone-100 px-1.5 py-0.5 text-caption font-medium text-stone-500">
                    Без ЖК
                  </span>
                  {listing.street_address ? (
                    <span>{listing.street_address}</span>
                  ) : null}
                  <span className="text-stone-500">· {district.name.ru}</span>
                </span>
              )}
              {developer?.is_verified ? (
                <Link
                  href="/tsentr-pomoshchi#verified-developer"
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-caption font-medium text-stone-700 hover:border-stone-300"
                  title="Что значит «Проверенный»?"
                >
                  <span
                    className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                    aria-hidden
                  />
                  Проверенный
                </Link>
              ) : null}
              {building ? (
                <Link
                  href={`/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${slug}`}
                  className="group inline-flex items-center gap-1 text-caption font-medium text-stone-500 transition-colors hover:text-terracotta-700"
                  aria-label="Показать на карте"
                >
                  <MapPin className="size-3" />
                  На карте
                  <ArrowUpRight className="size-3 opacity-60 transition-opacity group-hover:opacity-100" />
                </Link>
              ) : null}
            </div>
            {building?.status === 'delivered' ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-caption font-medium text-stone-700">
                <span
                  className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                  aria-hidden
                />
                Готов к заселению
              </span>
            ) : building?.handover_estimated_quarter ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-caption font-medium text-stone-700">
                <Calendar className="size-3 text-stone-500" aria-hidden />
                Сдача {formatHandoverQuarter(building.handover_estimated_quarter)}
              </span>
            ) : null}
          </div>

          {/* RIGHT: price block + CTAs (decision module) */}
          <div className="flex flex-col gap-4 rounded-md border border-stone-200 bg-stone-50/60 p-5 md:w-[22rem] md:shrink-0">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-display font-semibold tabular-nums text-stone-900">
                  {formatPriceNumber(listing.price_total_dirams)} TJS
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-caption text-stone-500 tabular-nums">
                  {formatPriceNumber(listing.price_per_m2_dirams)} TJS / м²
                </span>
              </div>
              {/* Soft terracotta rassrochka pill — anchors to §7
                  Условия (the 3-metric card section). Reads as a
                  decisive monthly number, not a price footnote. */}
              {listing.installment_available && listing.installment_monthly_amount_dirams ? (
                <a
                  href="#rassrochka"
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-terracotta-50 px-2.5 py-1 text-caption font-semibold text-terracotta-800 tabular-nums hover:bg-terracotta-100"
                >
                  Рассрочка от {formatPriceNumber(listing.installment_monthly_amount_dirams)} TJS / мес
                </a>
              ) : null}
            </div>
            {/* Dual CTAs + secondary contact strip — handled by
                ContactBarWithModal which renders inline on desktop
                and pins to the mobile sticky bar on smaller widths. */}
            <ContactBarWithModal
              listingTitle={`${listing.rooms_count}-комн ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
              sellerPhone={sellerPhone}
              isDiaspora={isDiaspora}
              priceFromDirams={listing.price_total_dirams}
            />
          </div>
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
          <div className="flex flex-col gap-1">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Параметры
            </span>
            <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Об этой квартире</h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <AppChip asStatic tone={FINISHING_TONE[listing.finishing_type]}>
              {tFinishing(listing.finishing_type)}
            </AppChip>
            <span className="text-caption text-stone-500">
              {finishingDescription(listing.finishing_type)}
            </span>
          </div>
          {(listing.bathroom_separate != null ||
            listing.has_technical_passport != null ||
            listing.orientation) ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              {listing.bathroom_separate != null ? (
                <AppChip asStatic tone="neutral">
                  Санузел {listing.bathroom_separate ? 'раздельный' : 'совмещённый'}
                </AppChip>
              ) : null}
              {/* Tech-passport — green-toned when present (positive
                  trust signal), neutral when absent (factual). Hidden
                  entirely when the seller didn't say. */}
              {listing.has_technical_passport === true ? (
                <AppChip asStatic tone="positive">
                  Техпаспорт есть
                </AppChip>
              ) : listing.has_technical_passport === false ? (
                <AppChip asStatic tone="neutral">
                  Техпаспорт — выдадут при сдаче
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
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Чертёж
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Планировка</h2>
            </div>
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
                alt={`Планировка квартиры ${listing.rooms_count}-комн ${building ? `в ${building.name.ru}` : `на ${listing.street_address ?? '—'}`}`}
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
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                От продавца
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Описание</h2>
            </div>
            <p className="text-body text-stone-700">{listing.unit_description.ru}</p>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §7 РАССРОЧКА (anchor target for §2 magic-moment line) ─ */}
      {/* scroll-mt-20 stops the heading from landing flush against the
          top of the viewport when the magic-moment anchor jumps here. */}
      {listing.installment_available && listing.installment_monthly_amount_dirams ? (
        <section id="rassrochka" className="scroll-mt-20 border-t border-stone-200 bg-white py-6">
          <AppContainer className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Условия
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Рассрочка от застройщика</h2>
            </div>
            {/* 3-metric cards per the senior-design prescription:
                "В МЕСЯЦ / 3 400 TJS", "ПЕРВЫЙ ВЗНОС / 30%", "СРОК /
                84 мес". Each card: micro-uppercase label above + serif
                number beneath. Turns generic financial info into
                something that reads like a guarantee, not a
                line-of-text. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <RassrochkaMetric
                label="В месяц"
                value={`${formatPriceNumber(listing.installment_monthly_amount_dirams)} TJS`}
              />
              <RassrochkaMetric
                label="Первый взнос"
                value={`${listing.installment_first_payment_percent ?? 30}%`}
              />
              <RassrochkaMetric
                label="Срок"
                value={`${listing.installment_term_months ?? 84} мес`}
              />
            </div>
            <p className="text-meta text-stone-500">
              Без скрытых процентов. Условия фиксируются в договоре.
            </p>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §8 О ДОМЕ ──────────────────────────────────────────── */}
      {/* Two visual variants:
            - In a ЖК: existing card — cover photo + project name + key
              facts + escape link to all units in this building.
            - Standalone: lighter "Об этом доме" card — what we DO know
              about the building (floors / лифт / year built) without
              the project framing or developer link. */}
      {building ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Здание
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>О доме</h2>
            </div>
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
                          : `Сдача ${formatHandoverQuarter(building.handover_estimated_quarter) ?? '—'}`}
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
      ) : (
        // Standalone "Об этом доме" — render only when we have at
        // least one fact to show. Address alone is meaningful.
        (listing.street_address ||
          listing.total_floors ||
          listing.has_elevator != null ||
          listing.year_built) ? (
          <section className="border-t border-stone-200 py-6">
            <AppContainer className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                  Здание
                </span>
                <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Об этом доме</h2>
              </div>
              <AppCard>
                <AppCardContent>
                  <div className="flex flex-col gap-2">
                    {listing.street_address ? (
                      <span className="text-meta text-stone-700">
                        {listing.street_address}
                        <span className="text-stone-500"> · {district.name.ru}</span>
                      </span>
                    ) : (
                      <span className="text-meta text-stone-500">{district.name.ru}</span>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-stone-700">
                      {listing.total_floors ? (
                        <span className="inline-flex items-center gap-1">
                          <Layers className="size-3.5 text-stone-500" aria-hidden />
                          {listing.total_floors} {pluralFloors(listing.total_floors)}
                        </span>
                      ) : null}
                      {listing.has_elevator === true ? (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="size-3.5 text-stone-500" aria-hidden />
                          Лифт есть
                        </span>
                      ) : listing.has_elevator === false ? (
                        <span className="inline-flex items-center gap-1 text-stone-500">
                          Без лифта
                        </span>
                      ) : null}
                      {listing.year_built ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5 text-stone-500" aria-hidden />
                          {listing.year_built} г.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </AppCardContent>
              </AppCard>
            </AppContainer>
          </section>
        ) : null
      )}

      {/* ─── §9 О ЗАСТРОЙЩИКЕ (only if dev has trust depth) ────── */}
      {/* A small card surfacing developer track record. /zhk has the
          fuller version with project-status breakdown; this one is
          intentionally lighter — apartment buyers want the summary
          here, the depth on the building page. */}
      {showDeveloperCard ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Кто строит
              </span>
              <h2 className="text-h2 font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>О застройщике</h2>
            </div>
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h3 className="inline-flex flex-wrap items-center gap-2 text-h3 font-semibold text-stone-900">
                    {developer.display_name.ru}
                    {developer.is_verified ? (
                      <Link
                        href="/tsentr-pomoshchi#verified-developer"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-caption font-medium text-stone-700 hover:border-stone-300"
                        title="Что значит «Проверенный»?"
                      >
                        <span
                          className="size-1.5 rounded-full bg-[color:var(--color-fairness-great)]"
                          aria-hidden
                        />
                        Проверенный
                      </Link>
                    ) : null}
                  </h3>
                  {/* Summary line: years on market + breakdown of
                      delivered vs in-progress projects on OUR platform.
                      Founder critique 2026-05-11: an opaque "4 проекта"
                      total doesn't tell the buyer what they actually
                      want to know — "have they finished anything, and
                      what's currently being built?" The breakdown comes
                      from getDeveloperStats() which counts published
                      buildings by status, so the buyer can click "Все
                      проекты застройщика" below and audit each row.
                      Dropped the lifetime `projects_completed_count`
                      field for this summary — it's manually set and
                      unauditable; trust-first means showing only what
                      buyers can verify themselves. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-stone-700">
                    {developer.years_active != null ? (
                      <span className="tabular-nums">
                        {developer.years_active} {pluralYears(developer.years_active)} на рынке
                      </span>
                    ) : null}
                    {devStats.delivered > 0 ? (
                      <>
                        <span className="text-stone-400" aria-hidden>·</span>
                        <span className="tabular-nums">
                          Сдано {devStats.delivered}
                        </span>
                      </>
                    ) : null}
                    {devStats.underConstruction > 0 ? (
                      <>
                        <span className="text-stone-400" aria-hidden>·</span>
                        <span className="tabular-nums">
                          Строится {devStats.underConstruction}
                        </span>
                      </>
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
      {/* Coords come from the building when in a ЖК, else from the
          listing itself for standalones. Hidden silently when neither
          source has coords (rare — standalone seller skipped pin). */}
      {compactNearby.length > 0 && effectiveLat != null && effectiveLng != null ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer>
            <NearbyChips
              anchorLat={effectiveLat}
              anchorLng={effectiveLng}
              anchorLabel={locationLabel || district.name.ru}
              items={compactNearby.map((c) => ({
                cat: c.cat,
                name: c.item!.name,
                latitude: c.item!.lat,
                longitude: c.item!.lng,
                distanceM: c.item!.distanceM,
              }))}
              // Standalone listings don't have a /novostroyki?focus
              // target — the link points to the listing's own
              // detail-page anchor as a graceful fallback.
              allNearbyHref={
                building
                  ? `/novostroyki?view=karta&focus=${building.slug}&from=kvartira&fromSlug=${listing.slug}`
                  : `/kvartira/${listing.slug}#chto-ryadom`
              }
            />
          </AppContainer>
        </section>
      ) : null}

      {/* ─── §11 АЛЬТЕРНАТИВЫ ───────────────────────────────────── */}
      {/* Two variants:
            - In a ЖК: "Похожие в этом ЖК" — other apartments in the
              same building, hides building-name from each card since
              they're all in the same one (visual clutter).
            - Standalone: "Похожие в этом районе" — other apartments
              in the same district with rooms_count ±1, since there's
              no building to anchor on. Drives buyer comparison so the
              standalone detail page doesn't dead-end into the footer.
          The "Все в районе" CTA lets the visitor escape into the full
          district browse when their alternative wasn't in the top 3. */}
      {similar.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                  Альтернативы
                </span>
                <h2
                  className="text-h2 font-semibold text-stone-900"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  {building ? 'Похожие в этом ЖК' : `Похожие в районе ${district.name.ru}`}
                </h2>
              </div>
              {!building ? (
                <Link
                  href={`/kvartiry?district=${district.slug}`}
                  className="inline-flex items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                >
                  Все в районе
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {similar.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  // For ЖК listings, all alternatives are in the same
                  // building → pass it explicitly + hide the name in
                  // each card. For standalone alternatives we don't
                  // pass a building (most or all of them won't have
                  // one anyway) — the card falls back to its standalone
                  // variant with district + street_address.
                  building={building && building.id === l.building_id ? building : null}
                  developerVerified={(building && developer?.is_verified) ?? false}
                  hideBuildingName={!!building}
                />
              ))}
            </div>
          </AppContainer>
        </section>
      ) : !building ? (
        // Empty similar-list fallback for standalone — instead of just
        // dead-ending, point the buyer at the full district browse so
        // they have a clear next step.
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                Дальше
              </span>
              <h2
                className="text-h2 font-semibold text-stone-900"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                Посмотреть другие квартиры
              </h2>
            </div>
            <p className="text-meta text-stone-600">
              Похожих в районе {district.name.ru} пока нет. Откройте полный список — найдёте варианты в соседних районах.
            </p>
            <Link
              href={`/kvartiry?district=${district.slug}`}
              className="inline-flex w-fit items-center gap-1 text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
            >
              Все квартиры в районе {district.name.ru}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
            <Link
              href={`/kvartiry`}
              className="inline-flex w-fit items-center gap-1 text-meta font-medium text-stone-700 hover:text-stone-900 hover:underline"
            >
              Все квартиры в Вахдате
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
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

/**
 * Single metric card for the Рассрочка 3-card grid. Micro-uppercase
 * label above + serif tabular number beneath. Reads as a quiet
 * financial guarantee — three of these in a row turn a generic
 * installment line into something a buyer can scan with confidence.
 */
function RassrochkaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-stone-200 bg-stone-50/60 p-4">
      <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
        {label}
      </span>
      <span
        className="text-h2 font-semibold tabular-nums text-stone-900"
        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * One-line subtitle describing the finishing TYPE only — never makes
 * claims about readiness, move-in, or what the buyer can do next.
 * Founder critique 2026-05-11: the earlier "готова для вашего ремонта"
 * / "готова к заселению" copy was misleading because (a) the building
 * itself might still be under construction (so the buyer can't start
 * renovation OR move in regardless of finish type), and (b) a finished
 * apartment may still lack appliances / furniture / utilities even
 * when the building is delivered. We describe the state and let the
 * buyer infer what's needed from the project stage + their own visit.
 */
function finishingDescription(t: string): string {
  switch (t) {
    case 'no_finish':
      return 'голые стены и стяжка пола — отделка не выполнена';
    case 'pre_finish':
      return 'предчистовая отделка от застройщика — нужна финишная';
    case 'full_finish':
      return 'чистовая отделка от застройщика';
    case 'owner_renovated':
      return 'квартиру ремонтировал предыдущий владелец';
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
