import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BrowserCompatBanner, CompareBar, FeedbackButton, PageView, RetrySaveOnReturn } from '@/components/blocks';
import { AppToaster } from '@/components/primitives';
import { getCurrentUser } from '@/lib/auth/session';
import { Suspense } from 'react';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  // Auth state is read once per request and threaded down to the
  // header + mobile bottom nav so they can render the right-side CTAs
  // (Кабинет vs Войти) for the actual visitor. Without this both
  // surfaces always show "Войти" — confusing for logged-in users.
  const user = await getCurrentUser();
  const isAuthenticated = !!user;

  // Microsoft Clarity — session replay + heatmaps + rage-click
  // detection. Only injected when the project ID env var is set, so
  // local development without an account stays clean.
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <NextIntlClientProvider locale={locale}>
      <div className="flex min-h-dvh flex-col">
        {/* Old-browser nudge — renders only when oklch() isn't supported
            (Chrome < 111 / Safari < 15.4 / Firefox < 113). For the 95%
            on modern browsers this client island renders nothing and
            costs nothing visible. Paired with the @supports fallback
            in globals.css so the page is still usable before they
            update. */}
        <BrowserCompatBanner />
        <SiteHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <SiteFooter />
      </div>
      <MobileBottomNav isAuthenticated={isAuthenticated} />
      <CompareBar />
      <AppToaster />
      {/* Feedback widget — global floating button. Skips itself on
          operator surfaces (/kabinet, /post, /post/edit) and on the
          wizard via its own pathname check. Posts a feedback_submitted
          event into the existing events table; friction-alerts pipes
          a Telegram DM to the founder in real time. */}
      <FeedbackButton />
      {/* PageView fires `page_view` analytics events on every route
          change. Wrapped in Suspense because useSearchParams() needs
          a suspense boundary in the App Router for static rendering
          to keep working. */}
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
      {/* RetrySaveOnReturn — fires the pending /api/saved/toggle call
          if SaveToggle stashed an intent before bouncing the user to
          /voyti for re-login. Mounted layout-level so it runs once per
          page load regardless of which surface the user lands on. */}
      <RetrySaveOnReturn />
      {/* Microsoft Clarity — fills the genuine analytics gap that the
          first-party `events` table can't: session replay, click +
          scroll heatmaps, rage-click / dead-click / quick-back
          detection. Free forever, unlimited. Mounted afterInteractive
          so it doesn't block first paint. Loaded only when the
          project ID is configured. */}
      {clarityProjectId ? (
        <Script
          id="ms-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
            `,
          }}
        />
      ) : null}
    </NextIntlClientProvider>
  );
}
