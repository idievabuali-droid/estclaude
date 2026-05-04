import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Bell } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppCard, AppCardContent, AppButton } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { displayNameFromFilters } from '@/lib/saved-searches/format';
import { SavedSearchActions } from './SavedSearchActions';

interface SavedSearchRow {
  id: string;
  page: 'novostroyki' | 'kvartiry';
  filters: Record<string, string | string[] | undefined>;
  display_name: string;
  notify_chat_id: number | null;
  notify_phone: string | null;
  active: boolean;
  created_at: string;
}

/**
 * /kabinet/saved-searches — visitor's saved searches list.
 *
 * Login-required (other-people's-saved-searches isn't a thing). Each
 * row shows: name, channel (Telegram chat id present, or phone), the
 * underlying filter URL link to re-run the search, and toggle/delete.
 *
 * Anonymous saves are bound to the cookie's anon_id only — they
 * appear here once the visitor logs in (the auth-poll stitch
 * UPDATE-s their user_id).
 */
export default async function SavedSearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/voyti?redirect=${encodeURIComponent('/kabinet/saved-searches')}`);
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('saved_searches')
    .select('id, page, filters, display_name, notify_chat_id, notify_phone, active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as SavedSearchRow[];

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-2 py-5">
          <h1 className="text-h1 font-semibold text-stone-900">Сохранённые поиски</h1>
          <p className="text-meta text-stone-500">
            Уведомления приходят, как только появляется подходящая квартира.
          </p>
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-6">
        <AppContainer className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Bell className="size-8 text-stone-400" aria-hidden />
                  <h3 className="text-h3 font-semibold text-stone-900">
                    У вас ещё нет сохранённых поисков
                  </h3>
                  <p className="text-meta text-stone-500">
                    Откройте каталог, выберите фильтры и нажмите «Подписаться» —
                    мы напишем сразу, как появится подходящая квартира.
                  </p>
                  <Link href="/novostroyki">
                    <AppButton variant="primary">К каталогу ЖК</AppButton>
                  </Link>
                </div>
              </AppCardContent>
            </AppCard>
          ) : (
            rows.map((s) => {
              const path = s.page === 'novostroyki' ? '/novostroyki' : '/kvartiry';
              const qs = new URLSearchParams();
              for (const [k, v] of Object.entries(s.filters)) {
                if (v == null) continue;
                if (Array.isArray(v)) qs.set(k, v.join(','));
                else qs.set(k, String(v));
              }
              const replayHref = qs.toString() ? `${path}?${qs.toString()}` : path;
              const channelLabel = s.notify_chat_id
                ? 'Telegram'
                : s.notify_phone
                  ? `WhatsApp ${s.notify_phone}`
                  : 'Не подписано';
              const niceName = s.display_name || displayNameFromFilters(s.page, s.filters);
              return (
                <AppCard key={s.id}>
                  <AppCardContent>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-h3 font-semibold text-stone-900">{niceName}</h3>
                        <p className="text-caption text-stone-500">
                          {s.page === 'novostroyki' ? 'ЖК' : 'Квартиры'} · {channelLabel}
                          {!s.active ? ' · уведомления выключены' : ''}
                        </p>
                        <Link
                          href={replayHref}
                          className="w-fit text-meta font-medium text-terracotta-700 hover:text-terracotta-800"
                        >
                          Открыть поиск →
                        </Link>
                      </div>
                      <SavedSearchActions id={s.id} active={s.active} />
                    </div>
                  </AppCardContent>
                </AppCard>
              );
            })
          )}
        </AppContainer>
      </section>
    </>
  );
}
