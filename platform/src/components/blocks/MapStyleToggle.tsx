'use client';

import type { StyleSpecification } from 'maplibre-gl';
import { Map as MapIcon, Satellite as SatelliteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** OpenFreeMap Liberty — the streets style we already use everywhere
 *  else. Free, no API key, OSM-based. */
export const STREETS_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Hybrid satellite — Esri World Imagery (raster) with OpenStreetMap
 *  raster on top at reduced opacity, so streets + landmark + POI
 *  labels remain readable on satellite imagery while the imagery
 *  itself shows through. Same pattern Mapbox Satellite Streets uses.
 *
 *  Why OSM and not Esri's reference overlay: Esri's
 *  Reference/World_Boundaries_and_Places + World_Transportation are
 *  effectively empty for Tajikistan (verified by probing tiles —
 *  every TJ tile comes back as a ~3KB blank PNG). OSM has rich
 *  Vahdat data — every street, every landmark, every neighbourhood
 *  is labelled.
 *
 *  Tile usage: OSM Foundation's policy permits light per-user usage
 *  (each seller loads ~10-20 tiles per /post session — well below any
 *  threshold). Attribution surfaces via maplibre's attribution control.
 *
 *  Opacity 0.75: bumped from 0.55 after seller roleplay feedback —
 *  "you don't see almost any names of any places". OSM coverage in
 *  Vahdat is sparse enough that the few labels we DO get need to be
 *  crisp. Imagery underneath is still readable at 0.75; the white
 *  label halos OSM bakes into its raster tiles cut through. (Curated
 *  POIs + ЖК pins ride on top of this as labelled markers from
 *  LocationPicker / MapView for the names that matter most.) */
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics',
    },
    'osm-streets': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'esri-imagery-layer',
      type: 'raster',
      source: 'esri-imagery',
    },
    {
      id: 'osm-streets-overlay',
      type: 'raster',
      source: 'osm-streets',
      paint: { 'raster-opacity': 0.75 },
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
