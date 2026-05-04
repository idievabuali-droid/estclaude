import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { CompareBar, PageView } from '@/components/blocks';
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

  return (
    <NextIntlClientProvider locale={locale}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <SiteFooter />
      </div>
      <MobileBottomNav isAuthenticated={isAuthenticated} />
      <CompareBar />
      <AppToaster />
      {/* PageView fires `page_view` analytics events on every route
          change. Wrapped in Suspense because useSearchParams() needs
          a suspense boundary in the App Router for static rendering
          to keep working. */}
      <Suspense fallback={null}>
        <PageView />
      </Suspense>
    </NextIntlClientProvider>
  );
}
