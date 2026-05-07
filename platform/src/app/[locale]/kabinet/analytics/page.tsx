import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Flame, AlertTriangle, MessageSquare, Compass, Bell } from 'lucide-react';
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
  // visited → searched → viewed listing → (saved search OR gave
  // callback OR clicked contact). The last stage splits three ways
  // because those events represent very different intent levels —
  // bundling them hid the real "this person actually wants to talk"
  // signal under "this person ticked subscribe".
  const visitorStages = new Map<
    string,
    {
      visited: boolean;
      searched: boolean;
      viewedListing: boolean;
      savedSearch: boolean;
      gaveCallback: boolean;
      clickedContact: boolean;
    }
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

  // Recent feedback feed — collect every feedback_submitted event in
  // window so the founder can read all messages at a glance, sorted
  // newest first. This was previously only visible per-visitor in the
  // drill-down; now it's a first-class dashboard block.
  const recentFeedback: Array<{
    anonId: string;
    occurredAt: string;
    category: string;
    text: string;
    contact: string | null;
    pageUrl: string | null;
  }> = [];

  // Quiz funnel — count distinct anon_ids that hit each milestone.
  // Same anon-id-set pattern as the main funnel so a buyer who
  // re-started the quiz isn't double-counted.
  const quizSets = {
    started: new Set<string>(),
    answeredStep: new Set<string>(),
    completed: new Set<string>(),
    abandoned: new Set<string>(),
  };
  const quizStepCounts: Record<number, Set<string>> = {};

  // Recent friction events — the same patterns the friction-alerts
  // pipeline pings the founder about. Mirroring them onto the dashboard
  // so the founder can audit the pipeline + see signals without
  // depending on Telegram inbox memory. We store the raw events here
  // and post-process afterwards (the "3rd no-results in 30 min" rule
  // needs a windowed count we don't have during the loop).
  const allNoResultEvents: Array<{ anonId: string; occurredAt: string; pageUrl: string | null }> = [];
  const callbackStrandedEvents: Array<{ anonId: string; occurredAt: string; listingId: string | null }> = [];

  for (const e of events) {
    const anonId = e.anon_id as string;
    const evType = e.event_type as string;
    eventCounter[evType] = (eventCounter[evType] ?? 0) + 1;

    const stage = visitorStages.get(anonId) ?? {
      visited: false,
      searched: false,
      viewedListing: false,
      savedSearch: false,
      gaveCallback: false,
      clickedContact: false,
    };
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
    if (evType === 'saved_search_subscribed') stage.savedSearch = true;
    if (evType === 'callback_request_submitted') stage.gaveCallback = true;
    if (evType === 'contact_button_click') stage.clickedContact = true;
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
      // Mirror raw event for friction-alert audit log.
      allNoResultEvents.push({
        anonId,
        occurredAt: e.occurred_at as string,
        pageUrl: (props.url as string | undefined) ?? null,
      });
    }
    if (evType === 'callback_widget_typed_no_submit') {
      callbackStrandedEvents.push({
        anonId,
        occurredAt: e.occurred_at as string,
        listingId: (props.listing_id as string | undefined) ?? null,
      });
    }
    if (evType === 'feedback_submitted') {
      recentFeedback.push({
        anonId,
        occurredAt: e.occurred_at as string,
        category: (props.category as string | undefined) ?? 'idea',
        text: (props.text as string | undefined) ?? '',
        contact: (props.contact as string | undefined) ?? null,
        pageUrl: (props.page_url as string | undefined) ?? null,
      });
    }
    if (evType === 'quiz_started') {
      quizSets.started.add(anonId);
    }
    if (evType === 'quiz_step_answered') {
      quizSets.answeredStep.add(anonId);
      const stepNum = Number(props.step_num);
      if (Number.isFinite(stepNum)) {
        const set = quizStepCounts[stepNum] ?? new Set<string>();
        set.add(anonId);
        quizStepCounts[stepNum] = set;
      }
    }
    if (evType === 'quiz_completed') {
      quizSets.completed.add(anonId);
    }
    if (evType === 'quiz_abandoned') {
      quizSets.abandoned.add(anonId);
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
    savedSearch: 0,
    gaveCallback: 0,
    clickedContact: 0,
  };
  for (const s of visitorStages.values()) {
    if (s.visited) funnelCounts.visited++;
    if (s.searched) funnelCounts.searched++;
    if (s.viewedListing) funnelCounts.viewedListing++;
    if (s.savedSearch) funnelCounts.savedSearch++;
    if (s.gaveCallback) funnelCounts.gaveCallback++;
    if (s.clickedContact) funnelCounts.clickedContact++;
  }

  // ─── Recent feedback feed (newest first, cap 20) ──────────────
  recentFeedback.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  const recentFeedbackCapped = recentFeedback.slice(0, 20);

  // ─── Quiz funnel — 5-step bar chart ────────────────────────────
  // Per-step counts use the distinct-anon-id Sets accumulated above.
  // For step N we count buyers who answered step N at any point in
  // window. quiz_started seeds step 0 (the visitor saw the question
  // but didn't answer); the wizard has 5 steps so we render 1–5.
  const quizFunnel = [
    { stepNum: 0, label: 'Начали', count: quizSets.started.size },
    {
      stepNum: 1,
      label: 'Шаг 1: Районы',
      count: (quizStepCounts[1] ?? new Set()).size,
    },
    {
      stepNum: 2,
      label: 'Шаг 2: Бюджет',
      count: (quizStepCounts[2] ?? new Set()).size,
    },
    {
      stepNum: 3,
      label: 'Шаг 3: Комнат',
      count: (quizStepCounts[3] ?? new Set()).size,
    },
    {
      stepNum: 4,
      label: 'Шаг 4: Отделка',
      count: (quizStepCounts[4] ?? new Set()).size,
    },
    {
      stepNum: 5,
      label: 'Шаг 5: Сроки',
      count: (quizStepCounts[5] ?? new Set()).size,
    },
    { stepNum: 6, label: 'Завершили', count: quizSets.completed.size },
  ];
  const quizMaxCount = Math.max(...quizFunnel.map((s) => s.count), 1);

  // ─── Friction-alert audit log ─────────────────────────────────
  // Replicates the same patterns `lib/analytics/friction-alerts.ts`
  // pings the founder about, so the dashboard mirrors what showed
  // up (or should have shown up) in Telegram. Three sources:
  //   (a) feedback_submitted — every entry in recentFeedbackCapped
  //   (b) callback_widget_typed_no_submit — every event
  //   (c) "third no-result in 30 min" — windowed count per anon
  const frictionAlerts: Array<{
    occurredAt: string;
    anonId: string;
    kind: 'feedback' | 'callback_strand' | 'no_results';
    summary: string;
  }> = [];
  for (const f of recentFeedback) {
    frictionAlerts.push({
      occurredAt: f.occurredAt,
      anonId: f.anonId,
      kind: 'feedback',
      summary: `${categoryLabel(f.category)} · ${f.text.slice(0, 80)}${f.text.length > 80 ? '…' : ''}`,
    });
  }
  for (const c of callbackStrandedEvents) {
    frictionAlerts.push({
      occurredAt: c.occurredAt,
      anonId: c.anonId,
      kind: 'callback_strand',
      summary: c.listingId ? `Не отправил заявку (listing ${c.listingId.slice(0, 8)})` : 'Не отправил заявку',
    });
  }
  // Detect "third no-result in 30 min" — bucket events per anon, sort
  // by time, and emit one alert at the moment the 3rd hits. Same rule
  // friction-alerts.ts uses live.
  const noResultByAnon = new Map<string, Array<{ occurredAt: string; pageUrl: string | null }>>();
  for (const ev of allNoResultEvents) {
    const list = noResultByAnon.get(ev.anonId) ?? [];
    list.push({ occurredAt: ev.occurredAt, pageUrl: ev.pageUrl });
    noResultByAnon.set(ev.anonId, list);
  }
  for (const [anonId, list] of noResultByAnon) {
    list.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
    for (let i = 2; i < list.length; i++) {
      const here = new Date(list[i]!.occurredAt).getTime();
      const window2Ago = new Date(list[i - 2]!.occurredAt).getTime();
      if (here - window2Ago <= 30 * 60 * 1000) {
        frictionAlerts.push({
          occurredAt: list[i]!.occurredAt,
          anonId,
          kind: 'no_results',
          summary: `3-й «ничего не найдено» за 30 мин · ${list[i]!.pageUrl ?? '/'}`,
        });
        break; // emit once per anon (matches the live pipeline)
      }
    }
  }
  frictionAlerts.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  const frictionAlertsCapped = frictionAlerts.slice(0, 20);

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
      sample: v.sample,
    }))
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors)
    .slice(0, 10);

  // ─── Top engaged listings/buildings ─────────────────────────
  const topListingsRaw = Object.entries(listingEngagement)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topBuildingsRaw = Object.entries(buildingEngagement)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Hydrate slugs to human labels so the operator reads "ЖК Vahdat
  // Park · 2-комн 62 м²" instead of "vp-2k-a". Two batched queries.
  const listingSlugs = topListingsRaw.map((r) => r.key);
  const buildingSlugs = topBuildingsRaw.map((r) => r.key);
  const [listingMetaRes, buildingMetaRes] = await Promise.all([
    listingSlugs.length
      ? supabase
          .from('listings')
          .select('slug, rooms_count, size_m2, building:buildings!inner(name)')
          .in('slug', listingSlugs)
      : Promise.resolve({ data: [] as never[] }),
    buildingSlugs.length
      ? supabase.from('buildings').select('slug, name').in('slug', buildingSlugs)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const listingNames = new Map<string, string>();
  for (const row of (listingMetaRes.data ?? []) as Array<{
    slug: string;
    rooms_count: number;
    size_m2: number | string;
    building: { name: { ru?: string } } | { name: { ru?: string } }[] | null;
  }>) {
    const bld = Array.isArray(row.building) ? row.building[0] : row.building;
    const buildingName = bld?.name?.ru ?? '—';
    listingNames.set(
      row.slug,
      `${buildingName} · ${row.rooms_count}-комн ${Number(row.size_m2)} м²`,
    );
  }
  const buildingNames = new Map<string, string>();
  for (const row of (buildingMetaRes.data ?? []) as Array<{ slug: string; name: { ru?: string } }>) {
    buildingNames.set(row.slug, row.name?.ru ?? row.slug);
  }
  const topListings = topListingsRaw.map((r) => ({
    ...r,
    label: listingNames.get(r.key) ?? r.key,
  }));
  const topBuildings = topBuildingsRaw.map((r) => ({
    ...r,
    label: buildingNames.get(r.key) ?? r.key,
  }));

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
            savedSearch={funnelCounts.savedSearch}
            gaveCallback={funnelCounts.gaveCallback}
            clickedContact={funnelCounts.clickedContact}
            distinctIdentified={distinctIdentified.size}
            distinctVisitors={distinctVisitors}
          />

          {/* Hot leads — the actionable list. */}
          <HotLeadsBlock leads={hotLeads} />

          {/* Recent feedback — every "Сообщить о проблеме" submission
              from the floating button, newest first. Used to be only
              visible per-visitor in drill-down. Now first-class. */}
          <RecentFeedbackBlock rows={recentFeedbackCapped} />

          {/* Quiz funnel — 7-bar chart (start → 5 steps → complete)
              showing where buyers drop in the wizard. Highest-intent
              funnel; was previously invisible to the dashboard. */}
          <QuizFunnelBlock funnel={quizFunnel} maxCount={quizMaxCount} />

          {/* Friction-alerts audit log — mirror of what the founder
              should have seen in Telegram. Lets the founder check the
              pipeline didn't drop alerts + browse alerts that were
              read-and-forgotten in chat history. */}
          <FrictionAlertsBlock rows={frictionAlertsCapped} />

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
  savedSearch,
  gaveCallback,
  clickedContact,
  distinctIdentified,
  distinctVisitors,
}: {
  visited: number;
  searched: number;
  viewedListing: number;
  savedSearch: number;
  gaveCallback: number;
  clickedContact: number;
  distinctIdentified: number;
  distinctVisitors: number;
}) {
  const mainStages = [
    { label: 'Зашли', count: visited, prev: visited },
    { label: 'Искали', count: searched, prev: visited },
    { label: 'Открыли квартиру', count: viewedListing, prev: searched },
  ];
  // Last stage splits because the three intent levels are too
  // different to bundle (Cian-style breakdown). Saved-search is
  // weakest, clicked-contact is strongest. Drop-off between them
  // tells you what's actually working.
  const conversionStages = [
    { label: 'Сохранили поиск', count: savedSearch, color: 'text-stone-700' },
    { label: 'Оставили номер', count: gaveCallback, color: 'text-amber-700' },
    { label: 'Нажали контакт', count: clickedContact, color: 'text-terracotta-700' },
  ];
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">Воронка</h2>
            <span className="text-caption text-stone-500 tabular-nums">
              {distinctIdentified} из {distinctVisitors} вошли через Telegram
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {mainStages.map((s, i) => {
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
          <div className="flex flex-col gap-2 border-t border-stone-200 pt-3">
            <span className="text-caption font-medium text-stone-500">
              Конверсии (от тех, кто открыл квартиру)
            </span>
            <div className="grid grid-cols-3 gap-3">
              {conversionStages.map((s) => {
                const pct =
                  viewedListing > 0 ? Math.round((s.count / viewedListing) * 100) : null;
                return (
                  <div
                    key={s.label}
                    className="flex flex-col gap-0.5 rounded-md border border-stone-200 bg-white p-3"
                  >
                    <span className="text-caption text-stone-500">{s.label}</span>
                    <span className={`text-h2 font-semibold tabular-nums ${s.color}`}>
                      {s.count}
                    </span>
                    {pct != null ? (
                      <span className="text-caption tabular-nums text-stone-500">
                        {pct}% от просмотревших
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
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
  rows: Array<{ filtersKey: string; uniqueVisitors: number; label: string; page: string; sample: Record<string, unknown> }>;
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
            Нажмите на запрос, чтобы открыть текущий каталог с этими фильтрами.
          </p>
          {rows.length === 0 ? (
            <p className="text-meta text-stone-500">
              Все поиски возвращали хотя бы один результат.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r) => {
                const path = r.page === 'kvartiry' ? '/kvartiry' : '/novostroyki';
                const qs = new URLSearchParams();
                for (const [k, v] of Object.entries(r.sample)) {
                  if (v == null) continue;
                  if (Array.isArray(v)) qs.set(k, v.join(','));
                  else qs.set(k, String(v));
                }
                const href = qs.toString() ? `${path}?${qs.toString()}` : path;
                return (
                  <li
                    key={r.filtersKey}
                    className="border-t border-stone-100 first:border-t-0"
                  >
                    <Link
                      href={href}
                      className="flex items-start justify-between gap-3 py-2 hover:bg-stone-50"
                    >
                      <span className="text-meta text-stone-700">{r.label}</span>
                      <AppBadge variant="tier-2">
                        {r.uniqueVisitors} {pluralVisitors(r.uniqueVisitors)}
                      </AppBadge>
                    </Link>
                  </li>
                );
              })}
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
  rows: Array<{ key: string; count: number; label: string }>;
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
                    className="min-w-0 truncate text-meta text-terracotta-700 hover:text-terracotta-800"
                  >
                    {r.label}
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

/**
 * Recent feedback feed — every `feedback_submitted` event in window,
 * newest first. Each row links to the per-visitor drill-down so the
 * founder can read the full session that produced the feedback.
 */
function RecentFeedbackBlock({
  rows,
}: {
  rows: Array<{
    anonId: string;
    occurredAt: string;
    category: string;
    text: string;
    contact: string | null;
    pageUrl: string | null;
  }>;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-stone-500" aria-hidden />
            <h2 className="text-h2 font-semibold text-stone-900">Обратная связь</h2>
            {rows.length > 0 ? (
              <AppBadge variant="neutral">{rows.length}</AppBadge>
            ) : null}
          </div>
          <p className="text-meta text-stone-500">
            Сообщения от посетителей через кнопку «Сообщить о проблеме».
            Самые свежие сверху.
          </p>
          {rows.length === 0 ? (
            <p className="text-meta text-stone-500">
              Никто пока не оставил сообщение.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <li
                  key={r.anonId + r.occurredAt}
                  className="flex flex-col gap-1 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-meta font-medium text-stone-900">
                        {categoryLabel(r.category)}
                      </span>
                      {r.pageUrl ? (
                        <span className="text-caption text-stone-500">
                          · {r.pageUrl}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-caption text-stone-500 tabular-nums">
                      {relativeTime(r.occurredAt)}
                    </span>
                  </div>
                  <p className="text-meta text-stone-700">«{r.text}»</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {r.contact ? (
                      <span className="text-caption text-stone-600">
                        Связь: <span className="font-medium">{r.contact}</span>
                      </span>
                    ) : null}
                    <Link
                      href={`/kabinet/analytics/${r.anonId}`}
                      className="text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
                    >
                      Посмотреть сессию →
                    </Link>
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

/**
 * Quiz funnel — 7 horizontal bars (start → step1..5 → complete) with
 * counts + relative widths so the founder can see at a glance which
 * step is the killer. Drop-off between adjacent bars surfaces in red.
 */
function QuizFunnelBlock({
  funnel,
  maxCount,
}: {
  funnel: Array<{ stepNum: number; label: string; count: number }>;
  maxCount: number;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-stone-500" aria-hidden />
            <h2 className="text-h2 font-semibold text-stone-900">Подбор квартиры</h2>
          </div>
          <p className="text-meta text-stone-500">
            Где покупатели бросают мастер-подбора (/pomoshch-vybora). Чем
            больше падение между шагами — тем сильнее этот шаг сбивает.
          </p>
          {funnel[0]!.count === 0 ? (
            <p className="text-meta text-stone-500">
              Никто пока не запускал подбор за выбранный период.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {funnel.map((s, i) => {
                const widthPct = maxCount > 0 ? Math.max(2, Math.round((s.count / maxCount) * 100)) : 0;
                const prev = i > 0 ? funnel[i - 1]!.count : null;
                const dropPct = prev != null && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null;
                const isLast = i === funnel.length - 1;
                return (
                  <li key={s.stepNum} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-caption text-stone-700">
                      {s.label}
                    </span>
                    <div className="relative h-6 flex-1 rounded-sm bg-stone-100">
                      <div
                        className={
                          'absolute inset-y-0 left-0 rounded-sm ' +
                          (isLast
                            ? 'bg-[color:var(--color-fairness-great)]'
                            : 'bg-terracotta-600')
                        }
                        style={{ width: `${widthPct}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-meta font-semibold tabular-nums text-stone-900">
                      {s.count}
                    </span>
                    <span
                      className={
                        'w-16 shrink-0 text-caption tabular-nums ' +
                        (dropPct == null
                          ? 'text-transparent'
                          : dropPct >= 50
                          ? 'text-rose-600'
                          : dropPct > 0
                          ? 'text-stone-500'
                          : 'text-transparent')
                      }
                    >
                      {dropPct != null && dropPct > 0 ? `−${dropPct}%` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}

/**
 * Friction-alerts audit log — mirrors what the founder should have
 * seen in Telegram. Three event kinds rendered with consistent shape:
 * timestamp, anon_id link, summary line. Cap 20 newest.
 */
function FrictionAlertsBlock({
  rows,
}: {
  rows: Array<{
    occurredAt: string;
    anonId: string;
    kind: 'feedback' | 'callback_strand' | 'no_results';
    summary: string;
  }>;
}) {
  const kindLabel = (k: string): string => {
    if (k === 'feedback') return '💬 Обратная связь';
    if (k === 'callback_strand') return '📞 Не отправил заявку';
    if (k === 'no_results') return '🕳️ Ищет не из каталога';
    return k;
  };
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-stone-500" aria-hidden />
            <h2 className="text-h2 font-semibold text-stone-900">События для внимания</h2>
            {rows.length > 0 ? (
              <AppBadge variant="neutral">{rows.length}</AppBadge>
            ) : null}
          </div>
          <p className="text-meta text-stone-500">
            То же, что отправляется в Telegram бот в реальном времени —
            продублировано здесь, чтобы можно было пересмотреть.
          </p>
          {rows.length === 0 ? (
            <p className="text-meta text-stone-500">
              За выбранный период тревожных событий не было.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r, idx) => (
                <li
                  key={r.anonId + r.occurredAt + idx}
                  className="flex flex-wrap items-start justify-between gap-2 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-caption font-medium text-stone-700">
                      {kindLabel(r.kind)}
                    </span>
                    <span className="text-meta text-stone-700">{r.summary}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-caption tabular-nums text-stone-500">
                      {relativeTime(r.occurredAt)}
                    </span>
                    <Link
                      href={`/kabinet/analytics/${r.anonId}`}
                      className="text-caption font-medium text-terracotta-700 hover:text-terracotta-800"
                    >
                      anon {r.anonId.slice(0, 8)} →
                    </Link>
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

function categoryLabel(category: string): string {
  if (category === 'bug') return '🆘 Баг';
  if (category === 'confusion') return '😕 Непонятно';
  if (category === 'missing') return '🔍 Не нашёл';
  if (category === 'idea') return '💡 Идея';
  return category;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин назад`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч назад`;
  return `${Math.floor(diffSec / 86400)} дн назад`;
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
