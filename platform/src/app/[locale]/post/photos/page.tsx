'use client';

import { useState } from 'react';
import { Camera, Plus, X, Star, ImageIcon } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import {
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 15;

type Slot = { id: string; preview: string };

export default function PostPhotosStep() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - slots.length;
    const newSlots = files.slice(0, remaining).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(f),
    }));
    setSlots((prev) => [...prev, ...newSlots]);
    e.target.value = ''; // allow same file twice
  }

  function remove(id: string) {
    setSlots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (coverIdx >= next.length) setCoverIdx(0);
      return next;
    });
  }

  const enough = slots.length >= MIN_PHOTOS;

  return (
    <PostShell step="photos">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2 font-semibold text-stone-900">Фотографии</h1>
          <p className="text-meta text-stone-500">
            От {MIN_PHOTOS} до {MAX_PHOTOS} фото. Первая фотография — обложка.
          </p>
        </div>

        <AppCard>
          <AppCardContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
                {slots.map((slot, i) => (
                  <div
                    key={slot.id}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-md border-2',
                      i === coverIdx ? 'border-terracotta-600' : 'border-stone-200',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slot.preview}
                      alt="Превью"
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => remove(slot.id)}
                      aria-label="Удалить"
                      className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-stone-900/60 text-white hover:bg-stone-900/80"
                    >
                      <X className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverIdx(i)}
                      aria-label="Сделать обложкой"
                      className={cn(
                        'absolute bottom-1 left-1 inline-flex size-7 items-center justify-center rounded-full',
                        i === coverIdx
                          ? 'bg-terracotta-600 text-white'
                          : 'bg-white/90 text-stone-700 hover:bg-white',
                      )}
                    >
                      <Star className={cn('size-3.5', i === coverIdx ? 'fill-current' : '')} />
                    </button>
                  </div>
                ))}

                {slots.length < MAX_PHOTOS ? (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-stone-400 hover:bg-stone-100">
                    <Plus className="size-5" />
                    <span className="text-caption font-medium">Добавить</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="sr-only"
                      onChange={onSelect}
                    />
                  </label>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
                <span className="inline-flex items-center gap-1 text-meta text-stone-500 tabular-nums">
                  <ImageIcon className="size-4" />
                  {slots.length} / {MAX_PHOTOS}
                </span>
                {!enough ? (
                  <span className="text-meta text-stone-500 tabular-nums">
                    Минимум {MIN_PHOTOS} фото
                  </span>
                ) : (
                  <span className="text-meta text-[color:var(--color-fairness-great)]">
                    Достаточно для публикации
                  </span>
                )}
              </div>
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-stone-200 bg-stone-50">
          <AppCardContent>
            <div className="flex items-start gap-3">
              <Camera className="mt-1 size-5 text-stone-500" aria-hidden />
              <p className="text-meta text-stone-700">
                Хорошие фото утраивают шанс контакта. Снимайте при дневном свете, по одной комнате
                за фото, без мусора в кадре. Покажите вид из окна и санузел.
              </p>
            </div>
          </AppCardContent>
        </AppCard>

        <div className="flex justify-end">
          <AppButton
            variant="primary"
            size="lg"
            disabled={!enough}
            onClick={() => router.push('/post/review')}
          >
            Далее
          </AppButton>
        </div>
      </div>
    </PostShell>
  );
}
