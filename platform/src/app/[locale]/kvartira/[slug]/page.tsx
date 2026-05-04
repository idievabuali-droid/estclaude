import { notFound } from 'next/navigation';
import {
  MapPin,
  Layers,
  Ruler,
  Bath,
  ArrowUpRight,
} from 'lucide-react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppChip } from '@/components/primitives';
import { InstallmentDisplay, ListingCard, ListingTrustSignals, PriceConversion, CallbackWidget } from '@/components/blocks';
import { getListingStats } from '@/services/listing-stats';
import { getCurrentUser } from '@/lib/auth/session';
import { formatPriceNumber, formatM2, formatFloor, formatPostedAgo } from '@/lib/format';
import { getListing } from '@/services/listings';
import { getNearbyPOIs, POI_LABELS, type PoiCategory } from '@/services/poi';
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
  const title = `${listing.rooms_count}-комн ${formatM2(listing.size_m2)} в ${building.name.ru}`;
  return {
    title,
    description: listing.unit_description.ru,
    openGraph: { title, description: listing.unit_description.ru },
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

  const data = await getListing(slug);
  if (!data) notFound();
  const { listing, building, developer, district, similar, sellerPhone } = data;
  // Auth check used to decide whether to show the anonymous-only
  // CallbackWidget (logged-in users have ContactBarWithModal, no
  // need for a duplicate phone-capture surface).
  const visitor = await getCurrentUser();
  // Diaspora context: when the buyer has set a foreign currency on
  // /diaspora, the contact-bar intent CTA switches from physical visit
  // to online showing.
  const currency = await readCurrencyCookie();
  const isDiaspora = currency != null && currency !== 'TJS';
  // Exchange rates only fetched when the visitor has set a foreign
  // currency — local buyers don't need them and the call (cached
  // 24h, fail-soft) is wasted work otherwise.
  const rates = isDiaspora ? await getExchangeRates() : null;
  const pois = await getNearbyPOIs(building.latitude, building.longitude);
  // Trust signals — view count + recent price-change line, sourced
  // from the events table. Both are optional: zero views or no price
  // history → the strip simply doesn't render.
  const stats = await getListingStats(listing.id, listing.slug);

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
      {/* ─── 1. HERO ────────────────────────────────────────────── */}
      {/* Hero uses the cover photo when uploaded; otherwise the source-
          coded color block stays as a placeholder. The bottom gradient
          + title sit on top in both modes. */}
      <div
        className="relative aspect-[16/9] w-full bg-stone-100 md:aspect-[21/9]"
        style={listing.cover_photo_url ? undefined : { backgroundColor: listing.cover_color }}
      >
        {listing.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_photo_url}
            alt={`${listing.rooms_count}-комн ${formatM2(listing.size_m2)}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <AppContainer className="pb-3 md:pb-4">
            <h1 className="text-h2 font-semibold leading-[var(--leading-h2)] text-white drop-shadow-sm md:text-h1">
              {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
            </h1>
          </AppContainer>
        </div>
      </div>

      {/* Photo gallery — rendered only when there are MORE photos
          beyond the cover, so single-photo listings don't show a
          one-tile grid. */}
      {photoUrls.length > 1 ? (
        <section className="border-b border-stone-200 bg-white py-4">
          <AppContainer>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {photoUrls.map((p) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={p.id}
                  src={p.url}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          </AppContainer>
        </section>
      ) : null}

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
          {/* Building name link → /zhk; small "На карте" pill → map.
              Developer name added on a second line so the building
              summary card lower on the page can be dropped (was
              effectively re-stating the same building + developer
              info with a redundant CTA). */}
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
            <span className="text-caption text-stone-500">
              Застройщик: {developer.display_name.ru}
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

          {/* Tertiary signal — small + muted so it doesn't compete with
              price or building info above. */}
          <span className="text-caption text-stone-400">
            Опубликовано {formatPostedAgo(listing.published_at)}
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

          {/* Anonymous-friendly callback widget. Logged-in visitors
              already have ContactBarWithModal as the primary surface
              and we'd rather not double up; this widget exists so a
              random visitor without a Telegram session can leave a
              phone for the founder to follow up on WhatsApp. */}
          {!visitor ? <CallbackWidget listingId={listing.id} /> : null}
        </AppContainer>
      </section>

      {/* ─── 4. SPECS + FINISHING (the "stats" zone) ────────────── */}
      <section className="bg-stone-50 py-5">
        <AppContainer className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <Fact
              icon={<Ruler className="size-4 text-stone-500" />}
              label="Площадь"
              value={formatM2(listing.size_m2)}
            />
            <Fact
              icon={<Layers className="size-4 text-stone-500" />}
              label="Этаж"
              value={formatFloor(listing.floor_number, listing.total_floors)}
            />
            {listing.bathroom_separate != null ? (
              <Fact
                icon={<Bath className="size-4 text-stone-500" />}
                label="Санузел"
                value={listing.bathroom_separate ? 'раздельный' : 'совмещённый'}
              />
            ) : null}
          </div>

          {/* Finishing — chip is self-explanatory (its semantic colour
              IS the signal); a small caption underneath spells out
              what the buyer actually gets. No "Отделка:" prefix
              needed — the chip text says "Без ремонта" / "С ремонтом"
              etc., which already names the attribute. */}
          <div className="flex flex-col gap-1">
            <AppChip asStatic tone={FINISHING_TONE[listing.finishing_type]} className="w-fit">
              {tFinishing(listing.finishing_type)}
            </AppChip>
            <span className="text-caption text-stone-500">
              {finishingDescription(listing.finishing_type)}
            </span>
          </div>
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
      <section className="border-t border-stone-200 py-6">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Описание</h2>
          <p className="text-body text-stone-700">{listing.unit_description.ru}</p>
        </AppContainer>
      </section>

      {/* Building summary card removed — the title block at the top
          already has the building name (clickable to /zhk), the "На
          карте" pill, AND the developer name. A repeat card here was
          duplicate visual real estate. */}

      {/* ─── 7. COMPACT NEARBY (4 chips + link to full list) ────── */}
      {compactNearby.length > 0 ? (
        <section className="border-t border-stone-200 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h3 className="text-h3 font-semibold text-stone-900">Что рядом</h3>
            <div className="flex flex-wrap gap-2">
              {compactNearby.map(({ cat, item }) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-meta"
                >
                  <span aria-hidden>{POI_LABELS[cat].emoji}</span>
                  <span className="font-medium text-stone-700">{POI_LABELS[cat].ru}</span>
                  <span className="text-stone-500 tabular-nums">· {item!.distanceM} м</span>
                </span>
              ))}
            </div>
            <Link
              href={`/zhk/${building.slug}#nearby`}
              className="inline-flex w-fit items-center gap-1 self-start text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
            >
              Все рядом
              <ArrowUpRight className="size-3.5" />
            </Link>
          </AppContainer>
        </section>
      ) : null}

      {/* ─── 9. SIMILAR IN THIS BUILDING ────────────────────────── */}
      {similar.length > 0 ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6 pb-24 md:pb-7">
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

      {/* Mobile sticky contact bar is rendered by ContactBarWithModal
          in section 3 — it floats fixed regardless of scroll position. */}
    </>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white p-3">
      {icon}
      <div className="flex flex-col">
        <span className="text-caption text-stone-500">{label}</span>
        <span className="text-meta font-medium tabular-nums text-stone-900">{value}</span>
      </div>
    </div>
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
