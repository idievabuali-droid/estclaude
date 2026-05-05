import { AppContainer } from '@/components/primitives';

/**
 * Skeleton for /kvartira/[slug]. App Router renders this instantly
 * when the buyer taps a card → the new detail page server-renders
 * in the background. Without it the buyer's tap appears to do
 * nothing for 1-3 seconds (Tajik mobile networks + sequential
 * awaits including Overpass POI), which user-tested as "did my
 * tap register?". Skeleton matches the real page's shape — hero +
 * breadcrumb + price block + spec grid — so the layout doesn't
 * jump on swap.
 */
export default function ListingDetailLoading() {
  return (
    <>
      {/* Hero placeholder — same 16:9 / 21:9 aspect ratio as the
          real cover photo so the page doesn't shift when the real
          image loads. */}
      <div className="relative aspect-[16/9] w-full animate-pulse bg-stone-200 md:aspect-[21/9]" />

      {/* Breadcrumb strip */}
      <nav className="border-b border-stone-200 bg-stone-50">
        <AppContainer>
          <div className="flex items-center gap-2 py-2">
            <div className="h-3 w-16 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-3 animate-pulse rounded bg-stone-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-stone-200" />
          </div>
        </AppContainer>
      </nav>

      {/* Title + price + actions */}
      <section className="border-b border-stone-200 bg-white py-5">
        <AppContainer className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-44 animate-pulse rounded bg-stone-200" />
            <div className="h-7 w-32 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-9 w-48 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 animate-pulse rounded bg-stone-200" />
            <div className="h-10 w-24 animate-pulse rounded bg-stone-200" />
            <div className="h-10 w-24 animate-pulse rounded bg-stone-200" />
          </div>
        </AppContainer>
      </section>

      {/* Spec grid */}
      <section className="bg-stone-50 py-5">
        <AppContainer>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-md border border-stone-200 bg-white"
              />
            ))}
          </div>
        </AppContainer>
      </section>
    </>
  );
}
