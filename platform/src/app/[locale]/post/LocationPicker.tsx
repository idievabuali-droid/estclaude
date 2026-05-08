'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapStyleToggle,
  resolveMapStyle,
  STREETS_STYLE_URL,
  type MapStyleId,
} from '@/components/blocks/MapStyleToggle';

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
}

/**
 * Lets the seller place their building on a map by dragging a pin.
 * Vahdat is small and OSM/Nominatim coverage is patchy, so we skip
 * an address-search box and rely on district pre-centering + drag.
 *
 * Behaviour:
 *  - Mounts a maplibre map at the district centroid, zoom 14 (close
 *    enough to read streets without re-centering on every drag).
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
 * Reuses the OpenFreeMap tile source from MapView.tsx — keeps us on a
 * single vendor and avoids needing API keys.
 */
export function LocationPicker({
  centerLat,
  centerLng,
  centerKey,
  value,
  onChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Stash latest onChange so the marker drag handler doesn't capture
  // a stale closure when the parent re-renders.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [mapStyle, setMapStyle] = useState<MapStyleId>('streets');

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
      style: STREETS_STYLE_URL,
      center: [startLng, startLat],
      zoom: 14,
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
      onChangeRef.current({ lat: ll.lat, lng: ll.lng });
    });
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Proactively register the centroid as the chosen point if the
    // form had nothing — saves the user from having to drag if the
    // centroid is already correct.
    if (!value) {
      onChangeRef.current({ lat: startLat, lng: startLng });
    }

    return () => {
      marker.remove();
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
    map.flyTo({ center: [centerLng, centerLat], zoom: 14, duration: 500 });
    marker.setLngLat([centerLng, centerLat]);
    onChangeRef.current({ lat: centerLat, lng: centerLng });
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
      <div className="relative h-[280px] w-full overflow-hidden rounded-md border border-stone-200">
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
        Перетащите метку на точное место дома или нажмите по карте. Переключитесь
        на «Спутник», чтобы увидеть реальный вид сверху. По умолчанию метка стоит
        в центре района.
      </p>
    </div>
  );
}
