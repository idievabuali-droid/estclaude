import { AppContainer } from '@/components/primitives';

/**
 * Skeleton for /novostroyki list (browse mode). Map mode swaps in
 * its own loading state via the MapView client component, so this
 * focuses on the list view that's hit from "Все новостройки" /
 * any filter change.
 */
export default function NovostroykiLoading() {
  return (
    <>
      {/* Page-header skeleton (h1 + search) — desktop only, matches
          page.tsx where this section is `hidden md:block` when
          unscoped. Loading.tsx can't know whether the upcoming render
          will be scoped, so the unscoped/mobile-default state is the
          safe skeleton: shorter on mobile, full on desktop. */}
      <section className="hidden border-b border-stone-200 bg-white md:block">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="h-7 w-40 animate-pulse rounded bg-stone-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="h-9 w-24 animate-pulse rounded-md bg-stone-200" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-md bg-stone-200" />
        </AppContainer>
      </section>

      {/* Chip-row skeleton — visible on all viewports, matches the
          real sticky chip bar so the first paint to first interactive
          paint doesn't reflow. */}
      <section className="border-b border-stone-200 bg-white">
        <AppContainer>
          <div className="flex gap-2 overflow-hidden py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 shrink-0 animate-pulse rounded-md bg-stone-200"
              />
            ))}
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </AppContainer>
      </section>
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-stone-200" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
        <div className="h-6 w-28 animate-pulse rounded bg-stone-200" />
      </div>
    </div>
  );
}
