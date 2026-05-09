'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { LocationSearch } from '@/components/blocks';
import { mockDistricts } from '@/lib/mock';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

type Answers = {
  districts: string[];
  /** Optional POI / building / developer anchor picked from the
   *  LocationSearch in Q1. When set, the wizard's final navigation
   *  appends the right URL params (e.g. ?near_lat=… for POIs,
   *  ?developer=… for devs). Mutually informative with `districts`
   *  — both can be set; the destination page handles either. */
  anchor: PickedAnchor | null;
  /** Budget mode — drives whether the buyer is thinking in total
   *  cash ("сразу") or monthly installments ("в рассрочку"). Vahdat
   *  reality: ~half the active buyers are budget-constrained and
   *  reason in TJS/мес — asking only for total price loses them. */
  budgetMode: 'lump_sum' | 'installment';
  /** Total-price ceiling, TJS, when budgetMode = lump_sum. */
  budget: string | null;
  /** Monthly-payment ceiling, TJS, when budgetMode = installment.
   *  Resolves to ?monthly_to= on /kvartiry, which forces
   *  installment_available + the matching monthly cap. */
  maxMonthly: string | null;
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

/** Discriminated union for whatever the buyer picked in the Q1
 *  search box. Each variant carries the data needed to extend the
 *  destination URL params on completion. */
type PickedAnchor =
  | { kind: 'district'; slug: string; label: string }
  | { kind: 'poi'; lat: number; lng: number; label: string }
  | { kind: 'building'; slug: string; label: string }
  | { kind: 'developer'; id: string; label: string };

/** Each step now carries a subhead alongside the title — the wizard's
 *  Typeform/Cal.com feel comes from one decision at a time presented
 *  with a clear question (display serif H1) AND a one-line context
 *  subhead beneath it (muted body). The icon-circle that used to lead
 *  each step has been dropped — it competed with the question's
 *  visual weight and added no information the title didn't carry. */
const STEPS = [
  {
    key: 'districts' as const,
    title: 'Какие районы вам подходят?',
    subhead: 'Знаете конкретное место — школу, ЖК, район? Введите название.',
  },
  {
    key: 'budget' as const,
    title: 'Какой бюджет вы рассматриваете?',
    subhead: 'Цена сразу или ежемесячный платёж — ответьте, как вам удобнее.',
  },
  {
    key: 'rooms' as const,
    title: 'Сколько комнат нужно?',
    subhead: 'Можно выбрать несколько — например, 2 или 3 комнаты.',
  },
  {
    key: 'finishing' as const,
    title: 'Какая отделка вам подходит?',
    subhead: 'Готовое жильё или место под ваш ремонт.',
  },
  {
    key: 'timing' as const,
    title: 'Когда хотите въехать?',
    subhead: 'От готовых квартир до проектов на котловане.',
  },
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

// Monthly-payment ceilings, TJS/мес. Calibrated to typical Vahdat
// installment ranges: a 200k unit at 84 months ~2400 TJS/мес;
// a 350k unit at 60 months ~6000. The chips cover that band so a
// buyer's first instinct ("я могу 4000 в месяц") matches a real
// preset. Custom input handles the edges.
const MONTHLY_PRESETS = [
  { value: '2000', label: 'до 2 000' },
  { value: '3000', label: 'до 3 000' },
  { value: '4000', label: 'до 4 000' },
  { value: '5000', label: 'до 5 000' },
  { value: '8000', label: 'до 8 000' },
];

const ROOMS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  // 5+ as a separate chip — the previous "4+" lumped 4/5/6 together
  // so a buyer who specifically wanted 4-комн couldn't say so. The
  // listings filter already accepts CSV (?rooms=4,5) and treats 5+
  // as ">= 5" via the same path.
  { value: '5', label: '5+' },
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
    anchor: null,
    budgetMode: 'lump_sum',
    budget: null,
    maxMonthly: null,
    rooms: [],
    finishing: [],
    timing: null,
  });

  const step = STEPS[stepIdx]!;
  const isLast = stepIdx === STEPS.length - 1;

  // Quiz lifecycle events. The wizard is the platform's highest-intent
  // funnel and was previously invisible to /kabinet/analytics — buyers
  // could drop on any step and we couldn't see which step.
  //
  // - quiz_started fires once on mount.
  // - quiz_step_answered fires on each forward advance (in next()).
  // - quiz_completed fires on the last advance, before router.push.
  // - quiz_abandoned fires on unmount IF the wizard never reached
  //   completion (e.g. user navigated away or closed the tab).
  const completedRef = useRef(false);
  useEffect(() => {
    track('quiz_started');
    return () => {
      if (!completedRef.current) {
        track('quiz_abandoned', { last_step: stepIdx + 1 });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const canAdvance = (() => {
    if (step.key === 'districts') return true; // skip allowed
    if (step.key === 'rooms') return answers.rooms.length > 0;
    if (step.key === 'finishing') return answers.finishing.length > 0;
    if (step.key === 'budget') {
      // Either tab can satisfy the step. lump_sum needs `budget`
      // (preset, custom, or "any"); installment needs `maxMonthly`
      // (preset, custom, or "any"). Empty string = buyer cleared
      // a custom input before choosing — keep them on this step.
      const v = answers.budgetMode === 'installment' ? answers.maxMonthly : answers.budget;
      return v != null && v !== '';
    }
    return answers[step.key] != null;
  })();

  function next() {
    // Track the answer the buyer just gave on this step. The compact
    // payload (step number + step key + summary of the answer) is
    // enough to drive a per-step funnel in /kabinet/analytics without
    // bloating the events table with raw form state.
    track('quiz_step_answered', {
      step_num: stepIdx + 1,
      step_key: step.key,
      answer_summary: summariseStepAnswer(step.key, answers),
    });
    if (!isLast) return setStepIdx((i) => i + 1);
    // Final advance — the wizard is about to navigate away.
    track('quiz_completed');
    completedRef.current = true;

    // Anchor: a building or developer pick is decisive — the buyer
    // wanted that specific thing, send them to its detail/scoped
    // page directly rather than a filtered list. Wizard answers
    // get carried via URL params where applicable.
    if (answers.anchor?.kind === 'building') {
      router.push(`/zhk/${answers.anchor.slug}`);
      return;
    }
    if (answers.anchor?.kind === 'developer') {
      const p = new URLSearchParams();
      p.set('developer', answers.anchor.id);
      p.set('wizard', '1');
      if (answers.budget && answers.budget !== 'any') p.set('price_to', answers.budget);
      router.push(`/novostroyki?${p.toString()}`);
      return;
    }

    // POI anchor → near-radius filter. Apartment-level criteria
    // (rooms / finishing) carried into /kvartiry where they apply.
    // District anchor → ?district=, but allow alongside existing
    // district chip selection (deduped).
    const params = new URLSearchParams();
    if (answers.budgetMode === 'installment') {
      // Installment forces the apartment-level destination — the
      // monthly_to filter is per-listing, not per-building, and the
      // listings service auto-narrows to installment_available=true
      // when the cap is set.
      if (answers.maxMonthly && answers.maxMonthly !== 'any') {
        params.set('monthly_to', answers.maxMonthly);
      }
    } else if (answers.budget && answers.budget !== 'any') {
      params.set('price_to', answers.budget);
    }
    const roomsClean = answers.rooms.filter((r) => r !== 'any');
    if (roomsClean.length) params.set('rooms', roomsClean.join(','));
    const finishingClean = answers.finishing.filter((f) => f !== 'any');
    if (finishingClean.length) params.set('finishing', finishingClean.join(','));
    if (answers.anchor?.kind === 'poi') {
      params.set('near_lat', String(answers.anchor.lat));
      params.set('near_lng', String(answers.anchor.lng));
      params.set('near_label', answers.anchor.label);
      params.set('radius', '1500');
    }
    params.set('wizard', '1');

    // Installment path always lands on /kvartiry — the monthly cap
    // doesn't aggregate at building level.
    const isInstallment = answers.budgetMode === 'installment';
    const hasUnitCriteria =
      isInstallment ||
      answers.rooms.some((r) => r !== 'any') ||
      answers.finishing.some((f) => f !== 'any');
    if (hasUnitCriteria) {
      router.push(`/kvartiry?${params.toString()}`);
    } else {
      const projectParams = new URLSearchParams();
      // Merge district chips + anchor district (if any) — dedup.
      const allDistricts = new Set(answers.districts);
      if (answers.anchor?.kind === 'district') allDistricts.add(answers.anchor.slug);
      if (allDistricts.size) projectParams.set('district', [...allDistricts].join(','));
      if (answers.budget && answers.budget !== 'any') projectParams.set('price_to', answers.budget);
      if (answers.anchor?.kind === 'poi') {
        projectParams.set('near_lat', String(answers.anchor.lat));
        projectParams.set('near_lng', String(answers.anchor.lng));
        projectParams.set('near_label', answers.anchor.label);
        projectParams.set('radius', '1500');
      }
      projectParams.set('wizard', '1');
      router.push(`/novostroyki?${projectParams.toString()}`);
    }
  }

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* ─── PROGRESS NODES ──────────────────────────────────────
          5 connected circles per the senior-design prescription:
          completed = filled green with checkmark, current = filled
          terracotta with center dot, future = outlined grey with
          step number. Bar segments between nodes match the same
          three-state colour rule.
          Replaces the prior single-line bar (one colour, no nodes)
          which gave no signal about how far along the buyer was. */}
      <ol className="flex items-center px-4 md:px-0">
        {STEPS.map((_, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          const nodeClass = done
            ? 'bg-[color:var(--color-fairness-great)] text-white'
            : active
              ? 'bg-terracotta-600 text-white'
              : 'border border-stone-300 bg-white text-stone-400';
          const isLastNode = i === STEPS.length - 1;
          // Bar AFTER this node, green if buyer is past this node.
          const barClass = i < stepIdx
            ? 'bg-[color:var(--color-fairness-great)]'
            : 'bg-stone-200';
          return (
            <li
              key={i}
              className={cn('flex items-center', isLastNode ? '' : 'flex-1')}
            >
              <div
                className={cn(
                  'relative flex size-7 shrink-0 items-center justify-center rounded-full transition-colors',
                  nodeClass,
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : (
                  <span className="text-caption font-semibold tabular-nums">
                    {i + 1}
                  </span>
                )}
              </div>
              {!isLastNode ? (
                <div aria-hidden className={cn('h-0.5 flex-1', barClass)} />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* ─── QUESTION ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 px-4 md:px-0">
        <div className="flex flex-col gap-3">
          <span className="text-caption font-medium uppercase tracking-widest text-stone-500 tabular-nums">
            Вопрос {stepIdx + 1} из {STEPS.length}
          </span>
          <h1
            className="text-[28px] font-semibold leading-[1.15] text-stone-900 md:text-display"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            {step.title}
          </h1>
          <p className="text-meta text-stone-600 md:text-body">{step.subhead}</p>
        </div>

        {/* Step content — preserved logic, just the wrapper shell
            (icon-circle + h2) was stripped above. */}
        <div className="flex flex-col gap-5">
          {step.key === 'districts' ? (
              <div className="flex flex-col gap-4">
                {/* LocationSearch as the richer location input —
                    leverages the multi-source search. `onPick` keeps
                    the buyer IN the wizard (set anchor → continue
                    with budget/rooms/finishing) instead of navigating
                    away on first pick (which broke the wizard flow). */}
                <div className="flex flex-col gap-1">
                  <LocationSearch
                    destinationPath="/novostroyki"
                    variant="compact"
                    // Wizard step 1 is "what district interests you?" —
                    // surfacing buildings or parametric "3-комн до 200к"
                    // results from the same dropdown would confuse the
                    // intent. scope="location" hides those buckets and
                    // keeps recent-searches scoped separately so home
                    // recents don't leak into the wizard.
                    scope="location"
                    onPick={(hit) => {
                      const anchor: PickedAnchor =
                        hit.sourceKind === 'district'
                          ? { kind: 'district', slug: hit.slug, label: hit.name }
                          : hit.sourceKind === 'poi'
                            ? { kind: 'poi', lat: hit.latitude, lng: hit.longitude, label: hit.name }
                            : hit.sourceKind === 'building'
                              ? { kind: 'building', slug: hit.slug, label: hit.name }
                              : { kind: 'developer', id: hit.id, label: hit.name };
                      setAnswers((a) => {
                        const next: Answers = { ...a, anchor };
                        // If buyer picked a district via the search,
                        // also reflect it in the chips below so the
                        // selection state is consistent.
                        if (anchor.kind === 'district' && !a.districts.includes(anchor.slug)) {
                          next.districts = [...a.districts, anchor.slug];
                        }
                        return next;
                      });
                    }}
                  />
                  {/* Search-input subhead removed — the same line now
                      lives at the page-level step subhead, just above
                      the question. Keeping it twice produced a visible
                      duplicate. */}
                </div>

                {/* Picked anchor chip — shows what the buyer chose
                    via the search box, with X to clear. Without this
                    feedback they'd type, see the dropdown disappear,
                    and not know whether the pick "took". */}
                {answers.anchor ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta-300 bg-terracotta-50 px-3 py-1 text-meta font-medium text-terracotta-800">
                      Выбрано: {answers.anchor.label}
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, anchor: null }))}
                        aria-label="Убрать"
                        className="inline-flex size-4 items-center justify-center rounded-full hover:bg-terracotta-100"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </div>
                ) : null}

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
                mode={answers.budgetMode}
                budget={answers.budget}
                maxMonthly={answers.maxMonthly}
                onModeChange={(mode) =>
                  setAnswers((a) => ({
                    ...a,
                    budgetMode: mode,
                    // Switching tabs clears the OTHER mode's value so
                    // the URL params stay clean and canAdvance reads
                    // only the active tab's input.
                    budget: mode === 'lump_sum' ? a.budget : null,
                    maxMonthly: mode === 'installment' ? a.maxMonthly : null,
                  }))
                }
                onBudgetChange={(v) => setAnswers((a) => ({ ...a, budget: v }))}
                onMaxMonthlyChange={(v) =>
                  setAnswers((a) => ({ ...a, maxMonthly: v }))
                }
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

          {/* ─── BOTTOM ACTIONS ──────────────────────────────────
              Two buttons in a row per the prescription: outlined
              "Назад" left, terracotta-filled "Далее" right. On the
              first step "Назад" is hidden so "Далее" takes the full
              width as a single decisive primary. On step 1 only,
              the small "Пропустить — все районы" text-link sits
              below as a quiet escape. */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
              {stepIdx > 0 ? (
                <AppButton
                  variant="secondary"
                  size="lg"
                  onClick={() => setStepIdx((i) => i - 1)}
                  className="sm:flex-1"
                >
                  Назад
                </AppButton>
              ) : null}
              <AppButton
                variant="primary"
                size="lg"
                disabled={!canAdvance}
                onClick={next}
                // Terracotta override — wizard primary keeps the
                // brand-warm color (deliberate exception to the
                // platform's stone-900 default, same as /voyti's
                // Telegram primary). The wizard is a brand moment.
                className="bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800 sm:flex-[2]"
              >
                {isLast ? 'Показать подходящие варианты' : 'Далее'}
              </AppButton>
            </div>
            {step.key === 'districts' ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => i + 1)}
                className="self-center text-meta font-medium text-stone-500 hover:text-terracotta-700 hover:underline"
              >
                Пропустить — все районы
              </button>
            ) : null}
          </div>
        </div>
      </div>
  );
}

/** Picking "Не важно" deselects every specific value (and vice
 *  versa). Lets the buyer multi-select specific values like 1 + 2
 *  rooms without the "any" sentinel polluting the URL params. */
/** Compact, JSON-friendly summary of the buyer's answer on a given
 *  step. Used as the `answer_summary` property on the
 *  `quiz_step_answered` event so /kabinet/analytics can show what
 *  was picked at each drop-off without dumping raw form state. */
function summariseStepAnswer(
  stepKey: 'districts' | 'budget' | 'rooms' | 'finishing' | 'timing',
  answers: Answers,
): unknown {
  switch (stepKey) {
    case 'districts':
      return {
        districts: answers.districts,
        anchor_kind: answers.anchor?.kind ?? null,
      };
    case 'budget':
      return {
        mode: answers.budgetMode,
        budget: answers.budget,
        max_monthly: answers.maxMonthly,
      };
    case 'rooms':
      return { rooms: answers.rooms };
    case 'finishing':
      return { finishing: answers.finishing };
    case 'timing':
      return { timing: answers.timing };
  }
}

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
 * Budget Q2 choice — tabbed picker that splits the question by HOW
 * the buyer will pay rather than ramming both decisions into one
 * screen. Vahdat reality: about half the buyers reason in monthly
 * installments (Faridun: "я могу 4000 в месяц"), the other half in
 * total cash. The earlier single-track version forced both into the
 * total-price track and lost installment buyers entirely.
 *
 * Two tabs:
 *   1. "Сразу"      → BudgetTrack with TJS-total presets + custom +
 *                     "не важно". Resolves to ?price_to=… on submit.
 *   2. "В рассрочку" → BudgetTrack with TJS-per-month presets + custom +
 *                     "не важно". Resolves to ?monthly_to=… which
 *                     forces installment_available=true at the
 *                     listings service layer.
 *
 * Switching tabs clears the OTHER tab's value (handled by parent)
 * so the URL params on submit reflect exactly one track.
 */
function BudgetChoice({
  mode,
  budget,
  maxMonthly,
  onModeChange,
  onBudgetChange,
  onMaxMonthlyChange,
}: {
  mode: 'lump_sum' | 'installment';
  budget: string | null;
  maxMonthly: string | null;
  onModeChange: (mode: 'lump_sum' | 'installment') => void;
  onBudgetChange: (v: string) => void;
  onMaxMonthlyChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs — pill segmented control. Each pill is a button
          (not a Link) so the wizard state stays intact when switching. */}
      <div
        role="tablist"
        aria-label="Способ оплаты"
        className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 p-1"
      >
        {(
          [
            { id: 'lump_sum' as const, label: 'Сразу' },
            { id: 'installment' as const, label: 'В рассрочку' },
          ]
        ).map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onModeChange(tab.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-meta font-medium transition-colors',
                active
                  ? 'bg-white text-terracotta-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === 'lump_sum' ? (
        <BudgetTrack
          presets={BUDGET_PRESETS}
          value={budget}
          onChange={onBudgetChange}
          inputLabel="Или введите свой максимум, TJS"
          inputPlaceholder="220 000"
          inputId="wizard-budget-input"
          unit="TJS"
          skipHint="Без ограничения по цене"
        />
      ) : (
        <BudgetTrack
          presets={MONTHLY_PRESETS}
          value={maxMonthly}
          onChange={onMaxMonthlyChange}
          inputLabel="Или введите свой максимум, TJS / мес"
          inputPlaceholder="3 500"
          inputId="wizard-monthly-input"
          unit="TJS / мес"
          skipHint="Без ограничения по платежу"
        />
      )}

      {mode === 'installment' ? (
        // Trust note — the installment track narrows results to
        // listings the seller actually offers in rassrochka. Buyers
        // who don't see this assume "rassrochka exists everywhere"
        // and get confused when the result count drops.
        <p className="text-caption text-stone-500">
          Покажем только квартиры с рассрочкой от застройщика. Платёж рассчитан по
          объявленным условиям продавца.
        </p>
      ) : null}
    </div>
  );
}

/** Inner picker shared between the two budget tabs. Same UI shape
 *  (chips + custom input + "не важно" card), just different presets,
 *  units and copy. */
function BudgetTrack({
  presets,
  value,
  onChange,
  inputLabel,
  inputPlaceholder,
  inputId,
  unit,
  skipHint,
}: {
  presets: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (v: string) => void;
  inputLabel: string;
  inputPlaceholder: string;
  inputId: string;
  unit: string;
  skipHint: string;
}) {
  const presetValues = new Set(presets.map((p) => p.value));
  const inputValue =
    value && value !== 'any' && !presetValues.has(value) ? value : '';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
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
              {p.label} {unit}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-caption text-stone-500">
          {inputLabel}
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={inputPlaceholder}
          value={inputValue}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              onChange('');
              return;
            }
            onChange(raw);
          }}
          className="h-11 rounded-md border border-stone-300 bg-white px-3 text-meta tabular-nums text-stone-900 focus:border-terracotta-600 focus:outline-none"
        />
      </div>

      <CardOption
        active={value === 'any'}
        onClick={() => onChange('any')}
        label="Не важно — покажите все"
        hint={skipHint}
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
