'use client';

import type { StyleSpecification } from 'maplibre-gl';
import { Map as MapIcon, Satellite as SatelliteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** OpenFreeMap Liberty — the streets style we already use everywhere
 *  else. Free, no API key, OSM-based. */
export const STREETS_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Hybrid satellite — Esri World Imagery (raster) with the Esri
 *  reference-overlay raster on top, so street + neighbourhood + POI
 *  labels remain readable on satellite imagery. Two raster sources
 *  stacked; both free and OSM-compatible.
 *
 *  Without the labels overlay, sellers complained that "Спутник" mode
 *  was great for spotting buildings visually but useless for figuring
 *  out which street they were looking at — the labels overlay is what
 *  makes a satellite map actually navigable. Standard pattern from
 *  Google Maps "Hybrid" view, Mapbox Satellite Streets, etc.
 *
 *  Attribution required per Esri's terms — both sources surface their
 *  © strings via maplibre's attribution control. */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
    'esri-reference': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri',
    },
  },
  layers: [
    {
      id: 'esri-imagery-layer',
      type: 'raster',
      source: 'esri-imagery',
    },
    {
      id: 'esri-reference-layer',
      type: 'raster',
      source: 'esri-reference',
      // Slight transparency so the imagery underneath stays
      // recognisable around dense label clusters.
      paint: { 'raster-opacity': 0.85 },
    },
  ],
};

export type MapStyleId = 'streets' | 'satellite';

/**
 * Resolves a `MapStyleId` to the value we hand to MapLibre's
 * `Map.setStyle()`. Streets gets the URL; satellite gets the inline
 * style spec.
 */
export function resolveMapStyle(id: MapStyleId): string | StyleSpecification {
  return id === 'satellite' ? SATELLITE_STYLE : STREETS_STYLE_URL;
}

export interface MapStyleToggleProps {
  current: MapStyleId;
  onChange: (next: MapStyleId) => void;
  /** Position helper. Defaults to top-right of the map. */
  className?: string;
}

/**
 * Small two-button toggle overlay for switching between OSM streets and
 * Esri satellite imagery. Used by both the buyer-side MapView and the
 * seller-side LocationPicker so the affordance is consistent.
 *
 * Visual: stacked white pills with active state in stone-900. Sits
 * inside an absolutely-positioned wrapper from the parent — pass
 * `className` to control placement (typical: `absolute top-3 right-3
 * z-10` so it floats above the map).
 *
 * Why two icons instead of a single toggle: scanning the icon tells
 * the user what mode they'd switch to, not what mode they're currently
 * in. Both labelled gives a clear "you can also see satellite" cue
 * without needing a tooltip.
 */
export function MapStyleToggle({ current, onChange, className }: MapStyleToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm',
        className,
      )}
      role="group"
      aria-label="Стиль карты"
    >
      <button
        type="button"
        onClick={() => onChange('streets')}
        aria-pressed={current === 'streets'}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 px-3 text-caption font-medium transition-colors',
          current === 'streets'
            ? 'bg-stone-900 text-white'
            : 'text-stone-700 hover:bg-stone-100',
        )}
      >
        <MapIcon className="size-3.5" aria-hidden />
        Карта
      </button>
      <button
        type="button"
        onClick={() => onChange('satellite')}
        aria-pressed={current === 'satellite'}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 px-3 text-caption font-medium transition-colors',
          current === 'satellite'
            ? 'bg-stone-900 text-white'
            : 'text-stone-700 hover:bg-stone-100',
        )}
      >
        <SatelliteIcon className="size-3.5" aria-hidden />
        Спутник
      </button>
    </div>
  );
}
