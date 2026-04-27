'use client';

import { useState } from 'react';
import { User, Handshake, Building2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import { AppButton, AppCard, AppCardContent } from '@/components/primitives';
import { cn } from '@/lib/utils';
import type { SourceType } from '@/types/domain';

const OPTIONS: Array<{
  value: SourceType;
  Icon: typeof User;
  label: string;
  description: string;
  chipLabel: string;
  chipTone: string;
}> = [
  {
    value: 'owner',
    Icon: User,
    label: 'Мне или моей семье',
    description: 'Я собственник этой квартиры или продаю свою семейную собственность.',
    chipLabel: 'Собственник',
    chipTone: 'bg-green-50 text-[color:var(--color-source-owner)]',
  },
  {
    value: 'intermediary',
    Icon: Handshake,
    label: 'Другому человеку — продаю от их имени',
    description:
      'Я представляю интересы владельца. Понадобится подтверждение разрешения для Tier 3.',
    chipLabel: 'Посредник',
    chipTone: 'bg-amber-50 text-[color:var(--color-source-intermediary)]',
  },
  {
    value: 'developer',
    Icon: Building2,
    label: 'Я представляю застройщика',
    description:
      'Перед публикацией команда платформы свяжется с офисом застройщика для подтверждения.',
    chipLabel: 'От застройщика',
    chipTone: 'bg-indigo-50 text-[color:var(--color-source-developer)]',
  },
];

export default function PostOwnershipStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<SourceType | null>(null);

  return (
    <PostShell step="ownership">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-stone-900">Кому принадлежит квартира?</h1>
          <p className="text-meta text-stone-500">
            Это влияет на источник в карточке. Источник всегда виден покупателю — поэтому важно
            ответить честно.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={cn(
                'group flex items-start gap-4 rounded-md border bg-white p-5 text-left transition-colors',
                selected === opt.value
                  ? 'border-terracotta-600 ring-2 ring-terracotta-600/20'
                  : 'border-stone-200 hover:border-stone-300',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-10 shrink-0 items-center justify-center rounded-full',
                  opt.chipTone,
                )}
              >
                <opt.Icon className="size-5" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-h3 font-semibold text-stone-900">{opt.label}</span>
                <span className="text-meta text-stone-500">{opt.description}</span>
                <span
                  className={cn(
                    'mt-1 inline-flex w-fit items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium',
                    opt.chipTone,
                  )}
                >
                  <opt.Icon className="size-3" /> {opt.chipLabel}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected === 'developer' ? (
          <AppCard className="border-amber-200 bg-amber-50/40">
            <AppCardContent>
              <p className="text-meta text-stone-700">
                После подачи объявления оно будет в статусе «Скрыто», пока команда платформы не
                подтвердит застройщика по телефону его офиса.
              </p>
            </AppCardContent>
          </AppCard>
        ) : null}

        <div className="flex justify-end">
          <AppButton
            variant="primary"
            size="lg"
            disabled={!selected}
            onClick={() => router.push('/post/building')}
          >
            Далее
          </AppButton>
        </div>
      </div>
    </PostShell>
  );
}
