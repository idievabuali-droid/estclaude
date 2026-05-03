import { notFound } from 'next/navigation';
import { Minus, X, ScanSearch, MessageCircle } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppCard, AppCardContent } from '@/components/primitives';
import { SourceChip, VerificationBadge, ShareButton } from '@/components/blocks';
import { getListingsByIds } from '@/services/listings';
import {
  getBuildingsByIds,
  getDeveloperById,
  getDistrictById,
} from '@/services/buildings';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';
import { getCurrentUser } from '@/lib/auth/session';
import { FEATURES } from '@/lib/feature-flags';

/**
 * /sravnenie — side-by-side comparison.
 *
 * Design follows Nielsen Norman Group guidance for comparison tables:
 * **don't declare winners** — let buyers decide based on their own
 * priorities. (Real estate is the worst possible domain for "winner"
 * badges: lowest price could mean lower quality, highest floor isn't
 * universally better, biggest area means more cleaning, most-ready
 * building forfeits pre-completion pricing, etc.) The earlier version
 * had an aggressive "Кто лучше в чём" winner card and per-cell
 * green/red highlighting that biased toward dimensions buyers don't
 * always actually optimise for.
 *
 * Now the page surfaces three neutral aids:
 *
 *   1. SPREAD SUMMARY — a quick "what differs between these" header.
 *      Shows the range of each numeric attribute (e.g. "Цена: 420 000 —
 *      580 000 TJS") with the item names at each extreme. Pure facts,
 *      no judgment.
 *
 *   2. PER-ROW IDENTICAL MARKER — rows where every item has the same
 *      value get a muted "одинаково" tag in the row label so buyers
 *      can skip past non-differentiators.
 *
 *   3. "ТОЛЬКО РАЗЛИЧИЯ" TOGGLE — URL-driven (?diff=1). When on, hides
 *      identical rows entirely. Borrowed from Best Buy's pattern.
 *
 * Plus shareable: each visit at /sravnenie?type=…&ids=… is a public,
 * deep-linkable comparison. The Поделиться button copies the URL to
 * WhatsApp / Telegram / clipboard. Recipients view without login (the
 * data is already public listings); a soft signup CTA at the bottom
 * invites them to save their own copies.
 */
export default async function SravneniePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: 'buildings' | 'listings';
    ids?: string;
    diff?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Compare hidden in V1 — render a friendly 'coming later' page so
  // any in-flight bookmarks / shared URLs land somewhere reasonable
  // instead of 404. See lib/feature-flags.ts for the re-enable
  // threshold. Bail BEFORE hitting Supabase so we don't fetch ids
  // for a hidden page.
  if (!FEATURES.compare) {
    return (
      <section className="py-7 md:py-9">
        <AppContainer>
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Minus className="size-8 text-stone-400" aria-hidden />
                <h1 className="text-h2 font-semibold text-stone-900">
                  Сравнение пока недоступно
                </h1>
                <p className="max-w-md text-meta text-stone-600">
                  Эта функция появится позже, когда у нас будет больше проектов.
                  А пока сохраняйте понравившиеся ЖК и квартиры в избранное —
                  мы пришлём, когда у них что-то изменится.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/novostroyki">
                    <AppButton variant="primary">К новостройкам</AppButton>
                  </Link>
                  <Link href="/kvartiry">
                    <AppButton variant="secondary">К квартирам</AppButton>
                  </Link>
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>
    );
  }

  const sp = await searchParams;
  const tFinishing = await getTranslations('Finishing');

  const type = sp.type ?? 'listings';
  if (type !== 'listings' && type !== 'buildings') notFound();
  const onlyDifferences = sp.diff === '1';

  const idList = sp.ids?.split(',').filter(Boolean) ?? [];

  const listings: MockListing[] =
    type === 'listings' && idList.length > 0 ? await getListingsByIds(idList) : [];
  const buildings: MockBuilding[] =
    type === 'buildings' && idList.length > 0 ? await getBuildingsByIds(idList) : [];

  const developerMap = new Map<string, MockDeveloper | null>();
  const districtMap = new Map<string, MockDistrict | null>();
  if (type === 'buildings' && buildings.length > 0) {
    const devIds = [...new Set(buildings.map((b) => b.developer_id))];
    const distIds = [...new Set(buildings.map((b) => b.district_id))];
    await Promise.all([
      ...devIds.map(async (id) => developerMap.set(id, await getDeveloperById(id))),
      ...distIds.map(async (id) => districtMap.set(id, await getDistrictById(id))),
    ]);
  }
  const buildingsForListings = new Map<string, MockBuilding>();
  if (type === 'listings' && listings.length > 0) {
    const bIds = [...new Set(listings.map((l) => l.building_id))];
    const bRows = await getBuildingsByIds(bIds);
    for (const b of bRows) buildingsForListings.set(b.id, b);
  }

  const isEmpty = type === 'listings' ? listings.length === 0 : buildings.length === 0;

  // Build the share URL from the current request's host so it works in
  // any deployment (Vercel preview, prod custom domain, local dev).
  const reqHeaders = await headers();
  const host = reqHeaders.get('host') ?? 'estclaude11-qn4w.vercel.app';
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
  const shareUrl = `${proto}://${host}/${locale}/sravnenie?type=${type}&ids=${idList.join(',')}`;

  // Auth check for the soft signup CTA at the bottom — only shown to
  // unauthenticated viewers (typical case for someone arriving via a
  // shared WhatsApp link).
  const currentUser = await getCurrentUser();

  // Toggle href preserves type + ids, flips the diff param.
  const toggleDiffHref = onlyDifferences
    ? `/sravnenie?type=${type}${idList.length ? `&ids=${idList.join(',')}` : ''}`
    : `/sravnenie?type=${type}${idList.length ? `&ids=${idList.join(',')}` : ''}&diff=1`;

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
            <div className="flex items-center gap-2">
              {!isEmpty ? <ShareButton url={shareUrl} title="Сравнение на ЖК.tj" /> : null}
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
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer className="flex flex-col gap-5">
          {isEmpty ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Minus className="size-8 text-stone-400" aria-hidden />
                  <h3 className="text-h3 font-semibold text-stone-900">Нечего сравнивать</h3>
                  <p className="text-meta text-stone-500">
                    Добавьте {type === 'listings' ? 'квартиры' : 'проекты'} в сравнение через
                    кнопку на карточке (значок с двумя стрелками).
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
              onlyDifferences={onlyDifferences}
              toggleDiffHref={toggleDiffHref}
            />
          ) : (
            <BuildingsCompare
              items={buildings}
              developerMap={developerMap}
              districtMap={districtMap}
              onlyDifferences={onlyDifferences}
              toggleDiffHref={toggleDiffHref}
            />
          )}

          {/* Soft signup CTA for unauthenticated viewers. Common case:
              someone arrives via a shared WhatsApp/Telegram link from
              a friend, browses the comparison, then we offer to save
              the items to their own account. NO login wall — viewing
              is always free. */}
          {!currentUser && !isEmpty ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-4 text-center md:flex-row md:text-left">
                  <div className="flex flex-1 flex-col gap-1">
                    <h3 className="text-h3 font-semibold text-stone-900">
                      Понравились эти {type === 'listings' ? 'квартиры' : 'проекты'}?
                    </h3>
                    <p className="text-meta text-stone-600">
                      Войдите через Telegram, чтобы сохранить их в свой кабинет — мы пришлём,
                      когда что-то изменится по цене или появятся новые квартиры.
                    </p>
                  </div>
                  <Link
                    href={`/voyti?redirect=${encodeURIComponent(`/sravnenie?type=${type}&ids=${idList.join(',')}`)}`}
                  >
                    <AppButton variant="primary" size="md">
                      <MessageCircle className="size-4" /> Войти через Telegram
                    </AppButton>
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}
        </AppContainer>
      </section>
    </>
  );
}

// ─── Helpers shared by both views ──────────────────────────────

interface RangeRow {
  label: string;
  value: string;
}

/**
 * Spread summary — neutral "what differs between these items" card
 * shown above the table. Replaces the prior "Кто лучше в чём" winner
 * card. Lists the range of each numeric dimension and which item is at
 * each extreme. Pure descriptive facts; the buyer judges what matters.
 */
function SpreadSummary({ rows }: { rows: RangeRow[] }) {
  if (rows.length === 0) return null;
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ScanSearch className="size-5 text-stone-500" aria-hidden />
            <h2 className="text-h3 font-semibold text-stone-900">Что отличается</h2>
          </div>
          <dl className="flex flex-col">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 py-2 last:border-b-0"
              >
                <dt className="text-meta text-stone-500">{r.label}</dt>
                <dd className="text-meta text-stone-900 tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

/** Toggle bar that flips ?diff=1 in the URL. Hides identical rows when on. */
function DiffToggle({
  href,
  active,
  hiddenRowsCount,
}: {
  href: string;
  active: boolean;
  hiddenRowsCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <span className="text-meta text-stone-600">
        {active
          ? `Показаны только различия — ${hiddenRowsCount} одинаковых строк скрыто`
          : 'Все параметры — одинаковые помечены «одинаково»'}
      </span>
      <Link
        href={href}
        className="text-meta font-medium text-terracotta-700 hover:text-terracotta-800"
      >
        {active ? 'Показать все' : 'Только различия'}
      </Link>
    </div>
  );
}

/** Group section header in the comparison table. */
function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr className="bg-stone-50">
      <td
        colSpan={99}
        className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-stone-500"
      >
        {children}
      </td>
    </tr>
  );
}

function MobileGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-caption font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </div>
  );
}

function isAllSame<T>(values: T[]): boolean {
  return values.every((v) => v === values[0]);
}

// ─── Listings comparison ──────────────────────────────────────

function ListingsCompare({
  items,
  buildingMap,
  tFinishing,
  onlyDifferences,
  toggleDiffHref,
}: {
  items: MockListing[];
  buildingMap: Map<string, MockBuilding>;
  tFinishing: (k: string) => string;
  onlyDifferences: boolean;
  toggleDiffHref: string;
}) {
  const labelFor = (l: MockListing): string => {
    const b = buildingMap.get(l.building_id);
    return `${b?.name.ru ?? '—'} · ${l.rooms_count}-комн`;
  };

  // ─── Spread summary (neutral) ────────────────────────────────
  const prices = items.map((l) => Number(l.price_total_dirams));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minPriceItem = items.find((l) => Number(l.price_total_dirams) === minPrice)!;
  const maxPriceItem = items.find((l) => Number(l.price_total_dirams) === maxPrice)!;

  const sizes = items.map((l) => l.size_m2);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  const installmentCount = items.filter((l) => l.installment_available).length;

  const spread: RangeRow[] = [];
  if (minPrice !== maxPrice) {
    spread.push({
      label: 'Цена',
      value: `${formatPriceNumber(BigInt(minPrice))} (${labelFor(minPriceItem)}) — ${formatPriceNumber(BigInt(maxPrice))} (${labelFor(maxPriceItem)})`,
    });
  }
  if (minSize !== maxSize) {
    spread.push({
      label: 'Площадь',
      value: `${formatM2(minSize)} — ${formatM2(maxSize)}`,
    });
  }
  if (installmentCount > 0 && installmentCount < items.length) {
    spread.push({
      label: 'Рассрочка',
      value: `есть у ${installmentCount} из ${items.length}`,
    });
  }
  // If all rooms differ, surface it; otherwise it's not interesting.
  const roomsRange = items.map((l) => l.rooms_count);
  if (!isAllSame(roomsRange)) {
    spread.push({
      label: 'Комнат',
      value: `${Math.min(...roomsRange)} — ${Math.max(...roomsRange)}`,
    });
  }

  // ─── Row definitions ─────────────────────────────────────────
  type Row = {
    label: string;
    group: 'price' | 'unit' | 'trust';
    render: (l: MockListing) => React.ReactNode;
    /** Used to detect "all same" and "show only diff" filter. */
    keyOf: (l: MockListing) => string | number | boolean;
  };

  const rows: Row[] = [
    {
      label: 'Цена',
      group: 'price',
      keyOf: (l) => Number(l.price_total_dirams),
      render: (l) => (
        <span className="text-h3 font-semibold tabular-nums text-stone-900">
          {formatPriceNumber(l.price_total_dirams)} TJS
        </span>
      ),
    },
    {
      label: 'Цена за м²',
      group: 'price',
      keyOf: (l) => Number(l.price_per_m2_dirams),
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">
          {formatPriceNumber(l.price_per_m2_dirams)} TJS
        </span>
      ),
    },
    {
      label: 'Рассрочка',
      group: 'price',
      keyOf: (l) => l.installment_available,
      render: (l) =>
        l.installment_available ? (
          <span className="text-meta font-medium text-stone-900">Есть</span>
        ) : (
          <span className="text-meta text-stone-400">Нет</span>
        ),
    },
    {
      label: 'Площадь',
      group: 'unit',
      keyOf: (l) => l.size_m2,
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">{formatM2(l.size_m2)}</span>
      ),
    },
    {
      label: 'Комнат',
      group: 'unit',
      keyOf: (l) => l.rooms_count,
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">{l.rooms_count}</span>
      ),
    },
    {
      label: 'Этаж',
      group: 'unit',
      keyOf: (l) => l.floor_number,
      render: (l) => (
        <span className="text-meta tabular-nums text-stone-700">
          {formatFloor(l.floor_number, l.total_floors)}
        </span>
      ),
    },
    {
      label: 'Отделка',
      group: 'unit',
      keyOf: (l) => l.finishing_type,
      render: (l) => <span className="text-meta text-stone-700">{tFinishing(l.finishing_type)}</span>,
    },
    {
      label: 'Источник',
      group: 'trust',
      keyOf: (l) => l.source_type,
      render: (l) => <SourceChip source={l.source_type} />,
    },
    {
      label: 'Проверка',
      group: 'trust',
      keyOf: (l) => l.verification_tier,
      render: (l) => <VerificationBadge tier={l.verification_tier} />,
    },
  ];

  // Annotate each row with whether all items have the same value.
  const annotated = rows.map((row) => ({
    ...row,
    allSame: isAllSame(items.map((l) => row.keyOf(l))),
  }));
  const hiddenRowsCount = annotated.filter((r) => r.allSame).length;
  const visibleRows = onlyDifferences ? annotated.filter((r) => !r.allSame) : annotated;

  return (
    <>
      <SpreadSummary rows={spread} />
      <DiffToggle
        href={toggleDiffHref}
        active={onlyDifferences}
        hiddenRowsCount={hiddenRowsCount}
      />

      {/* MOBILE: stacked cards */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((l) => {
          const building = buildingMap.get(l.building_id);
          const isSold = l.status !== 'active';
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
                      href={`/sravnenie?type=listings&ids=${items.filter((x) => x.id !== l.id).map((x) => x.id).join(',')}${onlyDifferences ? '&diff=1' : ''}`}
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
                  {(['price', 'unit', 'trust'] as const).map((group) => {
                    const groupRows = visibleRows.filter((r) => r.group === group);
                    if (groupRows.length === 0) return null;
                    return (
                      <div key={group} className="flex flex-col gap-2">
                        <MobileGroupLabel>
                          {group === 'price' ? 'Цена' : group === 'unit' ? 'Параметры' : 'Доверие'}
                        </MobileGroupLabel>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {groupRows.map((row) => (
                            <div key={row.label} className="flex flex-col gap-0.5">
                              <dt className="text-caption text-stone-500">
                                {row.label}
                                {row.allSame ? (
                                  <span className="ml-1 text-stone-400">· одинаково</span>
                                ) : null}
                              </dt>
                              <dd>{row.render(l)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </AppCardContent>
            </AppCard>
          );
        })}
      </div>

      {/* TABLET+: side-by-side table */}
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
                        href={`/sravnenie?type=listings&ids=${items.filter((x) => x.id !== l.id).map((x) => x.id).join(',')}${onlyDifferences ? '&diff=1' : ''}`}
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
            {(['price', 'unit', 'trust'] as const).map((group) => {
              const groupRows = visibleRows.filter((r) => r.group === group);
              if (groupRows.length === 0) return null;
              return (
                <Group
                  key={group}
                  title={groupLabel(group)}
                  rows={groupRows}
                  items={items}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function groupLabel(group: 'price' | 'unit' | 'trust' | 'about'): string {
  switch (group) {
    case 'price':
      return 'Цена';
    case 'unit':
      return 'Параметры квартиры';
    case 'trust':
      return 'Доверие';
    case 'about':
      return 'О проекте';
  }
}

/** Renders a group section header followed by its rows. */
function Group<T>({
  title,
  rows,
  items,
}: {
  title: string;
  rows: Array<{
    label: string;
    render: (item: T) => React.ReactNode;
    allSame: boolean;
  }>;
  items: T[];
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <GroupHeader>{title}</GroupHeader>
      {rows.map((row) => (
        <tr key={row.label} className="border-b border-stone-100 last:border-b-0">
          <td className="sticky left-0 z-10 bg-white px-4 py-3 text-meta font-medium text-stone-500">
            {row.label}
            {row.allSame ? (
              <span className="ml-2 text-caption font-normal text-stone-400">одинаково</span>
            ) : null}
          </td>
          {items.map((item, idx) => (
            <td key={idx} className="px-4 py-3">
              {row.render(item)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Buildings comparison ─────────────────────────────────────

function BuildingsCompare({
  items,
  developerMap,
  districtMap,
  onlyDifferences,
  toggleDiffHref,
}: {
  items: MockBuilding[];
  developerMap: Map<string, MockDeveloper | null>;
  districtMap: Map<string, MockDistrict | null>;
  onlyDifferences: boolean;
  toggleDiffHref: string;
}) {
  const STATUS: Record<string, string> = {
    announced: 'Котлован',
    under_construction: 'Строится',
    near_completion: 'Почти готов',
    delivered: 'Сдан',
  };

  const labelFor = (b: MockBuilding) => b.name.ru;

  // ─── Spread summary ─────────────────────────────────────────
  const prices = items
    .map((b) => (b.price_per_m2_from_dirams != null ? Number(b.price_per_m2_from_dirams) : null))
    .filter((v): v is number => v != null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  const verifiedCount = items.filter((b) => developerMap.get(b.developer_id)?.is_verified).length;
  const distinctStatuses = [...new Set(items.map((b) => b.status))];
  const distinctDistricts = [...new Set(items.map((b) => b.district_id))];

  const spread: RangeRow[] = [];
  if (minPrice != null && maxPrice != null && minPrice !== maxPrice) {
    const minItem = items.find(
      (b) => b.price_per_m2_from_dirams != null && Number(b.price_per_m2_from_dirams) === minPrice,
    )!;
    const maxItem = items.find(
      (b) => b.price_per_m2_from_dirams != null && Number(b.price_per_m2_from_dirams) === maxPrice,
    )!;
    spread.push({
      label: 'Цена за м²',
      value: `${formatPriceNumber(BigInt(minPrice))} (${labelFor(minItem)}) — ${formatPriceNumber(BigInt(maxPrice))} (${labelFor(maxItem)})`,
    });
  }
  if (distinctStatuses.length > 1) {
    spread.push({
      label: 'Статус',
      value: distinctStatuses.map((s) => STATUS[s] ?? s).join(' · '),
    });
  }
  if (verifiedCount > 0 && verifiedCount < items.length) {
    spread.push({
      label: 'Проверенный застройщик',
      value: `у ${verifiedCount} из ${items.length}`,
    });
  }
  if (distinctDistricts.length > 1) {
    spread.push({
      label: 'Район',
      value: `${distinctDistricts.length} разных района`,
    });
  }

  type Row = {
    label: string;
    group: 'price' | 'about' | 'trust';
    render: (b: MockBuilding) => React.ReactNode;
    keyOf: (b: MockBuilding) => string | number | boolean | null;
  };

  const rows: Row[] = [
    {
      label: 'Цена от',
      group: 'price',
      keyOf: (b) => (b.price_per_m2_from_dirams != null ? Number(b.price_per_m2_from_dirams) : null),
      render: (b) =>
        b.price_per_m2_from_dirams ? (
          <span className="text-h3 font-semibold tabular-nums text-stone-900">
            {formatPriceNumber(b.price_per_m2_from_dirams)} TJS / м²
          </span>
        ) : (
          <span className="text-meta text-stone-400">—</span>
        ),
    },
    {
      label: 'Статус',
      group: 'about',
      keyOf: (b) => b.status,
      render: (b) => <span className="text-meta text-stone-700">{STATUS[b.status]}</span>,
    },
    {
      label: 'Сдача',
      group: 'about',
      keyOf: (b) => b.handover_estimated_quarter ?? '',
      render: (b) => (
        <span className="text-meta tabular-nums text-stone-700">
          {b.handover_estimated_quarter ?? 'Сдан'}
        </span>
      ),
    },
    {
      label: 'Этажей',
      group: 'about',
      keyOf: (b) => b.total_floors,
      render: (b) => (
        <span className="text-meta tabular-nums text-stone-700">{b.total_floors}</span>
      ),
    },
    {
      label: 'Квартир',
      group: 'about',
      keyOf: (b) => b.total_units,
      render: (b) => (
        <span className="text-meta tabular-nums text-stone-700">{b.total_units}</span>
      ),
    },
    {
      label: 'Район',
      group: 'about',
      keyOf: (b) => b.district_id,
      render: (b) => (
        <span className="text-meta text-stone-700">
          {districtMap.get(b.district_id)?.name.ru ?? '—'}
        </span>
      ),
    },
    {
      label: 'Застройщик',
      group: 'trust',
      keyOf: (b) => b.developer_id,
      render: (b) => {
        const dev = developerMap.get(b.developer_id);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-meta text-stone-700">{dev?.display_name.ru ?? '—'}</span>
            {dev?.is_verified ? (
              <VerificationBadge tier="phone_verified" developerVerified />
            ) : null}
          </div>
        );
      },
    },
  ];

  const annotated = rows.map((row) => ({
    ...row,
    allSame: isAllSame(items.map((b) => row.keyOf(b))),
  }));
  const hiddenRowsCount = annotated.filter((r) => r.allSame).length;
  const visibleRows = onlyDifferences ? annotated.filter((r) => !r.allSame) : annotated;

  return (
    <>
      <SpreadSummary rows={spread} />
      <DiffToggle
        href={toggleDiffHref}
        active={onlyDifferences}
        hiddenRowsCount={hiddenRowsCount}
      />

      {/* MOBILE: stacked cards */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((b) => (
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
                    href={`/sravnenie?type=buildings&ids=${items.filter((x) => x.id !== b.id).map((x) => x.id).join(',')}${onlyDifferences ? '&diff=1' : ''}`}
                    aria-label="Убрать"
                    className="inline-flex size-7 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100"
                  >
                    <X className="size-4" />
                  </Link>
                </div>
                {(['price', 'about', 'trust'] as const).map((group) => {
                  const groupRows = visibleRows.filter((r) => r.group === group);
                  if (groupRows.length === 0) return null;
                  return (
                    <div key={group} className="flex flex-col gap-2">
                      <MobileGroupLabel>
                        {group === 'price' ? 'Цена' : group === 'about' ? 'О проекте' : 'Доверие'}
                      </MobileGroupLabel>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {groupRows.map((row) => (
                          <div key={row.label} className="flex flex-col gap-0.5">
                            <dt className="text-caption text-stone-500">
                              {row.label}
                              {row.allSame ? (
                                <span className="ml-1 text-stone-400">· одинаково</span>
                              ) : null}
                            </dt>
                            <dd>{row.render(b)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            </AppCardContent>
          </AppCard>
        ))}
      </div>

      {/* TABLET+: comparison table */}
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
                      href={`/sravnenie?type=buildings&ids=${items.filter((x) => x.id !== b.id).map((x) => x.id).join(',')}${onlyDifferences ? '&diff=1' : ''}`}
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
            {(['price', 'about', 'trust'] as const).map((group) => {
              const groupRows = visibleRows.filter((r) => r.group === group);
              if (groupRows.length === 0) return null;
              return (
                <Group
                  key={group}
                  title={groupLabel(group)}
                  rows={groupRows}
                  items={items}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
