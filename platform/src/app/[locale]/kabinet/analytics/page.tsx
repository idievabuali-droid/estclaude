import { redirect, notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
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

const WINDOW_DAYS = 30;

interface Counter { key: string; count: number }

/**
 * /kabinet/analytics — founder-only visitor analytics.
 *
 * Two columns:
 *  - Aggregate (top of page): how much traffic, what they're doing,
 *    what failed-search filter combos look like (the most actionable
 *    signal: those are buyers telling us what's missing from inventory).
 *  - Per-visitor (bottom): list of the most-active anon_ids in the
 *    window, with click-through to a per-visitor drill-down.
 *
 * Server-rendered. SQL aggregations only — no client-side charting
 * dependency. If the founder needs more shapes than this view shows,
 * they can hit Supabase Studio directly (the events table is plain
 * jsonb).
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/kabinet/analytics')}`);
  }
  if (!(await isFounder(user.id))) {
    notFound();
  }

  const supabase = createAdminClient();
  // Server component is invoked per request; the lint flags Date.now
  // as impure but that's exactly the behaviour we want here (every
  // page load reflects the current 30-day window). Suppress the
  // rule with a localised comment so we don't disable purity checks
  // globally.
  // eslint-disable-next-line react-hooks/purity -- rolling time window is intentional
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pull a slice — for V1 volume (a few thousand events tops) this
  // fits comfortably in memory and we aggregate in JS. If volume
  // climbs we move these to a Postgres function (count(*) group by).
  const { data: rawEvents } = await supabase
    .from('events')
    .select('anon_id, user_id, event_type, properties, url, occurred_at')
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(10000);
  const events = rawEvents ?? [];

  // ─── Aggregates ────────────────────────────────────────────
  const distinctAnon = new Set<string>();
  const distinctIdentified = new Set<string>();
  const eventCounter: Record<string, number> = {};
  const listingViews: Record<string, number> = {};
  const buildingViews: Record<string, number> = {};
  const channelClicks: Record<string, number> = {};
  const noResultsByFilter: Record<string, { count: number; sample: Record<string, unknown> }> = {};
  const visitorActivity: Record<
    string,
    { lastSeen: string; eventCount: number; userId: string | null }
  > = {};

  for (const e of events) {
    const anon = e.anon_id as string;
    const evType = e.event_type as string;
    distinctAnon.add(anon);
    if (e.user_id) distinctIdentified.add(e.user_id as string);
    eventCounter[evType] = (eventCounter[evType] ?? 0) + 1;

    const v = visitorActivity[anon] ?? {
      lastSeen: e.occurred_at as string,
      eventCount: 0,
      userId: null,
    };
    v.eventCount++;
    if (e.user_id) v.userId = e.user_id as string;
    visitorActivity[anon] = v;

    const props = (e.properties ?? {}) as Record<string, unknown>;

    if (evType === 'page_view') {
      const path = (props.pathname as string | undefined) ?? '';
      const m = path.match(/\/(kvartira|zhk)\/([^/?#]+)/);
      if (m) {
        const slug = m[2]!;
        if (m[1] === 'kvartira') listingViews[slug] = (listingViews[slug] ?? 0) + 1;
        else buildingViews[slug] = (buildingViews[slug] ?? 0) + 1;
      }
    } else if (evType === 'contact_button_click') {
      const channel = (props.channel as string | undefined) ?? 'unknown';
      channelClicks[channel] = (channelClicks[channel] ?? 0) + 1;
    } else if (evType === 'search_no_results') {
      const filtersKey = JSON.stringify(props.filters ?? {});
      const cur = noResultsByFilter[filtersKey] ?? { count: 0, sample: (props.filters as Record<string, unknown>) ?? {} };
      cur.count++;
      noResultsByFilter[filtersKey] = cur;
    }
  }

  const topListings: Counter[] = Object.entries(listingViews)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topBuildings: Counter[] = Object.entries(buildingViews)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topNoResults = Object.entries(noResultsByFilter)
    .map(([k, v]) => ({ filtersKey: k, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topVisitors = Object.entries(visitorActivity)
    .map(([anonId, v]) => ({ anonId, ...v }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 30);

  // Pull phone for identified visitors so the row shows "+992 ... · 5 ивентов"
  // not "abc123 · 5 events".
  const userIds = topVisitors.map((v) => v.userId).filter(Boolean) as string[];
  const userPhones = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: u } = await supabase
      .from('users')
      .select('id, phone, tg_username')
      .in('id', [...new Set(userIds)]);
    for (const row of u ?? []) {
      userPhones.set(row.id as string, (row.phone as string) ?? '—');
    }
  }

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-2 py-5">
          <h1 className="text-h1 font-semibold text-stone-900">Аналитика</h1>
          <p className="text-meta text-stone-500">
            Последние {WINDOW_DAYS} дней. Только для команды платформы.
          </p>
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Stat label="Уникальных посетителей" value={distinctAnon.size} />
            <Stat label="Из них вошли через Telegram" value={distinctIdentified.size} />
            <Stat label="Всего событий" value={events.length} />
          </div>

          {topNoResults.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-h2 font-semibold text-stone-900">
                      Поиски без результатов
                    </h2>
                    <p className="text-meta text-stone-500">
                      Что покупатели ищут, но не находят. Лучший сигнал какие
                      объявления добавлять.
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {topNoResults.map((r) => (
                      <li
                        key={r.filtersKey}
                        className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                      >
                        <span className="text-meta text-stone-700">
                          {summariseFilters(r.sample)}
                        </span>
                        <AppBadge variant="tier-2">{r.count}×</AppBadge>
                      </li>
                    ))}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AnalyticsList
              title="Топ просмотров квартир"
              empty="Пока нет просмотров."
              rows={topListings}
              hrefPrefix="/kvartira/"
            />
            <AnalyticsList
              title="Топ просмотров ЖК"
              empty="Пока нет просмотров."
              rows={topBuildings}
              hrefPrefix="/zhk/"
            />
          </div>

          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <h2 className="text-h2 font-semibold text-stone-900">
                  Контакт-клики
                </h2>
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

          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-h2 font-semibold text-stone-900">
                    Посетители
                  </h2>
                  <p className="text-meta text-stone-500">
                    Самые активные — нажмите, чтобы посмотреть детали.
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-1">
          <span className="text-caption text-stone-500">{label}</span>
          <span className="text-h1 font-semibold tabular-nums text-stone-900">{value}</span>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function AnalyticsList({
  title,
  empty,
  rows,
  hrefPrefix,
}: {
  title: string;
  empty: string;
  rows: Counter[];
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

function summariseFilters(filters: Record<string, unknown>): string {
  const parts = Object.entries(filters)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : String(v)}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function channelLabel(channel: string): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'telegram') return 'Telegram';
  if (channel === 'phone') return 'Звонок';
  return channel;
}
