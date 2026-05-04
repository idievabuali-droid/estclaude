'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MiniMapHighlight {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface MiniMapProps {
  /** Centre coordinate. */
  latitude: number;
  longitude: number;
  /** Russian name shown under the dot. Optional. */
  label?: string;
  /** Map height — defaults to 220px which fits comfortably between
   *  page sections without taking over the layout. */
  height?: number;
  /** Optional secondary pin (e.g., a nearby POI the user just tapped
   *  in the Что рядом chip list). When set, the map fits both pins
   *  and shows the highlight as an orange star with its own label. */
  highlight?: MiniMapHighlight | null;
}

const DOT_STYLE =
  'width:30px;height:30px;border-radius:9999px;background:var(--color-terracotta-600);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.25)';
const LABEL_STYLE =
  'position:absolute;top:34px;left:50%;transform:translateX(-50%);background:white;color:var(--color-terracotta-700);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.1);border:1px solid var(--color-terracotta-200)';
// Highlight (orange star) — distinct from the building dot so the
// user instantly sees "this is the place I just tapped".
const HIGHLIGHT_DOT_STYLE =
  'width:34px;height:34px;border-radius:9999px;background:#f97316;border:3px solid white;box-shadow:0 3px 12px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;line-height:1';
const HIGHLIGHT_LABEL_STYLE =
  'position:absolute;top:38px;left:50%;transform:translateX(-50%);background:#f97316;color:white;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,0.1)';

/**
 * Compact embedded map for /zhk and /kvartira detail pages.
 *
 * Two ways to use it:
 *   1. Static "here's where the building is" preview — pass just
 *      latitude / longitude / label. Single terracotta pin.
 *   2. Interactive nearby-chip companion — also pass `highlight` with
 *      a POI's lat/lng/label. Adds an orange star pin and re-fits the
 *      camera to show building + POI together. Updating `highlight`
 *      triggers a smooth fly without rebuilding the map.
 *
 * Russian-first label override + minimal controls so the embed feels
 * like a preview, not a full map app. The big MapView focus mode is
 * still one tap away via the page's "На карте" link.
 */
export function MiniMap({
  latitude,
  longitude,
  label,
  height = 220,
  highlight,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const buildingMarkerRef = useRef<Marker | null>(null);
  const highlightMarkerRef = useRef<Marker | null>(null);

  // One-time map init. Building marker + Russian-first label tweak
  // happen on style.load. Highlight handling lives in a separate
  // effect so re-running it doesn't recreate the map.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [longitude, latitude],
      zoom: 15,
      // No (i) attribution control inside the map — we attribute OSM
      // in the site footer instead, which is license-compliant
      // (ODbL: "reasonable means") and removes a UI element the user
      // flagged as confusing.
      attributionControl: false,
      interactive: true,
    });
    mapRef.current = map;

    map.once('style.load', () => {
      const layers = map.getStyle().layers ?? [];
      for (const layer of layers) {
        if (layer.type !== 'symbol') continue;
        const layout = layer.layout as { 'text-field'?: unknown } | undefined;
        if (layout && layout['text-field'] != null) {
          try {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name:ru'],
              ['get', 'name:en'],
              ['get', 'name'],
            ]);
          } catch {
            /* skip */
          }
        }
      }
    });

    // Building dot + label.
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:30px;height:30px';
    wrap.setAttribute('aria-label', label ?? 'Местоположение');
    const dot = document.createElement('div');
    dot.style.cssText = DOT_STYLE;
    dot.setAttribute('aria-hidden', 'true');
    wrap.appendChild(dot);
    if (label) {
      const lbl = document.createElement('div');
      lbl.style.cssText = LABEL_STYLE;
      lbl.textContent = label;
      wrap.appendChild(lbl);
    }
    buildingMarkerRef.current = new maplibregl.Marker({ element: wrap, anchor: 'center' })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      buildingMarkerRef.current = null;
      highlightMarkerRef.current = null;
    };
  }, [latitude, longitude, label]);

  // Highlight marker lifecycle. Decoupled from the init effect so
  // tapping a different "Что рядом" chip just slides the map without
  // rebuilding it. Old highlight is removed before adding the new one.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (highlightMarkerRef.current) {
      highlightMarkerRef.current.remove();
      highlightMarkerRef.current = null;
    }

    if (!highlight) {
      // No highlight — return to the building pin alone.
      map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 500 });
      return;
    }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:34px;height:34px';
    wrap.setAttribute('aria-label', highlight.label ?? 'Точка');
    const star = document.createElement('div');
    star.style.cssText = HIGHLIGHT_DOT_STYLE;
    star.setAttribute('aria-hidden', 'true');
    star.textContent = '★';
    wrap.appendChild(star);
    if (highlight.label) {
      const lbl = document.createElement('div');
      lbl.style.cssText = HIGHLIGHT_LABEL_STYLE;
      lbl.textContent = highlight.label;
      wrap.appendChild(lbl);
    }
    highlightMarkerRef.current = new maplibregl.Marker({ element: wrap, anchor: 'center' })
      .setLngLat([highlight.longitude, highlight.latitude])
      .addTo(map);

    // Fit both pins with generous padding so the labels aren't
    // clipped by the map edges.
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([longitude, latitude]);
    bounds.extend([highlight.longitude, highlight.latitude]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 500 });
  }, [highlight, latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-md border border-stone-200"
      style={{ height: `${height}px` }}
      aria-label="Карта-превью"
    />
  );
}
