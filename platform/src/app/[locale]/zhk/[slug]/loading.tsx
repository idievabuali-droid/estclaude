import { AppContainer } from '@/components/primitives';

/**
 * Skeleton for /zhk/[slug]. Same rationale as the /kvartira
 * loading.tsx — Tajik mobile networks + sequential awaits
 * (especially Overpass `getNearbyPOIs` for the Что рядом list)
 * mean tap-to-render can be 1-3s. Skeleton fills that gap.
 */
export default function BuildingDetailLoading() {
  return (
    <>
      <div className="relative aspect-[2/1] w-full animate-pulse bg-stone-200 md:aspect-[21/9]" />

      <section className="border-b border-stone-200 bg-white py-5">
        <AppContainer className="flex flex-col gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-stone-200" />
          <div className="h-7 w-56 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
        </AppContainer>
      </section>

      <section className="bg-stone-50 py-5">
        <AppContainer>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-md border border-stone-200 bg-white"
              />
            ))}
          </div>
        </AppContainer>
      </section>
    </>
  );
}
