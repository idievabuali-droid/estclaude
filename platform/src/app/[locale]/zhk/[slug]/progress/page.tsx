import { notFound } from 'next/navigation';
import { Camera, Calendar, ChevronLeft, ShieldCheck, Bell } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { SaveToggle, ImageWithFallback } from '@/components/blocks';
import { getBuilding } from '@/services/buildings';
import { getBuildingProgress } from '@/services/progress';
import { supabasePublicUrl } from '@/services/photos';

/**
 * Construction-progress timeline (WEDGE-1).
 *
 * Per Cian's `/hod-stroitelstva/` pattern: monthly date-stamped photos showing
 * the project's actual physical progress. The single highest-trust signal for
 * new-build buyers — answers "is this building actually growing?".
 *
 * Renders the real uploaded photos (Supabase Storage) via supabasePublicUrl —
 * the same resolver the detail-page §D preview uses, so the album and the
 * inline preview show identical images. A colored placeholder is kept only as
 * the fallback for a photo whose storage path can't be resolved.
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

  const days = await getBuildingProgress(building.id);

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
            <h1
              className="text-h1 font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >Ход строительства</h1>
            <p className="text-meta text-stone-500">
              Реальные фото с площадки. Загружает {developer.display_name.ru}; платформа
              сверяет дату и метаданные перед публикацией.
            </p>
          </div>
          {/* Subscribe-to-progress affordance. Reuses SaveToggle on
              the building — saving the building already wires it up
              for monthly construction-photo notifications via the
              «Изменения» badge / Telegram (whichever channel the user
              picks at login). The card framing makes the implicit
              subscription explicit so buyers know they can opt in. */}
          <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <p className="text-meta font-semibold text-stone-900">
                  Получать новые фото стройки
                </p>
                <p className="text-caption text-stone-600">
                  Сохраните ЖК — пришлём, когда застройщик загрузит свежие фото.
                </p>
              </div>
            </div>
            <SaveToggle type="building" id={building.id} />
          </div>
        </AppContainer>
      </section>

      {days.length === 0 ? (
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
            {days.map((day) => (
              <div key={day.dateKey} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-stone-500" aria-hidden />
                  <h2 className="text-h2 font-semibold text-stone-900 tabular-nums">
                    {day.label}
                  </h2>
                  <span className="text-meta text-stone-500 tabular-nums">
                    · {day.photos.length} фото
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                  {day.photos.map((p) => (
                    <ProgressPhotoTile
                      key={p.id}
                      storagePath={p.storage_path}
                      coverColor={building.cover_color}
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
  storagePath,
  coverColor,
}: {
  storagePath: string;
  /** Fallback background when the photo URL can't be resolved. */
  coverColor: string;
}) {
  // Real uploaded photo when the storage path resolves to a public URL.
  // ImageWithFallback swaps to the colored placeholder + camera icon if
  // the URL is missing OR the file 404s (e.g. seed placeholder rows
  // whose objects were never uploaded) — so a broken-image icon never
  // shows. Mirrors the §D preview on the detail page.
  //
  // No date/attribution overlay: the date lives once on the day's group
  // header above, and provenance is covered by the page subtitle + the
  // "Откуда эти фото" trust card. The tile is just the photo.
  const url = supabasePublicUrl(storagePath);
  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-md bg-stone-100">
      <ImageWithFallback
        src={url}
        alt="Фото хода строительства"
        className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        fallback={
          <>
            <div
              className="absolute inset-0"
              style={{ backgroundColor: coverColor }}
              aria-hidden
            />
            <Camera
              className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-white/40"
              aria-hidden
            />
          </>
        }
      />
    </div>
  );
}
