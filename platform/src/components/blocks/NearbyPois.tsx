import { POI_LABELS, type PoiCategory, type PoiResult } from '@/services/poi';

export interface NearbyPoisProps {
  pois: PoiResult;
}

/**
 * "Что рядом" section — WEDGE-2.
 *
 * Shows the NEAREST one of each POI category (mosque, school, etc.) as a
 * single tight list. Earlier the layout showed 3 of each category (24
 * total entries) which crowded out actually-meaningful card content;
 * the second-closest mosque doesn't change a buyer's mind about the
 * location. Proximity is what they care about.
 *
 * The service still returns up to 3 per category (cached upstream) so
 * a "Показать все" expander can be added later without touching the
 * data fetch.
 *
 * Mosque first per Tajik market relevance.
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

  const rows = categories
    .map((cat) => ({ cat, item: pois[cat][0] ?? null }))
    .filter((r) => r.item != null);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-semibold text-stone-900">Что рядом</h2>
        <p className="text-meta text-stone-500">
          Ближайшие места рядом с домом. Расстояния по прямой; время — пешком.
          Источник — OpenStreetMap.
        </p>
      </div>

      <ul className="flex flex-col rounded-md border border-stone-200 bg-white">
        {rows.map(({ cat, item }) => {
          const { ru, emoji } = POI_LABELS[cat];
          return (
            <li
              key={cat}
              className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 first:border-t-0"
            >
              <span className="inline-flex min-w-0 items-center gap-2 text-meta">
                <span className="shrink-0 text-base" aria-hidden>{emoji}</span>
                <span className="shrink-0 font-medium text-stone-900">{ru}</span>
                <span className="truncate text-stone-500">· {item!.name}</span>
              </span>
              <span className="shrink-0 text-meta text-stone-500 tabular-nums">
                {item!.walkingMin} мин · {item!.distanceM} м
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
