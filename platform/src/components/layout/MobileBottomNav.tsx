'use client';

import { Suspense, useEffect, useState } from 'react';
import { Home, Bookmark, User, GitCompare } from 'lucide-react';
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

const BASE_ITEMS: NavItem[] = [
  { href: '/', Icon: Home, label: 'Главная' },
  { href: '/izbrannoe', Icon: Bookmark, label: 'Избранное' },
  { href: '/kabinet', Icon: User, label: 'Кабинет' },
];

/**
 * Mobile bottom navigation.
 *
 * Three permanent items (Главная / Избранное / Кабинет) — and a fourth
 * dynamic "Сравнение (N)" item that appears only when the buyer has
 * 1+ items in their compare set.
 *
 * The dynamic slot keeps the nav un-cluttered for the 95% of visits
 * where compare isn't being used, while giving an obvious top-level
 * entry point for the buyers who are mid-comparison. The CompareBar
 * still appears when items are selected — they're complementary
 * surfaces (bar = preview + remove; nav = jump-to-table).
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
  const [hydrated, setHydrated] = useState(false);
  const { type: compareType, ids: compareIds } = useCompareStore();

  // Compare store is sessionStorage-backed with skipHydration: true,
  // so we manually rehydrate to avoid mismatches between server-render
  // (no storage) and client-render.
  useEffect(() => {
    Promise.resolve(useCompareStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

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
          BASE_ITEMS[0]!,
          BASE_ITEMS[1]!,
          { href: compareHref, Icon: GitCompare, label: 'Сравнение', badge: compareCount },
          BASE_ITEMS[2]!,
        ]
      : BASE_ITEMS;

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
          const active =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href.split('?')[0] + '/');
          return (
            <li key={label}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-caption font-medium',
                  active ? 'text-terracotta-600' : 'text-stone-500',
                )}
              >
                <span className="relative inline-flex">
                  <Icon
                    className={cn(
                      'size-5',
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
