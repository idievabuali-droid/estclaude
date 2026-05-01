'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import {
  AppButton,
  AppCard,
  AppCardContent,
  AppCheckbox,
} from '@/components/primitives';

export default function PostReviewStep() {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    setPublishing(true);
    // SPEC-GAP: real Server Action insert deferred to Supabase wiring
    await new Promise((r) => setTimeout(r, 600));
    router.push('/post/published');
  }

  return (
    <PostShell step="review">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-stone-900">Проверьте перед публикацией</h1>
          <p className="text-meta text-stone-500">
            После публикации объявление сразу появится в поиске. Изменить можно в любой момент.
          </p>
        </div>

        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-3">
              <h2 className="text-h3 font-semibold text-stone-900">Сводка</h2>
              <dl className="grid grid-cols-1 gap-2 text-meta md:grid-cols-2">
                <Row label="ЖК">ЖК Vahdat Park</Row>
                <Row label="Источник">Собственник</Row>
                <Row label="Комнаты">2</Row>
                <Row label="Площадь">62 м²</Row>
                <Row label="Этаж">4/10</Row>
                <Row label="Отделка">Предчистовая</Row>
                <Row label="Цена">285 000 TJS</Row>
                <Row label="Рассрочка">3 400 TJS / мес · 30% · 84 мес</Row>
                <Row label="Фото">5 загружено</Row>
              </dl>
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-amber-200 bg-amber-50/40">
          <AppCardContent>
            <p className="text-meta text-stone-700">
              <strong>Halal-by-design.</strong> Мы не показываем процент годовых, не используем
              срочное давление и не публикуем накрученные счётчики. Если в ваших данных есть
              признаки манипулятивных приёмов — мы попросим переписать.
            </p>
          </AppCardContent>
        </AppCard>

        <AppCard>
          <AppCardContent>
            <AppCheckbox
              label="Я подтверждаю, что данные точные и я имею право продавать эту квартиру."
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
          </AppCardContent>
        </AppCard>

        <div className="flex justify-end">
          <AppButton
            variant="primary"
            size="lg"
            disabled={!agree || publishing}
            loading={publishing}
            onClick={publish}
          >
            <CheckCircle2 className="size-4" /> Опубликовать
          </AppButton>
        </div>
      </div>
    </PostShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-stone-100 py-2 last:border-b-0">
      <dt className="text-caption text-stone-500">{label}</dt>
      <dd className="text-meta font-medium tabular-nums text-stone-900">{children}</dd>
    </div>
  );
}
