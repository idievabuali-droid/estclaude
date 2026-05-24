'use client';

import { AppSelect } from '@/components/primitives';

/**
 * Срок сдачи picker — two side-by-side dropdowns (Год + Квартал)
 * replacing the earlier free-text "2026-Q3" input that was easy to
 * typo. Stores the same `YYYY-Q[1-4]` string downstream, so no DB or
 * API changes.
 *
 * Picking the empty option in either dropdown clears the whole value
 * to `''` — handover_quarter is optional, and a half-filled value
 * (year only / quarter only) has no meaning for downstream consumers.
 *
 * Six years of options (current + 5) covers every realistic Vahdat
 * new-build handover horizon; extend the range if a longer-term
 * project shows up.
 */
const YEAR_OPTS = (() => {
  const currentYear = new Date().getFullYear();
  return [
    { value: '', label: '— Год —' },
    ...Array.from({ length: 6 }, (_, i) => {
      const y = String(currentYear + i);
      return { value: y, label: y };
    }),
  ];
})();

const QUARTER_OPTS = [
  { value: '', label: '— Квартал —' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'Q4', label: 'Q4' },
];

export interface HandoverQuarterPickerProps {
  /** "YYYY-QX" string, or '' when unset. */
  value: string;
  onChange: (next: string) => void;
}

export function HandoverQuarterPicker({ value, onChange }: HandoverQuarterPickerProps) {
  const year = value.split('-')[0] ?? '';
  const quarter = value.split('-')[1] ?? '';

  function setYear(newYear: string) {
    if (!newYear) {
      onChange('');
      return;
    }
    // Year picked without a quarter yet → default to Q1 so the stored
    // value is a complete, parsable "YYYY-QX" rather than an orphan year.
    onChange(`${newYear}-${quarter || 'Q1'}`);
  }
  function setQuarter(newQuarter: string) {
    if (!newQuarter) {
      onChange('');
      return;
    }
    // Quarter picked without a year yet → default to next calendar year
    // (the most common case for a new build).
    onChange(`${year || String(new Date().getFullYear() + 1)}-${newQuarter}`);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <AppSelect
        label="Год сдачи"
        options={YEAR_OPTS}
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <AppSelect
        label="Квартал"
        options={QUARTER_OPTS}
        value={quarter}
        onChange={(e) => setQuarter(e.target.value)}
      />
    </div>
  );
}
