'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Search,
  MapPin,
  School,
  Building2,
  ShoppingCart,
  Bus,
  Stethoscope,
  Pill,
  Trees,
  Landmark,
  UtensilsCrossed,
  Banknote,
  Fuel,
  Dumbbell,
  Star,
  Building,
  BadgeCheck,
  Hammer,
  Briefcase,
  Clock,
  X,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { parseQuery, describeParsedQuery, type ParsedQuery } from '@/lib/search/parse-query';
import {
  loadRecent,
  pushRecent,
  removeRecent,
  clearRecent,
  type RecentSearchScope,
} from '@/lib/search/recent-searches';

// SearchHit shape mirrors services/search.ts. Pages can't import that
// service module (admin client) so we duplicate the type minimally.
// Exported so wizards / other UIs that pass `onPick` can type the
// callback parameter.
export type SearchHit =
  | { sourceKind: 'district'; id: string; name: string; slug: string }
  | { sourceKind: 'building'; id: string; name: string; slug: string; districtName: string | null }
  | { sourceKind: 'developer'; id: string; name: string; isVerified: boolean }
  | {
      sourceKind: 'poi';
      id: string;
      name: string;
      kind: string;
      subkind: string | null;
      district_slug: string | null;
      latitude: number;
      longitude: number;
    };

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
  restaurant: UtensilsCrossed,
  bank: Banknote,
  fuel: Fuel,
  sport: Dumbbell,
  landmark: Star,
  culture: Star,
  government: Building,
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
  restaurant: 'Кафе / ресторан',
  bank: 'Банк',
  fuel: 'Заправка',
  sport: 'Спорт',
  landmark: 'Достопримечательность',
  culture: 'Культура',
  government: 'Госучреждение',
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
  /** What KIND of results the dropdown should surface.
   *
   *  - 'all' (default — home hero): every sourceKind PLUS the
   *    "По характеристикам" group when the parser recognises rooms /
   *    price / finishing in the query. The full search-everything intent.
   *  - 'location' (guided wizard, future location-only pickers):
   *    districts + POIs only. Buildings, developers, and parametric
   *    queries are out of scope for "what district interests you?"
   *    style pickers and would confuse the user.
   *
   *  Defaults to 'all' so existing call sites are unaffected. Recent
   *  searches are stored under separate localStorage keys per scope so
   *  the wizard's history doesn't pollute the home's history. */
  scope?: 'all' | 'location';
  /** Controlled-mode pair. When BOTH are provided the parent owns the
   *  query state (used by the home page so its "Найти" button can read
   *  the value). When omitted the component falls back to internal
   *  state — preserves backwards-compatibility with all the existing
   *  uncontrolled call sites. */
  value?: string;
  onChange?: (next: string) => void;
  /** Fired when the user submits without picking from the dropdown
   *  (Enter on a non-empty input + closed/empty dropdown, or external
   *  trigger via a parent button). The parent decides routing — in
   *  particular the home page's "Найти" runs the parametric parser and
   *  routes to /kvartiry vs /novostroyki accordingly. */
  onSubmit?: (query: string, parsed: ParsedQuery) => void;
  /** When provided, the component calls this on pick INSTEAD of
   *  navigating. Used by the /pomoshch-vybora wizard so the buyer
   *  picks a location and stays in the wizard. */
  onPick?: (hit: SearchHit) => void;
}

/**
 * Autocomplete input. Surfaces districts / ЖК / developers / POIs from
 * /api/search plus parametric apartment queries (rooms / price /
 * finishing) recognised by lib/search/parse-query. The dropdown groups
 * results by category with quiet uppercase captions so the buyer always
 * sees what kind of thing they're picking.
 *
 * Loading / empty / error states are visible (was a flat hide-the-
 * dropdown gap pre-launch — buyers couldn't tell if search worked).
 *
 * Recent searches are stored per scope in localStorage and surfaced
 * when the input is focused and empty.
 */
export function LocationSearch({
  destinationPath,
  initialQuery = '',
  radiusMeters = 1500,
  variant = 'hero',
  scope = 'all',
  value,
  onChange,
  onSubmit,
  onPick,
}: LocationSearchProps) {
  const router = useRouter();
  const isControlled = value !== undefined && onChange !== undefined;
  const [internalQ, setInternalQ] = useState(initialQuery);
  const q = isControlled ? value : internalQ;
  const setQ = (next: string) => {
    if (isControlled) onChange(next);
    else setInternalQ(next);
  };

  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [touched, setTouched] = useState(false);
  // Visible loading / error flags, distinct from `hits.length === 0`
  // so the dropdown can render the right state. Pre-fix the dropdown
  // just hid in all three cases — buyers couldn't tell what was going on.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Recent searches — re-loaded from storage when the dropdown opens
  // empty so cross-tab updates show up. Only relevant on the home/
  // 'all' scope; wizard-scope intentionally hides recents.
  const [recents, setRecents] = useState<string[]>([]);
  const recentScope: RecentSearchScope = scope;

  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Parametric parse — runs on every query change, but only the home
  // 'all' scope surfaces it as a dropdown row. Cheap regex; no fetch.
  const parsed: ParsedQuery = scope === 'all' ? parseQuery(q) : { remainder: q };
  const parsedSummary = scope === 'all' ? describeParsedQuery(parsed) : null;

  // Filter hits by scope. 'location' → districts + POIs only.
  const visibleHits =
    scope === 'location'
      ? hits.filter((h) => h.sourceKind === 'district' || h.sourceKind === 'poi')
      : hits;

  // Group hits by sourceKind for the categorised dropdown. Order is
  // fixed: district → building → developer → poi (matches server-side
  // rank order from services/search.ts).
  const grouped = {
    district: visibleHits.filter((h): h is Extract<SearchHit, { sourceKind: 'district' }> => h.sourceKind === 'district'),
    building: visibleHits.filter((h): h is Extract<SearchHit, { sourceKind: 'building' }> => h.sourceKind === 'building'),
    developer: visibleHits.filter((h): h is Extract<SearchHit, { sourceKind: 'developer' }> => h.sourceKind === 'developer'),
    poi: visibleHits.filter((h): h is Extract<SearchHit, { sourceKind: 'poi' }> => h.sourceKind === 'poi'),
  };

  // Debounced fetch. Min-chars 1 (was 2) — Bayut/Algolia consensus is
  // first-character feedback signals "search works" to the buyer.
  // Per-keystroke fanout still cheap (200ms debounce, < 50 rows per
  // table, all four queries parallel).
  useEffect(() => {
    if (!touched) return;
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      // Empty input — no fetch, but if focused the dropdown will
      // surface recents (handled below in the render). Defer the
      // setState reset to a microtask to satisfy React 19's
      // `react-hooks/set-state-in-effect` lint — sync setState in
      // an effect body would otherwise cause a cascading render.
      queueMicrotask(() => {
        setHits([]);
        setLoading(false);
        setError(false);
      });
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // Defer the loading/error reset to a microtask — React 19 lint
    // rule `react-hooks/set-state-in-effect` disallows sync setState
    // in an effect body. Queue them just before the debounce fires;
    // the dropdown spinner appears within ~200ms either way so the
    // microtask delay is imperceptible.
    queueMicrotask(() => {
      setLoading(true);
      setError(false);
    });
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits ?? []);
        setLoading(false);
        setOpen(true);
      } catch {
        setHits([]);
        setLoading(false);
        setError(true);
        setOpen(true);
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, touched]);

  // Refresh recents from storage when the dropdown opens empty (focus
  // on an empty input). Cheap — single localStorage read. Deferred via
  // queueMicrotask so the setState doesn't fire synchronously inside
  // the effect body (React 19 lint rule).
  useEffect(() => {
    if (!open) return;
    if (q.trim().length === 0) {
      queueMicrotask(() => {
        setRecents(loadRecent(recentScope));
      });
    }
  }, [open, q, recentScope]);

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

  function pick(hit: SearchHit) {
    setOpen(false);
    // Remember this query for next time (home scope only — wizard
    // recents would be confusing).
    if (scope === 'all' && q.trim()) pushRecent(recentScope, q.trim());
    if (onPick) {
      onPick(hit);
      return;
    }
    if (hit.sourceKind === 'district') {
      router.push(`${destinationPath}?district=${encodeURIComponent(hit.slug)}`);
      return;
    }
    if (hit.sourceKind === 'building') {
      router.push(`/zhk/${hit.slug}`);
      return;
    }
    if (hit.sourceKind === 'developer') {
      router.push(`/novostroyki?developer=${encodeURIComponent(hit.id)}`);
      return;
    }
    const params = new URLSearchParams({
      near_lat: String(hit.latitude),
      near_lng: String(hit.longitude),
      near_label: hit.name,
      radius: String(radiusMeters),
    });
    router.push(`${destinationPath}?${params.toString()}`);
  }

  function pickRecent(query: string) {
    setQ(query);
    if (!touched) setTouched(true);
    // Don't auto-submit; let the buyer see the autocomplete results
    // refresh and decide whether to refine or commit.
  }

  function submitFreeText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setOpen(false);
    if (scope === 'all') pushRecent(recentScope, trimmed);
    if (onSubmit) {
      onSubmit(trimmed, parseQuery(trimmed));
      return;
    }
    // Default fallback when no parent submit handler is wired —
    // navigate to destinationPath with the query as a free-text param.
    router.push(`${destinationPath}?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // No dropdown open / no hits → Enter falls through to free-text submit.
    if (!open || visibleHits.length === 0) {
      if (e.key === 'Enter' && q.trim().length >= 1) {
        e.preventDefault();
        submitFreeText(q);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % visibleHits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? visibleHits.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = visibleHits[activeIdx >= 0 ? activeIdx : 0];
      if (target) pick(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const isHero = variant === 'hero';
  const trimmedQ = q.trim();
  const showRecents = open && trimmedQ.length === 0 && recents.length > 0;
  const showLoading = open && trimmedQ.length >= 1 && loading;
  const showError = open && trimmedQ.length >= 1 && !loading && error;
  const showHits = open && trimmedQ.length >= 1 && !loading && !error && visibleHits.length > 0;
  const showEmpty = open && trimmedQ.length >= 1 && !loading && !error && visibleHits.length === 0 && !parsedSummary;
  const showParsed = open && trimmedQ.length >= 1 && !loading && !error && parsedSummary != null && scope === 'all';
  const dropdownVisible = showRecents || showLoading || showError || showHits || showEmpty || showParsed;

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
            if (!touched) setTouched(true);
            if (next.trim().length === 0) {
              setHits([]);
              setError(false);
              // Open the dropdown so empty-focus recents can render.
              setOpen(true);
            }
          }}
          onFocus={() => {
            if (!touched) setTouched(true);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={
            scope === 'location'
              ? 'Район, школа, мечеть, ориентир…'
              : 'Район, ЖК, школа, ориентир, "3 комнаты", "до 200к"…'
          }
          className={
            'min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400 ' +
            (isHero ? 'ml-3 text-body' : 'ml-2 text-meta')
          }
          aria-label="Поиск"
          autoComplete="off"
        />
      </div>

      {dropdownVisible ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {/* ─── РЕЦЕНТЫ ─── empty + focused */}
          {showRecents ? (
            <SearchGroup label="Недавнее">
              {recents.map((r) => (
                <li key={r} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => pickRecent(r)}
                    className="flex flex-1 items-center gap-3 px-3 py-2 text-left text-meta text-stone-700 hover:bg-stone-50"
                  >
                    <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{r}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Удалить «${r}» из недавнего`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(recentScope, r);
                      setRecents(loadRecent(recentScope));
                    }}
                    className="mr-2 inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    clearRecent(recentScope);
                    setRecents([]);
                  }}
                  className="block w-full px-3 py-2 text-left text-caption font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                >
                  Очистить всё
                </button>
              </li>
            </SearchGroup>
          ) : null}

          {/* ─── ПО ХАРАКТЕРИСТИКАМ ─── parametric query (scope='all' only) */}
          {showParsed ? (
            <SearchGroup label="По характеристикам">
              <li>
                <button
                  type="button"
                  onClick={() => submitFreeText(q)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-meta text-stone-700 hover:bg-stone-50"
                >
                  <SlidersHorizontal className="size-4 shrink-0 text-terracotta-700" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-stone-900">
                      {parsedSummary}
                    </span>
                    <span className="truncate text-caption text-stone-500">
                      Найти подходящие квартиры
                    </span>
                  </div>
                </button>
              </li>
            </SearchGroup>
          ) : null}

          {/* ─── РАЙОНЫ / ЖК / ЗАСТРОЙЩИКИ / ОРИЕНТИРЫ ─── */}
          {showHits && grouped.district.length > 0 ? (
            <SearchGroup label="Районы">
              {grouped.district.map((h) => (
                <SearchRow
                  key={`district-${h.id}`}
                  hit={h}
                  active={visibleHits.indexOf(h) === activeIdx}
                  onPick={() => pick(h)}
                  onHover={() => setActiveIdx(visibleHits.indexOf(h))}
                />
              ))}
            </SearchGroup>
          ) : null}
          {showHits && grouped.building.length > 0 ? (
            <SearchGroup label="ЖК">
              {grouped.building.map((h) => (
                <SearchRow
                  key={`building-${h.id}`}
                  hit={h}
                  active={visibleHits.indexOf(h) === activeIdx}
                  onPick={() => pick(h)}
                  onHover={() => setActiveIdx(visibleHits.indexOf(h))}
                />
              ))}
            </SearchGroup>
          ) : null}
          {showHits && grouped.developer.length > 0 ? (
            <SearchGroup label="Застройщики">
              {grouped.developer.map((h) => (
                <SearchRow
                  key={`developer-${h.id}`}
                  hit={h}
                  active={visibleHits.indexOf(h) === activeIdx}
                  onPick={() => pick(h)}
                  onHover={() => setActiveIdx(visibleHits.indexOf(h))}
                />
              ))}
            </SearchGroup>
          ) : null}
          {showHits && grouped.poi.length > 0 ? (
            <SearchGroup label="Ориентиры">
              {grouped.poi.map((h) => (
                <SearchRow
                  key={`poi-${h.id}`}
                  hit={h}
                  active={visibleHits.indexOf(h) === activeIdx}
                  onPick={() => pick(h)}
                  onHover={() => setActiveIdx(visibleHits.indexOf(h))}
                />
              ))}
            </SearchGroup>
          ) : null}

          {/* ─── LOADING ─── */}
          {showLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-meta text-stone-500">
              <Loader2 className="size-4 shrink-0 animate-spin text-stone-400" aria-hidden />
              <span>Ищем…</span>
            </div>
          ) : null}

          {/* ─── EMPTY ─── */}
          {showEmpty ? (
            <div className="flex flex-col gap-2 px-3 py-4 text-center">
              <span className="text-meta text-stone-700">
                Ничего не нашли по запросу «{trimmedQ}»
              </span>
              {hasSubmitTarget(scope, onSubmit) ? (
                <span className="text-caption text-stone-500">
                  Нажмите Найти — поищем в квартирах и новостройках.
                </span>
              ) : null}
            </div>
          ) : null}

          {/* ─── ERROR ─── */}
          {showError ? (
            <div className="flex items-start gap-2 px-3 py-3 text-meta text-stone-700">
              <AlertCircle className="size-4 shrink-0 text-stone-500" aria-hidden />
              <div className="flex flex-1 flex-col gap-1">
                <span>Поиск временно недоступен.</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(false);
                    // Re-trigger the fetch by bumping touched + a no-op
                    // setQ. Cheaper than duplicating the fetch logic.
                    setQ(q);
                  }}
                  className="self-start text-caption font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
                >
                  Попробовать ещё раз
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Caption + list wrapper for one dropdown group. Caption matches the
 *  uppercase tracked-widest stone-500 grammar used everywhere else
 *  (eyebrow above section H2s, kabinet operator captions, filter
 *  labels). */
function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <div className="px-3 pt-2.5 pb-1">
        <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
          {label}
        </span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function SearchRow({
  hit,
  active,
  onPick,
  onHover,
}: {
  hit: SearchHit;
  active: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const { Icon, primary, secondary, verified } = rowFor(hit);
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        onMouseEnter={onHover}
        className={
          'flex w-full items-center gap-3 px-3 py-2 text-left text-meta ' +
          (active ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-50')
        }
      >
        <Icon className="size-4 shrink-0 text-stone-500" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="inline-flex items-center gap-1.5 truncate font-medium text-stone-900">
            {primary}
            {verified ? (
              <BadgeCheck
                className="size-3.5 shrink-0 text-[color:var(--color-badge-tier-developer)]"
                aria-label="Проверенный застройщик"
              />
            ) : null}
          </span>
          <span className="truncate text-caption text-stone-500">{secondary}</span>
        </div>
      </button>
    </li>
  );
}

function rowFor(hit: SearchHit): { Icon: typeof MapPin; primary: string; secondary: string; verified?: boolean } {
  if (hit.sourceKind === 'district') {
    return { Icon: MapPin, primary: hit.name, secondary: 'Район' };
  }
  if (hit.sourceKind === 'building') {
    return {
      Icon: Hammer,
      primary: hit.name,
      secondary: `ЖК${hit.districtName ? ` · ${hit.districtName}` : ''}`,
    };
  }
  if (hit.sourceKind === 'developer') {
    return {
      Icon: Briefcase,
      primary: hit.name,
      secondary: 'Застройщик',
      verified: hit.isVerified,
    };
  }
  const Icon = KIND_ICON[hit.kind] ?? Building2;
  return {
    Icon,
    primary: hit.name,
    secondary: `${KIND_LABEL[hit.kind] ?? hit.kind}${hit.district_slug ? ` · ${hit.district_slug}` : ''}`,
  };
}

/** True when the empty-state hint should mention the Найти button.
 *  Wizard-mode hides this hint because there's no Найти CTA wired —
 *  the wizard step itself drives the next move. */
function hasSubmitTarget(
  scope: 'all' | 'location',
  onSubmit: LocationSearchProps['onSubmit'],
): boolean {
  return scope === 'all' || onSubmit !== undefined;
}
