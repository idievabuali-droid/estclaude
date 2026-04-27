import { setRequestLocale } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppCard,
  AppCardContent,
} from '@/components/primitives';

const ARTICLES = [
  {
    slug: 'verification-tiers',
    title: 'Что означают значки проверки?',
    summary: 'Tier 1, Tier 2, Tier 3 и значок проверенного застройщика — что они значат и как их получить.',
  },
  {
    slug: 'finishing-types',
    title: 'Без ремонта, предчистовая, с ремонтом — в чём разница?',
    summary: 'Четыре типа отделки в Tajik market context, с примерами, чего ожидать.',
  },
  {
    slug: 'fairness',
    title: 'Что означает «12% ниже среднего» в карточке?',
    summary: 'Платформа сравнивает цену за м² со средней по району. Не реклама, не давление.',
  },
  {
    slug: 'sources',
    title: 'От застройщика, собственник, посредник — кто кто?',
    summary: 'Три источника объявлений, как их отличить и почему это важно.',
  },
  {
    slug: 'installments',
    title: 'Что такое рассрочка и как она работает?',
    summary: 'Рассрочка от застройщика без процентов: первый взнос, месячный платёж, срок.',
  },
  {
    slug: 'safety',
    title: 'Как безопасно покупать новостройку?',
    summary: 'Документы, проверка застройщика, договор долевого участия, поэтапная оплата.',
  },
  {
    slug: 'become-verified',
    title: 'Как стать проверенным продавцом?',
    summary: 'Шаги от Tier 1 (телефон) до Tier 3 (выезд команды). Что требуется и сколько занимает.',
  },
  {
    slug: 'diaspora',
    title: 'Покупаю из России — как это работает?',
    summary: 'Удалённый просмотр, видео-обзор, проверка документов, перевод задатка.',
  },
];

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="border-b border-stone-200 bg-white py-5">
        <AppContainer className="flex flex-col gap-2">
          <h1 className="text-h1 font-semibold text-stone-900">Центр помощи</h1>
          <p className="text-meta text-stone-500">
            Ответы на главные вопросы. Если не нашли своё — напишите нам через WhatsApp в подвале страницы.
          </p>
        </AppContainer>
      </section>

      <section className="py-6 pb-9">
        <AppContainer className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ARTICLES.map((a) => (
            <AppCard key={a.slug}>
              <AppCardContent>
                <Link
                  href={`/tsentr-pomoshchi/${a.slug}`}
                  className="group flex items-start justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-h3 font-semibold text-stone-900 group-hover:text-terracotta-600">
                      {a.title}
                    </span>
                    <span className="text-meta text-stone-500">{a.summary}</span>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-stone-400 group-hover:text-terracotta-600" />
                </Link>
              </AppCardContent>
            </AppCard>
          ))}
        </AppContainer>
      </section>
    </>
  );
}
