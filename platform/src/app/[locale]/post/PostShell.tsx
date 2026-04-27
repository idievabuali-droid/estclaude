'use client';

import { ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppContainer } from '@/components/primitives';
import { cn } from '@/lib/utils';

export const POST_STEPS = [
  { slug: 'phone', label: 'Телефон' },
  { slug: 'ownership', label: 'Кто продаёт' },
  { slug: 'building', label: 'ЖК' },
  { slug: 'details', label: 'Детали' },
  { slug: 'photos', label: 'Фото' },
  { slug: 'review', label: 'Проверка' },
  { slug: 'published', label: 'Готово' },
] as const;

export type PostStep = (typeof POST_STEPS)[number]['slug'];

export function PostShell({
  step,
  children,
}: {
  step: PostStep;
  children: React.ReactNode;
}) {
  const idx = POST_STEPS.findIndex((s) => s.slug === step);
  const prev = idx > 0 ? POST_STEPS[idx - 1] : null;
  const isPublished = step === 'published';

  return (
    <section className="bg-stone-50 py-5">
      <AppContainer className="lg:max-w-2xl">
        {!isPublished ? (
          <div className="mb-5 flex flex-col gap-3">
            {/* Step counter */}
            <div className="flex items-center justify-between gap-3">
              {prev ? (
                <Link
                  href={`/post/${prev.slug}`}
                  className="inline-flex items-center gap-1 text-meta font-medium text-stone-700 hover:text-terracotta-600"
                >
                  <ChevronLeft className="size-4" /> Назад
                </Link>
              ) : (
                <span />
              )}
              <span className="text-caption tabular-nums text-stone-500">
                Шаг {idx + 1} из {POST_STEPS.length - 1}
              </span>
            </div>
            {/* Progress bar */}
            <div className="flex h-1 w-full overflow-hidden rounded-full bg-stone-200">
              {POST_STEPS.slice(0, -1).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-full flex-1',
                    i <= idx ? 'bg-terracotta-600' : 'bg-transparent',
                    i > 0 ? 'ml-0.5' : '',
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}
        {children}
      </AppContainer>
    </section>
  );
}
