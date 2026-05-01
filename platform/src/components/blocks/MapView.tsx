'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Link } from '@/i18n/navigation';
import { formatPriceNumber } from '@/lib/format';
import type { MockBuilding } from '@/lib/mock';

export interface MapViewProps {
  buildings: MockBuilding[];
}

// Vahdat town center (V1 launch scope; was Dushanbe pre-Vahdat-only)
const VAHDAT_CENTER: [number, number] = [69.0214, 38.5511];

/**
 * MapView — Layer 7 spatial component.
 * Uses MapLibre GL JS + OpenFreeMap (free, OSM-based, no API key).
 *
 * Pin design choices (after iteration with the user):
 * - Each pin is a pill (price text) + a small triangular tip that
 *   points to the exact lat/lng. Without the tip, a wide pill makes
 *   the location ambiguous — you can't tell which side of the road
 *   the building is on.
 * - Selected state changes COLOUR ONLY (white→terracotta) + lifts
 *   z-index. No scale, no ring offset — anything that resizes the
 *   element visually shifts its perceived position, which makes the
 *   map feel jumpy.
 * - Selected pin's z-index is set on the marker element itself
 *   (maplibre uses the element you pass as the marker root, so
 *   parentElement is the shared canvas container — setting zIndex
 *   there would affect every marker).
 */
const PIN_WRAPPER_CLASS = 'flex flex-col items-center cursor-pointer';
const PILL_BASE =
  'rounded-full border px-3 py-1 text-caption font-semibold tabular-nums shadow-md whitespace-nowrap transition-colors';
const PILL_DEFAULT = 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50';
const PILL_SELECTED = 'border-terracotta-700 bg-terracotta-600 text-white';
// Triangular tip via CSS clip-path. Width 12, height 8 — same dims
// in both states; only the fill colour swaps so the apparent
// position of the pin's anchor (the tip's bottom point) never moves.
const TIP_STYLE_BASE = 'width:12px;height:8px;clip-path:polygon(50% 100%,0 0,100% 0);margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.1));transition:background-color 200ms';
const TIP_BG_DEFAULT = 'background:#fff';
const TIP_BG_SELECTED = 'background:var(--color-terracotta-600)';

export function MapView({ buildings }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // Track the marker DOM (wrapper, pill, tip) by building slug so the
  // selection-restyle effect can look them up without recreating markers.
  const markerElementsRef = useRef<
    Map<string, { root: HTMLDivElement; pill: HTMLDivElement; tip: HTMLDivElement }>
  >(new Map());
  const [selected, setSelected] = useState<MockBuilding | null>(null);
  // ?selected=<slug> deep-link from a card's address row. The marker
  // sync effect picks this up and pre-opens the popup + flies to it.
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get('selected');

  // Initialise the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: VAHDAT_CENTER,
      zoom: 13,
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

    // Clear old markers + element-by-slug map
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    if (buildings.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const b of buildings) {
      // Wrapper holds pill + tip in a flex column. Anchor: 'bottom'
      // means the bottom-center of this element aligns with lat/lng,
      // and since the tip is at the bottom of the wrapper, the tip's
      // point is exactly where the building is.
      const root = document.createElement('div');
      root.className = PIN_WRAPPER_CLASS;
      root.setAttribute('role', 'button');
      root.setAttribute('tabindex', '0');
      root.setAttribute('aria-label', `${b.name.ru} — открыть превью`);
      root.addEventListener('click', () => setSelected(b));
      // Keyboard activation for accessibility
      root.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelected(b);
        }
      });

      // Pill: per-m² starting price, matching card convention.
      const pill = document.createElement('div');
      pill.className = `${PILL_BASE} ${PILL_DEFAULT}`;
      const shortName = b.name.ru.replace(/^ЖК\s+/i, '');
      pill.textContent = b.price_per_m2_from_dirams
        ? `от ${(Number(b.price_per_m2_from_dirams) / 100_000).toFixed(1)}K TJS/м²`
        : shortName;
      root.appendChild(pill);

      // Tip: small downward-pointing triangle via clip-path.
      const tip = document.createElement('div');
      tip.setAttribute('aria-hidden', 'true');
      tip.style.cssText = `${TIP_STYLE_BASE};${TIP_BG_DEFAULT}`;
      root.appendChild(tip);

      const marker = new maplibregl.Marker({ element: root, anchor: 'bottom' })
        .setLngLat([b.longitude, b.latitude])
        .addTo(map);
      markersRef.current.push(marker);
      markerElementsRef.current.set(b.slug, { root, pill, tip });
      bounds.extend([b.longitude, b.latitude]);
    }

    // If a building was deep-linked via ?selected=<slug>, open its popup
    // and centre on it. Otherwise fit all pins in view.
    const deepLinked = selectedSlug
      ? buildings.find((b) => b.slug === selectedSlug)
      : null;
    if (deepLinked) {
      // Syncing internal `selected` state to the URL param is an
      // explicit external-system sync — exactly what useEffect+setState
      // is for, even though the lint rule warns generically.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(deepLinked);
      map.flyTo({
        center: [deepLinked.longitude, deepLinked.latitude],
        zoom: 15,
        duration: 600,
      });
    } else if (buildings.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    } else {
      const only = buildings[0]!;
      map.flyTo({ center: [only.longitude, only.latitude], zoom: 14, duration: 600 });
    }
  }, [buildings, selectedSlug]);

  // Restyle pins when selection changes. ONLY colours + z-index move —
  // never size or position — so the pin's tip stays glued to its lat/lng.
  // Direct DOM mutation is required: maplibre owns these elements
  // outside of React's render tree.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    for (const [slug, { root, pill, tip }] of markerElementsRef.current) {
      const isSel = selected?.slug === slug;
      pill.className = `${PILL_BASE} ${isSel ? PILL_SELECTED : PILL_DEFAULT}`;
      tip.style.cssText = `${TIP_STYLE_BASE};${isSel ? TIP_BG_SELECTED : TIP_BG_DEFAULT}`;
      // root IS the maplibre marker element (parent is the shared
      // canvas container, so setting zIndex there would affect every
      // marker). Lift the selected pin above any clustered neighbours.
      root.style.zIndex = isSel ? '100' : '1';
    }
  }, [selected]);
  /* eslint-enable react-hooks/immutability */

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'calc(100dvh - 3.5rem)', minHeight: '32rem' }}
    >
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%' }}
      />

      {/* Floating preview card. Fixed-positioned (not absolute) so it
          sits above the mobile bottom-nav (z-30) and stays visible
          regardless of how much content is above the map. */}
      {selected ? (
        <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md md:absolute md:left-4 md:right-auto md:bottom-4">
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
