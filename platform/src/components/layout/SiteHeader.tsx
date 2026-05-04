import { getTranslations } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Global header. Server component so it can read the auth state and
 * branch the right side of the nav: anonymous → "Войти"; logged-in →
 * "Кабинет". Without this, every authenticated user sees a "Войти"
 * link (broken UX — seen by the founder in the analytics walkthrough).
 *
 * The mobile-only Search icon-button used to live here as a stub with
 * no onClick. Removed — V1 doesn't have site-wide search; the filter
 * pages cover it. Re-add as a real command palette when buyer behaviour
 * shows the need.
 */
export async function SiteHeader() {
  const t = await getTranslations('Nav');
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
      <AppContainer className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-terracotta-600">
          <span className="text-h3">ЖК.tj</span>
        </Link>

        <nav className="hidden items-center gap-5 text-meta font-medium text-stone-700 md:flex">
          <Link href="/novostroyki" className="hover:text-terracotta-600">
            {t('buildings')}
          </Link>
          <Link href="/kvartiry" className="hover:text-terracotta-600">
            {t('apartments')}
          </Link>
          <Link href="/izbrannoe" className="hover:text-terracotta-600">
            {t('saved')}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/post"
            className="hidden h-9 items-center rounded-md border border-stone-300 bg-white px-4 text-meta font-semibold text-stone-900 hover:bg-stone-100 md:inline-flex"
          >
            {t('post')}
          </Link>
          {user ? (
            <Link
              href="/kabinet"
              className="inline-flex h-9 items-center rounded-md bg-terracotta-600 px-4 text-meta font-semibold text-white hover:bg-terracotta-700"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/voyti"
              className="inline-flex h-9 items-center rounded-md bg-terracotta-600 px-4 text-meta font-semibold text-white hover:bg-terracotta-700"
            >
              {t('login')}
            </Link>
          )}
        </div>
      </AppContainer>
    </header>
  );
}
