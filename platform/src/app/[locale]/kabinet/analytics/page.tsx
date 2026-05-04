import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Flame, AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppCard,
  AppCardContent,
  AppBadge,
} from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { isFounder } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { displayNameFromFilters } from '@/lib/saved-searches/format';
import { findHotLeads, getStaffUserIds } from '@/lib/analytics/profile';

interface PageSearchParams {
  range?: 'today' | '7d' | '30d' | 'custom';
  from?: string; // ISO date when range=custom
  to?: string; // ISO date when range=custom
  staff?: 'on' | 'off';
}

const RANGE_OPTIONS: Array<{ value: NonNullable<PageSearchParams['range']>; label: string; days: number | null }> = [
  { value: 'today', label: 'Сегодня', days: 1 },
  { value: '7d', label: '7 дней', days: 7 },
  { value: '30d', label: '30 дней', days: 30 },
];

/**
 * /kabinet/analytics — operator dashboard.
 *
 * Designed so the founder can glance at it for 30 seconds and know
 * what to do next, not reverse-engineer raw counts. Every section
 * is a candidate action: a hot lead to call, an inventory gap to
 * fill, an interaction to follow up on.
 *
 * Server-rendered. SQL aggregations done in JS over a slice of events
 * since this is V1 volume. Migrate to Postgres functions when the
 * events table crosses ~100k rows in the active window.
 */
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/kabinet/analytics')}`);
  }
  if (!(await isFounder(user.id))) {
    notFound();
  }

  const range = sp.range ?? '7d';
  const includeStaff = sp.staff === 'on';

  const fromIso = computeFromIso(range, sp.from);
  const toIso = sp.to && range === 'custom' ? sp.to : new Date().toISOString();

  const supabase = createAdminClient();
  const staffUserIds = await getStaffUserIds();

  // Pull events in window. Filter out staff at JS level so we can
  // still show them when the toggle is on.
  const { data: rawEvents } = await supabase
    .from('events')
    .select('anon_id, user_id, event_type, properties, occurred_at')
    .gte('occurred_at', fromIso)
    .lte('occurred_at', toIso)
    .order('occurred_at', { ascending: false })
    .limit(20000);
  const allEvents = rawEvents ?? [];
  const events = includeStaff
    ? allEvents
    : allEvents.filter((e) => !e.user_id || !staffUserIds.has(e.user_id as string));

  // ─── Funnel stages ──────────────────────────────────────────
  // visited → searched → viewed listing → contact_or_save_or_callback
  const visitorStages = new Map<
    string,
    { visited: boolean; searched: boolean; viewedListing: boolean; converted: boolean }
  >();
  const eventCounter: Record<string, number> = {};
  const channelClicks: Record<string, number> = {};
  const noResultsByVisitor: Record<string, { visitorIds: Set<string>; sample: Record<string, unknown>; page: string }> = {};
  const visitorActivity: Record<
    string,
    { lastSeen: string; eventCount: number; userId: string | null }
  > = {};
  const listingEngagement: Record<string, number> = {};
  const buildingEngagement: Record<string, number> = {};

  for (const e of events) {
    const anonId = e.anon_id as string;
    const evType = e.event_type as string;
    eventCounter[evType] = (eventCounter[evType] ?? 0) + 1;

    const stage = visitorStages.get(anonId) ?? { visited: false, searched: false, viewedListing: false, converted: false };
    stage.visited = true;
    if (evType === 'search_run') stage.searched = true;
    const props = (e.properties ?? {}) as Record<string, unknown>;
    if (evType === 'page_view') {
      const path = (props.pathname as string | undefined) ?? '';
      const lm = path.match(/\/kvartira\/([^/?#]+)/);
      const bm = path.match(/\/zhk\/([^/?#]+)/);
      if (lm) {
        stage.viewedListing = true;
        listingEngagement[lm[1]!] = (listingEngagement[lm[1]!] ?? 0) + 1;
      }
      if (bm) buildingEngagement[bm[1]!] = (buildingEngagement[bm[1]!] ?? 0) + 1;
    }
    if (evType === 'listing_card_click') {
      const slug = props.listing_slug as string | undefined;
      if (slug) listingEngagement[slug] = (listingEngagement[slug] ?? 0) + 1;
    }
    if (evType === 'building_card_click') {
      const slug = props.building_slug as string | undefined;
      if (slug) buildingEngagement[slug] = (buildingEngagement[slug] ?? 0) + 1;
    }
    if (evType === 'contact_button_click' || evType === 'callback_request_submitted' || evType === 'saved_search_subscribed') {
      stage.converted = true;
    }
    if (evType === 'contact_button_click') {
      const channel = (props.channel as string | undefined) ?? 'unknown';
      channelClicks[channel] = (channelClicks[channel] ?? 0) + 1;
    }
    if (evType === 'search_no_results') {
      const filtersKey = JSON.stringify(props.filters ?? {});
      const cur = noResultsByVisitor[filtersKey] ?? {
        visitorIds: new Set<string>(),
        sample: (props.filters as Record<string, unknown>) ?? {},
        page: (props.page as string) ?? 'novostroyki',
      };
      cur.visitorIds.add(anonId);
      noResultsByVisitor[filtersKey] = cur;
    }
    visitorStages.set(anonId, stage);

    const v = visitorActivity[anonId] ?? {
      lastSeen: e.occurred_at as string,
      eventCount: 0,
      userId: null,
    };
    v.eventCount++;
    if (e.user_id) v.userId = e.user_id as string;
    visitorActivity[anonId] = v;
  }

  const funnelCounts = {
    visited: 0,
    searched: 0,
    viewedListing: 0,
    converted: 0,
  };
  for (const s of visitorStages.values()) {
    if (s.visited) funnelCounts.visited++;
    if (s.searched) funnelCounts.searched++;
    if (s.viewedListing) funnelCounts.viewedListing++;
    if (s.converted) funnelCounts.converted++;
  }

  // ─── Hot leads ──────────────────────────────────────────────
  const hotLeads = await findHotLeads({
    fromIso,
    excludeUserIds: includeStaff ? new Set<string>() : staffUserIds,
  });

  // ─── 0-result searches ranked by UNIQUE visitors ─────────────
  const noResultsRanked = Object.entries(noResultsByVisitor)
    .map(([key, v]) => ({
      filtersKey: key,
      uniqueVisitors: v.visitorIds.size,
      label: displayNameFromFilters(
        v.page === 'kvartiry' ? 'kvartiry' : 'novostroyki',
        v.sample as Record<string, string | string[] | undefined>,
      ),
      page: v.page,
    }))
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors)
    .slice(0, 10);

  // ─── Top engaged listings/buildings ─────────────────────────
  const topListings = Object.entries(listingEngagement)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topBuildings = Object.entries(buildingEngagement)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ─── Visitor table ──────────────────────────────────────────
  const topVisitors = Object.entries(visitorActivity)
    .map(([anonId, v]) => ({ anonId, ...v }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 30);
  const userIds = topVisitors.map((v) => v.userId).filter(Boolean) as string[];
  const userPhones = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: u } = await supabase
      .from('users')
      .select('id, phone')
      .in('id', [...new Set(userIds)]);
    for (const row of u ?? []) {
      userPhones.set(row.id as string, (row.phone as string) ?? '—');
    }
  }

  const distinctVisitors = visitorStages.size;
  const distinctIdentified = new Set(
    Object.values(visitorActivity).map((v) => v.userId).filter(Boolean) as string[],
  );

  const totalListingViews = Object.values(listingEngagement).reduce((a, b) => a + b, 0);
  const contactConversionPct =
    totalListingViews > 0
      ? Math.round((Object.values(channelClicks).reduce((a, b) => a + b, 0) / totalListingViews) * 100)
      : null;

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-3 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-h1 font-semibold text-stone-900">Аналитика</h1>
            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((r) => (
                <Link
                  key={r.value}
                  href={`/kabinet/analytics?${new URLSearchParams({ ...stripUndef(sp), range: r.value }).toString()}`}
                  className={
                    'inline-flex h-9 shrink-0 items-center rounded-sm px-3 text-meta font-medium ' +
                    (range === r.value
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200')
                  }
                >
                  {r.label}
                </Link>
              ))}
              <Link
                href={`/kabinet/analytics?${new URLSearchParams({ ...stripUndef(sp), staff: includeStaff ? 'off' : 'on' }).toString()}`}
                className={
                  'inline-flex h-9 shrink-0 items-center rounded-sm border px-3 text-meta font-medium ' +
                  (includeStaff
                    ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100')
                }
                title={includeStaff ? 'Активность команды учитывается' : 'Активность команды исключена'}
              >
                {includeStaff ? '✓ Включая команду' : 'Без команды'}
              </Link>
            </div>
          </div>
          <p className="text-meta text-stone-500">
            Только для команды платформы. {labelForRange(range)}.
          </p>
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          {/* Funnel — the headline number; if conversion drops at one
              step, that's where to focus. */}
          <Funnel
            visited={funnelCounts.visited}
            searched={funnelCounts.searched}
            viewedListing={funnelCounts.viewedListing}
            converted={funnelCounts.converted}
            distinctIdentified={distinctIdentified.size}
            distinctVisitors={distinctVisitors}
          />

          {/* Hot leads — the actionable list. */}
          <HotLeadsBlock leads={hotLeads} />

          {/* 0-result searches — direct inventory acquisition signal. */}
          <NoResultsBlock rows={noResultsRanked} />

          {/* Top engaged listings/buildings — shows what the catalog
              is winning on. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EngagementList
              title="Топ квартир"
              empty="Никто пока не открывал карточки квартир."
              rows={topListings}
              hrefPrefix="/kvartira/"
            />
            <EngagementList
              title="Топ ЖК"
              empty="Никто пока не открывал карточки ЖК."
              rows={topBuildings}
              hrefPrefix="/zhk/"
            />
          </div>

          {/* Contact-click breakdown with conversion rate vs listing views. */}
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Контакт-клики</h2>
                  {contactConversionPct != null ? (
                    <span className="text-meta text-stone-500">
                      <span className="font-semibold text-stone-900">{contactConversionPct}%</span>{' '}
                      от просмотров квартир
                    </span>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-2">
                  {Object.entries(channelClicks).length === 0 ? (
                    <li className="text-meta text-stone-500">Никто пока не нажимал.</li>
                  ) : (
                    Object.entries(channelClicks).map(([ch, n]) => (
                      <li key={ch} className="flex items-center justify-between">
                        <span className="text-meta text-stone-700">{channelLabel(ch)}</span>
                        <AppBadge variant="tier-3">{n}</AppBadge>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </AppCardContent>
          </AppCard>

          {/* Visitors table — the entry point to per-visitor drill-down. */}
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-h2 font-semibold text-stone-900">Посетители</h2>
                  <p className="text-meta text-stone-500">
                    Самые активные. Нажмите для деталей и истории.
                  </p>
                </div>
                <table className="w-full text-meta">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-caption text-stone-500">
                      <th className="py-2 font-medium">Посетитель</th>
                      <th className="py-2 font-medium">Событий</th>
                      <th className="py-2 font-medium">Последний раз</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVisitors.map((v) => (
                      <tr key={v.anonId} className="border-b border-stone-100">
                        <td className="py-2">
                          <Link
                            href={`/kabinet/analytics/${v.anonId}`}
                            className="text-terracotta-700 hover:text-terracotta-800"
                          >
                            {v.userId ? userPhones.get(v.userId) ?? 'Вошёл в Telegram' : `anon ${v.anonId.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td className="py-2 tabular-nums">{v.eventCount}</td>
                        <td className="py-2 text-stone-500 tabular-nums">
                          {new Date(v.lastSeen).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>
    </>
  );
}

function Funnel({
  visited,
  searched,
  viewedListing,
  converted,
  distinctIdentified,
  distinctVisitors,
}: {
  visited: number;
  searched: number;
  viewedListing: number;
  converted: number;
  distinctIdentified: number;
  distinctVisitors: number;
}) {
  const stages = [
    { label: 'Зашли', count: visited, prev: visited },
    { label: 'Искали', count: searched, prev: visited },
    { label: 'Открыли квартиру', count: viewedListing, prev: searched },
    { label: 'Связались / сохранили', count: converted, prev: viewedListing },
  ];
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Воронка</h2>
            <span className="text-caption text-stone-500 tabular-nums">
              {distinctIdentified} из {distinctVisitors} вошли через Telegram
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stages.map((s, i) => {
              const dropPct = s.prev > 0 ? Math.round((s.count / s.prev) * 100) : null;
              return (
                <div key={s.label} className="flex flex-col gap-1 rounded-md border border-stone-200 bg-stone-50 p-3">
                  <span className="text-caption text-stone-500">{s.label}</span>
                  <span className="text-h1 font-semibold tabular-nums text-stone-900">{s.count}</span>
                  {i > 0 && dropPct != null ? (
                    <span className={
                      'text-caption tabular-nums ' +
                      (dropPct >= 50 ? 'text-stone-700' : 'text-rose-600')
                    }>
                      {dropPct}% от пред.
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

import type { HotLead } from '@/lib/analytics/profile';

function HotLeadsBlock({ leads }: { leads: HotLead[] }) {
  return (
    <AppCard className={leads.length > 0 ? 'border-terracotta-300 bg-terracotta-50/40' : undefined}>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-terracotta-700" aria-hidden />
            <h2 className="text-h2 font-semibold text-stone-900">Горячие лиды</h2>
          </div>
          <p className="text-meta text-stone-500">
            Открыли ≥3 квартир и сохранили хотя бы одну, но ещё не оставили контакт.
            С ними стоит связаться первыми.
          </p>
          {leads.length === 0 ? (
            <p className="text-meta text-stone-500">Сейчас таких нет.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {leads.map((l) => (
                <li
                  key={l.anonId}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/kabinet/analytics/${l.anonId}`}
                      className="text-meta font-semibold text-terracotta-700 hover:text-terracotta-800"
                    >
                      {l.identity?.phone ?? `anon ${l.anonId.slice(0, 8)}`}
                      {l.identity?.tg_username ? ` · @${l.identity.tg_username}` : ''}
                    </Link>
                    <span className="text-caption text-stone-500 tabular-nums">
                      {l.listingViewCount} просмотр(ов) квартир · {l.saveCount + l.savedSearchCount} сохранён(о)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.identity?.phone ? (
                      <a
                        href={`https://wa.me/${l.identity.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-sm bg-terracotta-600 px-3 text-meta font-medium text-white hover:bg-terracotta-700"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {l.identity?.tg_username ? (
                      <a
                        href={`https://t.me/${l.identity.tg_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center rounded-sm border border-stone-300 bg-white px-3 text-meta font-medium text-stone-700 hover:bg-stone-100"
                      >
                        Telegram
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function NoResultsBlock({
  rows,
}: {
  rows: Array<{ filtersKey: string; uniqueVisitors: number; label: string; page: string }>;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-stone-500" aria-hidden />
            <h2 className="text-h2 font-semibold text-stone-900">Чего не хватает в каталоге</h2>
          </div>
          <p className="text-meta text-stone-500">
            Запросы, по которым покупатели ничего не нашли. Ранжировано по числу
            уникальных посетителей — добавление таких объявлений принесёт больше всего.
          </p>
          {rows.length === 0 ? (
            <p className="text-meta text-stone-500">
              Все поиски возвращали хотя бы один результат.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li
                  key={r.filtersKey}
                  className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="text-meta text-stone-700">{r.label}</span>
                  <AppBadge variant="tier-2">
                    {r.uniqueVisitors} {pluralVisitors(r.uniqueVisitors)}
                  </AppBadge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function EngagementList({
  title,
  empty,
  rows,
  hrefPrefix,
}: {
  title: string;
  empty: string;
  rows: Array<{ key: string; count: number }>;
  hrefPrefix: string;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <h2 className="text-h2 font-semibold text-stone-900">{title}</h2>
          <ul className="flex flex-col gap-2">
            {rows.length === 0 ? (
              <li className="text-meta text-stone-500">{empty}</li>
            ) : (
              rows.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3">
                  <Link
                    href={`${hrefPrefix}${r.key}`}
                    className="truncate text-meta text-terracotta-700 hover:text-terracotta-800"
                  >
                    {r.key}
                  </Link>
                  <AppBadge variant="neutral">{r.count}</AppBadge>
                </li>
              ))
            )}
          </ul>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function computeFromIso(range: NonNullable<PageSearchParams['range']>, customFrom: string | undefined): string {
  if (range === 'custom' && customFrom) return customFrom;
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function labelForRange(range: NonNullable<PageSearchParams['range']>): string {
  if (range === 'today') return 'Последние 24 часа';
  if (range === '7d') return 'Последние 7 дней';
  if (range === '30d') return 'Последние 30 дней';
  return 'Произвольный период';
}

function channelLabel(channel: string): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'telegram') return 'Telegram';
  if (channel === 'phone') return 'Звонок';
  return channel;
}

function pluralVisitors(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'посетителей';
  if (last > 1 && last < 5) return 'посетителя';
  if (last === 1) return 'посетитель';
  return 'посетителей';
}

function stripUndef(obj: PageSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}
