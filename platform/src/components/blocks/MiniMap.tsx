'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MiniMapProps {
  /** Centre coordinate. */
  latitude: number;
  longitude: number;
  /** Russian name shown under the dot. Optional. */
  label?: string;
  /** Map height — defaults to 220px which fits comfortably between
   *  page sections without taking over the layout. */
  height?: number;
}

const DOT_STYLE =
  'width:30px;height:30px;border-radius:9999px;background:var(--color-terracotta-600);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.25)';
const LABEL_STYLE =
  'position:absolute;top:34px;left:50%;transform:translateX(-50%);background:white;color:var(--color-terracotta-700);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.1);border:1px solid var(--color-terracotta-200)';

/**
 * Compact embedded map for /zhk and /kvartira detail pages. Was missing
 * — buyers had to click "На карте" to enter focus mode and see where
 * the building is. Cian + Krisha both embed a small map preview inline
 * so the spatial answer comes without leaving the page.
 *
 * Single pin, no clustering, no chip bar, no preview cards. The big
 * MapView focus mode still exists for "explore POIs around this
 * building" — this is purely "here's where it is on the map".
 */
export function MiniMap({ latitude, longitude, label, height = 220 }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [longitude, latitude],
      zoom: 15,
      // Smaller widget: keep the controls minimal so the buyer's not
      // tempted to start panning around. They can tap the parent
      // page's "На карте" link for the full experience.
      attributionControl: { compact: true },
      interactive: true,
    });
    mapRef.current = map;

    // Russian-first labels (same override as MapView). Keeps the
    // nearby street names readable for Tajik buyers.
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
    new maplibregl.Marker({ element: wrap, anchor: 'center' })
      .setLngLat([longitude, latitude])
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-md border border-stone-200"
      style={{ height: `${height}px` }}
      aria-label="Карта-превью"
    />
  );
}
