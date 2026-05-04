import { MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppContainer, AppButton, AppCard, AppCardContent } from '@/components/primitives';

/**
 * Russian-language 404 inside the [locale] layout — was the generic
 * Next.js "This page could not be found." in English with no header
 * or nav. That fallback reads as "the platform is broken" rather
 * than "the URL was wrong"; for a trust-first product that's a
 * meaningful trust hit. Keeping the SiteHeader / SiteFooter from the
 * [locale] layout means the user never feels lost.
 *
 * Routes that hit this:
 *   - /verifikatsiya/tier-2 + tier-3 (intentionally V1-cut via notFound())
 *   - typos / dead links shared in WhatsApp groups
 *   - listings / buildings the user removed
 */
export default function LocalisedNotFound() {
  return (
    <section className="py-12">
      <AppContainer>
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-stone-100">
                <MapPin className="size-7 text-stone-500" aria-hidden />
              </div>
              <div className="flex max-w-md flex-col gap-2">
                <h1 className="text-h1 font-semibold text-stone-900">
                  Страница не найдена
                </h1>
                <p className="text-meta text-stone-600">
                  Возможно, ссылка устарела или объявление было снято. Попробуйте
                  начать поиск заново.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/">
                  <AppButton variant="primary">На главную</AppButton>
                </Link>
                <Link href="/novostroyki">
                  <AppButton variant="secondary">Все новостройки</AppButton>
                </Link>
                <Link href="/kvartiry">
                  <AppButton variant="secondary">Все квартиры</AppButton>
                </Link>
              </div>
            </div>
          </AppCardContent>
        </AppCard>
      </AppContainer>
    </section>
  );
}
