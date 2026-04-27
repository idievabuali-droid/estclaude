import { MapPin } from 'lucide-react';
import {
  POI_LABELS,
  type PoiCategory,
  type PoiResult,
} from '@/services/poi';

export interface NearbyPoisProps {
  pois: PoiResult;
}

/**
 * "Что рядом" section — WEDGE-2.
 *
 * Renders nearest 3 of each POI category with walking minutes + meters.
 * Mosque is first per Tajik market relevance. No score, no ranking — just
 * raw data the buyer can judge (halal-by-design: no opaque scoring).
 *
 * Categories with 0 results are quietly hidden so the section stays clean.
 */
export function NearbyPois({ pois }: NearbyPoisProps) {
  const categories: PoiCategory[] = [
    'mosque',
    'school',
    'kindergarten',
    'hospital',
    'supermarket',
    'transit',
    'park',
    'pharmacy',
  ];

  const nonEmpty = categories.filter((c) => pois[c].length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 font-semibold text-stone-900">Что рядом</h2>
          <p className="text-meta text-stone-500">
            Расстояния по прямой; время — пешком при средней скорости. Источник —
            OpenStreetMap.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {nonEmpty.map((cat) => (
          <PoiCategoryCard key={cat} category={cat} items={pois[cat]} />
        ))}
      </div>
    </div>
  );
}

function PoiCategoryCard({
  category,
  items,
}: {
  category: PoiCategory;
  items: PoiResult[PoiCategory];
}) {
  const { ru, emoji } = POI_LABELS[category];
  return (
    <div className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-h3 font-semibold text-stone-900">
          <span aria-hidden>{emoji}</span> {ru}
        </h3>
        <span className="text-caption text-stone-500 tabular-nums">{items.length}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((p, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
          >
            <span className="inline-flex min-w-0 items-center gap-1 text-meta text-stone-700">
              <MapPin className="size-3.5 shrink-0 text-stone-400" aria-hidden />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="shrink-0 text-meta text-stone-500 tabular-nums">
              {p.walkingMin} мин · {p.distanceM} м
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
