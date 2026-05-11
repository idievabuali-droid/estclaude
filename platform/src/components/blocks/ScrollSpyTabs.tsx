'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export interface ScrollSpyTab {
  /** Anchor target id (e.g. "units"). Must match an existing
   *  element id on the page. */
  id: string;
  /** Label shown on the tab. */
  label: string;
  /** Optional override — when set, the tab links to this URL via
   *  next/link instead of an in-page anchor. Used by /zhk's
   *  "Ход стройки" tab which jumps to a different route (/zhk/<slug>/progress)
   *  rather than scrolling to a section. */
  externalHref?: string;
  /** Optional className applied to the link (e.g. amber pill on the
   *  "Ход стройки" external link to mark it as a route change). */
  externalClassName?: string;
  /** Optional icon node rendered before the label. */
  icon?: React.ReactNode;
}

export interface ScrollSpyTabsProps {
  tabs: ScrollSpyTab[];
  /** ARIA label for the nav landmark. */
  ariaLabel?: string;
  /** Tailwind `top-N` offset where this sticky nav anchors. Defaults
   *  to `top-14` (below the 56px SiteHeader). */
  topOffsetClass?: string;
}

/**
 * Sticky horizontal sub-nav with scroll-spy. Tabs become active when
 * their target section enters the upper viewport — both on direct
 * click (anchor jumps, the observer fires once the scroll lands) and
 * during normal scroll (founder critique 2026-05-11: "the shadow
 * doesn't move through stages even when I click").
 *
 * Pattern reference: Cian / Avito / Rightmove all sync a sub-nav's
 * active state with IntersectionObserver on the section anchors. We
 * pick the topmost intersecting section so a section becomes active
 * the moment its top crosses the line just below the sub-nav.
 *
 * rootMargin choice: `-128px 0px -50% 0px` masks the top 128px (the
 * SiteHeader 56px + the sub-nav itself ~52px + a small buffer) and
 * the bottom 50%. The "active zone" is roughly the upper middle of
 * the viewport — when a section's top crosses into this zone, that
 * tab lights up. Empirically this matches how the buyer perceives
 * "what section am I on right now."
 *
 * External-link tabs (route changes, e.g. /zhk/<slug>/progress) are
 * exempt from scroll-spy — they never get active state because they
 * leave the page entirely. Rendered with `externalClassName` for
 * visual differentiation.
 */
export function ScrollSpyTabs({
  tabs,
  ariaLabel = 'Разделы',
  topOffsetClass = 'top-14',
}: ScrollSpyTabsProps) {
  const [activeId, setActiveId] = useState<string | null>(tabs[0]?.id ?? null);

  useEffect(() => {
    const inPageTabs = tabs.filter((t) => !t.externalHref);
    const targets = inPageTabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el != null);
    if (targets.length === 0) return;

    // Track which sections are currently intersecting. The observer
    // fires on each crossing; we re-derive the "active" one from the
    // current intersecting set rather than relying on a single entry.
    const intersecting = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        // Pick the topmost intersecting section (smallest viewport-y).
        // Re-measure live so this stays correct even when sections
        // reflow (e.g. images load + grow the page height).
        let best: { id: string; top: number } | null = null;
        for (const id of intersecting) {
          const el = document.getElementById(id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (best == null || top < best.top) best = { id, top };
        }
        if (best) setActiveId(best.id);
      },
      // Top mask: SiteHeader (56) + sub-nav (~52) + buffer (20) = ~128.
      // Bottom mask: 50% so a section only "wins" once a meaningful
      // chunk is visible — avoids flicker when a section flashes by.
      { rootMargin: '-128px 0px -50% 0px', threshold: 0 },
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [tabs]);

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'sticky z-20 border-b border-stone-200 bg-white/95 backdrop-blur',
        topOffsetClass,
      )}
    >
      <div className="mx-auto w-full max-w-[var(--container-max)] px-4 md:px-5 lg:px-6 relative">
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = activeId === tab.id && !tab.externalHref;
            const base =
              'inline-flex h-9 shrink-0 items-center gap-1 rounded-sm px-3 text-meta font-medium transition-colors';
            // External-route tabs (e.g. "Ход стройки") keep their own
            // visual treatment. In-page tabs flip between active
            // (stone-100 filled) and inactive (stone-700 quiet hover).
            if (tab.externalHref) {
              return (
                <Link
                  key={tab.id}
                  href={tab.externalHref}
                  className={cn(base, tab.externalClassName)}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            }
            return (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  base,
                  isActive
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-700 hover:bg-stone-100',
                )}
              >
                {tab.icon}
                {tab.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
