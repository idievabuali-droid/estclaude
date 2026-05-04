'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import maplibregl, { type Map as MaplibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Link } from '@/i18n/navigation';
import { formatPriceNumber } from '@/lib/format';
import type { MockBuilding } from '@/lib/mock';
import { POI_LABELS, type PoiCategory, type PoiItem, type PoiResult } from '@/services/poi';

export interface MapViewProps {
  buildings: MockBuilding[];
  /**
   * Focus mode: when set, the map shows ONLY this one building (not the
   * whole `buildings` list). The pin is a simple "you are here" dot —
   * no price label — because the buyer arrived here from that
   * building's own page and already knows what it is. Below the map
   * sits a category chip bar (Mosque / School / Hospital / etc.); the
   * 2GIS pattern is to keep the map clean by default and reveal POIs
   * only for the category the buyer asks about.
   */
  focusedBuilding?: MockBuilding | null;
  focusPois?: PoiResult | null;
  /**
   * POI-near mode: when set (URL has ?view=karta&near_lat=…&near_lng=…),
   * overlay a landmark pin at the POI plus a translucent radius circle.
   * The `buildings` list is already pre-filtered server-side to those
   * within the radius, so they render as normal price pins. Camera
   * fits the POI + visible buildings together. Mutually exclusive with
   * focusedBuilding (focus mode wins if both happen to be set).
   */
  nearPoi?: { lat: number; lng: number; label: string; radiusM: number } | null;
}

// Vahdat town center (V1 launch scope; was Dushanbe pre-Vahdat-only)
const VAHDAT_CENTER: [number, number] = [69.0214, 38.5511];

// MapLibre source/layer ids for the POI radius circle overlay. Using
// constants so the cleanup pass on every effect re-run can reliably
// remove them by name.
const NEAR_RADIUS_SOURCE = 'near-poi-radius';
const NEAR_RADIUS_FILL_LAYER = 'near-poi-radius-fill';
const NEAR_RADIUS_LINE_LAYER = 'near-poi-radius-line';

/**
 * Builds a 64-vertex polygon approximating a circle of `radiusM` metres
 * centred on (lat, lng). MapLibre paints geographic features in lat/lng
 * so we project metres to degrees using the standard Earth-radius
 * approximation. Good enough for visual radius indication at our scale
 * — buyers don't need geodesic precision, they need "is this in the
 * neighbourhood".
 */
function radiusPolygon(lat: number, lng: number, radiusM: number): GeoJSON.Feature {
  const R = 6371000;
  const points: Array<[number, number]> = [];
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const dx = (radiusM * Math.cos(angle)) / (R * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusM * Math.sin(angle)) / R;
    points.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [points] },
  };
}

// POI pin: orange landmark dot, distinct from the building price pills
// and the focus-mode terracotta dot so the buyer instantly reads "this
// is the place I searched for, not a building".
const NEAR_POI_DOT_STYLE =
  'width:32px;height:32px;border-radius:9999px;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;cursor:default';
const NEAR_POI_LABEL_STYLE =
  'position:absolute;top:34px;left:50%;transform:translateX(-50%);background:white;border:1px solid #f97316;color:#9a3412;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.1)';

/**
 * MapView — Layer 7 spatial component.
 * Uses MapLibre GL JS + OpenFreeMap (free, OSM-based, no API key).
 *
 * Two operating modes (controlled by the `focusedBuilding` prop):
 *
 *  - BROWSE mode (default): every `buildings[]` entry → price-pill pin.
 *    Click → floating preview card. ?selected=<slug> deep-links open a
 *    card. Used by /novostroyki?view=karta for shopping.
 *
 *  - FOCUS mode (when focusedBuilding set): one terracotta "you are
 *    here" dot — NO price/name label, because the buyer arrived from
 *    that building's page. Bottom chip bar lets them ask "where are
 *    the schools / mosques / supermarkets". Selecting a chip pops up
 *    that one category's POIs (up to 3, distance-sorted) with always-
 *    visible distance pills, and refits the map to show building +
 *    POIs together. Selecting again deselects. Used by "На карте"
 *    links from apartment + building pages.
 *
 * Pin design choices (after iteration with the user):
 * - Browse-mode building pin is a price pill (per-m² starting price)
 *   plus a tiny tip pointing at the lat/lng. Selected state changes
 *   COLOUR ONLY (white→terracotta) + lifts z-index. No scale, no ring
 *   offset — anything that resizes the element visually shifts its
 *   perceived position, which makes the map feel jumpy.
 * - Focus-mode building dot is intentionally label-free — the page
 *   header already says "Назад в <Name>", so re-stating the name on
 *   the pin would just be visual noise. The dot is anchored center
 *   (not bottom) because there's no tip — the pin's centre IS the
 *   building's lat/lng.
 * - POI markers in focus mode are pills (emoji + distance) rather than
 *   bare circles, because the distance is the answer to "is this
 *   close enough" and ought to be readable without an extra tap.
 */

// Browse-mode building pin styles
const PIN_WRAPPER_CLASS = 'flex flex-col items-center cursor-pointer';
const PILL_BASE =
  'rounded-full border px-3 py-1 text-caption font-semibold tabular-nums shadow-md whitespace-nowrap transition-colors';
const PILL_DEFAULT = 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50';
const PILL_SELECTED = 'border-terracotta-700 bg-terracotta-600 text-white';
// Triangular tip via CSS clip-path. Width 12, height 8 — same dims in
// both states; only the fill colour swaps so the apparent position of
// the pin's anchor (the tip's bottom point) never moves.
const TIP_STYLE_BASE = 'width:12px;height:8px;clip-path:polygon(50% 100%,0 0,100% 0);margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.1));transition:background-color 200ms';
const TIP_BG_DEFAULT = 'background:#fff';
const TIP_BG_SELECTED = 'background:var(--color-terracotta-600)';

// Focus-mode building marker — clean "you are here" dot, no label.
// 22px terracotta with thick white ring + drop shadow reads as a
// deliberate anchor against neutral POI pills.
const FOCUS_DOT_STYLE =
  'width:22px;height:22px;border-radius:9999px;background:var(--color-terracotta-600,#c2410c);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:default';

// Focus-mode POI marker — emoji + distance pill so distance is
// immediately readable. White background with stone border keeps it
// neutral so the terracotta building dot stays the visual anchor.
const POI_PILL_STYLE =
  'display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 6px;border-radius:9999px;background:#fff;border:1px solid var(--color-stone-300,#d6d3d1);box-shadow:0 1px 3px rgba(0,0,0,0.15);font-size:11px;line-height:1;white-space:nowrap;cursor:pointer;font-variant-numeric:tabular-nums;color:var(--color-stone-900,#1c1917);transition:transform 150ms,box-shadow 150ms';
const POI_PILL_SELECTED_STYLE =
  'display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 6px;border-radius:9999px;background:var(--color-terracotta-50,#fdf4f0);border:1px solid var(--color-terracotta-600,#c2410c);box-shadow:0 2px 6px rgba(194,65,12,0.25);font-size:11px;line-height:1;white-space:nowrap;cursor:pointer;font-variant-numeric:tabular-nums;color:var(--color-terracotta-800,#9a3412);transform:scale(1.05);z-index:50';

/** Order of category chips in the bottom bar — mosque first per Tajik
 *  market relevance, transit/park last because they're nice-to-haves. */
const CATEGORY_ORDER: PoiCategory[] = [
  'mosque',
  'school',
  'kindergarten',
  'supermarket',
  'hospital',
  'pharmacy',
  'transit',
  'park',
];

type SelectedPoi = { item: PoiItem; cat: PoiCategory; idx: number };

export function MapView({
  buildings,
  focusedBuilding,
  focusPois,
  nearPoi,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // Browse-mode building markers (slug → DOM refs) so the selection
  // restyle effect can mutate styles without recreating markers.
  const markerElementsRef = useRef<
    Map<string, { root: HTMLDivElement; pill: HTMLDivElement; tip: HTMLDivElement }>
  >(new Map());
  // Focus-mode POI markers (idx → DOM ref).
  const poiElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const [selected, setSelected] = useState<MockBuilding | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<SelectedPoi | null>(null);
  // Which POI category is currently revealed in focus mode. null =
  // none (cleanest state — just the building dot, buyer asks for what
  // they want via the chip bar).
  const [activeCategory, setActiveCategory] = useState<PoiCategory | null>(null);

  // ?selected=<slug> deep-link from a card's address row (browse mode).
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get('selected');

  const isFocusMode = focusedBuilding != null;

  // Reset POI selection state when entering / leaving focus mode or
  // when the focused building itself changes — stale state would point
  // at POIs that no longer exist on the map. This IS an external sync
  // (the URL-driven focusedBuilding prop is the external source), so
  // setting state here is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCategory(null);
    setSelectedPoi(null);
  }, [focusedBuilding]);

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

    // Two style overrides applied once the OpenFreeMap style finishes
    // loading. Both target what Tajik buyers actually use to orient
    // themselves on the map:
    //
    //   1. RUSSIAN-FIRST LABELS: OSM tags many Vahdat features with
    //      `name:ru` (district names, market names, big landmarks) but
    //      the default style picks `name` first, which often comes
    //      back in Tajik or English. Override the text-field on every
    //      label layer to prefer name:ru → name:en → name.
    //
    //   2. SHOW LANDMARKS AT CITY ZOOM: OpenMapTiles' POI label
    //      layers (poi_z14, poi_z15, poi_z16) only kick in at zoom
    //      14+, so at our default zoom 13 the buyer sees streets but
    //      no markets / mosques / hospitals / schools — the very
    //      anchors they use to mentally place a building. Lower their
    //      minzoom so familiar landmarks appear from zoom 12 upward,
    //      giving each pin a recognisable neighbour even on the
    //      city-wide view.
    map.once('style.load', () => {
      const layers = map.getStyle().layers ?? [];
      for (const layer of layers) {
        if (layer.type !== 'symbol') continue;
        const layout = layer.layout as { 'text-field'?: unknown } | undefined;

        // (1) Russian-first text override — only for layers that have
        // a text-field at all. Icon-only layers are skipped because
        // their text-field is undefined or static.
        if (layout && layout['text-field'] != null) {
          try {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name:ru'],
              ['get', 'name:en'],
              ['get', 'name'],
            ]);
          } catch {
            // Some layers reject the override silently — skip.
          }
        }

        // (2) Show POI / neighbourhood labels earlier. Conservative
        // step (just 2 zoom levels) so popular landmarks appear at the
        // city view without the map turning into a wall of text.
        const id = layer.id;
        const isPoi = id.startsWith('poi');
        const isNeighbourhood =
          id.includes('neighbourhood') || id.includes('suburb');
        if (isPoi || isNeighbourhood) {
          const min = (layer as { minzoom?: number }).minzoom ?? 0;
          const max = (layer as { maxzoom?: number }).maxzoom ?? 24;
          try {
            map.setLayerZoomRange(layer.id, Math.max(11, min - 2), max);
          } catch {
            // Layer doesn't accept range changes — skip.
          }
        }
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers when buildings / focus / active category change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear all old markers + lookup maps
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerElementsRef.current.clear();
    poiElementsRef.current.clear();

    // ─── FOCUS MODE ───────────────────────────────────────────
    if (isFocusMode) {
      const focused = focusedBuilding!;

      // Building dot — anchored center, no label.
      const dot = document.createElement('div');
      dot.style.cssText = FOCUS_DOT_STYLE;
      dot.setAttribute('aria-label', `${focused.name.ru} — выбранное здание`);
      const buildingMarker = new maplibregl.Marker({ element: dot, anchor: 'center' })
        .setLngLat([focused.longitude, focused.latitude])
        .addTo(map);
      markersRef.current.push(buildingMarker);

      // POI markers — only the active category, if any.
      const items: PoiItem[] = activeCategory && focusPois
        ? focusPois[activeCategory]
        : [];

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([focused.longitude, focused.latitude]);

      items.forEach((item, idx) => {
        const el = document.createElement('div');
        el.style.cssText = POI_PILL_STYLE;
        const emojiSpan = document.createElement('span');
        emojiSpan.setAttribute('aria-hidden', 'true');
        emojiSpan.textContent = POI_LABELS[activeCategory!].emoji;
        const distSpan = document.createElement('span');
        distSpan.textContent = `${item.distanceM} м`;
        el.appendChild(emojiSpan);
        el.appendChild(distSpan);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute(
          'aria-label',
          `${POI_LABELS[activeCategory!].ru.slice(0, -1)}: ${item.name}, ${item.distanceM} метров от здания`,
        );
        const onActivate = () =>
          setSelectedPoi({ item, cat: activeCategory!, idx });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onActivate();
        });
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        });
        const m = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([item.lng, item.lat])
          .addTo(map);
        markersRef.current.push(m);
        poiElementsRef.current.set(idx, el);
        bounds.extend([item.lng, item.lat]);
      });

      // Camera: when a category is active and has POIs, fit building +
      // POIs. Otherwise just centre on the building at neighbourhood
      // zoom — the buyer can see the surrounding streets while they
      // pick a category.
      if (items.length > 0) {
        map.fitBounds(bounds, { padding: 100, maxZoom: 16, duration: 600 });
      } else {
        map.flyTo({
          center: [focused.longitude, focused.latitude],
          zoom: 16,
          duration: 600,
        });
      }
      return;
    }

    // ─── BROWSE MODE ──────────────────────────────────────────
    // Clean up POI overlay from any prior render so we don't accumulate
    // duplicate sources / layers across remounts. Safe to call even
    // when none was added.
    if (map.getLayer(NEAR_RADIUS_FILL_LAYER)) map.removeLayer(NEAR_RADIUS_FILL_LAYER);
    if (map.getLayer(NEAR_RADIUS_LINE_LAYER)) map.removeLayer(NEAR_RADIUS_LINE_LAYER);
    if (map.getSource(NEAR_RADIUS_SOURCE)) map.removeSource(NEAR_RADIUS_SOURCE);

    // POI overlay (only in browse mode, when nearPoi is set). Adds the
    // landmark pin + a translucent radius circle that frames which
    // buildings the buyer is currently seeing.
    if (nearPoi) {
      const addOverlay = () => {
        if (map.getSource(NEAR_RADIUS_SOURCE)) return;
        map.addSource(NEAR_RADIUS_SOURCE, {
          type: 'geojson',
          data: radiusPolygon(nearPoi.lat, nearPoi.lng, nearPoi.radiusM),
        });
        // Insert beneath any symbol layer so building pins remain
        // readable on top of the tinted radius. Falls back to default
        // (top) when no symbol layer is found.
        const layers = map.getStyle().layers ?? [];
        const firstSymbol = layers.find((l) => l.type === 'symbol')?.id;
        map.addLayer(
          {
            id: NEAR_RADIUS_FILL_LAYER,
            type: 'fill',
            source: NEAR_RADIUS_SOURCE,
            paint: { 'fill-color': '#f97316', 'fill-opacity': 0.08 },
          },
          firstSymbol,
        );
        map.addLayer(
          {
            id: NEAR_RADIUS_LINE_LAYER,
            type: 'line',
            source: NEAR_RADIUS_SOURCE,
            paint: {
              'line-color': '#f97316',
              'line-width': 2,
              'line-dasharray': [2, 2],
              'line-opacity': 0.7,
            },
          },
          firstSymbol,
        );
      };
      // Style may still be loading on first mount — defer until ready.
      if (map.isStyleLoaded()) addOverlay();
      else map.once('style.load', addOverlay);

      // POI pin marker. Wraps the dot + the always-visible label so
      // both move together on pan/zoom. Anchor center because the dot
      // IS the POI location (no tip).
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:32px;height:32px';
      wrap.setAttribute('aria-label', `${nearPoi.label} — место поиска`);
      const dot = document.createElement('div');
      dot.style.cssText = NEAR_POI_DOT_STYLE;
      dot.textContent = '★';
      dot.setAttribute('aria-hidden', 'true');
      wrap.appendChild(dot);
      const lbl = document.createElement('div');
      lbl.style.cssText = NEAR_POI_LABEL_STYLE;
      lbl.textContent = nearPoi.label;
      wrap.appendChild(lbl);
      const poiMarker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([nearPoi.lng, nearPoi.lat])
        .addTo(map);
      markersRef.current.push(poiMarker);
    }

    if (buildings.length === 0 && !nearPoi) return;

    const bounds = new maplibregl.LngLatBounds();
    if (nearPoi) bounds.extend([nearPoi.lng, nearPoi.lat]);
    for (const b of buildings) {
      const root = document.createElement('div');
      root.className = PIN_WRAPPER_CLASS;
      root.setAttribute('role', 'button');
      root.setAttribute('tabindex', '0');
      root.setAttribute('aria-label', `${b.name.ru} — открыть превью`);
      root.addEventListener('click', () => setSelected(b));
      root.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelected(b);
        }
      });

      const pill = document.createElement('div');
      pill.className = `${PILL_BASE} ${PILL_DEFAULT}`;
      const shortName = b.name.ru.replace(/^ЖК\s+/i, '');
      pill.textContent = b.price_per_m2_from_dirams
        ? `от ${(Number(b.price_per_m2_from_dirams) / 100_000).toFixed(1)}K TJS/м²`
        : shortName;
      root.appendChild(pill);

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

    // ?selected=<slug> deep-link → centre on it + open preview
    const deepLinked = selectedSlug
      ? buildings.find((b) => b.slug === selectedSlug)
      : null;
    if (deepLinked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(deepLinked);
      map.flyTo({
        center: [deepLinked.longitude, deepLinked.latitude],
        zoom: 15,
        duration: 600,
      });
    } else if (nearPoi && buildings.length === 0) {
      // POI overlay with no surrounding buildings — centre on the POI
      // at neighbourhood zoom so the buyer sees an empty radius
      // surrounded by streets, not a confusing wide view.
      map.flyTo({ center: [nearPoi.lng, nearPoi.lat], zoom: 15, duration: 600 });
    } else if (buildings.length > 1 || (nearPoi && buildings.length > 0)) {
      // POI + at least one building, or several buildings: fit bounds
      // to include everything that's been added.
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
    } else if (buildings.length === 1) {
      const only = buildings[0]!;
      map.flyTo({ center: [only.longitude, only.latitude], zoom: 14, duration: 600 });
    }
  }, [buildings, selectedSlug, isFocusMode, focusedBuilding, focusPois, activeCategory, nearPoi]);

  // Restyle browse-mode building pins when selection changes.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (isFocusMode) return;
    for (const [slug, { root, pill, tip }] of markerElementsRef.current) {
      const isSel = selected?.slug === slug;
      pill.className = `${PILL_BASE} ${isSel ? PILL_SELECTED : PILL_DEFAULT}`;
      tip.style.cssText = `${TIP_STYLE_BASE};${isSel ? TIP_BG_SELECTED : TIP_BG_DEFAULT}`;
      root.style.zIndex = isSel ? '100' : '1';
    }
  }, [selected, isFocusMode]);

  // Restyle focus-mode POI pills when a POI is selected for its label.
  useEffect(() => {
    if (!isFocusMode) return;
    for (const [idx, el] of poiElementsRef.current) {
      const isSel = selectedPoi?.cat === activeCategory && selectedPoi?.idx === idx;
      el.style.cssText = isSel ? POI_PILL_SELECTED_STYLE : POI_PILL_STYLE;
    }
  }, [selectedPoi, isFocusMode, activeCategory]);
  /* eslint-enable react-hooks/immutability */

  // Map height accounts for:
  // - 3.5rem top nav (always)
  // - 3.5rem back-link header (focus mode only — that header sits
  //   above this MapView in the parent route)
  // The mobile bottom nav is hidden on focus-mode pages (see
  // MobileBottomNav), so we don't subtract its height here.
  const mapHeight = isFocusMode
    ? 'calc(100dvh - 7rem)'
    : 'calc(100dvh - 3.5rem)';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: mapHeight, minHeight: '32rem' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Browse-mode building preview card (hidden in focus mode). */}
      {!isFocusMode && selected ? (
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

      {/* Focus-mode: bottom category chip bar + POI detail popup.
          Two pieces stacked at the bottom — the popup (when a POI is
          selected) sits ABOVE the chip bar so the chips stay reachable.
          Both are floating (absolute on desktop, fixed on mobile so
          they ride above any sticky nav). */}
      {isFocusMode && focusPois ? (
        <>
          {selectedPoi ? (
            <div className="pointer-events-auto absolute inset-x-3 bottom-20 z-40 mx-auto max-w-sm md:left-4 md:right-auto md:bottom-20">
              <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-md">
                <span aria-hidden className="text-h3">
                  {POI_LABELS[selectedPoi.cat].emoji}
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-meta font-semibold text-stone-900">
                    {selectedPoi.item.name}
                  </span>
                  <span className="text-caption text-stone-500 tabular-nums">
                    {selectedPoi.item.distanceM} м · ≈{selectedPoi.item.walkingMin} мин пешком
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={() => setSelectedPoi(null)}
                  className="p-1 text-stone-500 hover:text-stone-900"
                >
                  ×
                </button>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-30 md:bottom-4">
            <div className="mx-auto max-w-3xl px-3">
              <div
                role="toolbar"
                aria-label="Что рядом"
                className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-stone-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {CATEGORY_ORDER.map((cat) => {
                  const items = focusPois[cat];
                  const count = items.length;
                  const active = activeCategory === cat;
                  const disabled = count === 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        // Toggle: re-tap clears.
                        setActiveCategory(active ? null : cat);
                        setSelectedPoi(null);
                      }}
                      aria-pressed={active}
                      className={
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-meta font-medium tabular-nums transition-colors ' +
                        (disabled
                          ? 'cursor-not-allowed text-stone-400'
                          : active
                          ? 'bg-terracotta-600 text-white'
                          : 'text-stone-700 hover:bg-stone-100')
                      }
                    >
                      <span aria-hidden>{POI_LABELS[cat].emoji}</span>
                      <span>{POI_LABELS[cat].ru}</span>
                      {count > 0 ? (
                        <span
                          className={
                            'rounded-full px-1.5 text-caption ' +
                            (active ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600')
                          }
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
