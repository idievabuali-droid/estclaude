import { notFound } from 'next/navigation';
import { Check, Minus, X, TrendingUp, Trophy } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppCard, AppCardContent } from '@/components/primitives';
import { SourceChip, VerificationBadge } from '@/components/blocks';
import { getListingsByIds } from '@/services/listings';
import {
  getBuildingsByIds,
  getDeveloperById,
  getDistrictById,
} from '@/services/buildings';
import type { MockBuilding, MockDeveloper, MockDistrict, MockListing } from '@/lib/mock';
import { formatPriceNumber, formatM2, formatFloor } from '@/lib/format';

/**
 * /sravnenie — side-by-side comparison page.
 *
 * V1 polish:
 *   1. WINNER SUMMARY card at the top — buyers see at a glance which item
 *      wins on each meaningful dimension (cheapest, biggest, fastest
 *      delivery, most verified developer, etc.) WITHOUT having to scan
 *      every row of the table.
 *   2. Per-row difference highlighting — winner cell green + check;
 *      worst cell shows percentage delta in red so the magnitude of the
 *      gap is obvious; tied rows get a subtle "одинаково" marker so the
 *      buyer knows the row isn't a differentiator.
 *   3. Rows grouped under section headers (Цена, Параметры, Доверие)
 *      so a 12-row table reads as 3 sub-stories rather than a wall.
 *   4. Empty-state-only fallback when ?ids is empty — the previous
 *      half-baked demo dump was confusing and pulled random listings.
 *
 * Type guarantee: V1 supports comparing buildings OR listings, never
 * mixed (enforced by the compare store).
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

  // No demo fallback — empty state is honest. Previously we pulled
  // random featured listings here which buyers found confusing
  // ("why are these listings being compared?").
  const listings: MockListing[] =
    type === 'listings' && idList.length > 0 ? await getListingsByIds(idList) : [];
  const buildings: MockBuilding[] =
    type === 'buildings' && idList.length > 0 ? await getBuildingsByIds(idList) : [];

  // For buildings rendering — pre-fetch developer + district per item.
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
  // For listings rendering — also need parent buildings.
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

// ─── Helpers shared by both views ──────────────────────────────

const VERIFICATION_RANK: Record<string, number> = {
  listing_verified: 3,
  profile_verified: 2,
  phone_verified: 1,
};

/** Inline percentage delta vs the winning value (for "this is X% worse"). */
function deltaPercent(value: number, winner: number, lowerIsBetter: boolean): string | null {
  if (value === winner || winner === 0) return null;
  const pct = lowerIsBetter
    ? Math.round(((value - winner) / winner) * 100)
    : Math.round(((winner - value) / winner) * 100);
  if (pct === 0) return null;
  return lowerIsBetter ? `+${pct}%` : `−${pct}%`;
}

/** Visual treatment for a single cell in a comparison row. */
function cellClassFor(state: 'winner' | 'worst' | 'neutral'): string {
  if (state === 'winner') {
    return 'text-[color:var(--color-fairness-great)] font-semibold';
  }
  if (state === 'worst') return 'text-rose-700';
  return 'text-stone-700';
}

/** Group section header used in both views. */
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

/** Winner summary card — same structure for both listings + buildings. */
interface WinnerRow {
  icon: React.ReactNode;
  metric: string;
  itemLabel: string;
  value: string;
  href: string;
}

function WinnerSummary({ winners }: { winners: WinnerRow[] }) {
  if (winners.length === 0) return null;
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Trophy
              className="size-5 text-[color:var(--color-fairness-great)]"
              aria-hidden
            />
            <h2 className="text-h3 font-semibold text-stone-900">Кто лучше в чём</h2>
          </div>
          <div className="flex flex-col">
            {winners.map((w, i) => (
              <div
                key={`${w.metric}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-base">
                    {w.icon}
                  </span>
                  <span className="text-meta text-stone-500">{w.metric}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <Link
                    href={w.href}
                    className="text-meta font-semibold text-stone-900 hover:text-terracotta-600"
                  >
                    {w.itemLabel}
                  </Link>
                  <span className="text-caption text-stone-500 tabular-nums">{w.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

// ─── Listings comparison ──────────────────────────────────────

function ListingsCompare({
  items,
  buildingMap,
  tFinishing,
}: {
  items: MockListing[];
  buildingMap: Map<string, MockBuilding>;
  tFinishing: (k: string) => string;
}) {
  // Pre-compute winners for each numeric/winnable dimension.
  const minPrice = Math.min(...items.map((l) => Number(l.price_total_dirams)));
  const maxPrice = Math.max(...items.map((l) => Number(l.price_total_dirams)));
  const minPricePerM2 = Math.min(...items.map((l) => Number(l.price_per_m2_dirams)));
  const maxArea = Math.max(...items.map((l) => l.size_m2));
  const maxFloor = Math.max(...items.map((l) => l.floor_number));
  const anyInstallment = items.some((l) => l.installment_available);
  const allSamePrice = minPrice === maxPrice;

  const labelFor = (l: MockListing): string => {
    const b = buildingMap.get(l.building_id);
    return `${b?.name.ru ?? '—'} · ${l.rooms_count}-комн`;
  };
  const hrefFor = (l: MockListing) => `/kvartira/${l.slug}`;

  // Build the winner summary.
  const winners: WinnerRow[] = [];
  if (!allSamePrice) {
    const cheapest = items.find((l) => Number(l.price_total_dirams) === minPrice)!;
    winners.push({
      icon: '💰',
      metric: 'Лучшая цена',
      itemLabel: labelFor(cheapest),
      value: `${formatPriceNumber(cheapest.price_total_dirams)} TJS`,
      href: hrefFor(cheapest),
    });
  }
  if (Math.min(...items.map((l) => l.size_m2)) !== maxArea) {
    const biggest = items.find((l) => l.size_m2 === maxArea)!;
    winners.push({
      icon: '📐',
      metric: 'Самая большая',
      itemLabel: labelFor(biggest),
      value: formatM2(biggest.size_m2),
      href: hrefFor(biggest),
    });
  }
  const cheapestPerM2 = items.find((l) => Number(l.price_per_m2_dirams) === minPricePerM2)!;
  if (Math.max(...items.map((l) => Number(l.price_per_m2_dirams))) !== minPricePerM2) {
    winners.push({
      icon: '⚖️',
      metric: 'Лучшая цена за м²',
      itemLabel: labelFor(cheapestPerM2),
      value: `${formatPriceNumber(cheapestPerM2.price_per_m2_dirams)} TJS / м²`,
      href: hrefFor(cheapestPerM2),
    });
  }
  if (anyInstallment && !items.every((l) => l.installment_available)) {
    const withInstallment = items.filter((l) => l.installment_available);
    winners.push({
      icon: '💳',
      metric: 'С рассрочкой',
      itemLabel:
        withInstallment.length === 1
          ? `только у ${labelFor(withInstallment[0]!)}`
          : `у ${withInstallment.length} из ${items.length}`,
      value: '',
      href: hrefFor(withInstallment[0]!),
    });
  }
  // Verification: highest tier wins (dev-verified > listing > profile > phone).
  const verRank = (l: MockListing): number => {
    const b = buildingMap.get(l.building_id);
    if (b && (l.source_type === 'developer')) return 4;
    return VERIFICATION_RANK[l.verification_tier] ?? 0;
  };
  const maxVerRank = Math.max(...items.map(verRank));
  if (Math.min(...items.map(verRank)) !== maxVerRank) {
    const mostTrusted = items.find((l) => verRank(l) === maxVerRank)!;
    winners.push({
      icon: '✓',
      metric: 'Лучшая проверка',
      itemLabel: labelFor(mostTrusted),
      value: '',
      href: hrefFor(mostTrusted),
    });
  }

  // ─── Rows definition with state per cell ──────────────────────
  type Cell = { state: 'winner' | 'worst' | 'neutral'; node: React.ReactNode };
  type Row = {
    label: string;
    group: 'price' | 'unit' | 'trust';
    cells: (l: MockListing) => Cell;
    allSame?: boolean;
  };

  const isAllSame = <T,>(values: T[]): boolean => values.every((v) => v === values[0]);

  const rows: Row[] = [
    {
      label: 'Цена',
      group: 'price',
      allSame: allSamePrice,
      cells: (l) => {
        const v = Number(l.price_total_dirams);
        const state: Cell['state'] =
          allSamePrice ? 'neutral' : v === minPrice ? 'winner' : v === maxPrice ? 'worst' : 'neutral';
        const delta = deltaPercent(v, minPrice, true);
        return {
          state,
          node: (
            <span className={`text-h3 tabular-nums ${cellClassFor(state)}`}>
              {formatPriceNumber(l.price_total_dirams)} TJS
              {state === 'winner' ? <Check className="ml-1 inline size-3.5" aria-hidden /> : null}
              {state === 'worst' && delta ? (
                <span className="ml-2 text-caption font-normal">{delta}</span>
              ) : null}
            </span>
          ),
        };
      },
    },
    {
      label: 'Цена за м²',
      group: 'price',
      allSame: isAllSame(items.map((l) => Number(l.price_per_m2_dirams))),
      cells: (l) => {
        const v = Number(l.price_per_m2_dirams);
        const state: Cell['state'] = v === minPricePerM2 ? 'winner' : 'neutral';
        return {
          state,
          node: (
            <span className={`text-meta tabular-nums ${cellClassFor(state)}`}>
              {formatPriceNumber(l.price_per_m2_dirams)} TJS
            </span>
          ),
        };
      },
    },
    {
      label: 'Рассрочка',
      group: 'price',
      allSame: isAllSame(items.map((l) => l.installment_available)),
      cells: (l) => ({
        state: l.installment_available ? 'winner' : 'neutral',
        node: l.installment_available ? (
          <span className="inline-flex items-center gap-1 text-meta font-medium text-[color:var(--color-fairness-great)]">
            <Check className="size-4" aria-hidden /> Есть
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-meta text-stone-400">
            <Minus className="size-4" aria-hidden /> Нет
          </span>
        ),
      }),
    },
    {
      label: 'Площадь',
      group: 'unit',
      allSame: isAllSame(items.map((l) => l.size_m2)),
      cells: (l) => {
        const state: Cell['state'] = l.size_m2 === maxArea ? 'winner' : 'neutral';
        return {
          state,
          node: <span className={`text-meta tabular-nums ${cellClassFor(state)}`}>{formatM2(l.size_m2)}</span>,
        };
      },
    },
    {
      label: 'Комнат',
      group: 'unit',
      allSame: isAllSame(items.map((l) => l.rooms_count)),
      cells: (l) => ({
        state: 'neutral',
        node: <span className="text-meta tabular-nums text-stone-700">{l.rooms_count}</span>,
      }),
    },
    {
      label: 'Этаж',
      group: 'unit',
      allSame: isAllSame(items.map((l) => l.floor_number)),
      cells: (l) => {
        const state: Cell['state'] = l.floor_number === maxFloor ? 'winner' : 'neutral';
        return {
          state,
          node: (
            <span className={`text-meta tabular-nums ${cellClassFor(state)}`}>
              {formatFloor(l.floor_number, l.total_floors)}
            </span>
          ),
        };
      },
    },
    {
      label: 'Отделка',
      group: 'unit',
      allSame: isAllSame(items.map((l) => l.finishing_type)),
      cells: (l) => ({
        state: 'neutral',
        node: <span className="text-meta text-stone-700">{tFinishing(l.finishing_type)}</span>,
      }),
    },
    {
      label: 'Источник',
      group: 'trust',
      allSame: isAllSame(items.map((l) => l.source_type)),
      cells: (l) => ({ state: 'neutral', node: <SourceChip source={l.source_type} /> }),
    },
    {
      label: 'Проверка',
      group: 'trust',
      allSame: isAllSame(items.map((l) => l.verification_tier)),
      cells: (l) => {
        const state: Cell['state'] = verRank(l) === maxVerRank ? 'winner' : 'neutral';
        return { state, node: <VerificationBadge tier={l.verification_tier} /> };
      },
    },
  ];

  return (
    <>
      <WinnerSummary winners={winners} />

      {/* MOBILE: per-listing cards stacked, with winner cells flagged */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((l) => {
          const building = buildingMap.get(l.building_id);
          const isSold = l.status !== 'active';
          const isCheapest = Number(l.price_total_dirams) === minPrice && !allSamePrice;
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
                  {(['price', 'unit', 'trust'] as const).map((group) => (
                    <div key={group} className="flex flex-col gap-2">
                      <MobileGroupLabel>
                        {group === 'price' ? 'Цена' : group === 'unit' ? 'Параметры' : 'Доверие'}
                      </MobileGroupLabel>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {rows
                          .filter((r) => r.group === group)
                          .map((row) => {
                            const c = row.cells(l);
                            return (
                              <div key={row.label} className="flex flex-col gap-0.5">
                                <dt className="text-caption text-stone-500">
                                  {row.label}
                                  {row.allSame ? (
                                    <span className="ml-1 text-stone-400">· одинаково</span>
                                  ) : null}
                                </dt>
                                <dd>{c.node}</dd>
                              </div>
                            );
                          })}
                      </dl>
                    </div>
                  ))}
                  {isCheapest ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-green-50 px-2 py-1 text-caption font-medium text-[color:var(--color-fairness-great)]">
                      <TrendingUp className="size-3" aria-hidden /> Самая низкая цена
                    </span>
                  ) : null}
                </div>
              </AppCardContent>
            </AppCard>
          );
        })}
      </div>

      {/* TABLET+: traditional comparison table with row groups */}
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
            {(['price', 'unit', 'trust'] as const).map((group) => (
              <Group key={group} title={groupLabel(group)} rows={rows.filter((r) => r.group === group)} items={items} />
            ))}
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
      return 'О ЖК';
  }
}

/** Group of rows in a comparison table. Renders a section header
 *  followed by the rows themselves. */
function Group<T>({
  title,
  rows,
  items,
}: {
  title: string;
  rows: Array<{
    label: string;
    cells: (item: T) => { state: 'winner' | 'worst' | 'neutral'; node: React.ReactNode };
    allSame?: boolean;
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
          {items.map((item, idx) => {
            const c = row.cells(item);
            return (
              <td
                key={idx}
                className={
                  'px-4 py-3 ' +
                  (c.state === 'winner' ? 'bg-green-50/50' : c.state === 'worst' ? 'bg-rose-50/40' : '')
                }
              >
                {c.node}
              </td>
            );
          })}
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
}: {
  items: MockBuilding[];
  developerMap: Map<string, MockDeveloper | null>;
  districtMap: Map<string, MockDistrict | null>;
}) {
  const STATUS: Record<string, string> = {
    announced: 'Котлован',
    under_construction: 'Строится',
    near_completion: 'Почти готов',
    delivered: 'Сдан',
  };
  // Status rank: delivered = best (move-in-ready), announced = worst.
  const STATUS_RANK: Record<string, number> = {
    delivered: 4,
    near_completion: 3,
    under_construction: 2,
    announced: 1,
  };

  const pricesPerM2 = items
    .map((b) => (b.price_per_m2_from_dirams != null ? Number(b.price_per_m2_from_dirams) : null))
    .filter((v): v is number => v != null);
  const minPricePerM2 = pricesPerM2.length > 0 ? Math.min(...pricesPerM2) : null;
  const maxPricePerM2 = pricesPerM2.length > 0 ? Math.max(...pricesPerM2) : null;
  const allSamePricePerM2 = minPricePerM2 === maxPricePerM2;
  const maxFloors = Math.max(...items.map((b) => b.total_floors));
  const maxUnits = Math.max(...items.map((b) => b.total_units));
  const maxStatusRank = Math.max(...items.map((b) => STATUS_RANK[b.status] ?? 0));

  const labelFor = (b: MockBuilding) => b.name.ru;
  const hrefFor = (b: MockBuilding) => `/zhk/${b.slug}`;

  const winners: WinnerRow[] = [];
  if (minPricePerM2 != null && !allSamePricePerM2) {
    const cheapest = items.find(
      (b) => b.price_per_m2_from_dirams != null && Number(b.price_per_m2_from_dirams) === minPricePerM2,
    )!;
    winners.push({
      icon: '💰',
      metric: 'Лучшая цена за м²',
      itemLabel: labelFor(cheapest),
      value: `от ${formatPriceNumber(cheapest.price_per_m2_from_dirams!)} TJS / м²`,
      href: hrefFor(cheapest),
    });
  }
  if (!items.every((b) => STATUS_RANK[b.status] === maxStatusRank)) {
    const mostReady = items.find((b) => STATUS_RANK[b.status] === maxStatusRank)!;
    winners.push({
      icon: '🏗',
      metric: 'Готовность к заселению',
      itemLabel: labelFor(mostReady),
      value: STATUS[mostReady.status] ?? '',
      href: hrefFor(mostReady),
    });
  }
  if (Math.min(...items.map((b) => b.total_units)) !== maxUnits) {
    const biggest = items.find((b) => b.total_units === maxUnits)!;
    winners.push({
      icon: '🏢',
      metric: 'Самый большой проект',
      itemLabel: labelFor(biggest),
      value: `${biggest.total_units} квартир`,
      href: hrefFor(biggest),
    });
  }
  // Best developer = verified one (boolean).
  const verifiedItems = items.filter((b) => developerMap.get(b.developer_id)?.is_verified);
  if (verifiedItems.length > 0 && verifiedItems.length < items.length) {
    winners.push({
      icon: '✓',
      metric: 'Проверенный застройщик',
      itemLabel:
        verifiedItems.length === 1
          ? `только у ${labelFor(verifiedItems[0]!)}`
          : `у ${verifiedItems.length} из ${items.length}`,
      value: '',
      href: hrefFor(verifiedItems[0]!),
    });
  }

  type Cell = { state: 'winner' | 'worst' | 'neutral'; node: React.ReactNode };
  type Row = {
    label: string;
    group: 'price' | 'about' | 'trust';
    cells: (b: MockBuilding) => Cell;
    allSame?: boolean;
  };

  const isAllSame = <T,>(values: T[]): boolean => values.every((v) => v === values[0]);

  const rows: Row[] = [
    {
      label: 'Цена от',
      group: 'price',
      allSame: allSamePricePerM2,
      cells: (b) => {
        if (b.price_per_m2_from_dirams == null) {
          return { state: 'neutral', node: <span className="text-meta text-stone-400">—</span> };
        }
        const v = Number(b.price_per_m2_from_dirams);
        const state: Cell['state'] =
          allSamePricePerM2
            ? 'neutral'
            : v === minPricePerM2
              ? 'winner'
              : v === maxPricePerM2
                ? 'worst'
                : 'neutral';
        const delta = minPricePerM2 != null ? deltaPercent(v, minPricePerM2, true) : null;
        return {
          state,
          node: (
            <span className={`text-h3 tabular-nums ${cellClassFor(state)}`}>
              {formatPriceNumber(b.price_per_m2_from_dirams)} TJS / м²
              {state === 'winner' ? <Check className="ml-1 inline size-3.5" aria-hidden /> : null}
              {state === 'worst' && delta ? (
                <span className="ml-2 text-caption font-normal">{delta}</span>
              ) : null}
            </span>
          ),
        };
      },
    },
    {
      label: 'Статус',
      group: 'about',
      allSame: isAllSame(items.map((b) => b.status)),
      cells: (b) => {
        const state: Cell['state'] = (STATUS_RANK[b.status] ?? 0) === maxStatusRank ? 'winner' : 'neutral';
        return { state, node: <span className={`text-meta ${cellClassFor(state)}`}>{STATUS[b.status]}</span> };
      },
    },
    {
      label: 'Сдача',
      group: 'about',
      allSame: isAllSame(items.map((b) => b.handover_estimated_quarter)),
      cells: (b) => ({
        state: 'neutral',
        node: (
          <span className="text-meta tabular-nums text-stone-700">
            {b.handover_estimated_quarter ?? 'Сдан'}
          </span>
        ),
      }),
    },
    {
      label: 'Этажей',
      group: 'about',
      allSame: isAllSame(items.map((b) => b.total_floors)),
      cells: (b) => {
        const state: Cell['state'] = b.total_floors === maxFloors ? 'winner' : 'neutral';
        return {
          state,
          node: <span className={`text-meta tabular-nums ${cellClassFor(state)}`}>{b.total_floors}</span>,
        };
      },
    },
    {
      label: 'Квартир',
      group: 'about',
      allSame: isAllSame(items.map((b) => b.total_units)),
      cells: (b) => {
        const state: Cell['state'] = b.total_units === maxUnits ? 'winner' : 'neutral';
        return {
          state,
          node: <span className={`text-meta tabular-nums ${cellClassFor(state)}`}>{b.total_units}</span>,
        };
      },
    },
    {
      label: 'Район',
      group: 'about',
      allSame: isAllSame(items.map((b) => b.district_id)),
      cells: (b) => ({
        state: 'neutral',
        node: <span className="text-meta text-stone-700">{districtMap.get(b.district_id)?.name.ru ?? '—'}</span>,
      }),
    },
    {
      label: 'Застройщик',
      group: 'trust',
      cells: (b) => {
        const dev = developerMap.get(b.developer_id);
        const state: Cell['state'] = dev?.is_verified ? 'winner' : 'neutral';
        return {
          state,
          node: (
            <div className="flex flex-col gap-1">
              <span className={`text-meta ${cellClassFor(state)}`}>{dev?.display_name.ru ?? '—'}</span>
              {dev?.is_verified ? <VerificationBadge tier="phone_verified" developerVerified /> : null}
            </div>
          ),
        };
      },
    },
  ];

  return (
    <>
      <WinnerSummary winners={winners} />

      {/* MOBILE: per-building cards stacked */}
      <div className="flex flex-col gap-4 md:hidden">
        {items.map((b) => {
          const isCheapest =
            !allSamePricePerM2 &&
            b.price_per_m2_from_dirams != null &&
            Number(b.price_per_m2_from_dirams) === minPricePerM2;
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
                  {(['price', 'about', 'trust'] as const).map((group) => {
                    const groupRows = rows.filter((r) => r.group === group);
                    if (groupRows.length === 0) return null;
                    return (
                      <div key={group} className="flex flex-col gap-2">
                        <MobileGroupLabel>
                          {group === 'price' ? 'Цена' : group === 'about' ? 'О проекте' : 'Доверие'}
                        </MobileGroupLabel>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {groupRows.map((row) => {
                            const c = row.cells(b);
                            return (
                              <div key={row.label} className="flex flex-col gap-0.5">
                                <dt className="text-caption text-stone-500">
                                  {row.label}
                                  {row.allSame ? (
                                    <span className="ml-1 text-stone-400">· одинаково</span>
                                  ) : null}
                                </dt>
                                <dd>{c.node}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    );
                  })}
                  {isCheapest ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-sm bg-green-50 px-2 py-1 text-caption font-medium text-[color:var(--color-fairness-great)]">
                      <TrendingUp className="size-3" aria-hidden /> Лучшая цена за м²
                    </span>
                  ) : null}
                </div>
              </AppCardContent>
            </AppCard>
          );
        })}
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
            {(['price', 'about', 'trust'] as const).map((group) => (
              <Group key={group} title={groupLabel(group)} rows={rows.filter((r) => r.group === group)} items={items} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
