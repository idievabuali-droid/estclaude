'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, School, Building2, ShoppingCart, Bus, Stethoscope, Pill, Trees, Landmark } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

interface PoiHit {
  id: string;
  name: string;
  kind: string;
  subkind: string | null;
  district_slug: string | null;
  latitude: number;
  longitude: number;
}

const KIND_ICON: Record<string, typeof MapPin> = {
  mosque: Landmark,
  school: School,
  kindergarten: School,
  hospital: Stethoscope,
  pharmacy: Pill,
  supermarket: ShoppingCart,
  transit: Bus,
  park: Trees,
  square: Landmark,
  street: MapPin,
};

const KIND_LABEL: Record<string, string> = {
  mosque: 'Мечеть',
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
  pharmacy: 'Аптека',
  supermarket: 'Магазин',
  transit: 'Транспорт',
  park: 'Парк',
  square: 'Площадь',
  street: 'Улица',
};

export interface LocationSearchProps {
  /** Where to send the visitor when they pick a POI. The POI's
   *  lat/lng + radius default get appended to this base path. */
  destinationPath: '/novostroyki' | '/kvartiry';
  /** Initial value for the input — used when the page is already
   *  scoped to a POI (so the visitor sees what they searched for). */
  initialQuery?: string;
  /** Default radius in meters. 1500m = roughly 15 minutes' walk in
   *  Vahdat — generous enough to catch nearby buildings without
   *  including everything. */
  radiusMeters?: number;
  /** Style variant: hero on home, compact on filter pages. */
  variant?: 'hero' | 'compact';
}

/**
 * Autocomplete input for location-aware browsing. Type any landmark
 * name (school / mosque / market / street / square) — Vahdat-cached
 * POIs match in real time. Selecting one navigates to the destination
 * page with `?near_lat=<lat>&near_lng=<lng>&near_label=<name>` so the
 * page can filter listings by radius and render a "Рядом с X" header.
 *
 * Replaces the chip-based hero on /, where Madina-the-buyer was
 * confused by "Новостройки" vs "Квартиры" with no search affordance.
 */
export function LocationSearch({
  destinationPath,
  initialQuery = '',
  radiusMeters = 1500,
  variant = 'hero',
}: LocationSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<PoiHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced fetch — 200ms is enough that a fast typer doesn't fire
  // 8 requests for "Гулистон" but slow enough to feel instant. Skip
  // fetching when the query is too short; the onChange handler clears
  // stale hits in that case so the effect never has to call setState
  // synchronously (lint rule react-hooks/set-state-in-effect).
  useEffect(() => {
    if (q.trim().length < 2) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/pois/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { hits: PoiHit[] };
        setHits(data.hits ?? []);
        setOpen(true);
      } catch {
        // Network blip — silently leave the dropdown empty.
        setHits([]);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  function pick(hit: PoiHit) {
    const params = new URLSearchParams({
      near_lat: String(hit.latitude),
      near_lng: String(hit.longitude),
      near_label: hit.name,
      radius: String(radiusMeters),
    });
    router.push(`${destinationPath}?${params.toString()}`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) {
      if (e.key === 'Enter' && q.trim().length >= 2) {
        // Plain text fallback — send to filter page with the query
        // as a free-text search. The page can choose to surface a
        // "ничего не найдено" + relax suggestion or run its existing
        // filter pass.
        router.push(`${destinationPath}?q=${encodeURIComponent(q.trim())}`);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = hits[activeIdx >= 0 ? activeIdx : 0];
      if (target) pick(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const isHero = variant === 'hero';

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={
          'flex items-center rounded-md border bg-white transition-colors ' +
          (isHero ? 'h-14 border-stone-300 px-4 shadow-sm' : 'h-11 border-stone-200 px-3') +
          ' focus-within:border-terracotta-600'
        }
      >
        <Search className={isHero ? 'size-5 shrink-0 text-stone-500' : 'size-4 shrink-0 text-stone-500'} aria-hidden />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            setActiveIdx(-1);
            // Clear stale hits the moment the input falls below the
            // 2-char fetch threshold so the dropdown doesn't keep showing
            // the previous query's results while the user is typing back.
            if (next.trim().length < 2) {
              setHits([]);
              setOpen(false);
            }
          }}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Район, ЖК, школа, мечеть, адрес…"
          className={
            'min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400 ' +
            (isHero ? 'ml-3 text-body' : 'ml-2 text-meta')
          }
          aria-label="Поиск по местам"
          autoComplete="off"
        />
      </div>
      {open && hits.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {hits.map((h, i) => {
            const Icon = KIND_ICON[h.kind] ?? Building2;
            const kindLabel = KIND_LABEL[h.kind] ?? h.kind;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => pick(h)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-meta ' +
                    (i === activeIdx ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50')
                  }
                >
                  <Icon className="size-4 shrink-0 text-stone-500" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-stone-900">{h.name}</span>
                    <span className="truncate text-caption text-stone-500">
                      {kindLabel}
                      {h.district_slug ? ` · ${h.district_slug}` : ''}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
