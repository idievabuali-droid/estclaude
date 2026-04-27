import { notFound } from 'next/navigation';
import { Camera, Calendar, ChevronLeft, ShieldCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { getBuilding } from '@/services/buildings';
import { getBuildingProgress } from '@/services/progress';

/**
 * Construction-progress timeline (WEDGE-1).
 *
 * Per Cian's `/hod-stroitelstva/` pattern: monthly date-stamped photos showing
 * the project's actual physical progress. The single highest-trust signal for
 * new-build buyers — answers "is this building actually growing?".
 *
 * Until real Storage uploads land we render coloured placeholders with the
 * date stamp + attribution overlaid. The data layer (services + photos table)
 * is real Supabase — only the image bytes are placeholder.
 */
export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const data = await getBuilding(slug);
  if (!data) notFound();
  const { building, developer } = data;

  const months = await getBuildingProgress(building.id);

  return (
    <>
      <section className="border-b border-stone-200 bg-white">
        <AppContainer className="flex flex-col gap-3 py-5">
          <Link
            href={`/zhk/${building.slug}`}
            className="inline-flex w-fit items-center gap-1 text-meta font-medium text-stone-700 hover:text-terracotta-600"
          >
            <ChevronLeft className="size-4" /> {building.name.ru}
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-semibold text-stone-900">Ход строительства</h1>
            <p className="text-meta text-stone-500">
              Реальные фото с площадки. Загружает {developer.display_name.ru}; платформа
              сверяет дату и метаданные перед публикацией.
            </p>
          </div>
        </AppContainer>
      </section>

      {months.length === 0 ? (
        <section className="py-7">
          <AppContainer>
            <AppCard>
              <AppCardContent>
                <div className="flex flex-col items-center gap-3 py-7 text-center">
                  <Camera className="size-8 text-stone-400" aria-hidden />
                  <h3 className="text-h3 font-semibold text-stone-900">
                    Пока нет фото стройки
                  </h3>
                  <p className="text-meta text-stone-500">
                    Застройщик ещё не загрузил фотографии. Мы напомним о ежемесячном
                    обновлении.
                  </p>
                </div>
              </AppCardContent>
            </AppCard>
          </AppContainer>
        </section>
      ) : (
        <section className="bg-stone-50 py-6 pb-9">
          <AppContainer className="flex flex-col gap-7">
            {months.map((m) => (
              <div key={m.monthKey} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-stone-500" aria-hidden />
                  <h2 className="text-h2 font-semibold text-stone-900 tabular-nums">
                    {m.label}
                  </h2>
                  <span className="text-meta text-stone-500 tabular-nums">
                    · {m.photos.length} фото
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                  {m.photos.map((p, i) => (
                    <ProgressPhotoTile
                      key={p.id}
                      coverColor={building.cover_color}
                      takenAt={p.taken_at}
                      developer={developer.display_name.ru}
                      shadeIndex={i + m.photos.length}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Trust block at the bottom */}
            <AppCard className="border-amber-200/60 bg-amber-50/30">
              <AppCardContent>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-[color:var(--color-badge-tier-developer)]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-h3 font-semibold text-stone-900">
                      Откуда эти фото
                    </span>
                    <span className="text-meta text-stone-700">
                      Каждое фото загружено застройщиком (или командой платформы при выезде).
                      Мы проверяем дату, метаданные и при необходимости — координаты съёмки.
                      Фото без подтверждения мы не публикуем.
                    </span>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>
          </AppContainer>
        </section>
      )}
    </>
  );
}

function ProgressPhotoTile({
  coverColor,
  takenAt,
  developer,
  shadeIndex,
}: {
  coverColor: string;
  takenAt: string;
  developer: string;
  shadeIndex: number;
}) {
  // Placeholder rendering: each tile gets a slightly varied shade of the
  // building's cover color so the grid doesn't look like a single block.
  // When real Storage uploads land, replace with <Image src={publicUrl} />.
  const opacity = 0.65 + (shadeIndex % 4) * 0.08;
  const date = new Date(takenAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-md">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: coverColor, opacity }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
      <Camera
        className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-white/40"
        aria-hidden
      />
      <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 text-caption text-white drop-shadow-sm">
        <span className="font-semibold tabular-nums">{date}</span>
        <span className="truncate text-white/85">Загружено · {developer}</span>
      </div>
    </div>
  );
}
