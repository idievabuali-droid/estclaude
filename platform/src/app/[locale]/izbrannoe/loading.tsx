import { AppContainer } from '@/components/primitives';

/**
 * Tap "Избранное" in the bottom nav — this skeleton renders
 * instantly while the saved items + benchmarks + currency rates
 * load. Without it the previous page (often /kvartira detail with
 * Overpass POIs) stayed visible for a few seconds and the buyer
 * thought their tap didn't register.
 */
export default function IzbrannoeLoading() {
  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-4 py-5">
          <div className="h-7 w-32 animate-pulse rounded bg-stone-200" />
          {/* Tab switcher */}
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded bg-stone-200" />
            <div className="h-9 w-32 animate-pulse rounded bg-stone-200" />
          </div>
        </AppContainer>
      </section>

      <section className="py-6">
        <AppContainer>
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
                </div>
              </div>
            ))}
          </div>
        </AppContainer>
      </section>
    </>
  );
}
