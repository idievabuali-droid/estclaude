'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { FilterChipSheet } from '@/components/blocks';
import { mockDistricts } from '@/lib/mock';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * HeroChipRow — the home page's primary action affordance.
 *
 * Replaces the prior HeroSearchRow + sparkle-link to /pomoshch-vybora.
 * The 5-step wizard is retired (2026-05-21): chip filters give the
 * same result set in fewer taps.
 *
 * Structure:
 *   1. Segmented control [Новостройки (default) | Квартиры] — gates
 *      which destination the Показать CTA navigates to, and which
 *      extra chips appear when "Ещё фильтры" is expanded.
 *   2. Three always-visible base chips: Комнат / Цена / Район.
 *   3. "Ещё фильтры" inline expander → four type-aware extras:
 *        Новостройки → Площадь / Этаж / Стадия / Сдача
 *        Квартиры    → Площадь / Этаж / Отделка / В рассрочку
 *   4. Primary "Показать N квартир/новостроек" CTA — live count via
 *      thin /api/listings/count + /api/buildings/count endpoints.
 *
 * Naming + sheet shapes mirror the destination filter rails 1:1 so a
 * buyer who picks a chip here and lands on /novostroyki or /kvartiry
 * sees the same control labelled the same way:
 *   - PriceChipHero matches `/(kvartiry|novostroyki)/PriceChip` —
 *     label "Цена", sheetTitle "Цена, TJS", от + до inputs + presets.
 *   - MonthlyChipHero matches `/kvartiry/MonthlyChip` — label
 *     "В рассрочку", sheetTitle "Платёж в месяц", до + presets
 *     [2k,3k,4k,5k,7k] + tagline.
 *   - FloorChipHero matches `/(kvartiry|novostroyki)/FloorChip` —
 *     label "Этаж", sheetTitle "Этаж", integer от + до.
 *   - SizeChipHero matches `/(kvartiry|novostroyki)/SizeChip` —
 *     label "Площадь", sheetTitle "Площадь, м²", decimal от + до.
 *   - Rooms uses 1/2/3/4 (matches both rails' ROOM_FILTERS exactly).
 *   - Preset taps commit immediately to parent state (matches the
 *     `commit(...)` call inside the listing-page chips' preset onClick).
 *
 * State is local — committed chip values DO NOT go into the URL (the
 * home is `/` and a polluted URL hurts shareability / SEO). State is
 * mirrored to sessionStorage so back-nav from a destination page returns
 * to the same chip selection. Survives back/forward, dies on tab close.
 *
 * Type-flip preserves the hidden type's chip values silently — switching
 * from Новостройки to Квартиры and back restores Стадия/Сдача, matching
 * the wizard's lump-sum-vs-installment behaviour.
 *
 * Удобства / Что рядом intentionally omitted from the hero — both rails
 * treat them as advanced (Что рядом has 8 POI categories, Удобства has 6
 * amenities — too many options to expose in a hero chip without sprawl).
 * Buyers who care about either find them on the destination filter rail.
 */

type HeroType = 'novostroyki' | 'kvartiry';

interface ChipState {
  // Shared across both destinations
  rooms: string[];
  price_from: string;
  price_to: string;
  district: string[];
  size_from: string;
  size_to: string;
  floor_from: string;
  floor_to: string;
  // Квартиры extras
  finishing: string[];
  monthly_to: string;
  // Новостройки extras
  status: string[];
  handover: string[];
}

interface PersistedState {
  type: HeroType;
  expanded: boolean;
  state: ChipState;
}

const DEFAULT_STATE: ChipState = {
  rooms: [],
  price_from: '',
  price_to: '',
  district: [],
  size_from: '',
  size_to: '',
  floor_from: '',
  floor_to: '',
  finishing: [],
  monthly_to: '',
  status: [],
  handover: [],
};

const SESSION_KEY = 'vafo:hero-chips';

// ─── option sets ────────────────────────────────────────────
// Matches ROOM_FILTERS in both /kvartiry/FilterRail.tsx and
// /novostroyki/FilterRail.tsx — 1/2/3/4 only. 5+ apartments are rare in
// Vahdat new builds; buyers can still pick multiple values (e.g. 3+4)
// to express "3 or more bedrooms".
const ROOMS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

// Matches FINISHING_FILTERS in /kvartiry/FilterRail.tsx exactly.
const FINISHING_OPTIONS = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

// Matches STATUS_FILTERS in /novostroyki/FilterRail.tsx exactly.
// Values come from the BuildingStatus enum in types/domain.ts.
const STATUS_OPTIONS = [
  { value: 'announced', label: 'Котлован' },
  { value: 'under_construction', label: 'Строится' },
  { value: 'near_completion', label: 'Почти готов' },
  { value: 'delivered', label: 'Сдан' },
];

// Matches HANDOVER_FILTERS in /novostroyki/FilterRail.tsx exactly.
const HANDOVER_OPTIONS = [
  { value: 'delivered', label: 'Сдан' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028+', label: '2028+' },
];

// Matches the preset list in /novostroyki/PriceChip.tsx — 5 values
// covering the Vahdat new-build budget bracket. /kvartiry/PriceChip
// has no presets (leaner intentional choice), but typed inputs work
// identically on both pages.
const PRICE_PRESETS_TJS = [150_000, 200_000, 250_000, 300_000, 400_000];

// Matches /kvartiry/MonthlyChip preset list exactly: 2k / 3k / 4k / 5k
// / 7k. Faridun's installment range.
const MONTHLY_PRESETS_TJS = [2_000, 3_000, 4_000, 5_000, 7_000];

// ─── helpers ────────────────────────────────────────────────
const formatNum = (v: string | number) => {
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('ru-RU').format(n);
};

const formatM2 = (v: string) => {
  if (!v) return '';
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
};

/** Russian plural picker. 1 → one, 2-4 → few, 5+ → many (with the
 *  11-14 special case). */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

const kvartiraLabel = (n: number) => plural(n, 'квартиру', 'квартиры', 'квартир');
const novostroykaLabel = (n: number) =>
  plural(n, 'новостройку', 'новостройки', 'новостроек');

/** Compose URL search params from a partial map, skipping empties. */
function buildQuery(params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** Convert the chip accumulator into the URL param shape the count
 *  endpoints (and the destination pages) understand. Drops empty
 *  filters so the URL stays clean. The destination-page param schema
 *  is shared between /kvartiry, /novostroyki, /api/listings/count and
 *  /api/buildings/count — see those files for the canonical mapping.
 *
 *  Floor + size + price are apartment-criteria dimensions and work on
 *  BOTH destinations (each listing has size/floor; building queries
 *  filter to "has ≥1 listing matching"). The type-specific branch only
 *  picks the right set of extras (Стадия/Сдача vs Отделка/В рассрочку). */
function stateToParams(type: HeroType, state: ChipState): Record<string, string> {
  const p: Record<string, string> = {};
  if (state.rooms.length) p.rooms = state.rooms.join(',');
  if (state.price_from) p.price_from = state.price_from;
  if (state.price_to) p.price_to = state.price_to;
  if (state.district.length) p.district = state.district.join(',');
  if (state.size_from) p.size_from = state.size_from;
  if (state.size_to) p.size_to = state.size_to;
  if (state.floor_from) p.floor_from = state.floor_from;
  if (state.floor_to) p.floor_to = state.floor_to;
  if (type === 'kvartiry') {
    if (state.finishing.length) p.finishing = state.finishing.join(',');
    if (state.monthly_to) p.monthly_to = state.monthly_to;
  } else {
    if (state.status.length) p.status = state.status.join(',');
    if (state.handover.length) p.handover = state.handover.join(',');
  }
  return p;
}

/** List of filters currently in play — for the hero_search_submitted
 *  analytics event. Tells us which chips are most often committed. */
function activeFilterKeys(type: HeroType, state: ChipState): string[] {
  const keys: string[] = [];
  if (state.rooms.length) keys.push('rooms');
  if (state.price_from || state.price_to) keys.push('price');
  if (state.district.length) keys.push('district');
  if (state.size_from || state.size_to) keys.push('size');
  if (state.floor_from || state.floor_to) keys.push('floor');
  if (type === 'kvartiry') {
    if (state.finishing.length) keys.push('finishing');
    if (state.monthly_to) keys.push('monthly');
  } else {
    if (state.status.length) keys.push('stage');
    if (state.handover.length) keys.push('handover');
  }
  return keys;
}

// ─── component ──────────────────────────────────────────────
export function HeroChipRow() {
  const router = useRouter();
  const [type, setType] = useState<HeroType>('novostroyki');
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<ChipState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  // Hydrate from sessionStorage on mount. SSR snapshot is the defaults,
  // so the first paint matches the server output (no hydration mismatch);
  // a useEffect swap reads the persisted state on the client. The
  // setStates here are intentional (one-time hydration, not a sync
  // loop) — the linter rule is general guidance, not a hard ban.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        if (saved.type === 'novostroyki' || saved.type === 'kvartiry') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setType(saved.type);
        }
        if (typeof saved.expanded === 'boolean') {
          setExpanded(saved.expanded);
        }
        if (saved.state && typeof saved.state === 'object') {
          setState({ ...DEFAULT_STATE, ...saved.state });
        }
      }
    } catch {
      // Corrupt JSON / privacy-mode sessionStorage — fall back to defaults.
    }
    setHydrated(true);
  }, []);

  // Persist after hydration. Skip the first render so we don't overwrite
  // saved state with the defaults before hydration completes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedState = { type, expanded, state };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      // Storage quota / privacy mode — non-fatal.
    }
  }, [hydrated, type, expanded, state]);

  // Live count fetch — debounced 250ms, AbortController cancels in-flight
  // requests on rapid chip changes so the latest filter set wins. setCount
  // is called inside the fetch callback (not in the effect body) so the
  // lint rule doesn't trigger here.
  const abortRef = useRef<AbortController | null>(null);
  const params = useMemo(() => stateToParams(type, state), [type, state]);
  useEffect(() => {
    if (!hydrated) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const endpoint =
      type === 'novostroyki' ? '/api/buildings/count' : '/api/listings/count';
    const url = `${endpoint}${buildQuery(params)}`;
    const handle = window.setTimeout(() => {
      fetch(url, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { count: null }))
        .then((data: { count?: number | null }) => {
          if (ctrl.signal.aborted) return;
          setCount(typeof data.count === 'number' ? data.count : null);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          // Network or fetch error — drop the number, the CTA falls
          // back to a count-free label. Don't surface the error.
          setCount(null);
        });
    }, 250);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [hydrated, type, params]);

  function setChipValue<K extends keyof ChipState>(key: K, value: ChipState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  // Whether any chip has a non-empty value — drives the visibility of
  // the global "Сбросить всё" link. Mirrors `hasAnyFilter` in the
  // /kvartiry and /novostroyki filter rails.
  const hasAnyFilter =
    state.rooms.length > 0 ||
    state.price_from !== '' ||
    state.price_to !== '' ||
    state.district.length > 0 ||
    state.size_from !== '' ||
    state.size_to !== '' ||
    state.floor_from !== '' ||
    state.floor_to !== '' ||
    state.finishing.length > 0 ||
    state.monthly_to !== '' ||
    state.status.length > 0 ||
    state.handover.length > 0;

  function resetAll() {
    setState(DEFAULT_STATE);
    track('hero_chip_committed', { chip: 'reset_all', value_summary: null });
  }

  function submit() {
    const q = buildQuery(params);
    const dest = type === 'novostroyki' ? '/novostroyki' : '/kvartiry';
    track('hero_search_submitted', {
      destination: type,
      filters_applied: activeFilterKeys(type, state),
      count: count ?? -1,
    });
    router.push(`${dest}${q}`);
  }

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    track('hero_more_filters_toggled', { expanded: next, type });
  }

  // CTA label — pluralised noun, count omitted if the fetch is still in
  // flight on first paint (avoids flicker from "Показать варианты" → "47").
  const ctaLabel = (() => {
    if (count == null) {
      return type === 'novostroyki' ? 'Показать новостройки' : 'Показать квартиры';
    }
    const noun =
      type === 'novostroyki' ? novostroykaLabel(count) : kvartiraLabel(count);
    return `Показать ${formatNum(count)} ${noun}`;
  })();

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3 md:gap-4">
      {/* Type segmented control — pill-style binary toggle. Default
          tab is Новостройки (brand wedge); flipping to Квартиры swaps
          which extra chips render. Width capped at max-w-md across
          breakpoints so the segmented sits visually balanced above the
          chip rows (was md:w-fit, which made it narrower than the chip
          row on desktop — read as a different element). */}
      <div
        role="tablist"
        aria-label="Что вы ищете"
        className="inline-flex w-full max-w-md rounded-full border border-stone-200 bg-stone-50 p-1"
      >
        {(
          [
            { id: 'novostroyki' as const, label: 'Новостройки' },
            { id: 'kvartiry' as const, label: 'Квартиры' },
          ]
        ).map((tab) => {
          const active = type === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setType(tab.id)}
              className={cn(
                'flex-1 rounded-full px-5 py-2 text-meta font-semibold transition-colors md:flex-none',
                active
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Always-visible base chips — Комнат / Цена / Район. */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <RoomsChipHero
          value={state.rooms}
          onCommit={(v) => setChipValue('rooms', v)}
        />
        <PriceChipHero
          from={state.price_from}
          to={state.price_to}
          onCommit={(f, t) => {
            setState((prev) => ({ ...prev, price_from: f, price_to: t }));
          }}
        />
        <DistrictChipHero
          value={state.district}
          onCommit={(v) => setChipValue('district', v)}
        />
      </div>

      {/* Type-aware extras — visible only when expanded. Four chips per
          type. Quotes the canonical filter set on each destination rail
          (minus Что рядом / Удобства which are advanced on /novostroyki).
          Grid 2x2 on mobile (place-items-center so each chip sits in
          the middle of its grid cell — same visual balance as the base
          row), free-flow flex on md+ where all 4 fit in a single row.
          Without the grid override the wrap was 3+1 with the last chip
          floating alone, which read as unintentional. */}
      {expanded ? (
        <div className="grid w-full grid-cols-2 place-items-center gap-2 md:flex md:flex-wrap md:items-center md:justify-center">
          <SizeChipHero
            from={state.size_from}
            to={state.size_to}
            onCommit={(f, t) => {
              setState((prev) => ({ ...prev, size_from: f, size_to: t }));
            }}
          />
          <FloorChipHero
            from={state.floor_from}
            to={state.floor_to}
            onCommit={(f, t) => {
              setState((prev) => ({ ...prev, floor_from: f, floor_to: t }));
            }}
          />
          {type === 'kvartiry' ? (
            <>
              <FinishingChipHero
                value={state.finishing}
                onCommit={(v) => setChipValue('finishing', v)}
              />
              <MonthlyChipHero
                value={state.monthly_to}
                onCommit={(v) => setChipValue('monthly_to', v)}
              />
            </>
          ) : (
            <>
              <StageChipHero
                value={state.status}
                onCommit={(v) => setChipValue('status', v)}
              />
              <HandoverChipHero
                value={state.handover}
                onCommit={(v) => setChipValue('handover', v)}
              />
            </>
          )}
        </div>
      ) : null}

      {/* Expander + global reset — Cian's "Расширенный поиск" pattern
          on the left; global reset on the right, only when ≥1 filter is
          set. The reset mirrors /kvartiry and /novostroyki rails' global
          "Сбросить всё" terracotta link, so a buyer who's set many chips
          can start over in one tap instead of clearing each individually. */}
      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={toggleExpand}
          className="inline-flex items-center gap-1 text-meta font-medium text-stone-600 hover:text-terracotta-700"
        >
          {expanded ? (
            <>
              Свернуть фильтры
              <ChevronUp className="size-3.5" aria-hidden />
            </>
          ) : (
            <>
              Ещё фильтры
              <ChevronDown className="size-3.5" aria-hidden />
            </>
          )}
        </button>
        {hasAnyFilter ? (
          <>
            <span className="text-stone-300" aria-hidden>·</span>
            <button
              type="button"
              onClick={resetAll}
              className="text-meta font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
            >
              Сбросить всё
            </button>
          </>
        ) : null}
      </div>

      {/* Primary CTA — dark stone-900 to match the existing "Найти"
          button visual weight on the prior hero. Live count label;
          renders without count when the fetch is still in flight. */}
      <button
        type="button"
        onClick={submit}
        className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-md bg-stone-900 px-6 text-meta font-semibold text-white transition-colors hover:bg-stone-800 active:bg-stone-700"
      >
        <span className="tabular-nums">{ctaLabel}</span>
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

// ─── chip sub-components ────────────────────────────────────
// Each chip wraps FilterChipSheet. Pending state lives locally; Apply
// commits to the parent's state; Reset zeros the local pending; the
// chip's X clears the parent value directly (one tap).
//
// Preset taps commit immediately to the parent state (matches the
// `commit(...)` call inside `/(kvartiry|novostroyki)/(Price|Monthly)Chip`
// preset onClick handlers) — so the chip face shows the new value
// without needing a second Apply tap.

interface MultiSelectChipProps {
  value: string[];
  onCommit: (next: string[]) => void;
}

function trackOpened(chip: string) {
  track('hero_chip_opened', { chip });
}

function trackCommitted(chip: string, summary: unknown) {
  track('hero_chip_committed', { chip, value_summary: summary });
}

/** Rooms multi-select: pill grid 1/2/3/4 — matches ROOM_FILTERS in
 *  both /kvartiry/FilterRail and /novostroyki/FilterRail exactly. */
function RoomsChipHero({ value, onCommit }: MultiSelectChipProps) {
  const [pending, setPending] = useState<Set<string>>(new Set(value));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(new Set(value));
  }, [value]);

  function toggle(v: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  const summary = (() => {
    if (value.length === 0) return undefined;
    const labels = ROOMS_OPTIONS.filter((o) => value.includes(o.value)).map(
      (o) => o.label,
    );
    return `Комнат: ${labels.join(', ')}`;
  })();

  const hasPending =
    pending.size !== value.length ||
    [...pending].some((v) => !value.includes(v));

  return (
    <FilterChipSheet
      label="Комнат"
      valueSummary={summary}
      sheetTitle="Сколько комнат?"
      hasPending={hasPending}
      onOpen={() => trackOpened('rooms')}
      onApply={() => {
        const next = Array.from(pending);
        onCommit(next);
        trackCommitted('rooms', next);
      }}
      onReset={() => setPending(new Set())}
      onClear={() => onCommit([])}
    >
      <div className="flex flex-wrap gap-2">
        {ROOMS_OPTIONS.map((opt) => {
          const active = pending.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-11 min-w-[3rem] items-center justify-center rounded-sm border px-4 text-meta font-semibold tabular-nums transition-colors',
                active
                  ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </FilterChipSheet>
  );
}

interface RangeChipProps {
  from: string;
  to: string;
  onCommit: (from: string, to: string) => void;
}

/** Total-price range chip — label "Цена", sheetTitle "Цена, TJS".
 *  Mirrors `/novostroyki/PriceChip` exactly: от + до inputs + 5 preset
 *  ceilings [150k / 200k / 250k / 300k / 400k]. Preset tap zeros `от`
 *  and sets `до` (matches the canonical preset behavior — a preset is
 *  a budget ceiling, not a range). */
function PriceChipHero({ from, to, onCommit }: RangeChipProps) {
  const [pendingFrom, setPendingFrom] = useState(from);
  const [pendingTo, setPendingTo] = useState(to);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingFrom(from);
    setPendingTo(to);
  }, [from, to]);

  const summary = (() => {
    if (from && to) return `${formatNum(from)} – ${formatNum(to)} TJS`;
    if (from) return `от ${formatNum(from)} TJS`;
    if (to) return `до ${formatNum(to)} TJS`;
    return undefined;
  })();

  const hasPending = pendingFrom !== from || pendingTo !== to;

  return (
    <FilterChipSheet
      label="Цена"
      valueSummary={summary}
      sheetTitle="Цена, TJS"
      hasPending={hasPending}
      onOpen={() => trackOpened('price')}
      onApply={() => {
        const f = pendingFrom.trim();
        const t = pendingTo.trim();
        onCommit(f, t);
        trackCommitted('price', { from: f || null, to: t || null });
      }}
      onReset={() => {
        setPendingFrom('');
        setPendingTo('');
      }}
      onClear={() => onCommit('', '')}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="hero-price-from" className="text-caption text-stone-500">
              от, TJS
            </label>
            <input
              id="hero-price-from"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="100 000"
              value={pendingFrom}
              onChange={(e) => setPendingFrom(e.target.value)}
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="hero-price-to" className="text-caption text-stone-500">
              до, TJS
            </label>
            <input
              id="hero-price-to"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="500 000"
              value={pendingTo}
              onChange={(e) => setPendingTo(e.target.value)}
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS_TJS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPendingFrom('');
                setPendingTo(String(preset));
                onCommit('', String(preset));
                trackCommitted('price', { from: null, to: String(preset) });
              }}
              className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-white px-3 text-caption font-medium tabular-nums text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              до {formatNum(preset)} TJS
            </button>
          ))}
        </div>
      </div>
    </FilterChipSheet>
  );
}

/** District multi-select — hero-only chip. /kvartiry and /novostroyki
 *  rails don't currently expose district filtering (Vahdat is small),
 *  but the URL param is wired through to the count endpoints + page
 *  filtering so the hero can use it. */
function DistrictChipHero({ value, onCommit }: MultiSelectChipProps) {
  const [pending, setPending] = useState<Set<string>>(new Set(value));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(new Set(value));
  }, [value]);

  const options = useMemo(
    () => mockDistricts.map((d) => ({ value: d.slug, label: d.name.ru })),
    [],
  );

  function toggle(v: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  const summary = (() => {
    if (value.length === 0) return undefined;
    const labels = options
      .filter((o) => value.includes(o.value))
      .map((o) => o.label);
    if (labels.length === 1) return `Район: ${labels[0]}`;
    if (labels.length === 2) return `Район: ${labels[0]}, ${labels[1]}`;
    return `Район: ${labels.length}`;
  })();

  const hasPending =
    pending.size !== value.length ||
    [...pending].some((v) => !value.includes(v));

  return (
    <FilterChipSheet
      label="Район"
      valueSummary={summary}
      sheetTitle="В каком районе?"
      hasPending={hasPending}
      onOpen={() => trackOpened('district')}
      onApply={() => {
        const next = Array.from(pending);
        onCommit(next);
        trackCommitted('district', next);
      }}
      onReset={() => setPending(new Set())}
      onClear={() => onCommit([])}
    >
      <MultiOptionGrid
        options={options}
        active={(v) => pending.has(v)}
        onToggle={toggle}
      />
    </FilterChipSheet>
  );
}

/** Apartment-size range — label "Площадь", sheetTitle "Площадь, м²".
 *  Mirrors `/(kvartiry|novostroyki)/SizeChip` exactly: decimal от + до,
 *  step 0.5 (Tajik listings often state half-meters). */
function SizeChipHero({ from, to, onCommit }: RangeChipProps) {
  const [pendingFrom, setPendingFrom] = useState(from);
  const [pendingTo, setPendingTo] = useState(to);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingFrom(from);
    setPendingTo(to);
  }, [from, to]);

  const summary = (() => {
    if (from && to) return `${formatM2(from)} – ${formatM2(to)} м²`;
    if (from) return `от ${formatM2(from)} м²`;
    if (to) return `до ${formatM2(to)} м²`;
    return undefined;
  })();

  const hasPending = pendingFrom !== from || pendingTo !== to;

  return (
    <FilterChipSheet
      label="Площадь"
      valueSummary={summary}
      sheetTitle="Площадь, м²"
      hasPending={hasPending}
      onOpen={() => trackOpened('size')}
      onApply={() => {
        const f = pendingFrom.trim();
        const t = pendingTo.trim();
        onCommit(f, t);
        trackCommitted('size', { from: f || null, to: t || null });
      }}
      onReset={() => {
        setPendingFrom('');
        setPendingTo('');
      }}
      onClear={() => onCommit('', '')}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="hero-size-from" className="text-caption text-stone-500">
            от, м²
          </label>
          <input
            id="hero-size-from"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="40"
            value={pendingFrom}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="hero-size-to" className="text-caption text-stone-500">
            до, м²
          </label>
          <input
            id="hero-size-to"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="80"
            value={pendingTo}
            onChange={(e) => setPendingTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
      </div>
    </FilterChipSheet>
  );
}

/** Apartment floor range — label "Этаж", sheetTitle "Этаж". Mirrors
 *  `/(kvartiry|novostroyki)/FloorChip` exactly: integer от + до, step 1.
 *  No presets (matches canonical — there's no natural "popular floor
 *  range" since the realistic band depends on the building's total
 *  floors, which varies project to project). */
function FloorChipHero({ from, to, onCommit }: RangeChipProps) {
  const [pendingFrom, setPendingFrom] = useState(from);
  const [pendingTo, setPendingTo] = useState(to);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingFrom(from);
    setPendingTo(to);
  }, [from, to]);

  const summary = (() => {
    if (from && to) return `${from} – ${to} эт`;
    if (from) return `от ${from} эт`;
    if (to) return `до ${to} эт`;
    return undefined;
  })();

  const hasPending = pendingFrom !== from || pendingTo !== to;

  return (
    <FilterChipSheet
      label="Этаж"
      valueSummary={summary}
      sheetTitle="Этаж"
      hasPending={hasPending}
      onOpen={() => trackOpened('floor')}
      onApply={() => {
        const f = pendingFrom.trim();
        const t = pendingTo.trim();
        onCommit(f, t);
        trackCommitted('floor', { from: f || null, to: t || null });
      }}
      onReset={() => {
        setPendingFrom('');
        setPendingTo('');
      }}
      onClear={() => onCommit('', '')}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="hero-floor-from" className="text-caption text-stone-500">
            от
          </label>
          <input
            id="hero-floor-from"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="3"
            value={pendingFrom}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="hero-floor-to" className="text-caption text-stone-500">
            до
          </label>
          <input
            id="hero-floor-to"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="10"
            value={pendingTo}
            onChange={(e) => setPendingTo(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
        </div>
      </div>
    </FilterChipSheet>
  );
}

/** Finishing multi-select — label "Отделка". Options match
 *  FINISHING_FILTERS in `/kvartiry/FilterRail` exactly. */
function FinishingChipHero({ value, onCommit }: MultiSelectChipProps) {
  const [pending, setPending] = useState<Set<string>>(new Set(value));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(new Set(value));
  }, [value]);

  function toggle(v: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  const summary = (() => {
    if (value.length === 0) return undefined;
    if (value.length === 1) {
      return (
        FINISHING_OPTIONS.find((o) => o.value === value[0])?.label ?? undefined
      );
    }
    return `Отделка: ${value.length}`;
  })();

  const hasPending =
    pending.size !== value.length ||
    [...pending].some((v) => !value.includes(v));

  return (
    <FilterChipSheet
      label="Отделка"
      valueSummary={summary}
      sheetTitle="Какая отделка?"
      hasPending={hasPending}
      onOpen={() => trackOpened('finishing')}
      onApply={() => {
        const next = Array.from(pending);
        onCommit(next);
        trackCommitted('finishing', next);
      }}
      onReset={() => setPending(new Set())}
      onClear={() => onCommit([])}
    >
      <MultiOptionGrid
        options={FINISHING_OPTIONS}
        active={(v) => pending.has(v)}
        onToggle={toggle}
      />
    </FilterChipSheet>
  );
}

interface SingleCeilingChipProps {
  value: string;
  onCommit: (next: string) => void;
}

/** Monthly-payment ceiling — label "В рассрочку", sheetTitle "Платёж в
 *  месяц". Mirrors `/kvartiry/MonthlyChip` exactly: до input + presets
 *  [2k / 3k / 4k / 5k / 7k] + tagline. Preset tap commits immediately
 *  to match canonical behavior. */
function MonthlyChipHero({ value, onCommit }: SingleCeilingChipProps) {
  const [pending, setPending] = useState(value);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(value);
  }, [value]);

  const summary = value ? `до ${formatNum(value)} TJS / мес` : undefined;
  const hasPending = pending !== value;

  return (
    <FilterChipSheet
      label="В рассрочку"
      valueSummary={summary}
      sheetTitle="Платёж в месяц"
      hasPending={hasPending}
      onOpen={() => trackOpened('monthly')}
      onApply={() => {
        onCommit(pending.trim());
        trackCommitted('monthly', pending.trim() || null);
      }}
      onReset={() => setPending('')}
      onClear={() => onCommit('')}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="hero-monthly-to" className="text-caption text-stone-500">
            до, TJS / мес
          </label>
          <input
            id="hero-monthly-to"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="4 000"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
          />
          <p className="text-caption text-stone-500">
            Покажем только квартиры с рассрочкой и платежом не выше указанного.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {MONTHLY_PRESETS_TJS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPending(String(preset));
                onCommit(String(preset));
                trackCommitted('monthly', String(preset));
              }}
              className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-white px-3 text-caption font-medium tabular-nums text-stone-700 transition-colors hover:border-terracotta-400 hover:bg-terracotta-50 hover:text-terracotta-700"
            >
              до {formatNum(preset)} TJS
            </button>
          ))}
        </div>
      </div>
    </FilterChipSheet>
  );
}

function StageChipHero({ value, onCommit }: MultiSelectChipProps) {
  return (
    <SimpleMultiSheet
      chip="stage"
      label="Стадия"
      sheetTitle="На какой стадии?"
      options={STATUS_OPTIONS}
      value={value}
      onCommit={onCommit}
    />
  );
}

function HandoverChipHero({ value, onCommit }: MultiSelectChipProps) {
  return (
    <SimpleMultiSheet
      chip="handover"
      label="Сдача"
      sheetTitle="Когда сдают?"
      options={HANDOVER_OPTIONS}
      value={value}
      onCommit={onCommit}
    />
  );
}

interface SimpleMultiSheetProps {
  chip: string;
  label: string;
  sheetTitle: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onCommit: (next: string[]) => void;
}

/** Shared multi-select sheet used by Stage / Handover — same pill-grid
 *  content, different label + options. Distinct from Finishing only
 *  because the latter's labels are longer and read better in a wrap-
 *  grid; for terseness we keep the wrap-grid layout consistent across
 *  all multi-selects. */
function SimpleMultiSheet({
  chip,
  label,
  sheetTitle,
  options,
  value,
  onCommit,
}: SimpleMultiSheetProps) {
  const [pending, setPending] = useState<Set<string>>(new Set(value));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(new Set(value));
  }, [value]);

  function toggle(v: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  const summary = (() => {
    if (value.length === 0) return undefined;
    const labels = options.filter((o) => value.includes(o.value)).map((o) => o.label);
    if (labels.length === 1) return `${label}: ${labels[0]}`;
    if (labels.length === 2) return `${label}: ${labels[0]}, ${labels[1]}`;
    return `${label}: ${labels.length}`;
  })();

  const hasPending =
    pending.size !== value.length ||
    [...pending].some((v) => !value.includes(v));

  return (
    <FilterChipSheet
      label={label}
      valueSummary={summary}
      sheetTitle={sheetTitle}
      hasPending={hasPending}
      onOpen={() => trackOpened(chip)}
      onApply={() => {
        const next = Array.from(pending);
        onCommit(next);
        trackCommitted(chip, next);
      }}
      onReset={() => setPending(new Set())}
      onClear={() => onCommit([])}
    >
      <MultiOptionGrid
        options={options}
        active={(v) => pending.has(v)}
        onToggle={toggle}
      />
    </FilterChipSheet>
  );
}

/** Wrap-grid of pill buttons — reused by every multi-select chip. */
function MultiOptionGrid({
  options,
  active,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  active: (v: string) => boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = active(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={on}
            className={cn(
              'inline-flex h-10 items-center rounded-sm border px-3 text-meta font-medium transition-colors',
              on
                ? 'border-terracotta-600 bg-terracotta-50 text-terracotta-800'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
