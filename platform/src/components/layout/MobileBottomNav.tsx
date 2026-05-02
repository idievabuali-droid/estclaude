'use client';

import { Suspense } from 'react';
import { Home, Bookmark, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Bottom nav simplified to a single Home entry point. The home page
 * funnels users into the four directions (Новостройки / Квартиры /
 * Из-за рубежа / Помощь в выборе) so we don't pre-pick for them on
 * a small bar where everything competes for the same tap target.
 */
const ITEMS = [
  { href: '/', Icon: Home, label: 'Главная' },
  { href: '/izbrannoe', Icon: Bookmark, label: 'Избранное' },
  { href: '/kabinet', Icon: User, label: 'Кабинет' },
] as const;

/**
 * Outer wrapper — splits search-param reading into a Suspense child so
 * static prerendering doesn't bail out. Next.js requires
 * `useSearchParams()` consumers to live inside a Suspense boundary
 * during static export; pages like /post/phone are statically built
 * but include this nav globally via the locale layout.
 */
export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner />
    </Suspense>
  );
}

function MobileBottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hide on flow pages where the sticky bottom is reserved for actions
  const isFlow = pathname.startsWith('/post') || pathname.startsWith('/verifikatsiya');
  if (isFlow) return null;

  // Hide on the focus-mode map view (/novostroyki?view=karta&focus=...).
  // The buyer arrived from a specific building's page wanting to study
  // its surroundings; a global nav row at the bottom would pull them
  // away from that focus AND compete with the POI category chip bar
  // that lives in the same screen real estate. The "← Назад в <ЖК>"
  // link in the page header is the explicit way out.
  const isFocusMap =
    pathname.startsWith('/novostroyki') &&
    searchParams.get('view') === 'karta' &&
    searchParams.get('focus') != null;
  if (isFocusMap) return null;

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white md:hidden"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map(({ href, Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-caption font-medium',
                  active ? 'text-terracotta-600' : 'text-stone-500',
                )}
              >
                <Icon className={cn('size-5', active ? 'text-terracotta-600' : 'text-stone-500')} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
