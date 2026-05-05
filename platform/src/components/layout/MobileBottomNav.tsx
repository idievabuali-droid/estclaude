'use client';

import { Suspense, useEffect, useState } from 'react';
import { Home, Bookmark, User, GitCompare, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { useCompareStore } from '@/lib/compare-store';
import { FEATURES } from '@/lib/feature-flags';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  Icon: typeof Home;
  label: string;
  /** When set, renders a small badge with this number on the icon. */
  badge?: number;
}

/**
 * Mobile bottom navigation.
 *
 * Three permanent items (Главная / Избранное / Кабинет or Войти) — and
 * a fourth dynamic "Сравнение (N)" item that appears only when the
 * buyer has 1+ items in their compare set.
 *
 * The third slot is auth-aware: anonymous visitors see "Войти" (LogIn
 * icon) so tapping it doesn't land them on /kabinet → bounce to /voyti
 * three-step dead end. Logged-in users see "Кабинет".
 *
 * `isAuthenticated` is passed as a prop from the layout (server-side
 * `getCurrentUser()` result) — keeping this a client component so we
 * can still read the compare store + pathname.
 */
export function MobileBottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <Suspense fallback={null}>
      <MobileBottomNavInner isAuthenticated={isAuthenticated} />
    </Suspense>
  );
}

function MobileBottomNavInner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const { type: compareType, ids: compareIds } = useCompareStore();
  // Tracks which tab the buyer just tapped. Drives instant visual
  // feedback (active style + pulsing dot) while the destination
  // server-renders. Without this the tap had zero feedback for the
  // 1-3 seconds the new page took to render — buyer thought their
  // tap didn't register and tapped again. The "pending" check below
  // is `tappedHref !== pathname`, so once navigation completes
  // (pathname matches), the dot just naturally stops rendering — no
  // need for an effect that sets state in response to pathname.
  const [tappedHref, setTappedHref] = useState<string | null>(null);

  // Compare store is sessionStorage-backed with skipHydration: true,
  // so we manually rehydrate to avoid mismatches between server-render
  // (no storage) and client-render.
  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  const baseItems: NavItem[] = [
    { href: '/', Icon: Home, label: 'Главная' },
    { href: '/izbrannoe', Icon: Bookmark, label: 'Избранное' },
    isAuthenticated
      ? { href: '/kabinet', Icon: User, label: 'Кабинет' }
      : { href: '/voyti', Icon: LogIn, label: 'Войти' },
  ];

  // Hide on flow pages where the sticky bottom is reserved for actions
  const isFlow = pathname.startsWith('/post') || pathname.startsWith('/verifikatsiya');
  if (isFlow) return null;

  // Hide on the focus-mode map view.
  const isFocusMap =
    pathname.startsWith('/novostroyki') &&
    searchParams.get('view') === 'karta' &&
    searchParams.get('focus') != null;
  if (isFocusMap) return null;

  // Compare gating: when the feature is OFF, never insert the dynamic
  // 'Сравнение (N)' slot — keeps the nav at 3 permanent items. The
  // store rehydrate still runs (hooks must be called unconditionally)
  // but its result is ignored.
  const compareCount = hydrated ? compareIds.length : 0;
  const compareHref = compareType
    ? `/sravnenie?type=${compareType}&ids=${compareIds.join(',')}`
    : '/sravnenie';

  const items: NavItem[] =
    FEATURES.compare && compareCount > 0
      ? [
          baseItems[0]!,
          baseItems[1]!,
          { href: compareHref, Icon: GitCompare, label: 'Сравнение', badge: compareCount },
          baseItems[2]!,
        ]
      : baseItems;

  // Tailwind needs the class to be statically known; pre-compute the
  // grid-cols class explicitly rather than building it from a number.
  const gridClass = items.length === 4 ? 'grid grid-cols-4' : 'grid grid-cols-3';

  return (
    <nav
      aria-label="Основное меню"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white md:hidden"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
    >
      <ul className={gridClass}>
        {items.map(({ href, Icon, label, badge }) => {
          const baseHref = href.split('?')[0];
          const isCurrent =
            href === '/'
              ? pathname === '/'
              : pathname === baseHref || pathname.startsWith(baseHref + '/');
          const isPending = tappedHref === href && !isCurrent;
          // Treat pending the same as active visually so the tapped
          // tab shifts colour the instant the buyer touches it. The
          // pulsing dot below the icon makes the "loading" intent
          // explicit so they don't think the page silently swapped.
          const active = isCurrent || isPending;
          return (
            <li key={label}>
              <Link
                href={href}
                onClick={() => {
                  if (!isCurrent) setTappedHref(href);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-caption font-medium transition-colors',
                  active ? 'text-terracotta-600' : 'text-stone-500',
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      'size-5 transition-colors',
                      active ? 'text-terracotta-600' : 'text-stone-500',
                    )}
                  />
                  {badge != null && badge > 0 ? (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta-600 px-1 text-[10px] font-semibold text-white tabular-nums"
                    >
                      {badge}
                    </span>
                  ) : null}
                  {/* Pending dot — shows only on the tapped tab while
                      its destination renders. Cleared automatically
                      when pathname matches. */}
                  {isPending ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 animate-pulse rounded-full bg-terracotta-600"
                    />
                  ) : null}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
