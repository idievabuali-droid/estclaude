'use client';

import { useState } from 'react';
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
  // parent. We DON'T sync from `value` after mount: in this app the
  // parent only changes a NumberField's value via remount (new key,
  // e.g. duplicate apartment), never in-place. If we add a use case
  // for external resets later we'll need a different sync strategy.
  const [draft, setDraft] = useState<string>(
    typeof value === 'number' ? String(value) : '',
  );

  return (
    <AppInput
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={draft}
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
