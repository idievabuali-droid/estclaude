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
  rooms: string | null;
  finishing: string | null;
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
    rooms: null,
    finishing: null,
    timing: null,
  });

  const step = STEPS[stepIdx]!;
  const isLast = stepIdx === STEPS.length - 1;
  const canAdvance =
    step.key === 'districts'
      ? true // skip allowed
      : answers[step.key] != null;

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
    if (answers.rooms && answers.rooms !== 'any') params.set('rooms', answers.rooms);
    if (answers.finishing && answers.finishing !== 'any') params.set('finishing', answers.finishing);

    // Choose target: /kvartiry is the right destination when buyer picked
    // unit-level criteria; /novostroyki is right when they only picked districts.
    const hasUnitCriteria = (answers.rooms && answers.rooms !== 'any') ||
      (answers.finishing && answers.finishing !== 'any');
    if (hasUnitCriteria) {
      router.push(`/kvartiry?${params.toString()}`);
    } else {
      const projectParams = new URLSearchParams();
      if (answers.districts.length) projectParams.set('district', answers.districts.join(','));
      if (answers.budget && answers.budget !== 'any') projectParams.set('price_to', answers.budget);
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
                multi={false}
                options={ROOMS}
                values={answers.rooms ? [answers.rooms] : []}
                onChange={(v) => setAnswers((a) => ({ ...a, rooms: v[0] ?? null }))}
              />
            ) : null}
            {step.key === 'finishing' ? (
              <CardChoice
                options={FINISHING}
                value={answers.finishing}
                onChange={(v) => setAnswers((a) => ({ ...a, finishing: v }))}
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

function CardChoice({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; hint?: string }>;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <CardOption
            key={opt.value}
            active={active}
            onClick={() => onChange(opt.value)}
            label={opt.label}
            hint={opt.hint}
          />
        );
      })}
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
