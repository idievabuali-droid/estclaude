import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { TelegramLogin } from './TelegramLogin';
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
      <AppContainer className="lg:max-w-md">
        <TelegramLogin redirect={target} />
      </AppContainer>
    </section>
  );
}
