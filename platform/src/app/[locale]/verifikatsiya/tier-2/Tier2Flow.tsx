'use client';

import { useState } from 'react';
import { ChevronLeft, IdCard, Camera, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { cn } from '@/lib/utils';

const STEPS = ['intro', 'id', 'selfie', 'review', 'submitted'] as const;
type Step = (typeof STEPS)[number];

export function Tier2Flow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!);
  }

  return (
    <div className="flex flex-col gap-5">
      {step !== 'intro' && step !== 'submitted' ? (
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
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-blue-50 text-[color:var(--color-badge-tier-2)]">
                  <ShieldCheck className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <h1 className="text-h2 font-semibold text-stone-900">
                    Подтвердить профиль (Tier 2)
                  </h1>
                  <p className="text-meta text-stone-500">
                    Покажите паспорт и сделайте селфи. Команда платформы проверит за 24–48 часов.
                  </p>
                </div>
              </div>

              <ul className="flex flex-col gap-2 text-meta text-stone-700">
                <Bullet>Документы хранятся в защищённом хранилище, доступ только у проверяющей команды.</Bullet>
                <Bullet>После проверки все ваши объявления получают синий значок «Профиль проверен».</Bullet>
                <Bullet>Если что-то не подойдёт, мы скажем причину и дадим возможность пересдать.</Bullet>
              </ul>

              <div className="flex flex-col gap-2 md:flex-row">
                <AppButton variant="primary" size="lg" onClick={() => setStep('id')}>
                  <IdCard className="size-4" /> Начать
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push('/kabinet')}
                >
                  Не сейчас
                </AppButton>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      {step === 'id' ? (
        <PhotoStep
          icon={<IdCard className="size-6" />}
          tone="bg-blue-50 text-[color:var(--color-badge-tier-2)]"
          title="Загрузите фото паспорта"
          description="Главный разворот, чтобы было видно фото и ФИО. Никаких бликов и обрезанных краёв."
          preview={idPhoto}
          onPick={(url) => setIdPhoto(url)}
          onContinue={() => setStep('selfie')}
        />
      ) : null}

      {step === 'selfie' ? (
        <PhotoStep
          icon={<Camera className="size-6" />}
          tone="bg-blue-50 text-[color:var(--color-badge-tier-2)]"
          title="Сделайте селфи с паспортом"
          description="Держите паспорт рядом с лицом. Хорошее освещение, без шапки и солнечных очков."
          preview={selfie}
          onPick={(url) => setSelfie(url)}
          onContinue={() => setStep('review')}
        />
      ) : null}

      {step === 'review' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <h2 className="text-h2 font-semibold text-stone-900">Проверьте перед отправкой</h2>
              <div className="grid grid-cols-2 gap-3">
                {idPhoto ? (
                  <Preview label="Паспорт" url={idPhoto} />
                ) : null}
                {selfie ? <Preview label="Селфи" url={selfie} /> : null}
              </div>
              <p className="text-meta text-stone-500">
                Отправляя, вы соглашаетесь, что данные будут использованы для подтверждения личности.
              </p>
              <div className="flex justify-end">
                <AppButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    toast.success('Заявка отправлена. Решение в течение 24–48 часов.');
                    setStep('submitted');
                  }}
                >
                  <CheckCircle2 className="size-4" /> Отправить на проверку
                </AppButton>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      ) : null}

      {step === 'submitted' ? (
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-blue-50 text-[color:var(--color-badge-tier-2)]">
                <Clock className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-h1 font-semibold text-stone-900">Заявка на проверке</h1>
                <p className="text-meta text-stone-500">
                  Мы пришлём уведомление в Telegram, когда проверка будет завершена.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <AppButton variant="primary" onClick={() => router.push('/kabinet')}>
                  Вернуться в кабинет
                </AppButton>
                <AppButton variant="secondary" onClick={() => router.push('/verifikatsiya/tier-3')}>
                  Узнать о Tier 3
                </AppButton>
              </div>
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

function PhotoStep({
  icon,
  tone,
  title,
  description,
  preview,
  onPick,
  onContinue,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  preview: string | null;
  onPick: (url: string) => void;
  onContinue: () => void;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className={cn('inline-flex size-12 items-center justify-center rounded-full', tone)}>
              {icon}
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-h2 font-semibold text-stone-900">{title}</h1>
              <p className="text-meta text-stone-500">{description}</p>
            </div>
          </div>

          <label className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-stone-300 bg-stone-50 hover:border-stone-400">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Превью" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-stone-500">
                <Camera className="size-8" />
                <span className="text-meta font-medium">Нажмите, чтобы выбрать или сфотографировать</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(URL.createObjectURL(f));
              }}
            />
          </label>

          <div className="flex justify-end">
            <AppButton variant="primary" size="lg" disabled={!preview} onClick={onContinue}>
              Далее
            </AppButton>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function Preview({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-stone-500">{label}</span>
      <div className="aspect-[4/3] overflow-hidden rounded-md border border-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="size-full object-cover" />
      </div>
    </div>
  );
}
