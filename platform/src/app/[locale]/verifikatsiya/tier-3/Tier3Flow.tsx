'use client';

import { useState } from 'react';
import { ChevronLeft, ShieldCheck, CheckCircle2, MapPin, Calendar, Clock } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  AppButton,
  AppCard,
  AppCardContent,
  AppSelect,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { mockListings, mockBuildings } from '@/lib/mock';
import { cn } from '@/lib/utils';

const STEPS = ['intro', 'listing', 'schedule', 'confirmed'] as const;
type Step = (typeof STEPS)[number];

const SLOTS = [
  '09:00 – 11:00',
  '11:00 – 13:00',
  '13:00 – 15:00',
  '15:00 – 17:00',
  '17:00 – 19:00',
];

// Generate next 14 days
const NEXT_DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1);
  return {
    iso: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' }),
  };
});

export function Tier3Flow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [listingId, setListingId] = useState<string>(mockListings[0]?.id ?? '');
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const myListings = mockListings.slice(0, 3); // mock: first 3 are mine

  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!);
  }

  return (
    <div className="flex flex-col gap-5">
      {step !== 'intro' && step !== 'confirmed' ? (
        <button
          type="button"
          onClick={back}
          className="inline-flex w-fit items-center gap-1 text-meta font-medium text-stone-700 hover:text-terracotta-600"
        >
          <ChevronLeft className="size-4" /> Назад
        </button>
      ) : null}

      {step === 'intro' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-green-50 text-[color:var(--color-badge-tier-3)]">
                  <ShieldCheck className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <h1 className="text-h2 font-semibold text-stone-900">
                    Верификация объекта (Tier 3)
                  </h1>
                  <p className="text-meta text-stone-500">
                    Команда платформы выезжает на квартиру и подтверждает: квартира существует,
                    цена соответствует заявленной, продавец — реальный.
                  </p>
                </div>
              </div>

              <ul className="flex flex-col gap-2 text-meta text-stone-700">
                <Bullet>Один выезд на 30–45 минут — мы не задерживаем.</Bullet>
                <Bullet>Зелёный значок «Объект проверен» появляется в карточке.</Bullet>
                <Bullet>Действует 45 дней. Перед окончанием мы напомним продлить.</Bullet>
                <Bullet>Бесплатно для V1. В будущем возможна символическая плата.</Bullet>
              </ul>

              <div className="flex justify-end">
                <AppButton variant="primary" size="lg" onClick={() => setStep('listing')}>
                  Запланировать визит
                </AppButton>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      {step === 'listing' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-5">
              <h2 className="text-h2 font-semibold text-stone-900">
                Какое объявление проверяем?
              </h2>
              <AppSelect
                label="Объявление"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                options={myListings.map((l) => {
                  const b = mockBuildings.find((bd) => bd.id === l.building_id);
                  return {
                    value: l.id,
                    label: `${b?.name.ru} · ${l.rooms_count}-комн · ${l.size_m2} м²`,
                  };
                })}
              />
              <div className="flex justify-end">
                <AppButton variant="primary" size="lg" disabled={!listingId} onClick={() => setStep('schedule')}>
                  Далее
                </AppButton>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      {step === 'schedule' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-h2 font-semibold text-stone-900">Выберите время визита</h2>
                <p className="text-meta text-stone-500">
                  Окна по 2 часа. Команда позвонит за 30 минут до приезда.
                </p>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-1 text-caption font-medium text-stone-500">
                  <Calendar className="size-3.5" /> Дата
                </span>
                <div className="flex flex-wrap gap-2">
                  {NEXT_DAYS.slice(0, 8).map((d) => (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => {
                        setDate(d.iso);
                        setSlot(null);
                      }}
                      className={cn(
                        'rounded-md border px-3 py-2 text-meta font-medium tabular-nums transition-colors',
                        date === d.iso
                          ? 'border-terracotta-600 bg-terracotta-100 text-terracotta-800 ring-2 ring-terracotta-600/20'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot */}
              {date ? (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1 text-caption font-medium text-stone-500">
                    <Clock className="size-3.5" /> Время
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SLOTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={cn(
                          'rounded-md border px-3 py-2 text-meta font-medium tabular-nums transition-colors',
                          slot === s
                            ? 'border-terracotta-600 bg-terracotta-100 text-terracotta-800 ring-2 ring-terracotta-600/20'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <AppButton
                  variant="primary"
                  size="lg"
                  disabled={!date || !slot}
                  onClick={() => {
                    toast.success('Визит запланирован');
                    setStep('confirmed');
                  }}
                >
                  Подтвердить визит
                </AppButton>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      {step === 'confirmed' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-green-50 text-[color:var(--color-badge-tier-3)]">
                <CheckCircle2 className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-h1 font-semibold text-stone-900">Визит запланирован</h1>
                <p className="text-meta text-stone-500 tabular-nums">
                  {date} · {slot}
                </p>
                <p className="inline-flex items-center justify-center gap-1 text-meta text-stone-500">
                  <MapPin className="size-3.5" />
                  Адрес возьмём из объявления
                </p>
              </div>
              <p className="text-meta text-stone-500">
                Мы пришлём напоминание в Telegram за день до визита.
              </p>
              <AppButton variant="primary" onClick={() => router.push('/kabinet')}>
                Вернуться в кабинет
              </AppButton>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--color-fairness-great)]" />
      <span>{children}</span>
    </li>
  );
}
