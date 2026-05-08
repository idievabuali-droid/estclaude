'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, Map as MapIcon } from 'lucide-react';
import { AppInput } from '@/components/primitives';
import type { SearchHit } from '@/services/search';

/** Subset of SearchHit kinds the address picker can act on. Developers
 *  have no location and would just be noise here, so they're filtered
 *  out before this type narrows the dropdown rendering. */
type LocatableHit = Exclude<SearchHit, { sourceKind: 'developer' }>;

/**
 * Picked from the autocomplete dropdown. Encodes EVERY signal the
 * /post form might want from a hit:
 *
 *   - building       → seller picked an existing ЖК. Parent should
 *                      flip mode to 'existing-building' and pre-select
 *                      this id (no new ЖК is being created).
 *   - district       → seller picked a neighbourhood. Use it as the
 *                      district AND drop the pin at the centroid.
 *   - poi            → seller picked a landmark. Set the address to
 *                      the landmark name, drop the pin at its coords;
 *                      the seller can refine further by dragging.
 *   - free           → seller pressed Enter / clicked the "use as
 *                      typed" row instead of picking a hit. We carry
 *                      whatever they typed; pin stays where it was.
 */
export type AddressPick =
  | {
      kind: 'building';
      buildingId: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
      districtId: string | null;
    }
  | {
      kind: 'district';
      districtId: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
    }
  | {
      kind: 'poi';
      name: string;
      latitude: number;
      longitude: number;
      districtSlug: string | null;
    }
  | {
      kind: 'free';
      text: string;
    };

export interface AddressAutocompleteProps {
  /** Current text in the input — controlled by the parent. */
  value: string;
  /** Fired on every keystroke. Parent owns the address text. */
  onChange: (next: string) => void;
  /** Fired when the user selects a row (or commits free text). */
  onPick: (pick: AddressPick) => void;
  /** Visible label above the input. */
  label?: string;
  /** Helper text shown below the input when no error. */
  helperText?: string;
  /** Error string from the form's validation map; flips the input to
   *  the red-border / red-helper style. */
  errorText?: string;
  /** Lets the parent's `data-field-key="..."` wrapper still work for
   *  the scroll-to-first-error behaviour in PostFlow. */
  fieldKey?: string;
  /** Default placeholder mirrors what we asked for in the original
   *  Адрес field. */
  placeholder?: string;
  required?: boolean;
}

/**
 * Address-input + autocomplete dropdown. Backed by the existing
 * `/api/search` unified-search endpoint: the same source that already
 * powers the buyer-side LocationSearch, so adding a building/landmark
 * once benefits both sides instantly.
 *
 * Design notes:
 *  - Debounced 350ms; min 2 chars before firing the request. Keeps the
 *    server quiet during fast typing and feels snappy at human speeds.
 *  - Dropdown rows show: icon (kind) + primary name + secondary line
 *    (district / kind). Tap or keyboard-Enter to pick.
 *  - "Use as typed" row at the bottom of the dropdown — fallback for
 *    addresses we don't know about (most street addresses in Vahdat,
 *    since OSM coverage at the street level is sparse here).
 *  - Picking a building should auto-flip the form's mode to
 *    "existing-building" — the parent handles this via `onPick`.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  label,
  helperText,
  errorText,
  fieldKey,
  placeholder,
  required,
}: AddressAutocompleteProps) {
  const [hits, setHits] = useState<LocatableHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Active row for keyboard-arrow navigation. -1 = nothing focused.
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Debounced search. Re-fires whenever the input changes; cleared on
  // every keystroke so we don't flood the server. The clear-when-empty
  // is wrapped in queueMicrotask to satisfy
  // `react-hooks/set-state-in-effect` (sync setState in effect body
  // would otherwise warn — same pattern as PostFlow's autosave).
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      queueMicrotask(() => setHits([]));
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hits: SearchHit[] };
        // Filter out developer hits — they have no location and can't
        // anchor a map pin, so they'd be noise in this picker.
        const filtered = data.hits.filter(
          (h): h is LocatableHit => h.sourceKind !== 'developer',
        );
        setHits(filtered);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [value]);

  // Click-outside to close the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function pickHit(hit: LocatableHit) {
    setOpen(false);
    setActive(-1);
    if (hit.sourceKind === 'building') {
      // Replace the typed text with the building's name so the seller
      // sees what they actually picked. PostFlow will mode-flip via
      // onPick callback.
      onChange(hit.name);
      onPick({
        kind: 'building',
        buildingId: hit.id,
        name: hit.name,
        latitude: hit.latitude,
        longitude: hit.longitude,
        districtId: hit.districtId,
      });
    } else if (hit.sourceKind === 'district') {
      // District pick — leave the typed text as-is (the seller might
      // be typing an address WITHIN this district), just drop the pin
      // at the centroid + auto-set district.
      onPick({
        kind: 'district',
        districtId: hit.id,
        name: hit.name,
        latitude: hit.latitude,
        longitude: hit.longitude,
      });
    } else if (hit.sourceKind === 'poi') {
      // POI pick — replace text with the landmark's name. Useful for
      // "напротив парка Дусти" framing common in TJ.
      onChange(hit.name);
      onPick({
        kind: 'poi',
        name: hit.name,
        latitude: hit.latitude,
        longitude: hit.longitude,
        districtSlug: hit.district_slug,
      });
    }
  }

  function pickFreeText() {
    setOpen(false);
    setActive(-1);
    onPick({ kind: 'free', text: value.trim() });
  }

  // Build the rendered list — hits + an optional "use as typed" row
  // at the bottom (only when the typed text doesn't exactly match the
  // first hit; otherwise it's redundant).
  const showFreeRow = value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative" data-field-key={fieldKey}>
      <AppInput
        label={label}
        value={value}
        required={required}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || hits.length === 0) {
            if (e.key === 'Enter' && value.trim().length >= 2) {
              e.preventDefault();
              pickFreeText();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active >= 0 && hits[active]) {
              pickHit(hits[active]);
            } else {
              pickFreeText();
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        helperText={helperText}
        errorText={errorText}
      />

      {open && (loading || hits.length > 0 || showFreeRow) ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 max-h-72 overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-md"
        >
          {loading && hits.length === 0 ? (
            <li className="px-3 py-2 text-meta text-stone-500">Поиск…</li>
          ) : null}

          {/* 0-results hint — fired when the seller has typed enough
              to search but our POI / building / district data didn't
              match anything. Vahdat OSM coverage is patchy at the
              street level; this hint reassures sellers that they can
              still proceed via the "Use as typed" row + manual pin. */}
          {!loading && hits.length === 0 && showFreeRow ? (
            <li className="border-b border-stone-100 px-3 py-2 text-caption text-stone-500">
              Не нашли «{value.trim()}» — введите адрес и поставьте метку
              на карте ниже.
            </li>
          ) : null}

          {hits.map((hit, i) => (
            <li
              key={`${hit.sourceKind}-${'id' in hit ? hit.id : i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => {
                // mousedown (not click) so the input blur from clicking
                // outside doesn't fire first and close the dropdown.
                e.preventDefault();
                pickHit(hit);
              }}
              onMouseEnter={() => setActive(i)}
              className={
                'flex cursor-pointer items-start gap-2 px-3 py-2 text-meta ' +
                (active === i ? 'bg-stone-100' : 'hover:bg-stone-50')
              }
            >
              <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-stone-500">
                {hit.sourceKind === 'building' ? (
                  <Building2 className="size-3.5" aria-hidden />
                ) : hit.sourceKind === 'district' ? (
                  <MapIcon className="size-3.5" aria-hidden />
                ) : (
                  <MapPin className="size-3.5" aria-hidden />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-stone-900">{hit.name}</span>
                <span className="truncate text-caption text-stone-500">
                  {hit.sourceKind === 'building'
                    ? `ЖК${hit.districtName ? ` · ${hit.districtName}` : ''}`
                    : hit.sourceKind === 'district'
                      ? 'Район'
                      : `${hit.kind}${hit.district_slug ? ` · ${hit.district_slug}` : ''}`}
                </span>
              </span>
            </li>
          ))}

          {showFreeRow ? (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                pickFreeText();
              }}
              className="flex cursor-pointer items-start gap-2 border-t border-stone-100 px-3 py-2 text-meta hover:bg-stone-50"
            >
              <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-stone-500">
                <MapPin className="size-3.5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-stone-900">
                  Использовать «{value.trim()}»
                </span>
                <span className="truncate text-caption text-stone-500">
                  и поставить метку на карте вручную
                </span>
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
