'use client';

import { useMemo, useState } from 'react';
import { ListingCard } from './ListingCard';
import type { MockBuilding, MockDeveloper, MockListing } from '@/lib/mock';
import type { ExchangeRates, SupportedCurrency } from '@/services/currency';

export interface RoomTypeFilterProps {
  listings: MockListing[];
  building: MockBuilding;
  developer: MockDeveloper;
  /** District-median per m² for the FairnessIndicator on each card.
   *  Null when there's no benchmark for this district yet. */
  districtMedianPerM2: number | null;
  districtSampleSize: number;
  /** Diaspora currency (cookie-driven). Optional — when set together
   *  with `rates`, each card shows the foreign-currency equivalent.
   *  Both are now /diaspora-only; non-/diaspora callers omit them. */
  currency?: SupportedCurrency | null;
  rates?: ExchangeRates | null;
}

/**
 * §C apartments grid with a Cian-style room-count chip filter on top.
 *
 * Buyers' mental model on a building page is "I need a 2-bedroom" — flat
 * grids force them to scan unrelated room counts. Chips at the top let
 * them slice in one tap, client-side, no page reload.
 *
 * Chip row only renders when the inventory is varied — at least 3 listings
 * AND at least 2 distinct room counts. Single-room-type or tiny-inventory
 * buildings skip the filter UI (one chip would be silly).
 */
export function RoomTypeFilter({
  listings,
  building,
  developer,
  districtMedianPerM2,
  districtSampleSize,
  currency,
  rates,
}: RoomTypeFilterProps) {
  const roomCounts = useMemo(() => {
    const set = new Set<number>();
    for (const l of listings) set.add(l.rooms_count);
    return [...set].sort((a, b) => a - b);
  }, [listings]);

  const showChips = listings.length >= 3 && roomCounts.length >= 2;

  // null = "Все" (no filter); number = filter to that room count.
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(
    () => (selected == null ? listings : listings.filter((l) => l.rooms_count === selected)),
    [listings, selected],
  );

  return (
    <div className="flex flex-col gap-4">
      {showChips ? (
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          <Chip
            label={`Все (${listings.length})`}
            active={selected == null}
            onClick={() => setSelected(null)}
          />
          {roomCounts.map((rc) => {
            const count = listings.filter((l) => l.rooms_count === rc).length;
            return (
              <Chip
                key={rc}
                label={`${rc}-комн (${count})`}
                active={selected === rc}
                onClick={() => setSelected(rc)}
              />
            );
          })}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {filtered.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            building={building}
            developerVerified={developer.is_verified}
            districtMedianPerM2={districtMedianPerM2}
            districtSampleSize={districtSampleSize}
            currency={currency}
            rates={rates}
            hideBuildingName
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-sm px-3 py-1.5 text-meta font-medium tabular-nums transition-colors ${
        active
          ? 'bg-stone-900 text-white'
          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  );
}
