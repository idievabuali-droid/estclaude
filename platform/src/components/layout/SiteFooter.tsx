import { useTranslations } from 'next-intl';
import { AppContainer } from '@/components/primitives';
import { Link } from '@/i18n/navigation';

export function SiteFooter() {
  const t = useTranslations('Nav');

  return (
    <footer className="mt-7 border-t border-stone-200 bg-white py-6">
      <AppContainer className="flex flex-col gap-4 text-meta text-stone-500 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-4">
          <Link href="/novostroyki" className="hover:text-stone-900">
            {t('buildings')}
          </Link>
          <Link href="/kvartiry" className="hover:text-stone-900">
            {t('apartments')}
          </Link>
          <Link href="/diaspora" className="hover:text-stone-900">
            {t('diaspora')}
          </Link>
          <Link href="/tsentr-pomoshchi" className="hover:text-stone-900">
            Помощь
          </Link>
        </div>
        <span className="tabular-nums">© 2026</span>
      </AppContainer>
    </footer>
  );
}
