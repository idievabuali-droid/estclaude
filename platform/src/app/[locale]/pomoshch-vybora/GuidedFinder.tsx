'use client';

import { useState, type ReactNode } from 'react';
import { ChevronLeft, MapPin, Coins, Bed, Brush, Calendar } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton, AppCard, AppCardContent } from '@/components/primitives';
import { LocationSearch } from '@/components/blocks';
import { mockDistricts } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Answers = {
  districts: string[];
  budget: string | null;
  /** Multi-select: buyer can pick "1 OR 2 rooms" (Faridun's case).
   *  Treats the special "any" value as mutually exclusive with
   *  specific room counts. */
  rooms: string[];
  /** Multi-select: buyer can pick "С ремонтом OR Отремонтировано
   *  владельцем" (anything ready-to-move-in). Same "any"
   *  exclusivity rule as rooms. */
  finishing: string[];
  timing: string | null;
};

const STEPS = [
  { key: 'districts' as const, title: 'Какие районы вам подходят?', Icon: MapPin },
  { key: 'budget' as const, title: 'Какой бюджет вы рассматриваете?', Icon: Coins },
  { key: 'rooms' as const, title: 'Сколько комнат нужно?', Icon: Bed },
  { key: 'finishing' as const, title: 'Какая отделка вам подходит?', Icon: Brush },
  { key: 'timing' as const, title: 'Когда хотите въехать?', Icon: Calendar },
];

// Budget ceiling presets — start from 250 000 so Faridun's 200k
// real budget shows him real options instead of the previous floor
// of 500 000 (which made him think nothing was for him). Up to
// 1.2M covers the diaspora / family-relocation segment. Free-text
// input below the chips for everything else.
const BUDGET_PRESETS = [
  { value: '250000', label: 'до 250 000' },
  { value: '350000', label: 'до 350 000' },
  { value: '500000', label: 'до 500 000' },
  { value: '800000', label: 'до 800 000' },
  { value: '1200000', label: 'до 1 200 000' },
];

const ROOMS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4+' },
  { value: 'any', label: 'Не важно' },
];

const FINISHING = [
  { value: 'no_finish', label: 'Без ремонта', hint: 'Дешевле, вы делаете ремонт сами' },
  { value: 'pre_finish', label: 'Предчистовая', hint: 'Базовая отделка, вы завершаете' },
  { value: 'full_finish', label: 'С ремонтом', hint: 'Готово к заезду' },
  {
    value: 'owner_renovated',
    label: 'Отремонтировано владельцем',
    hint: 'Готовое жильё, осмотрите лично',
  },
  { value: 'any', label: 'Не важно', hint: 'Покажите все варианты' },
];

const TIMING = [
  { value: 'now', label: 'Сейчас — въехать в готовое' },
  { value: 'soon', label: 'В ближайшие 6 месяцев' },
  { value: 'later', label: 'В течение 1–2 лет' },
  { value: 'any', label: 'Не важно — главное цена' },
];

export function GuidedFinder() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    districts: [],
    budget: null,
    rooms: [],
    finishing: [],
    timing: null,
  });

  const step = STEPS[stepIdx]!;
  const isLast = stepIdx === STEPS.length - 1;
  const canAdvance = (() => {
    if (step.key === 'districts') return true; // skip allowed
    if (step.key === 'rooms') return answers.rooms.length > 0;
    if (step.key === 'finishing') return answers.finishing.length > 0;
    if (step.key === 'budget') {
      // Treat empty string (free-input cleared) the same as null —
      // buyer hasn't chosen yet. Numeric strings + presets + "any"
      // all advance.
      return answers.budget != null && answers.budget !== '';
    }
    return answers[step.key] != null;
  })();

  function next() {
    if (!isLast) return setStepIdx((i) => i + 1);
    // JOURNEY-5: pass ALL collected answers to the apartments page
    // (rooms + finishing make sense at the unit level, so /kvartiry not /novostroyki)
    const params = new URLSearchParams();
    if (answers.districts.length) {
      // SPEC-GAP: /kvartiry doesn't currently filter by district at the listing
      // level — district lives on the building. Defer to /novostroyki for that
      // dimension; the user will land there if they picked districts but no rooms/finishing.
    }
    if (answers.budget && answers.budget !== 'any') params.set('price_to', answers.budget);
    // Multi-select: drop the "any" sentinel before joining; if "any"
    // was the only pick the param is omitted, matching the "no filter"
    // semantic the destination pages expect.
    const roomsClean = answers.rooms.filter((r) => r !== 'any');
    if (roomsClean.length) params.set('rooms', roomsClean.join(','));
    const finishingClean = answers.finishing.filter((f) => f !== 'any');
    if (finishingClean.length) params.set('finishing', finishingClean.join(','));
    // Wizard flag — destination page reads this and renders the
    // WizardResultBanner so the buyer's 5 questions of effort get
    // an explicit acknowledgement instead of an identical-to-normal
    // filtered list page.
    params.set('wizard', '1');

    // Choose target: /kvartiry is the right destination when buyer picked
    // unit-level criteria; /novostroyki is right when they only picked districts.
    const hasUnitCriteria =
      answers.rooms.some((r) => r !== 'any') ||
      answers.finishing.some((f) => f !== 'any');
    if (hasUnitCriteria) {
      router.push(`/kvartiry?${params.toString()}`);
    } else {
      const projectParams = new URLSearchParams();
      if (answers.districts.length) projectParams.set('district', answers.districts.join(','));
      if (answers.budget && answers.budget !== 'any') projectParams.set('price_to', answers.budget);
      projectParams.set('wizard', '1');
      router.push(`/novostroyki?${projectParams.toString()}`);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Step counter + progress */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {stepIdx > 0 ? (
            <button
              type="button"
              onClick={() => setStepIdx((i) => i - 1)}
              className="inline-flex items-center gap-1 text-meta font-medium text-stone-700 hover:text-terracotta-600"
            >
              <ChevronLeft className="size-4" /> Назад
            </button>
          ) : (
            <span />
          )}
          <span className="text-caption tabular-nums text-stone-500">
            Вопрос {stepIdx + 1} из {STEPS.length}
          </span>
        </div>
        <div className="flex h-1 w-full overflow-hidden rounded-full bg-stone-200">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-full flex-1',
                i <= stepIdx ? 'bg-terracotta-600' : 'bg-transparent',
                i > 0 ? 'ml-0.5' : '',
              )}
            />
          ))}
        </div>
      </div>

      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
                <step.Icon className="size-5" />
              </span>
              <h1 className="text-h2 font-semibold text-stone-900">{step.title}</h1>
            </div>

            {step.key === 'districts' ? (
              <div className="flex flex-col gap-4">
                {/* LocationSearch as the richer location input —
                    leverages the multi-source search (district / ЖК /
                    застройщик / POI). Picking a result navigates the
                    visitor away from the wizard with the right
                    destination URL (POI → /novostroyki?near_...,
                    district → ?district=, ЖК → /zhk/<slug>, dev →
                    /novostroyki?developer=). Buyers who already know
                    their anchor skip Q2-Q5 entirely — the wizard
                    is for buyers WITHOUT a specific place in mind,
                    so this is correct. */}
                <div className="flex flex-col gap-1">
                  <LocationSearch
                    destinationPath="/novostroyki"
                    variant="compact"
                  />
                  <p className="text-caption text-stone-500">
                    Знаете конкретное место — школу, ЖК, район? Введите
                    название и сразу увидите подходящие квартиры.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-caption uppercase tracking-wide text-stone-400">
                  <span className="h-px flex-1 bg-stone-200" />
                  или
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-stone-500">
                    Выберите один или несколько районов
                  </span>
                  <ChipChoice
                    multi
                    options={mockDistricts.map((d) => ({
                      value: d.slug,
                      label: d.name.ru,
                    }))}
                    values={answers.districts}
                    onChange={(v) =>
                      setAnswers((a) => ({ ...a, districts: v }))
                    }
                  />
                </div>
              </div>
            ) : null}
            {step.key === 'budget' ? (
              <BudgetChoice
                value={answers.budget}
                onChange={(v) => setAnswers((a) => ({ ...a, budget: v }))}
              />
            ) : null}
            {step.key === 'rooms' ? (
              <ChipChoice
                multi
                options={ROOMS}
                values={answers.rooms}
                onChange={(v) => setAnswers((a) => ({ ...a, rooms: applyAnyMutex(v) }))}
              />
            ) : null}
            {step.key === 'finishing' ? (
              <CardChoice
                multi
                options={FINISHING}
                values={answers.finishing}
                onChange={(v) => setAnswers((a) => ({ ...a, finishing: applyAnyMutex(v) }))}
              />
            ) : null}
            {step.key === 'timing' ? (
              <CardChoice
                options={TIMING}
                value={answers.timing}
                onChange={(v) => setAnswers((a) => ({ ...a, timing: v }))}
              />
            ) : null}
          </div>
        </AppCardContent>
      </AppCard>

      <div className="flex flex-col gap-2">
        <AppButton variant="primary" size="lg" disabled={!canAdvance} onClick={next}>
          {isLast ? 'Показать подходящие варианты' : 'Далее'}
        </AppButton>
        {step.key === 'districts' ? (
          <button
            type="button"
            onClick={() => setStepIdx((i) => i + 1)}
            className="text-meta font-medium text-stone-500 hover:text-terracotta-600"
          >
            Пропустить — все районы
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Picking "Не важно" deselects every specific value (and vice
 *  versa). Lets the buyer multi-select specific values like 1 + 2
 *  rooms without the "any" sentinel polluting the URL params. */
function applyAnyMutex(next: string[]): string[] {
  const last = next[next.length - 1];
  if (last === 'any') return ['any'];
  return next.filter((v) => v !== 'any');
}

function ChipChoice({
  options,
  values,
  multi,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  values: string[];
  multi: boolean;
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    if (multi) {
      onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
    } else {
      onChange([v]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm px-3 py-2 text-meta font-medium transition-colors',
              active
                ? 'bg-terracotta-100 text-terracotta-800 ring-2 ring-terracotta-600'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Single OR multi-select large card chooser. Discriminated by which
 * props are passed: `value` + scalar onChange for single (Q2 budget,
 * Q5 timing); `values` + array onChange + `multi` for finishing
 * (Q4) where "С ремонтом OR Отремонтировано владельцем" is a real
 * combination buyers want.
 */
type CardChoiceProps =
  | {
      multi?: false;
      options: Array<{ value: string; label: string; hint?: string }>;
      value: string | null;
      onChange: (v: string) => void;
    }
  | {
      multi: true;
      options: Array<{ value: string; label: string; hint?: string }>;
      values: string[];
      onChange: (v: string[]) => void;
    };

function CardChoice(props: CardChoiceProps) {
  function isActive(v: string): boolean {
    if (props.multi) return props.values.includes(v);
    return props.value === v;
  }
  function handleClick(v: string) {
    if (props.multi) {
      const next = props.values.includes(v)
        ? props.values.filter((x) => x !== v)
        : [...props.values, v];
      props.onChange(next);
    } else {
      props.onChange(v);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {props.options.map((opt) => (
        <CardOption
          key={opt.value}
          active={isActive(opt.value)}
          onClick={() => handleClick(opt.value)}
          label={opt.label}
          hint={opt.hint}
        />
      ))}
    </div>
  );
}

/**
 * Budget Q2 choice — replaces the rigid 4-option card list. Three
 * surfaces in priority order:
 *
 *   1. Quick-pick chips (5 ceiling presets, starting at 250k so
 *      Faridun's actual 200k budget gets meaningful results).
 *   2. Free-text "Или введите свой максимум" input — the buyer
 *      types their actual ceiling. Selecting a preset clears the
 *      typed value and vice versa.
 *   3. "Не важно — покажите все" CardOption to skip the filter
 *      entirely. Mutually exclusive with the chips + input.
 *
 * Discriminating which mode is active: if value is "any" → "Не
 * важно" wins; if value matches a preset → that chip is highlighted;
 * otherwise the input shows the value.
 */
function BudgetChoice({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  const presetValues = new Set(BUDGET_PRESETS.map((p) => p.value));
  const inputValue =
    value && value !== 'any' && !presetValues.has(value) ? value : '';

  return (
    <div className="flex flex-col gap-3">
      {/* Quick-pick presets */}
      <div className="flex flex-wrap gap-2">
        {BUDGET_PRESETS.map((p) => {
          const active = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-meta font-medium tabular-nums transition-colors',
                active
                  ? 'border-terracotta-600 bg-terracotta-600 text-white'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-terracotta-300 hover:bg-terracotta-50',
              )}
            >
              {p.label} TJS
            </button>
          );
        })}
      </div>

      {/* Free-text input — for buyers whose ceiling doesn't match a
          preset (e.g. Faridun at 220k, or 600k cash buyers). */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="wizard-budget-input"
          className="text-caption text-stone-500"
        >
          Или введите свой максимум, TJS
        </label>
        <input
          id="wizard-budget-input"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="220 000"
          value={inputValue}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              // Empty input clears the budget answer entirely (so the
              // "Далее" button disables until the buyer picks again).
              onChange('');
              return;
            }
            onChange(raw);
          }}
          className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
        />
      </div>

      {/* "Не важно" — the catch-all skip. Card-style for prominence
          since it's the most-clicked option for low-effort buyers. */}
      <CardOption
        active={value === 'any'}
        onClick={() => onChange('any')}
        label="Не важно — покажите все"
        hint="Без ограничения по цене"
      />
    </div>
  );
}

function CardOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-md border bg-white p-4 text-left transition-colors',
        active ? 'border-terracotta-600 ring-2 ring-terracotta-600/20' : 'border-stone-200 hover:border-stone-300',
      )}
    >
      <span className="text-h3 font-semibold text-stone-900">{label}</span>
      {hint ? <span className="text-meta text-stone-500">{hint}</span> : null}
    </button>
  );
}
