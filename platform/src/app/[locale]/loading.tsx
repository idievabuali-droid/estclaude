import { AppContainer } from '@/components/primitives';

/**
 * Locale-root loading skeleton — applies to / (home) and any nested
 * route that doesn't have a more specific loading.tsx. Without this,
 * tapping "Главная" from a detail page froze the previous page for
 * 2-3s while the home re-rendered (sequential awaits: featured
 * buildings, recent listings, district benchmarks).
 *
 * Skeleton mirrors the home page's shape (hero search + USP strip
 * + featured project cards) so the swap is seamless.
 */
export default function LocaleRootLoading() {
  return (
    <>
      <section className="border-b border-stone-200 bg-stone-50 py-6 md:py-8">
        <AppContainer className="flex flex-col gap-5">
          {/* H1 */}
          <div className="flex flex-col gap-2">
            <div className="h-7 w-3/4 animate-pulse rounded bg-stone-200" />
            <div className="h-7 w-1/2 animate-pulse rounded bg-stone-200" />
          </div>
          {/* Search */}
          <div className="h-14 w-full max-w-2xl animate-pulse rounded-md bg-stone-200" />
          {/* USP strip — 3 items */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-md border border-stone-200 bg-white"
              />
            ))}
          </div>
        </AppContainer>
      </section>

      <section className="py-7">
        <AppContainer className="flex flex-col gap-5">
          <div className="h-6 w-48 animate-pulse rounded bg-stone-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-md border border-stone-200 bg-white"
              >
                <div className="aspect-[4/3] animate-pulse bg-stone-200" />
                <div className="flex flex-col gap-2 p-4">
                  <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
                  <div className="h-6 w-28 animate-pulse rounded bg-stone-200" />
                </div>
              </div>
            ))}
          </div>
        </AppContainer>
      </section>
    </>
  );
}
