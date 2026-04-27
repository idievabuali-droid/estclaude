import { notFound } from 'next/navigation';
import { Check, Minus, X } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppCard, AppCardContent } from '@/components/primitives';
import { SourceChip, VerificationBadge } from '@/components/blocks';
import { getListingsByIds } from '@/services/listings';
import {
  getBuildingsByIds,
  getDeveloperById,
  getDistrictById,
  listFeaturedBuildings,
  listBuildings,
} from '@/services/buildings';
import type { MockBuilding, MockListing } from '@/lib/mock';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';

/**
 * Page 8 — /sravnenie (Compare).
 * Per Architecture: compare state lives in URL only, no compare table.
 * V1 supports comparing buildings OR listings (not mixed).
 */
export default async function SravneniePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: 'buildings' | 'listings'; ids?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tFinishing = await getTranslations('Finishing');

  const type = sp.type ?? 'listings';
  if (type !== 'listings' && type !== 'buildings') notFound();

  const idList = sp.ids?.split(',').filter(Boolean) ?? [];

  // Fetch by IDs from Supabase. If no IDs supplied, show a default demo set
  // so the page is always meaningful (preview link, etc.).
  let listings: MockListing[] = [];
  let buildings: MockBuilding[] = [];

  if (type === 'listings') {
    if (idList.length > 0) {
      listings = await getListingsByIds(idList);
    } else {
      const featured = await listFeaturedBuildings(3);
      const ids = featured.map((b) => b.id);
      // Demo fallback: take 3 listings from any of the featured buildings
      const allBuildings = await listBuildings({});
      const allBuildingIds = new Set(allBuildings.map((b) => b.id));
      listings = (await getListingsByIds([])).slice(0, 0); // placeholder
      // Pull first 3 active listings via a minimal query
      const { listListings } = await import('@/services/listings');
      const all = await listListings({});
      listings = all
        .filter((l) => allBuildingIds.has(l.building_id))
        .slice(0, 3);
      // Quiet unused
      void ids;
    }
  } else {
    if (idList.length > 0) {
      buildings = await getBuildingsByIds(idList);
    } else {
      buildings = await listFeaturedBuildings(3);
    }
  }

  // For buildings rendering — pre-fetch developer + district for each
  const developerMap = new Map<string, Awaited<ReturnType<typeof getDeveloperById>>>();
  const districtMap = new Map<string, Awaited<ReturnType<typeof getDistrictById>>>();
  if (type === 'buildings') {
    const devIds = [...new Set(buildings.map((b) => b.developer_id))];
    const distIds = [...new Set(buildings.map((b) => b.district_id))];
    await Promise.all([
      ...devIds.map(async (id) => developerMap.set(id, await getDeveloperById(id))),
      ...distIds.map(async (id) => districtMap.set(id, await getDistrictById(id))),
    ]);
  }
  // For listings rendering — also need parent buildings
  const buildingsForListings = new Map<string, MockBuilding>();
  if (type === 'listings' && listings.length > 0) {
    const bIds = [...new Set(listings.map((l) => l.building_id))];
    const bRows = await getBuildingsByIds(bIds);
    for (const b of bRows) buildingsForListings.set(b.id, b);
  }

  const isEmpty = type === 'listings' ? listings.length === 0 : buildings.length === 0;

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-3 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 font-semibold text-stone-900">Сравнение</h1>
              <p className="text-meta text-stone-500 tabular-nums">
                {(type === 'listings' ? listings.length : buildings.length)}{' '}
                {type === 'listings' ? 'квартир' : 'проектов'}
              </p>
            </div>
            <div className="inline-flex items-center rounded-md border border-stone-200 bg-white p-1">
              <Link
                href="/sravnenie?type=listings"
                className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium ${
                  type === 'listings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
                }`}
              >
                Квартиры
              </Link>
              <Link
                href="/sravnenie?type=buildings"
                className={`inline-flex h-9 items-center rounded-sm px-4 text-meta font-medium ${
                  type === 'buildings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600'
                }`}
              >
                Новостройки
              </Link>
            </div>
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer>
          {isEmpty ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Minus className="size-8 text-stone-400" aria-hidden />
                  <h3 className="text-h3 font-semibold text-stone-900">Нечего сравнивать</h3>
                  <p className="text-meta text-stone-500">
                    Добавьте {type === 'listings' ? 'квартиры' : 'проекты'} в сравнение через
                    кнопку весов на карточке.
                  </p>
                  <Link href={type === 'listings' ? '/kvartiry' : '/novostroyki'}>
                    <AppButton variant="primary">
                      {type === 'listings' ? 'К квартирам' : 'К новостройкам'}
                    </AppButton>
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          ) : type === 'listings' ? (
            <ListingsCompare
              items={listings}
              buildingMap={buildingsForListings}
              tFinishing={tFinishing}
            />
          ) : (
            <BuildingsCompare
              items={buildings}
              developerMap={developerMap}
              districtMap={districtMap}
            />
          )}
        </AppContainer>
      </section>
    </>
  );
}

function ListingsCompare({
  items,
  buildingMap,
  tFinishing,
}: {
  items: MockListing[];
  buildingMap: Map<string, MockBuilding>;
  tFinishing: (k: string) => string;
}) {
  const minPrice = items.reduce(
    (acc, l) => (l.price_total_dirams < acc ? l.price_total_dirams : acc),
    items[0]!.price_total_dirams,
  );

  const rows: Array<{ label: string; render: (l: MockListing) => React.ReactNode }> = [
    {
      label: 'Цена',
      render: (l) => (
        <span
          className={`text-h3 font-semibold tabular-nums ${l.price_total_dirams === minPrice ? 'text-[color:var(--color-fairness-great)]' : 'text-stone-900'}`}
        >
          {formatPriceNumber(l.price_total_dirams)} TJS
          {l.price_total_dirams === minPrice ? (
            <Check className="ml-1 inline size-3.5" aria-label="Самая низкая цена" />
          ) : null}
        </span>
      ),
    },
    {
      label: 'Цена за м²',
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">
          {formatPriceNumber(l.price_per_m2_dirams)} TJS
        </span>
      ),
    },
    {
      label: 'Площадь',
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">{formatM2(l.size_m2)}</span>
      ),
    },
    {
      label: 'Комнат',
      render: (l) => <span className="text-meta tabular-nums text-stone-700">{l.rooms_count}</span>,
    },
    {
      label: 'Этаж',
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">
          {formatFloor(l.floor_number, l.total_floors)}
        </span>
      ),
    },
    {
      label: 'Отделка',
      render: (l) => (
        <span className="text-meta text-stone-700">{tFinishing(l.finishing_type)}</span>
      ),
    },
    {
      label: 'Источник',
      render: (l) => <SourceChip source={l.source_type} />,
    },
    {
      label: 'Проверка',
      render: (l) => <VerificationBadge tier={l.verification_tier} />,
    },
    {
      label: 'Рассрочка',
      render: (l) =>
        l.installment_available ? (
          <Check className="size-4 text-[color:var(--color-fairness-great)]" aria-label="Есть" />
        ) : (
          <Minus className="size-4 text-stone-300" aria-label="Нет" />
        ),
    },
  ];

  return (
    <>
      {/* MOBILE: vertical stacked cards (BUG-5). One full-width card per listing. */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((l) => {
          const building = buildingMap.get(l.building_id);
          const isSold = l.status !== 'active';
          const isCheapest = l.price_total_dirams === minPrice;
          return (
            <AppCard key={l.id} className={isSold ? 'opacity-60' : ''}>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/kvartira/${l.slug}`}
                      className="text-h3 font-semibold text-stone-900 hover:text-terracotta-600"
                    >
                      {building?.name.ru ?? '—'} · {l.rooms_count}-комн
                    </Link>
                    <Link
                      href={`/sravnenie?type=listings&ids=${items.filter((x) => x.id !== l.id).map((x) => x.id).join(',')}`}
                      aria-label="Убрать"
                      className="inline-flex size-7 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100"
                    >
                      <X className="size-4" />
                    </Link>
                  </div>
                  {isSold ? (
                    <span className="inline-flex w-fit rounded-sm bg-stone-100 px-2 py-0.5 text-caption text-stone-500">
                      {l.status === 'sold' ? 'Продано' : 'Снято'}
                    </span>
                  ) : null}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {rows.map((row) => (
                      <div key={row.label} className="flex flex-col gap-0.5">
                        <dt className="text-caption text-stone-500">{row.label}</dt>
                        <dd>{row.render(l)}</dd>
                      </div>
                    ))}
                  </dl>
                  {isCheapest ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-green-50 px-2 py-1 text-caption font-medium text-[color:var(--color-fairness-great)]">
                      <Check className="size-3" aria-hidden /> Самая низкая цена
                    </span>
                  ) : null}
                </div>
              </AppCardContent>
            </AppCard>
          );
        })}
      </div>

      {/* TABLET+: traditional comparison table */}
      <div className="hidden overflow-x-auto rounded-md border border-stone-200 bg-white md:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-caption font-medium uppercase tracking-wide text-stone-500">
                Параметр
              </th>
              {items.map((l) => {
                const building = buildingMap.get(l.building_id);
                const isSold = l.status !== 'active';
                return (
                  <th
                    key={l.id}
                    className={`min-w-[200px] px-4 py-3 text-left ${isSold ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/kvartira/${l.slug}`}
                        className="text-meta font-semibold text-stone-900 hover:text-terracotta-600"
                      >
                        {building?.name.ru ?? '—'} · {l.rooms_count}-комн
                        {isSold ? (
                          <span className="ml-2 rounded-sm bg-stone-100 px-2 py-0.5 text-caption text-stone-500">
                            {l.status === 'sold' ? 'Продано' : 'Снято'}
                          </span>
                        ) : null}
                      </Link>
                      <Link
                        href={`/sravnenie?type=listings&ids=${items.filter((x) => x.id !== l.id).map((x) => x.id).join(',')}`}
                        aria-label="Убрать"
                        className="inline-flex size-6 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100"
                      >
                        <X className="size-3.5" />
                      </Link>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-stone-100 last:border-b-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-meta font-medium text-stone-500">
                  {row.label}
                </td>
                {items.map((l) => (
                  <td key={l.id} className="px-4 py-3">
                    {row.render(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BuildingsCompare({
  items,
  developerMap,
  districtMap,
}: {
  items: MockBuilding[];
  developerMap: Map<string, Awaited<ReturnType<typeof getDeveloperById>>>;
  districtMap: Map<string, Awaited<ReturnType<typeof getDistrictById>>>;
}) {
  const STATUS: Record<string, string> = {
    announced: 'Анонсирован',
    under_construction: 'Строится',
    near_completion: 'Почти готов',
    delivered: 'Сдан',
  };
  const minPrice = items.reduce(
    (acc, b) =>
      b.price_from_dirams != null && (acc == null || b.price_from_dirams < acc)
        ? b.price_from_dirams
        : acc,
    items[0]?.price_from_dirams ?? null,
  );
  const rows: Array<{ label: string; render: (b: MockBuilding) => React.ReactNode }> = [
    {
      label: 'Цена от',
      render: (b) =>
        b.price_from_dirams ? (
          <span
            className={`text-h3 font-semibold tabular-nums ${b.price_from_dirams === minPrice ? 'text-[color:var(--color-fairness-great)]' : 'text-stone-900'}`}
          >
            {formatPriceNumber(b.price_from_dirams)} TJS
          </span>
        ) : (
          <span className="text-meta text-stone-400">—</span>
        ),
    },
    {
      label: 'Статус',
      render: (b) => <span className="text-meta text-stone-700">{STATUS[b.status]}</span>,
    },
    {
      label: 'Сдача',
      render: (b) => (
        <span className="text-meta tabular-nums text-stone-700">
          {b.handover_estimated_quarter ?? 'Сдан'}
        </span>
      ),
    },
    {
      label: 'Этажей',
      render: (b) => <span className="text-meta tabular-nums text-stone-700">{b.total_floors}</span>,
    },
    {
      label: 'Квартир',
      render: (b) => <span className="text-meta tabular-nums text-stone-700">{b.total_units}</span>,
    },
    {
      label: 'Район',
      render: (b) => {
        const d = districtMap.get(b.district_id);
        return <span className="text-meta text-stone-700">{d?.name.ru ?? '—'}</span>;
      },
    },
    {
      label: 'Застройщик',
      render: (b) => {
        const dev = developerMap.get(b.developer_id);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-meta text-stone-700">{dev?.display_name.ru ?? '—'}</span>
            {dev?.is_verified ? <VerificationBadge tier="phone_verified" developerVerified /> : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* MOBILE: vertical stacked cards (BUG-5) */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((b) => {
          const isCheapest = b.price_from_dirams != null && b.price_from_dirams === minPrice;
          return (
            <AppCard key={b.id}>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/zhk/${b.slug}`}
                      className="text-h3 font-semibold text-stone-900 hover:text-terracotta-600"
                    >
                      {b.name.ru}
                    </Link>
                    <Link
                      href={`/sravnenie?type=buildings&ids=${items.filter((x) => x.id !== b.id).map((x) => x.id).join(',')}`}
                      aria-label="Убрать"
                      className="inline-flex size-7 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100"
                    >
                      <X className="size-4" />
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {rows.map((row) => (
                      <div key={row.label} className="flex flex-col gap-0.5">
                        <dt className="text-caption text-stone-500">{row.label}</dt>
                        <dd>{row.render(b)}</dd>
                      </div>
                    ))}
                  </dl>
                  {isCheapest ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-green-50 px-2 py-1 text-caption font-medium text-[color:var(--color-fairness-great)]">
                      <Check className="size-3" aria-hidden /> Самая низкая цена
                    </span>
                  ) : null}
                </div>
              </AppCardContent>
            </AppCard>
          );
        })}
      </div>

      {/* TABLET+: traditional comparison table */}
      <div className="hidden overflow-x-auto rounded-md border border-stone-200 bg-white md:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-caption font-medium uppercase tracking-wide text-stone-500">
                Параметр
              </th>
              {items.map((b) => (
                <th key={b.id} className="min-w-[200px] px-4 py-3 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/zhk/${b.slug}`}
                      className="text-meta font-semibold text-stone-900 hover:text-terracotta-600"
                    >
                      {b.name.ru}
                    </Link>
                    <Link
                      href={`/sravnenie?type=buildings&ids=${items.filter((x) => x.id !== b.id).map((x) => x.id).join(',')}`}
                      aria-label="Убрать"
                      className="inline-flex size-6 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100"
                    >
                      <X className="size-3.5" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-stone-100 last:border-b-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-meta font-medium text-stone-500">
                  {row.label}
                </td>
                {items.map((b) => (
                  <td key={b.id} className="px-4 py-3">
                    {row.render(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
