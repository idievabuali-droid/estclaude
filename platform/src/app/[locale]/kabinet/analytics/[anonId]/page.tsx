import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Flame, AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { displayNameFromFilters } from '@/lib/saved-searches/format';
import { formatEventRow } from '@/lib/analytics/event-format';
import {
  getVisitorBundle,
  deriveBuyerProfile,
  deriveFrictions,
  type BuyerProfile,
} from '@/lib/analytics/profile';

const FINISHING_LABEL: Record<string, string> = {
  no_finish: 'без ремонта',
  pre_finish: 'предчистовая',
  full_finish: 'с ремонтом',
  owner_renovated: 'отремонтировано',
};

const STAGE_LABEL: Record<string, string> = {
  announced: 'котлован',
  under_construction: 'строится',
  near_completion: 'почти готов',
  delivered: 'сдан',
};

/**
 * /kabinet/analytics/[anonId] — single-visitor drill-down.
 *
 * Designed so the operator looks at one visitor and immediately knows:
 *  - who they are (or aren't),
 *  - what they're looking for (derived buyer profile),
 *  - what they saved + what they couldn't find,
 *  - where they got stuck (frictions),
 *  - the full event timeline as a fallback for when the summaries miss
 *    something.
 */
export default async function VisitorPage({
  params,
}: {
  params: Promise<{ locale: string; anonId: string }>;
}) {
  const { locale, anonId } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent(`/kabinet/analytics/${anonId}`)}`);
  }
  if (!(await isFounder(user.id))) {
    notFound();
  }

  const bundle = await getVisitorBundle(anonId);
  const profile = deriveBuyerProfile(bundle);
  const frictions = deriveFrictions(bundle);

  // Hydrate listing/building names for the saved-items section so the
  // founder doesn't see UUIDs.
  const supabase = createAdminClient();
  const savedListingIds = bundle.savedItems.map((s) => s.listing_id).filter(Boolean) as string[];
  const savedBuildingIds = bundle.savedItems.map((s) => s.building_id).filter(Boolean) as string[];
  const [listingsRes, buildingsRes] = await Promise.all([
    savedListingIds.length
      ? supabase.from('listings').select('id, slug, rooms_count, size_m2, price_total_dirams, building_id').in('id', savedListingIds)
      : Promise.resolve({ data: [] }),
    savedBuildingIds.length
      ? supabase.from('buildings').select('id, slug, name').in('id', savedBuildingIds)
      : Promise.resolve({ data: [] }),
  ]);
  const listingMeta = new Map(
    ((listingsRes.data ?? []) as Array<{ id: string; slug: string; rooms_count: number; size_m2: number | string; price_total_dirams: string | number; building_id: string }>).map(
      (l) => [l.id, l],
    ),
  );
  const buildingMeta = new Map(
    ((buildingsRes.data ?? []) as Array<{ id: string; slug: string; name: { ru: string } }>).map((b) => [b.id, b]),
  );

  // Hydrate the listing slugs referenced in contact_requests so the
  // operator gets clickable rows.
  const contactListingIds = bundle.contactRequests.map((c) => c.listing_id);
  let contactListingMeta = new Map<string, { slug: string }>();
  if (contactListingIds.length > 0) {
    const { data } = await supabase.from('listings').select('id, slug').in('id', contactListingIds);
    contactListingMeta = new Map(((data ?? []) as Array<{ id: string; slug: string }>).map((r) => [r.id, { slug: r.slug }]));
  }

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-2 py-5">
          <Link
            href="/kabinet/analytics"
            className="w-fit text-meta text-stone-500 hover:text-terracotta-700"
          >
            ← Назад к аналитике
          </Link>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-h1 font-semibold text-stone-900">
              {bundle.identity ? bundle.identity.phone : `anon ${anonId.slice(0, 8)}`}
            </h1>
            <LeadTempBadge temp={profile.leadTemp} />
          </div>
          <p className="text-meta text-stone-500">
            {bundle.identity?.tg_username ? `@${bundle.identity.tg_username} · ` : ''}
            {bundle.firstSeen
              ? `Первый визит ${formatTs(bundle.firstSeen)} · последний ${formatTs(bundle.lastSeen!)} · ${profile.pageViewCount} просмотр(ов)`
              : 'Нет событий'}
          </p>
          <code className="text-caption text-stone-400">anon_id: {anonId}</code>
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          {/* Buyer profile — the headline summary so the operator can
              read in one glance what kind of buyer this is. */}
          <BuyerProfileCard profile={profile} />

          {/* Frictions — the actionable problem signals. Empty state
              hidden so the section disappears when there's nothing to
              show; the dashboard isn't a wall-of-empty-cards. */}
          {frictions.length > 0 ? (
            <AppCard className="border-amber-200 bg-amber-50/50">
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-700" aria-hidden />
                    <h2 className="text-h2 font-semibold text-stone-900">Точки трения</h2>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {frictions.map((f) => (
                      <li
                        key={f.key}
                        className="flex items-start justify-between gap-3 border-t border-amber-200/60 pt-2 first:border-t-0 first:pt-0"
                      >
                        <span className="text-meta text-stone-700">{f.label}</span>
                        {f.lastSeen ? (
                          <span className="shrink-0 text-caption tabular-nums text-stone-500">
                            {formatTs(f.lastSeen)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          {/* What they saved (listings, buildings, searches). */}
          {bundle.savedItems.length + bundle.savedSearches.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Что сохранили</h2>
                  {bundle.savedItems.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {bundle.savedItems.map((item) => {
                        const lst = item.listing_id ? listingMeta.get(item.listing_id) : null;
                        const bld = item.building_id ? buildingMeta.get(item.building_id) : null;
                        const label = lst
                          ? `Квартира ${lst.rooms_count}-комн · ${Number(lst.size_m2)} м² · ${Math.round(Number(lst.price_total_dirams) / 100).toLocaleString('ru-RU')} TJS`
                          : bld
                            ? // Building names already contain "ЖК" in
                              // most cases ("ЖК Гулистон Резиденс"); do
                              // not double-prefix.
                              (bld.name?.ru ?? bld.slug)
                            : '—';
                        const href = lst
                          ? `/kvartira/${lst.slug}`
                          : bld
                            ? `/zhk/${bld.slug}`
                            : '#';
                        return (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                          >
                            <Link href={href} className="text-meta text-terracotta-700 hover:text-terracotta-800">
                              {label}
                            </Link>
                            <span className="shrink-0 text-caption tabular-nums text-stone-500">
                              {formatTs(item.saved_at)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {bundle.savedSearches.length > 0 ? (
                    <div className="flex flex-col gap-1 border-t border-stone-200 pt-2">
                      <span className="text-caption font-medium text-stone-500">Сохранённые поиски</span>
                      <ul className="flex flex-col gap-1">
                        {bundle.savedSearches.map((s) => (
                          <li key={s.id} className="flex items-start justify-between gap-3">
                            <span className="text-meta text-stone-700">{s.display_name}</span>
                            <span className="shrink-0 text-caption tabular-nums text-stone-500">
                              {s.notify_chat_id ? 'Telegram' : s.notify_phone ? `WhatsApp ${s.notify_phone}` : 'не подписано'}
                              {!s.active ? ' · выкл' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          {/* What they wanted but didn't find — derived from this
              visitor's own search_no_results events. Direct inventory
              acquisition signal at the visitor level. */}
          {profile.noResultCount > 0 ? (
            <NoResultsForVisitor events={bundle.events} />
          ) : null}

          {/* Callback / contact requests — anonymous AND identified.
              The anon_id hookup in /api/callback-request makes the
              anonymous case work. */}
          {bundle.contactRequests.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Запросы обратной связи</h2>
                  <ul className="flex flex-col gap-2">
                    {bundle.contactRequests.map((r) => {
                      const slug = contactListingMeta.get(r.listing_id)?.slug;
                      return (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-meta text-stone-700">
                              {r.channel === 'whatsapp' ? 'WhatsApp' : r.channel} · {r.status}
                              {r.buyer_phone ? ` · ${r.buyer_phone}` : ''}
                            </span>
                            {slug ? (
                              <Link
                                href={`/kvartira/${slug}`}
                                className="text-caption text-terracotta-700 hover:text-terracotta-800"
                              >
                                /kvartira/{slug}
                              </Link>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-caption tabular-nums text-stone-500">
                            {formatTs(r.created_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          {/* Event feed — kept at the bottom as a fallback. Each row is
              a one-line human Russian summary; the full JSON sits in
              a <details> disclosure for debugging. */}
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <h2 className="text-h2 font-semibold text-stone-900">Лента событий</h2>
                <ul className="flex flex-col gap-1">
                  {bundle.events.length === 0 ? (
                    <li className="text-meta text-stone-500">Событий не найдено.</li>
                  ) : (
                    bundle.events.slice(0, 100).map((e) => (
                      <li
                        key={e.id}
                        className="flex flex-col gap-0.5 border-t border-stone-100 py-1 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-meta text-stone-800">{formatEventRow(e)}</span>
                          <span className="shrink-0 text-caption tabular-nums text-stone-400">
                            {formatTs(e.occurred_at)}
                          </span>
                        </div>
                        <details className="text-caption text-stone-400">
                          <summary className="cursor-pointer select-none hover:text-stone-600">
                            raw
                          </summary>
                          <code className="block whitespace-pre-wrap break-all py-1">
                            {JSON.stringify(e.properties)}
                          </code>
                        </details>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>
    </>
  );
}

function BuyerProfileCard({ profile }: { profile: BuyerProfile }) {
  const lines: string[] = [];
  if (profile.dominantRooms) {
    lines.push(`${profile.dominantRooms}-комн`);
  }
  if (profile.priceBandTjs) {
    const { min, max } = profile.priceBandTjs;
    if (min != null && max != null) lines.push(`бюджет ${fmtTjs(min)}–${fmtTjs(max)} TJS`);
    else if (max != null) lines.push(`до ${fmtTjs(max)} TJS`);
    else if (min != null) lines.push(`от ${fmtTjs(min)} TJS`);
  }
  if (profile.districts.length > 0) {
    lines.push(`районы: ${profile.districts.slice(0, 3).join(', ')}`);
  }
  if (profile.finishings.length > 0) {
    const fin = profile.finishings.slice(0, 2).map((f) => FINISHING_LABEL[f] ?? f);
    lines.push(`отделка: ${fin.join(', ')}`);
  }
  if (profile.stages.length > 0) {
    const st = profile.stages.slice(0, 2).map((s) => STAGE_LABEL[s] ?? s);
    lines.push(`стадия: ${st.join(', ')}`);
  }
  const summary = lines.length > 0
    ? lines.join(' · ')
    : 'Покупатель только смотрит — фильтры пока не использовал.';

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Что они ищут</h2>
          <p className="text-body text-stone-800">{summary}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Просмотров страниц" value={profile.pageViewCount} />
            <Stat label="Поисков" value={profile.searchCount} />
            <Stat label="Без результатов" value={profile.noResultCount} accent={profile.noResultCount > 0 ? 'amber' : undefined} />
            <Stat label="Контакт-кликов" value={profile.contactClickCount} accent={profile.contactClickCount > 0 ? 'green' : undefined} />
          </div>
          {profile.topListingSlugs.length + profile.topBuildingSlugs.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-stone-100 pt-2">
              <span className="text-caption font-medium text-stone-500">Чаще всего смотрели</span>
              <div className="flex flex-wrap gap-2">
                {profile.topListingSlugs.map((s) => (
                  <Link
                    key={`l-${s}`}
                    href={`/kvartira/${s}`}
                    className="inline-flex h-7 items-center rounded-sm bg-stone-100 px-2 text-caption text-stone-800 hover:bg-stone-200"
                  >
                    кв · {s}
                  </Link>
                ))}
                {profile.topBuildingSlugs.map((s) => (
                  <Link
                    key={`b-${s}`}
                    href={`/zhk/${s}`}
                    className="inline-flex h-7 items-center rounded-sm bg-stone-100 px-2 text-caption text-stone-800 hover:bg-stone-200"
                  >
                    ЖК · {s}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'amber' | 'green';
}) {
  const valueClass =
    accent === 'amber'
      ? 'text-amber-700'
      : accent === 'green'
        ? 'text-[color:var(--color-fairness-great)]'
        : 'text-stone-900';
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-stone-200 bg-stone-50 p-2">
      <span className="text-caption text-stone-500">{label}</span>
      <span className={`text-h3 font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function NoResultsForVisitor({ events }: { events: Array<{ event_type: string; properties: Record<string, unknown> }> }) {
  const items = events
    .filter((e) => e.event_type === 'search_no_results')
    .map((e, i) => {
      const page = ((e.properties as { page?: string }).page === 'kvartiry'
        ? 'kvartiry'
        : 'novostroyki') as 'novostroyki' | 'kvartiry';
      const filters = ((e.properties as { filters?: Record<string, string | string[] | undefined> }).filters) ?? {};
      return { key: `${i}-${JSON.stringify(filters)}`, label: displayNameFromFilters(page, filters), page };
    });
  // Dedupe identical filter combos so the same search run twice
  // doesn't crowd the list.
  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.label)) return false;
    seen.add(i.label);
    return true;
  });
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">Что хотели, но не нашли</h2>
          <ul className="flex flex-col gap-2">
            {unique.map((u) => (
              <li
                key={u.key}
                className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
              >
                <span className="text-meta text-stone-700">{u.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function LeadTempBadge({ temp }: { temp: 'cold' | 'warm' | 'hot' }) {
  if (temp === 'hot') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-terracotta-600 px-2 py-1 text-caption font-semibold text-white">
        <Flame className="size-3" aria-hidden /> Горячий
      </span>
    );
  }
  if (temp === 'warm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-2 py-1 text-caption font-semibold text-amber-800">
        Тёплый
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-stone-100 px-2 py-1 text-caption font-semibold text-stone-600">
      Холодный
    </span>
  );
}

function fmtTjs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}М`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}к`;
  return String(n);
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}
