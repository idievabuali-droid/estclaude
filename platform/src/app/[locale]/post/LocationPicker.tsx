'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapStyleToggle,
  resolveMapStyle,
  type MapStyleId,
} from '@/components/blocks/MapStyleToggle';

/** Curated landmark rendered on the map as a labelled pill so sellers
 *  can orient by places they know — Vahdat OSM coverage is too sparse
 *  for the base map alone to do that. The list is built server-side by
 *  /post page (POIs from the `pois` table + every published ЖК with
 *  coords); shown on both streets and satellite styles. */
export interface LocationLandmark {
  id: string;
  lat: number;
  lng: number;
  name: string;
  kind: 'poi' | 'building';
  /** POI subkind (`mosque`, `school`, `supermarket`, …). */
  poiKind?: string;
}

export interface LocationPickerProps {
  /** Map's initial center — usually the selected district's centroid,
   *  with a Vahdat-town fallback when the district has no centroid. */
  centerLat: number;
  centerLng: number;
  /** When the user changes district, bump this — picker re-centers
   *  the map and resets the marker to the new centroid. */
  centerKey: string;
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  /** Optional: POIs + existing ЖК coords rendered as labelled pills
   *  on the map. Stable list, expected to be loaded once at mount. */
  landmarks?: LocationLandmark[];
}

const SELLER_PICKER_ZOOM = 16;
const MAX_VISIBLE_LANDMARKS = 6;
const NEARBY_LANDMARK_RADIUS_M = 1200;
const MIN_LABEL_DISTANCE_M = 170;

function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadiusM = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function visibleLandmarksNear(
  landmarks: LocationLandmark[],
  center: { lat: number; lng: number },
): LocationLandmark[] {
  const ranked = landmarks
    .map((landmark) => ({
      landmark,
      distance: distanceM(center, { lat: landmark.lat, lng: landmark.lng }),
    }))
    .sort((a, b) => {
      const byDistance = a.distance - b.distance;
      if (Math.abs(byDistance) > 1) return byDistance;
      if (a.landmark.kind !== b.landmark.kind) {
        return a.landmark.kind === 'building' ? -1 : 1;
      }
      return a.landmark.name.localeCompare(b.landmark.name, 'ru');
    });

  const nearby = ranked.filter((item) => item.distance <= NEARBY_LANDMARK_RADIUS_M);
  const pool = nearby.length >= 4 ? nearby : ranked.slice(0, MAX_VISIBLE_LANDMARKS);
  const selected: typeof pool = [];

  for (const item of pool) {
    if (selected.length >= MAX_VISIBLE_LANDMARKS) break;
    const tooClose = selected.some((picked) => {
      const spacing = distanceM(
        { lat: item.landmark.lat, lng: item.landmark.lng },
        { lat: picked.landmark.lat, lng: picked.landmark.lng },
      );
      return spacing < MIN_LABEL_DISTANCE_M;
    });
    if (!tooClose) selected.push(item);
  }

  if (selected.length < 3) {
    for (const item of pool) {
      if (selected.length >= 3) break;
      if (selected.some((picked) => picked.landmark.id === item.landmark.id)) continue;
      selected.push(item);
    }
  }

  return selected.map((item) => item.landmark);
}

/**
 * Builds the inline-styled pill we attach as a maplibregl marker for
 * each landmark. Styles are inline (not Tailwind) because maplibre
 * appends the marker into its own DOM container outside any React
 * tree, so utility classes from the page wouldn't apply. Visuals:
 *
 *  - Compact white labels, closer to Google Maps' light map labels
 *    than to large product chips.
 *  - `pointer-events: none` so clicking *through* the pill drops the
 *    seller's pin on the ground beneath it (the seller wants to drop
 *    near a landmark, not pick the landmark itself).
 *  - Buildings get a different border tint to set them apart from
 *    POIs at a glance.
 */
function makeLandmarkElement(landmark: LocationLandmark): HTMLDivElement {
  const root = document.createElement('div');
  const isBuilding = landmark.kind === 'building';
  root.style.cssText =
    'pointer-events:none;display:inline-flex;align-items:center;gap:4px;' +
    'padding:2px 6px;border-radius:5px;background:rgba(255,255,255,0.9);' +
    'border:1px solid rgba(28,25,23,0.16);color:var(--color-stone-900);' +
    'box-shadow:0 1px 3px rgba(0,0,0,0.14);font-size:10px;line-height:1.15;' +
    'font-weight:600;white-space:nowrap;max-width:116px;overflow:hidden;text-overflow:ellipsis;' +
    'backdrop-filter:blur(2px);transform:translateY(-8px);';

  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  dot.style.cssText =
    'width:6px;height:6px;border-radius:9999px;flex-shrink:0;' +
    `background:${isBuilding ? 'var(--color-terracotta-600)' : 'var(--color-green-700)'};`;

  const label = document.createElement('span');
  label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;';
  label.textContent = landmark.name;

  root.appendChild(dot);
  root.appendChild(label);
  return root;
}

/**
 * Lets the seller place their building on a map by dragging a pin.
 * Vahdat is small and OSM/Nominatim coverage is patchy, so we skip
 * an address-search box and rely on district pre-centering + drag.
 *
 * Behaviour:
 *  - Mounts a maplibre map at the district centroid, zoom 16 (close
 *    enough to recognise roofs and entrances on satellite imagery).
 *  - Marker starts at the centroid; on first mount we proactively
 *    emit `onChange(centroid)` so the form has *something* to submit
 *    even if the seller never drags.
 *  - Dragging the marker emits the new lat/lng. Tap-on-map also moves
 *    the marker (faster than drag on touch).
 *  - When `centerKey` changes (district swap), we recenter map + reset
 *    marker + emit the new centroid as the chosen point.
 *  - Streets / Satellite toggle in the top-right corner — sellers
 *    spotting their building from above is faster than recognising
 *    the street name on the OSM streets style.
 *
 * Reuses the shared MapStyleToggle styles from MapView.tsx so buyer
 * and seller maps keep the same street/satellite controls.
 */
export function LocationPicker({
  centerLat,
  centerLng,
  centerKey,
  value,
  onChange,
  landmarks,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Landmark markers — kept in a ref so we can replace the small
  // nearby-label set whenever the seller moves the pin.
  const landmarkMarkersRef = useRef<Marker[]>([]);
  // Stash landmarks so the (mount-once) effect captures the latest
  // value without forcing a re-render of the whole picker.
  const landmarksRef = useRef(landmarks);
  // Stash latest onChange so the marker drag handler doesn't capture
  // a stale closure when the parent re-renders.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [mapStyle, setMapStyle] = useState<MapStyleId>('satellite');

  const renderLandmarkMarkers = useCallback((center: { lat: number; lng: number }) => {
    const map = mapRef.current;
    if (!map) return;
    for (const marker of landmarkMarkersRef.current) marker.remove();
    const visible = visibleLandmarksNear(landmarksRef.current ?? [], center);
    landmarkMarkersRef.current = visible.map((landmark) =>
      new maplibregl.Marker({ element: makeLandmarkElement(landmark), anchor: 'bottom' })
        .setLngLat([landmark.lng, landmark.lat])
        .addTo(map),
    );
  }, []);

  useEffect(() => {
    landmarksRef.current = landmarks;
    const marker = markerRef.current;
    if (!marker) return;
    const ll = marker.getLngLat();
    renderLandmarkMarkers({ lat: ll.lat, lng: ll.lng });
  }, [landmarks, renderLandmarkMarkers]);

  // Initial mount: build the map + marker exactly once. We treat
  // `centerKey` as the recenter trigger in a separate effect below
  // so that re-mounting the map (which is expensive) only happens on
  // genuine unmount.
  useEffect(() => {
    if (!containerRef.current) return;
    const startLat = value?.lat ?? centerLat;
    const startLng = value?.lng ?? centerLng;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveMapStyle('satellite'),
      center: [startLng, startLat],
      zoom: SELLER_PICKER_ZOOM,
      // In-map (i) attribution removed — license attribution lives
      // in the SiteFooter alongside the © year.
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new maplibregl.Marker({ color: '#c2410c', draggable: true })
      .setLngLat([startLng, startLat])
      .addTo(map);
    marker.on('dragend', () => {
      const ll = marker.getLngLat();
      const next = { lat: ll.lat, lng: ll.lng };
      onChangeRef.current(next);
      renderLandmarkMarkers(next);
    });
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      const next = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      onChangeRef.current(next);
      renderLandmarkMarkers(next);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Render only nearby landmark labels. Showing every curated POI at
    // once made the satellite map look cluttered; labels should orient
    // the seller around the current pin, not cover the imagery.
    renderLandmarkMarkers({ lat: startLat, lng: startLng });

    // Proactively register the centroid as the chosen point if the
    // form had nothing — saves the user from having to drag if the
    // centroid is already correct.
    if (!value) {
      onChangeRef.current({ lat: startLat, lng: startLng });
    }

    return () => {
      marker.remove();
      for (const m of landmarkMarkersRef.current) m.remove();
      landmarkMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // District change → recenter + reset marker. We treat the new
  // centroid as the chosen point (overwrites any previous drag),
  // because keeping a pin in district A while showing the map of
  // district B would be misleading.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    map.flyTo({ center: [centerLng, centerLat], zoom: SELLER_PICKER_ZOOM, duration: 500 });
    marker.setLngLat([centerLng, centerLat]);
    onChangeRef.current({ lat: centerLat, lng: centerLng });
    renderLandmarkMarkers({ lat: centerLat, lng: centerLng });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on key change
  }, [centerKey]);

  // Style swap. setStyle() reloads tiles in place; the marker survives
  // because it's rendered as a DOM overlay (not a map layer).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(resolveMapStyle(mapStyle));
  }, [mapStyle]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-meta font-medium text-stone-700">
        Расположение на карте
      </span>
      <div className="relative h-[360px] w-full overflow-hidden rounded-md border border-stone-200 md:h-[420px]">
        <div ref={containerRef} className="size-full" />
        {/* Toggle floats above the map. top-3 left-3 keeps it clear of
            maplibre's own zoom control on top-right. */}
        <MapStyleToggle
          current={mapStyle}
          onChange={setMapStyle}
          className="absolute left-3 top-3 z-10"
        />
      </div>
      <p className="text-caption text-stone-500">
        Выберите дом сверху: нажмите на крышу или перетащите метку. Переключитесь
        на «Карту», если нужны названия улиц. По умолчанию метка стоит в центре
        района.
      </p>
    </div>
  );
}
