import { useTranslations } from 'next-intl';
import { Phone, MessageCircle, Send } from 'lucide-react';
import { AppContainer } from '@/components/primitives';
import { Link } from '@/i18n/navigation';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

/**
 * Site footer. Was a single-row of 4 nav links + © 2026 — read as
 * "weekend project", which kills trust on a "give us your phone
 * number" platform. Now a four-column layout (stacked on mobile)
 * with: navigation, help, about, contact. Same Russian-first tone
 * as the rest of the platform.
 */
export function SiteFooter() {
  const t = useTranslations('Nav');

  return (
    <footer className="mt-7 border-t border-stone-200 bg-white py-7">
      <AppContainer className="flex flex-col gap-7">
        <div className="grid grid-cols-2 gap-7 md:grid-cols-4">
          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-stone-500">
              Поиск
            </h3>
            <Link href="/novostroyki" className="text-meta text-stone-700 hover:text-stone-900">
              {t('buildings')}
            </Link>
            <Link href="/kvartiry" className="text-meta text-stone-700 hover:text-stone-900">
              {t('apartments')}
            </Link>
            <Link href="/diaspora" className="text-meta text-stone-700 hover:text-stone-900">
              {t('diaspora')}
            </Link>
          </div>

          {/* Help */}
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-stone-500">
              Помощь
            </h3>
            <Link href="/tsentr-pomoshchi" className="text-meta text-stone-700 hover:text-stone-900">
              Центр помощи
            </Link>
            <Link href="/pomoshch-vybora" className="text-meta text-stone-700 hover:text-stone-900">
              Подбор квартиры
            </Link>
            <Link href="/post" className="text-meta text-stone-700 hover:text-stone-900">
              Разместить квартиру
            </Link>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-stone-500">
              О платформе
            </h3>
            <p className="text-meta text-stone-600">
              ЖК.tj — поиск новостроек и квартир в Вахдате с проверенными
              застройщиками и реальными фото со стройки.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-2">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-stone-500">
              Связаться
            </h3>
            <a
              href={FOUNDER_CONTACTS.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-meta text-stone-700 hover:text-stone-900"
            >
              <MessageCircle className="size-4 text-emerald-600" aria-hidden /> WhatsApp
            </a>
            <a
              href={FOUNDER_CONTACTS.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-meta text-stone-700 hover:text-stone-900"
            >
              <Send className="size-4 text-sky-600" aria-hidden /> Telegram
            </a>
            <a
              href={`tel:${FOUNDER_CONTACTS.phone}`}
              className="inline-flex items-center gap-1.5 text-meta text-stone-700 hover:text-stone-900"
            >
              <Phone className="size-4 text-stone-500" aria-hidden /> {FOUNDER_CONTACTS.phoneDisplay}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-100 pt-4 text-caption text-stone-500 md:flex-row md:items-center md:justify-between">
          <span className="tabular-nums">© 2026 ЖК.tj · Вахдат, Таджикистан</span>
          <span>
            Команда платформы вычитывает каждое объявление перед публикацией.
          </span>
        </div>
      </AppContainer>
    </footer>
  );
}
