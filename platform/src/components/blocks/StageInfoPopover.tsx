'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_INFO } from '@/lib/building-stages';
import type { BuildingStatus } from '@/types/domain';

export interface StageInfoPopoverProps {
  status: BuildingStatus;
  /** Visual size of the trigger icon. "sm" fits next to a chip label,
   *  "md" works inline with timeline labels. */
  size?: 'sm' | 'md';
  /** When true, click events on the trigger and popover are stopped
   *  from bubbling. Use this when the popover lives inside a parent
   *  that has its own onClick / Link, e.g. on a BuildingCard cover. */
  stopParentClick?: boolean;
  className?: string;
}

const POPOVER_WIDTH = 288;
const VIEWPORT_MARGIN = 12;

// SSR-safe layout effect — avoids the "useLayoutEffect on the server"
// warning while still measuring before paint on the client.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Small "?" trigger that opens a tooltip explaining what a building
 * stage means and roughly how long it takes. Tap outside or × closes.
 *
 * Positioning: the popover is rendered with `position: fixed` and the
 * coordinates are computed from the trigger's bounding rect, then
 * clamped to the viewport so the popover never overflows off-screen.
 * This is what every mature tooltip library does (Radix, Floating UI,
 * Popper) — it's the only approach that handles all trigger positions.
 *
 * Used in two places: on the BuildingCard status chip (so buyers
 * scrolling cards can quickly check what "Котлован" means without
 * leaving the card) and inline with each label in the
 * BuildingStageProgress timeline.
 */
export function StageInfoPopover({
  status,
  size = 'sm',
  stopParentClick,
  className,
}: StageInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const info = STAGE_INFO[status];

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      // The popover is a sibling of the trigger (in a fixed layer), so
      // we check both. The popover element has data-stage-popover.
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const popover = document.querySelector('[data-stage-popover="true"]');
      if (popover?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Compute viewport-clamped coordinates whenever opening, on resize,
  // and on scroll. Clamping ensures the popover never overflows.
  useIsoLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      // Try to centre below the trigger, then clamp to viewport.
      let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
        left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN;
      }
      if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
      const top = rect.bottom + 8;
      setCoords({ top, left });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true); // capture nested scrolls
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const stop = (e: React.MouseEvent) => {
    if (stopParentClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen((o) => !o);
        }}
        aria-label={`Что значит «${info.label}»`}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-stone-500 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2',
          className,
        )}
      >
        <HelpCircle className={iconSize} aria-hidden />
      </button>
      {open && coords ? (
        <div
          data-stage-popover="true"
          role="dialog"
          aria-label={`О стадии «${info.label}»`}
          onClick={stop}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${POPOVER_WIDTH}px`,
            zIndex: 50,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
          }}
          className="rounded-md border border-stone-200 bg-white p-3 text-left shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-meta font-semibold text-stone-900">{info.label}</span>
              {info.durationLabel ? (
                <span className="text-caption tabular-nums text-stone-500">
                  Обычно: {info.durationLabel}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setOpen(false);
              }}
              aria-label="Закрыть"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-meta text-stone-700">{info.description}</p>
        </div>
      ) : null}
    </>
  );
}
