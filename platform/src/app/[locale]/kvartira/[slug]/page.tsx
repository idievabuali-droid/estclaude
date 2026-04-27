import { notFound } from 'next/navigation';
import {
  MapPin,
  Layers,
  Ruler,
  Bath,
  ArrowUp,
  Eye,
  HelpCircle,
} from 'lucide-react';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppChip,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import {
  SourceChip,
  VerificationBadge,
  FairnessIndicator,
  computeFairness,
  InstallmentDisplay,
  ListingCard,
} from '@/components/blocks';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';
import { getListing } from '@/services/listings';
import { getNearbyPOIs } from '@/services/poi';
import { NearbyPois } from '@/components/blocks';
import { ContactBarWithModal } from './ContactBarWithModal';

const FINISHING_TONE = {
  no_finish: 'finishing-no-finish',
  pre_finish: 'finishing-pre-finish',
  full_finish: 'finishing-full-finish',
  owner_renovated: 'finishing-owner-renovated',
} as const;

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
    openGraph: {
      title,
      description: listing.unit_description.ru,
    },
  };
}

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
  const { listing, building, developer, district, median, similar } = data;
  const pois = await getNearbyPOIs(building.latitude, building.longitude);
  const fairness =
    median != null
      ? computeFairness(Number(listing.price_per_m2_dirams), median.median, median.sample)
      : null;

  return (
    <>
      {/* Hero — compact 16:9 on mobile (BUG-2). Source chip top-left, room+m² title overlaid. */}
      <div
        className="relative aspect-[16/9] w-full md:aspect-[21/9]"
        style={{ backgroundColor: listing.cover_color }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/15 to-transparent" />
        <div className="absolute left-3 top-3">
          <SourceChip source={listing.source_type} />
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <AppContainer className="pb-3 md:pb-4">
            <h1 className="text-h2 font-semibold leading-[var(--leading-h2)] text-white drop-shadow-sm md:text-h1">
              {listing.rooms_count}-комн · {formatM2(listing.size_m2)}
            </h1>
          </AppContainer>
        </div>
      </div>

      {/* JOURNEY-9: breadcrumbs so users can re-orient on long detail pages */}
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

      {/* Title context block (BUG-3: dropped redundant h1; building+district as primary identity now) */}
      <section className="border-b border-stone-200 bg-white py-4">
        <AppContainer className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Link
              href={`/zhk/${building.slug}`}
              className="inline-flex items-center gap-1 text-meta text-stone-700 hover:text-terracotta-600"
            >
              <MapPin className="size-3.5" />
              <span className="font-medium text-stone-900">{building.name.ru}</span>
              <span className="text-stone-500">· {district.name.ru}</span>
            </Link>
            <VerificationBadge
              tier={listing.verification_tier}
              developerVerified={listing.source_type === 'developer' && developer.is_verified}
            />
          </div>

          {/* Price + per-m² + fairness */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-display font-semibold tabular-nums text-stone-900">
              {formatPriceNumber(listing.price_total_dirams)} TJS
            </span>
            <span className="text-meta text-stone-500 tabular-nums">
              {formatPriceNumber(listing.price_per_m2_dirams)} TJS / м²
            </span>
            {fairness ? (
              <FairnessIndicator level={fairness.level} deltaPercent={fairness.deltaPercent} />
            ) : null}
          </div>

          {/* Quick contact (desktop) */}
          <div className="hidden flex-wrap gap-2 pt-2 md:flex">
            <AppButton variant="primary" size="lg">WhatsApp</AppButton>
            <AppButton variant="secondary" size="lg">Позвонить</AppButton>
            <AppButton variant="secondary" size="lg">Запросить визит</AppButton>
          </div>
        </AppContainer>
      </section>

      {/* Key facts grid */}
      <section className="bg-stone-50 py-5">
        <AppContainer className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact icon={<Ruler className="size-4 text-stone-500" />} label="Площадь" value={formatM2(listing.size_m2)} />
          <Fact
            icon={<Layers className="size-4 text-stone-500" />}
            label="Этаж"
            value={formatFloor(listing.floor_number, listing.total_floors)}
          />
          {listing.bathroom_count != null ? (
            <Fact
              icon={<Bath className="size-4 text-stone-500" />}
              label="Санузлов"
              value={String(listing.bathroom_count)}
            />
          ) : null}
          {listing.ceiling_height_cm ? (
            <Fact
              icon={<ArrowUp className="size-4 text-stone-500" />}
              label="Потолок"
              value={`${(listing.ceiling_height_cm / 100).toFixed(1)} м`}
            />
          ) : null}
          {listing.balcony != null ? (
            <Fact
              icon={<Eye className="size-4 text-stone-500" />}
              label="Балкон"
              value={listing.balcony ? 'есть' : 'нет'}
            />
          ) : null}
        </AppContainer>
      </section>

      {/* Finishing chip with description */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Отделка</h2>
          <div className="flex items-start gap-3">
            <AppChip asStatic tone={FINISHING_TONE[listing.finishing_type]}>
              {tFinishing(listing.finishing_type)}
            </AppChip>
            <button
              type="button"
              aria-label="Подробнее об отделке"
              className="inline-flex size-7 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100"
            >
              <HelpCircle className="size-4" />
            </button>
          </div>
          <p className="text-body text-stone-700">
            {finishingDescription(listing.finishing_type)}
          </p>
        </AppContainer>
      </section>

      {/* Installment */}
      {listing.installment_available && listing.installment_monthly_amount_dirams ? (
        <section className="border-t border-stone-200 bg-stone-50 py-6">
          <AppContainer className="flex flex-col gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Рассрочка от застройщика</h2>
            <InstallmentDisplay
              monthlyDirams={listing.installment_monthly_amount_dirams}
              firstPaymentPercent={listing.installment_first_payment_percent ?? 30}
              termMonths={listing.installment_term_months ?? 84}
              totalPriceDirams={listing.price_total_dirams}
            />
            <p className="text-meta text-stone-500">
              Без скрытых процентов. Условия фиксируются в договоре.
            </p>
          </AppContainer>
        </section>
      ) : null}

      {/* Description */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Описание</h2>
          <p className="text-body text-stone-700">{listing.unit_description.ru}</p>
        </AppContainer>
      </section>

      {/* WEDGE-2: "Что рядом" — POI distances (mosque, school, hospital, etc.) */}
      <section className="border-t border-stone-200 py-6">
        <AppContainer>
          <NearbyPois pois={pois} />
        </AppContainer>
      </section>

      {/* Building summary block */}
      <section className="border-t border-stone-200 bg-stone-50 py-6">
        <AppContainer>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-caption font-medium text-stone-500">Жилой комплекс</span>
                  <h3 className="text-h3 font-semibold text-stone-900">{building.name.ru}</h3>
                  <span className="text-meta text-stone-500">
                    Застройщик: {developer.display_name.ru}
                  </span>
                </div>
                <Link href={`/zhk/${building.slug}`}>
                  <AppButton variant="secondary">Открыть ЖК</AppButton>
                </Link>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>

      {/* Similar */}
      {similar.length > 0 ? (
        <section className="border-t border-stone-200 py-6 pb-24 md:pb-7">
          <AppContainer className="flex flex-col gap-5">
            <h2 className="text-h2 font-semibold text-stone-900">Похожие в этом ЖК</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {similar.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  building={building}
                  developerVerified={developer.is_verified}
                  districtMedianPerM2={median?.median ?? null}
                  districtSampleSize={median?.sample ?? 0}
                  hideBuildingName
                />
              ))}
            </div>
          </AppContainer>
        </section>
      ) : null}

      {/* Mobile sticky bar */}
      <ContactBarWithModal
        listingTitle={`${listing.rooms_count}-комн в ${building.name.ru}`}
        whatsappPhone="+992900000000"
      />
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

function finishingDescription(t: string) {
  switch (t) {
    case 'no_finish':
      return 'Квартира без отделки — готова для вашего ремонта.';
    case 'pre_finish':
      return 'Базовая отделка — готова к завершающему ремонту.';
    case 'full_finish':
      return 'Полная отделка от застройщика — готова к заселению.';
    case 'owner_renovated':
      return 'Квартира отремонтирована владельцем — осмотрите лично, чтобы оценить качество.';
    default:
      return '';
  }
}
