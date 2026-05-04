import { Bell, BookmarkPlus, Construction } from 'lucide-react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { TelegramLogin } from './TelegramLogin';
import { WhatsAppCallback } from './WhatsAppCallback';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * /voyti — login page.
 *
 * Replaced the previous mocked phone+OTP form with a real Telegram
 * QR/deep-link flow. The handshake works as:
 *
 *   1. Frontend calls /api/auth/start → server creates pending
 *      auth_session with a random 32-byte token.
 *   2. Page shows a QR (desktop) or a "Открыть в Telegram" button
 *      (mobile) that targets t.me/<bot>?start=<token>.
 *   3. User opens the bot, taps Share Contact. The bot's webhook
 *      links phone+tg_id to the session.
 *   4. Frontend has been polling /api/auth/poll; once status flips
 *      to 'completed', server sets the session cookie and we redirect.
 *
 * If the user is already logged in, skip the page entirely and send
 * them to their intended destination — no point showing a login UI
 * to someone who's already in.
 */
export default async function VoytiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const target = sp.redirect ?? '/';

  const user = await getCurrentUser();
  if (user) {
    redirect(target);
  }

  return (
    <section className="bg-stone-50 py-7 md:py-8">
      <AppContainer className="flex max-w-md flex-col gap-5">
        {/* What login unlocks — Madina audit caught that the page just
            said "Войти" with no benefits. Three concrete reasons up
            front, before either method is shown. */}
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-meta font-semibold text-stone-900">
            Что вы получите
          </h2>
          <ul className="flex flex-col gap-2 text-meta text-stone-700">
            <li className="flex items-start gap-2">
              <BookmarkPlus className="mt-0.5 size-4 shrink-0 text-terracotta-600" aria-hidden />
              Сохраняйте квартиры и ЖК в одном месте на всех устройствах
            </li>
            <li className="flex items-start gap-2">
              <Bell className="mt-0.5 size-4 shrink-0 text-terracotta-600" aria-hidden />
              Уведомления, когда у сохранённых меняется цена или появляются
              новые квартиры
            </li>
            <li className="flex items-start gap-2">
              <Construction className="mt-0.5 size-4 shrink-0 text-terracotta-600" aria-hidden />
              Подписка на ход стройки — приходят свежие фото с площадки
            </li>
          </ul>
        </div>

        <TelegramLogin redirect={target} />

        <div className="flex items-center gap-3 text-caption uppercase tracking-wide text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          или
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <WhatsAppCallback source="/voyti" />
      </AppContainer>
    </section>
  );
}
