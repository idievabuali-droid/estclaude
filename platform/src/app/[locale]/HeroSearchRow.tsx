'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { LocationSearch } from '@/components/blocks';
import { parseQuery, hasStructuralFilter, type ParsedQuery } from '@/lib/search/parse-query';

/**
 * Client wrapper around the home hero search row — owns the query
 * state so the "Найти" button can read it AND so the smart-routing
 * parser can run on submit.
 *
 * The home page itself is a server component (renders featured ЖК +
 * trust blocks + CTAs). This row is a small client island; it doesn't
 * pull the rest of the page out of RSC rendering.
 *
 * Routing rules on submit (Найти button OR Enter on closed dropdown):
 *
 *   1. Run the parametric parser on the typed text.
 *   2. If it found rooms / price / finishing → route to /kvartiry with
 *      those filters as URL params + `q=` for the remainder. Buyers
 *      typing "3 комнаты до 200к" land on the apartments list with
 *      the structural filters pre-applied.
 *   3. Otherwise (pure free-text / location word like "Гулистон") →
 *      route to /novostroyki with `q=` as a soft text filter. The
 *      apartments list also accepts `q=`, but at this stage of the
 *      decision tree the buyer's likely shopping projects.
 *
 * Picking from the autocomplete dropdown bypasses this — that path is
 * handled inside LocationSearch (district → ?district=, ЖК → /zhk/<slug>,
 * etc). This component only owns the typed-and-pressed-Найти path.
 */
export function HeroSearchRow() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(text: string, parsed: ParsedQuery) {
    const trimmed = text.trim();
    if (!trimmed) {
      // Empty input + click Найти: just go to /novostroyki (browse all
      // projects). Matches the prior "always go to /novostroyki" behaviour.
      router.push('/novostroyki');
      return;
    }
    // Param names match what the destination pages already accept —
    // /kvartiry's SearchParams uses `rooms`, `price_from`, `price_to`,
    // `finishing`. We add `q` (new — soft text filter) on top. Avoids
    // forcing the kvartiry/novostroyki pages to learn alternative
    // param names from the parser.
    const params = new URLSearchParams();
    if (parsed.rooms) params.set('rooms', String(parsed.rooms));
    if (parsed.priceMaxTjs) params.set('price_to', String(parsed.priceMaxTjs));
    if (parsed.priceMinTjs) params.set('price_from', String(parsed.priceMinTjs));
    if (parsed.finishing) params.set('finishing', parsed.finishing);
    const remainder = parsed.remainder.trim();
    if (remainder) params.set('q', remainder);

    const dest = hasStructuralFilter(parsed) ? '/kvartiry' : '/novostroyki';
    router.push(`${dest}?${params.toString()}`);
  }

  function handleSubmit() {
    submit(query, parseQuery(query));
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2 md:flex-row md:items-stretch">
      <div className="flex-1">
        <LocationSearch
          destinationPath="/novostroyki"
          variant="hero"
          scope="all"
          value={query}
          onChange={setQuery}
          onSubmit={submit}
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-stone-900 px-6 text-meta font-semibold text-white transition-colors hover:bg-stone-800 active:bg-stone-700"
      >
        Найти
      </button>
    </div>
  );
}
