import { AppContainer } from '@/components/primitives';

/**
 * Skeleton for /kvartiry list. Hits during nav from home → Все
 * квартиры or any filter chip change. Card-grid skeleton matches
 * the lg:grid-cols-3 layout so the swap is seamless.
 */
export default function KvartiryLoading() {
  return (
    <>
      {/* Page-header skeleton (h1 + search) — desktop only, matches
          page.tsx where this section is `hidden md:block` when
          unscoped. Same reasoning as /novostroyki loading. */}
      <section className="hidden border-b border-stone-200 bg-white md:block">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="flex flex-col gap-1">
            <div className="h-7 w-40 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-md bg-stone-200" />
        </AppContainer>
      </section>

      {/* Chip-row skeleton — visible on all viewports. */}
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
        <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
      </div>
    </div>
  );
}
