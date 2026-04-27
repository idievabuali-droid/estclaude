'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import { usePostDraftStore } from '@/lib/post-draft-store';
import {
  AppButton,
  AppInput,
  AppSelect,
  AppCheckbox,
  AppRadioGroup,
  AppRadio,
  AppTextarea,
  AppCard,
  AppCardContent,
} from '@/components/primitives';

const FINISHING_OPTIONS = [
  { value: 'no_finish', label: 'Без ремонта' },
  { value: 'pre_finish', label: 'Предчистовая' },
  { value: 'full_finish', label: 'С ремонтом' },
  { value: 'owner_renovated', label: 'Отремонтировано владельцем' },
];

export default function PostDetailsStep() {
  const router = useRouter();
  const draft = usePostDraftStore((s) => s.draft);
  const patch = usePostDraftStore((s) => s.patch);

  // JOURNEY-7: hydrate the persisted draft on mount
  useEffect(() => {
    usePostDraftStore.persist.rehydrate();
  }, []);

  const [installment, setInstallment] = useState(draft.installmentEnabled);
  const [finishing, setFinishing] = useState<string>(draft.finishing ?? 'pre_finish');

  function persistAndContinue() {
    patch({
      installmentEnabled: installment,
      finishing: finishing as typeof draft.finishing,
    });
    router.push('/post/photos');
  }

  return (
    <PostShell step="details">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-stone-900">Детали квартиры</h1>
          <p className="text-meta text-stone-500">
            Эти параметры появятся в карточке. Чем точнее данные — тем больше доверия.
          </p>
        </div>

        <AppCard>
          <AppCardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AppSelect
                label="Количество комнат"
                placeholder="Выберите"
                options={[
                  { value: '1', label: '1' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                  { value: '4', label: '4' },
                  { value: '5', label: '5+' },
                ]}
                required
              />
              <AppInput
                type="number"
                inputMode="decimal"
                label="Площадь, м²"
                placeholder="64.5"
                step="0.1"
                required
              />
              <AppInput type="number" inputMode="numeric" label="Этаж" placeholder="5" required />
              <AppInput
                type="number"
                inputMode="numeric"
                label="Всего этажей"
                placeholder="16"
              />
              <AppInput
                inputMode="text"
                label="Секция / блок (необязательно)"
                placeholder="A"
              />
              <AppInput
                inputMode="text"
                label="Номер квартиры (внутренний)"
                placeholder="47"
                helperText="Не показывается покупателю — нужен только для проверки уникальности."
              />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <h2 className="text-h3 font-semibold text-stone-900">Цена</h2>
              <AppInput
                type="number"
                inputMode="numeric"
                label="Цена, TJS"
                placeholder="742000"
                required
              />
              <AppCheckbox
                label="Доступна рассрочка от застройщика"
                description="Без процентов. Только месячный платёж, первый взнос и срок."
                checked={installment}
                onChange={(e) => setInstallment(e.target.checked)}
              />
              {installment ? (
                <div className="grid grid-cols-1 gap-3 border-l-2 border-terracotta-200 pl-4 md:grid-cols-3">
                  <AppInput
                    type="number"
                    inputMode="numeric"
                    label="Первый взнос, %"
                    placeholder="30"
                  />
                  <AppInput
                    type="number"
                    inputMode="numeric"
                    label="Месячный платёж, TJS"
                    placeholder="8750"
                  />
                  <AppInput
                    type="number"
                    inputMode="numeric"
                    label="Срок, мес"
                    placeholder="84"
                  />
                </div>
              ) : null}
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardContent>
            <AppRadioGroup
              name="finishing"
              label="Тип отделки"
              value={finishing}
              onValueChange={setFinishing}
            >
              {FINISHING_OPTIONS.map((f) => (
                <AppRadio key={f.value} value={f.value} label={f.label} />
              ))}
            </AppRadioGroup>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardContent>
            <AppTextarea
              label="Описание (необязательно)"
              placeholder="Расскажите, что важно знать покупателю..."
              maxLength={500}
              showCounter
            />
          </AppCardContent>
        </AppCard>

        <div className="flex justify-end">
          <AppButton variant="primary" size="lg" onClick={persistAndContinue}>
            Далее
          </AppButton>
        </div>
      </div>
    </PostShell>
  );
}
