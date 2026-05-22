'use client';

import { useEffect, useRef, useState } from 'react';
import { AppInput, type AppInputProps } from '@/components/primitives';

/**
 * Numeric input that doesn't suffer from `<input type="number">`'s
 * clearing quirks (select-all + retype occasionally retains the old
 * digit; `min` constraints can block zero-keypresses; iOS scroll-
 * wheel changes value on accidental scroll).
 *
 * We render `type="text"` + `inputMode="numeric"`/`"decimal"` so the
 * mobile keyboard stays numeric, then strip non-digit characters
 * inside the input handler. Decimals additionally allow exactly one
 * '.' character.
 *
 * Internally we keep a local string mirror of the raw input so that
 * mid-typing values like "12." (user about to type a decimal) don't
 * round-trip through the parent's `number | ''` state and erase the
 * trailing dot. The parent always sees `number | ''` — empty when
 * the field is blank, otherwise the parsed numeric value.
 *
 * The draft DOES sync from `value` when the prop changes from outside
 * AND the field isn't focused — so a programmatic update (e.g. the
 * developer-portfolio pre-fill, which arrives after the developer is
 * resolved) actually shows. The not-focused guard preserves the
 * mid-typing protection above: while the user is in the field, their
 * draft is never overwritten.
 */
export interface NumberFieldProps
  extends Omit<AppInputProps, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number | '';
  onChange: (next: number | '') => void;
  /** Allow a single decimal point. Default false (integer-only). */
  decimal?: boolean;
}

export function NumberField({
  value,
  onChange,
  decimal = false,
  ...rest
}: NumberFieldProps) {
  // Local string mirror so mid-typing values like "12." (user about
  // to type a decimal) survive the `number | ''` round-trip to the
  // parent.
  const [draft, setDraft] = useState<string>(
    typeof value === 'number' ? String(value) : '',
  );

  // Focus is tracked in a ref (no re-render needed) so the sync effect
  // below can tell a programmatic value change from the user's own
  // typing.
  const focusedRef = useRef(false);

  // Sync the draft from `value` when the prop changes externally —
  // but only while the field is NOT focused. This is what makes
  // pre-fill work (parent sets `value` after mount); the focus guard
  // keeps a mid-typing draft from being clobbered.
  useEffect(() => {
    if (focusedRef.current) return;
    const next = typeof value === 'number' ? String(value) : '';
    setDraft((cur) => (cur === next ? cur : next));
  }, [value]);

  return (
    <AppInput
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={draft}
      onFocus={(e) => {
        focusedRef.current = true;
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        let cleaned = decimal
          ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
          : raw.replace(/[^\d]/g, '');
        // Strip leading zeros for integers ("07" → "7") so the field
        // doesn't render confusingly. Keep "0" itself so the user can
        // type "0" then a digit if they want a small number first.
        if (!decimal) {
          cleaned = cleaned.replace(/^0+(?=\d)/, '');
        }
        setDraft(cleaned);
        if (cleaned === '' || cleaned === '.') {
          onChange('');
          return;
        }
        const n = Number(cleaned);
        if (Number.isNaN(n)) {
          onChange('');
          return;
        }
        onChange(n);
      }}
    />
  );
}
