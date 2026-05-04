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

/**
 * /kabinet/analytics/[anonId] — single visitor drill-down.
 *
 * Shows everything we know about one anonymous browser session:
 *  - identity row (phone + Telegram if they later signed in)
 *  - chronological event feed
 *  - their saved searches (with subscribe state)
 *  - their callback / contact requests
 *
 * Founder-only.
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

  const supabase = createAdminClient();

  const [eventsRes, searchesRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, event_type, properties, url, occurred_at, user_id')
      .eq('anon_id', anonId)
      .order('occurred_at', { ascending: false })
      .limit(200),
    supabase
      .from('saved_searches')
      .select('id, page, display_name, filters, notify_chat_id, notify_phone, active, created_at')
      .eq('anon_id', anonId)
      .order('created_at', { ascending: false }),
  ]);
  const events = eventsRes.data ?? [];
  const searches = searchesRes.data ?? [];

  // If we found events with a user_id (post-stitch), pull the user row
  // so we can show identity + check for callback requests they made.
  const userId = events.find((e) => e.user_id)?.user_id as string | undefined;
  let identity: { phone: string; tg_username: string | null } | null = null;
  let callbackRequests: { id: string; listing_id: string; created_at: string; channel: string; status: string }[] = [];
  if (userId) {
    const [{ data: u }, { data: cr }] = await Promise.all([
      supabase.from('users').select('phone, tg_username').eq('id', userId).maybeSingle(),
      supabase
        .from('contact_requests')
        .select('id, listing_id, created_at, channel, status')
        .eq('buyer_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (u) identity = { phone: u.phone as string, tg_username: (u.tg_username as string | null) ?? null };
    callbackRequests = (cr ?? []) as typeof callbackRequests;
  }

  // Aggregate top filters / paths this visitor used.
  const pathCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.event_type === 'page_view') {
      const path = ((e.properties ?? {}) as { pathname?: string }).pathname ?? '';
      pathCounts[path] = (pathCounts[path] ?? 0) + 1;
    }
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

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
          <h1 className="text-h1 font-semibold text-stone-900">
            {identity ? identity.phone : `anon ${anonId.slice(0, 8)}`}
          </h1>
          <p className="text-meta text-stone-500">
            {identity?.tg_username ? `@${identity.tg_username} · ` : ''}
            anon_id: <code className="text-caption">{anonId}</code>
          </p>
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-5">
          {topPaths.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Что смотрели</h2>
                  <ul className="flex flex-col gap-2">
                    {topPaths.map(([path, count]) => (
                      <li key={path} className="flex items-center justify-between gap-3">
                        <span className="truncate text-meta text-stone-700">{path}</span>
                        <AppBadge variant="neutral">{count}×</AppBadge>
                      </li>
                    ))}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          {searches.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Сохранённые поиски</h2>
                  <ul className="flex flex-col gap-2">
                    {searches.map((s) => (
                      <li key={s.id} className="flex items-start justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-meta font-medium text-stone-900">{s.display_name}</span>
                          <span className="text-caption text-stone-500">
                            {s.notify_chat_id ? 'Telegram' : s.notify_phone ? `WhatsApp ${s.notify_phone}` : 'не подписано'}
                            {!s.active ? ' · выключено' : ''}
                          </span>
                        </div>
                        <span className="text-caption tabular-nums text-stone-500">
                          {new Date(s.created_at as string).toLocaleDateString('ru-RU')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          {callbackRequests.length > 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col gap-3">
                  <h2 className="text-h2 font-semibold text-stone-900">Запросы обратной связи</h2>
                  <ul className="flex flex-col gap-2">
                    {callbackRequests.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0">
                        <span className="text-meta text-stone-700">
                          {r.channel} · {r.status}
                        </span>
                        <span className="text-caption tabular-nums text-stone-500">
                          {new Date(r.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AppCardContent>
            </AppCard>
          ) : null}

          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3">
                <h2 className="text-h2 font-semibold text-stone-900">Лента событий</h2>
                <ul className="flex flex-col gap-2">
                  {events.length === 0 ? (
                    <li className="text-meta text-stone-500">Событий не найдено.</li>
                  ) : (
                    events.map((e) => (
                      <li key={e.id} className="flex flex-col gap-0.5 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-meta font-medium text-stone-900">
                            {e.event_type}
                          </span>
                          <span className="text-caption tabular-nums text-stone-500">
                            {new Date(e.occurred_at as string).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <code className="truncate text-caption text-stone-500">
                          {summariseProps(e.properties as Record<string, unknown>)}
                        </code>
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

function summariseProps(p: Record<string, unknown>): string {
  if (!p || Object.keys(p).length === 0) return '';
  return JSON.stringify(p);
}
