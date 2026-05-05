'use client';

import { useState, type ReactNode } from 'react';
import { ChevronLeft, MapPin, Coins, Bed, Brush, Calendar } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton, AppCard, AppCardContent } from '@/components/primitives';
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

const BUDGETS = [
  { value: '500000', label: 'до 500 000 TJS' },
  { value: '800000', label: 'до 800 000 TJS' },
  { value: '1200000', label: 'до 1 200 000 TJS' },
  { value: 'any', label: 'Не важно — покажите все' },
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
              <ChipChoice
                multi
                options={mockDistricts.map((d) => ({ value: d.slug, label: d.name.ru }))}
                values={answers.districts}
                onChange={(v) => setAnswers((a) => ({ ...a, districts: v }))}
              />
            ) : null}
            {step.key === 'budget' ? (
              <CardChoice
                options={BUDGETS}
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
