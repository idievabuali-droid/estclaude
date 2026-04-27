'use client';

import { useState } from 'react';
import { Search, Plus, MapPin, Building } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import {
  AppButton,
  AppCard,
  AppCardContent,
  AppInput,
} from '@/components/primitives';
import { mockBuildings, getDistrict } from '@/lib/mock';
import { cn } from '@/lib/utils';

export default function PostBuildingStep() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = q
    ? mockBuildings.filter(
        (b) =>
          b.name.ru.toLowerCase().includes(q.toLowerCase()) ||
          b.address.ru.toLowerCase().includes(q.toLowerCase()),
      )
    : mockBuildings;

  return (
    <PostShell step="building">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-stone-900">В каком ЖК находится квартира?</h1>
          <p className="text-meta text-stone-500">
            Найдите ваш жилой комплекс. Если не нашли, добавьте его — мы подтвердим перед
            публикацией.
          </p>
        </div>

        <AppInput
          type="search"
          placeholder="Название ЖК или адрес"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leftSlot={<Search className="size-4" />}
        />

        <div className="flex flex-col gap-2">
          {filtered.map((b) => {
            const d = getDistrict(b.district_id);
            const active = selectedId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'flex items-center gap-3 rounded-md border bg-white p-4 text-left transition-colors',
                  active
                    ? 'border-terracotta-600 ring-2 ring-terracotta-600/20'
                    : 'border-stone-200 hover:border-stone-300',
                )}
              >
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: b.cover_color }}
                >
                  <Building className="size-4" aria-hidden />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-h3 font-semibold text-stone-900">{b.name.ru}</span>
                  <span className="inline-flex items-center gap-1 text-meta text-stone-500">
                    <MapPin className="size-3.5" />
                    {d?.name.ru} · {b.address.ru}
                  </span>
                </div>
              </button>
            );
          })}

          <AppCard className="border-dashed">
            <AppCardContent>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => alert('Добавление нового ЖК откроется в следующей версии')}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700">
                  <Plus className="size-4" />
                </span>
                <div className="flex flex-col">
                  <span className="text-h3 font-semibold text-stone-900">
                    Не нашли ЖК? Добавить новый
                  </span>
                  <span className="text-meta text-stone-500">
                    Мы подтвердим его перед публикацией.
                  </span>
                </div>
              </button>
            </AppCardContent>
          </AppCard>
        </div>

        <div className="flex justify-end">
          <AppButton
            variant="primary"
            size="lg"
            disabled={!selectedId}
            onClick={() => router.push('/post/details')}
          >
            Далее
          </AppButton>
        </div>
      </div>
    </PostShell>
  );
}
