'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { MiniMap, type MiniMapHighlight } from './MiniMap';
import { POI_LABELS, type PoiCategory } from '@/services/poi';

export interface NearbyChipsItem {
  cat: PoiCategory;
  name: string;
  latitude: number;
  longitude: number;
  distanceM: number;
}

export interface NearbyChipsProps {
  /** Anchor pin — usually the building (for /zhk) or the building's
   *  lat/lng (for the apartment's parent building on /kvartira). */
  anchorLat: number;
  anchorLng: number;
  anchorLabel: string;
  /** Compact 4-category preview list. Tapping a chip puts an orange
   *  star on the mini-map at that POI's location. */
  items: NearbyChipsItem[];
  /** Where the "Все рядом" link goes. Drilldown to the full POI list
   *  on /zhk has more categories + can show street-level POIs. */
  allNearbyHref: string;
  /** Map height — defaults to 220px. */
  mapHeight?: number;
}

/**
 * Interactive "Что рядом" block on /kvartira detail.
 *
 * Was: a static row of chips ("Мечети · 720 м") + a separate mini-map
 * showing only the building. Tapping a chip did nothing — buyers
 * couldn't see where the school / mosque / market was on the map.
 *
 * Now: tapping any chip drops an orange star on the mini-map at that
 * POI's lat/lng and re-fits the camera to show building + POI
 * together. Tapping the same chip again clears the highlight.
 *
 * Each chip carries the actual POI name so the buyer reads
 * "Мечети · Намозхона · 720 м" instead of just the category. Helps
 * orient when there are several mosques / schools nearby.
 */
export function NearbyChips({
  anchorLat,
  anchorLng,
  anchorLabel,
  items,
  allNearbyHref,
  mapHeight = 220,
}: NearbyChipsProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const highlight: MiniMapHighlight | null =
    activeIdx != null && items[activeIdx]
      ? {
          latitude: items[activeIdx]!.latitude,
          longitude: items[activeIdx]!.longitude,
          label: items[activeIdx]!.name,
        }
      : null;

  if (items.length === 0) {
    // No POIs in the compact preview — still render the map alone so
    // the spatial-context block isn't blank.
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-stone-900">Что рядом</h3>
        <MiniMap
          latitude={anchorLat}
          longitude={anchorLng}
          label={anchorLabel}
          height={mapHeight}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-h3 font-semibold text-stone-900">Что рядом</h3>
      <MiniMap
        latitude={anchorLat}
        longitude={anchorLng}
        label={anchorLabel}
        height={mapHeight}
        highlight={highlight}
      />
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={`${item.cat}-${i}`}
              type="button"
              onClick={() => setActiveIdx(isActive ? null : i)}
              aria-pressed={isActive}
              className={
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-meta transition-colors ' +
                (isActive
                  ? 'border-orange-300 bg-orange-50 text-orange-800'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-200 hover:bg-orange-50/60')
              }
            >
              <span aria-hidden>{POI_LABELS[item.cat].emoji}</span>
              <span className="font-medium">{POI_LABELS[item.cat].ru}</span>
              <span className="tabular-nums text-stone-500">· {item.distanceM} м</span>
            </button>
          );
        })}
      </div>
      <Link
        href={allNearbyHref}
        className="inline-flex w-fit items-center gap-1 self-start text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
      >
        Все рядом
        <ArrowUpRight className="size-3.5" />
      </Link>
    </div>
  );
}
