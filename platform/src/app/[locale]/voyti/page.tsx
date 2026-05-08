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

  // Contextual one-liner above the H1 when we know WHY the user
  // landed here — feedback from the seller-journey roleplay was
  // "I clicked Разместить квартиру, why am I suddenly at a login
  // page?" Setting context up front keeps the redirect from feeling
  // like a generic auth wall. Falls through to no banner for visits
  // that started directly at /voyti (header CTA, footer link, etc).
  const redirectContext: Record<string, string> = {
    '/post': 'Чтобы разместить квартиру, войдите через Telegram.',
    '/kabinet': 'Чтобы открыть кабинет, войдите через Telegram.',
    '/izbrannoe': 'Чтобы посмотреть избранное, войдите через Telegram.',
  };
  // Match by prefix so /kabinet/analytics, /post/edit/123 etc all
  // pick up the right copy.
  const contextLine =
    Object.entries(redirectContext).find(([prefix]) => target.startsWith(prefix))?.[1] ?? null;

  return (
    // Warm canvas (terracotta-50/30 → stone-50) so the page reads as
    // branded rather than generic SaaS-grey, even in its minimal form.
    <section className="flex min-h-[calc(100vh-3.5rem)] items-center bg-gradient-to-b from-terracotta-50/30 via-stone-50 to-stone-50 py-12 md:py-20">
      <AppContainer className="flex max-w-md flex-col gap-6">
        {/* Wordmark in serif — quiet brand presence above the H1.
            Logo at top of a centered card is the established login-page
            grammar (Stripe, Linear, Cal.com all use it). */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className="text-h2 font-semibold text-terracotta-700 tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            ЖК.tj
          </span>
        </div>

        {/* Centered card — max-w-md, white surface on warm canvas,
            generous padding, no shadow (the canvas tint provides the
            visual lift). */}
        <div className="flex flex-col gap-5 rounded-md border border-stone-200 bg-white p-7">
          <div className="flex flex-col items-center gap-2 text-center">
            {contextLine ? (
              <span className="text-meta font-medium text-terracotta-700">
                {contextLine}
              </span>
            ) : null}
            <h1
              className="text-h1 font-semibold leading-[var(--leading-h1)] text-stone-900"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Вход через Telegram
            </h1>
            <p
              className="text-meta italic text-stone-500"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Без SMS — только тап в боте.
            </p>
          </div>

          <TelegramLogin redirect={target} />

          {/* "или" divider — thin grey lines either side, caption-sized
              uppercase between. */}
          <div className="flex items-center gap-3 text-caption uppercase tracking-wide text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            или
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <WhatsAppCallback source="/voyti" />
        </div>

        {/* Tiny privacy disclaimer below the card — sets the tone
            without adding anxiety. */}
        <p className="text-center text-caption text-stone-500">
          Мы не передаём ваш номер третьим лицам.
        </p>
      </AppContainer>
    </section>
  );
}
