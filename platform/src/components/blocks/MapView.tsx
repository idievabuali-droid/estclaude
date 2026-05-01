'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Link } from '@/i18n/navigation';
import { formatPriceNumber } from '@/lib/format';
import type { MockBuilding } from '@/lib/mock';

export interface MapViewProps {
  buildings: MockBuilding[];
}

// Dushanbe center per Tech Spec §7.1
const DUSHANBE_CENTER: [number, number] = [68.787, 38.5598];

/**
 * MapView — Layer 7 spatial component.
 * Uses MapLibre GL JS + OpenFreeMap (free, OSM-based, no API key).
 */
export function MapView({ buildings }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<MockBuilding | null>(null);

  // Initialise the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DUSHANBE_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers when buildings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (buildings.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const b of buildings) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className =
        'flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-caption font-semibold tabular-nums text-stone-900 shadow-md hover:bg-stone-50 transition-colors';
      el.style.cursor = 'pointer';
      // Marker label: per-m² starting price ("от 4.1K TJS/м²"), matching
      // the building card / detail page convention. Per-m² is the
      // comparable signal at the building level — total starting price
      // varies wildly with apartment size mix and misleads the eye.
      // BUG-6 (clustering) is deferred until inventory density justifies it.
      const shortName = b.name.ru.replace(/^ЖК\s+/i, '');
      // dirams → TJS = ÷100, then TJS → K-TJS = ÷100_000.
      // For per-m² we keep one decimal because the values are smaller (3-6K).
      el.textContent = b.price_per_m2_from_dirams
        ? `от ${(Number(b.price_per_m2_from_dirams) / 100_000).toFixed(1)}K TJS/м²`
        : shortName;
      el.setAttribute('aria-label', `${b.name.ru} — открыть превью`);
      el.addEventListener('click', () => setSelected(b));

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([b.longitude, b.latitude])
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([b.longitude, b.latitude]);
    }

    if (buildings.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    } else {
      const only = buildings[0]!;
      map.flyTo({ center: [only.longitude, only.latitude], zoom: 14, duration: 600 });
    }
  }, [buildings]);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'calc(100dvh - 3.5rem)', minHeight: '32rem' }}
    >
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%' }}
      />

      {/* Floating preview card */}
      {selected ? (
        <div className="absolute inset-x-3 bottom-4 z-10 mx-auto max-w-md md:left-4 md:right-auto md:bottom-4">
          <Link
            href={`/zhk/${selected.slug}`}
            className="flex items-stretch gap-3 overflow-hidden rounded-md border border-stone-200 bg-white shadow-md hover:shadow-md focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
          >
            <div
              className="aspect-square w-24 shrink-0"
              style={{ backgroundColor: selected.cover_color }}
              aria-hidden
            />
            <div className="flex flex-1 flex-col gap-1 py-3 pr-3">
              <span className="text-h3 font-semibold text-stone-900">{selected.name.ru}</span>
              <span className="text-meta text-stone-500">{selected.address.ru}</span>
              {selected.price_per_m2_from_dirams ? (
                <span className="mt-auto text-meta font-semibold tabular-nums text-stone-900">
                  от {formatPriceNumber(selected.price_per_m2_from_dirams)} TJS / м²
                </span>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={(e) => {
                e.preventDefault();
                setSelected(null);
              }}
              className="self-start p-2 text-stone-500 hover:text-stone-900"
            >
              ×
            </button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
