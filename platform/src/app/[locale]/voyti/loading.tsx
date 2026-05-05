import { AppContainer } from '@/components/primitives';

/**
 * Tap "Войти" in the bottom nav — without this the previous page
 * froze for a second while /voyti server-rendered. Skeleton matches
 * the page's stacked-card layout (benefits panel, Telegram card,
 * "или" divider, WhatsApp callback card).
 */
export default function VoytiLoading() {
  return (
    <section className="bg-stone-50 py-7 md:py-8">
      <AppContainer className="flex max-w-md flex-col gap-5">
        {/* Benefits panel */}
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="mb-3 h-3 w-32 animate-pulse rounded bg-stone-200" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-stone-200" />
            ))}
          </div>
        </div>
        {/* Telegram card */}
        <div className="rounded-md border border-stone-200 bg-white p-5">
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 animate-pulse rounded-full bg-stone-200" />
            <div className="h-6 w-44 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-56 animate-pulse rounded bg-stone-200" />
            <div className="h-11 w-full animate-pulse rounded-md bg-stone-200" />
          </div>
        </div>
        {/* "или" divider */}
        <div className="h-3 w-full animate-pulse rounded bg-stone-200" />
        {/* WhatsApp card */}
        <div className="h-44 animate-pulse rounded-md border border-stone-200 bg-white" />
      </AppContainer>
    </section>
  );
}
