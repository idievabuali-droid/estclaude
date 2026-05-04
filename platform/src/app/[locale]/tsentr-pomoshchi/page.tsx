import { setRequestLocale } from 'next-intl/server';
import { ChevronDown, MessageCircle, Phone } from 'lucide-react';
import { AppContainer, AppCard, AppCardContent, AppButton } from '@/components/primitives';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

/**
 * Help center — V1 simplified version.
 *
 * Why <details> accordion instead of separate /tsentr-pomoshchi/[slug]
 * pages: the previous version listed 8 article tiles all linking to
 * routes that didn't exist (no [slug]/page.tsx, every click → 404).
 * Inlining short Q+A here means there's no possible broken link, no
 * extra routes to maintain, and the buyer reads the answer with one
 * tap instead of a route navigation. Native <details> is server-
 * rendered, accessible, and needs zero client JS — perfect for V1.
 *
 * What was removed in this V1 pass (article was for a feature that
 * isn't visible in V1, would just confuse buyers):
 *   - "fairness" — indicator is globally disabled in V1
 *   - "sources" — source filter is hidden in V1 (every listing is
 *     posted by the founder right now, so the developer/owner/
 *     intermediary distinction has no surface to attach to)
 *   - "become-verified" — V1 has no real sellers, only the founder
 *     posts; explaining the seller verification flow serves nobody
 *
 * What stays + was rewritten:
 *   - "verification-tiers" → narrowed to just "Проверенный застройщик"
 *     since that's the only verification badge V1 actually shows
 */
const FAQ = [
  {
    q: 'Что означает «Проверенный застройщик»?',
    a: [
      'Значок появляется на карточках ЖК, когда наша команда подтвердила застройщика по телефону его офиса.',
      'Что мы проверяем:',
      '— Регистрацию компании и лицензию.',
      '— Реальный офис и контактный телефон.',
      '— Историю проектов: построенные дома, сданные в срок.',
      'Значок не гарантирует качество ремонта или сроков сдачи нового проекта и не заменяет личной проверки документов перед покупкой.',
    ],
  },
  {
    q: 'Без ремонта, предчистовая, с ремонтом — в чём разница?',
    a: [
      'Четыре типа отделки в новостройках Таджикистана:',
      '— Без ремонта (черновая): голые стены, чёрный пол, нет сантехники. Готова под ваш ремонт «с нуля». Дешевле всего, но плюс расходы на ремонт.',
      '— Предчистовая: стяжка пола, штукатурка стен, разводка коммуникаций. Готова под чистовую отделку — обои, плитку, двери выбираете сами.',
      '— С ремонтом (от застройщика): полностью готова к заселению. Полы, обои, сантехника. Можно сразу жить.',
      '— Отремонтировано владельцем: продавец сделал ремонт сам. Состояние смотрите лично.',
    ],
  },
  {
    q: 'Что такое рассрочка и как она работает?',
    a: [
      'Рассрочка от застройщика — это покупка квартиры в платежах напрямую застройщику, без банка и без процентов.',
      'Как работает:',
      '— Первый взнос (обычно 30%) при подписании договора.',
      '— Остаток в равных платежах в течение 5–7 лет (60–84 месяцев).',
      '— Без процентов и без проверки кредитной истории.',
      'Платёж считается так: (общая цена − первый взнос) ÷ количество месяцев. Рассрочка действует до сдачи дома; после сдачи остаток нужно погасить.',
    ],
  },
  {
    q: 'Как безопасно покупать новостройку?',
    a: [
      'Что проверить перед сделкой:',
      '— Документы застройщика: разрешение на строительство, право на земельный участок.',
      '— Договор: должен быть зарегистрирован в БТИ. Никаких «расписок» или «предварительных договоров».',
      '— Поэтапная оплата: платите по мере готовности дома, не всю сумму сразу.',
      '— История застройщика: сданы ли его другие проекты в срок.',
      'Признаки риска:',
      '— Цена сильно ниже рынка (на 20%+ дешевле похожих).',
      '— Застройщик торопит с предоплатой.',
      '— Нет официального офиса или сайта.',
      '— Просят полную сумму до начала строительства.',
    ],
  },
  {
    q: 'Покупаю из России — как это работает?',
    a: [
      'Если вы за границей — Россия, Казахстан, Турция и другие страны — покупка возможна без поездки в Таджикистан.',
      'Как мы помогаем:',
      '— Видеообзор квартиры: команда выезжает на объект и снимает живое видео.',
      '— Проверка документов застройщика онлайн: разрешения, право на участок, история сданных проектов.',
      '— Оформление доверенности: на родственника или знакомого в Таджикистане для подписания договора.',
      'Цены сразу в вашей валюте — выберите валюту в верхней части страницы /diaspora и все суммы пересчитаются автоматически.',
    ],
  },
] as const;

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
            Ответы на главные вопросы.
          </p>
        </AppContainer>
      </section>

      <section className="py-6 pb-9">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            // Native <details> for server-rendered, JS-free accordion.
            // Tailwind's `group/details` modifier + open: variant
            // would let us animate the chevron, but a simple rotation
            // via the open attribute is enough here.
            <details
              key={item.q}
              className="group rounded-md border border-stone-200 bg-white open:bg-stone-50"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-h3 font-semibold text-stone-900 marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="flex flex-col gap-2 border-t border-stone-200 px-4 py-4 text-body text-stone-700">
                {item.a.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </details>
          ))}
          </div>

          {/* "Не нашли ответ?" CTA — was a dead end before; this turns
              the help center into a conversation starter. WhatsApp
              first since the local market skews that way; Telegram
              second for diaspora. */}
          <AppCard>
            <AppCardContent>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-h3 font-semibold text-stone-900">
                    Не нашли ответ?
                  </h3>
                  <p className="text-meta text-stone-600">
                    Напишите — поможем разобраться с вашим вопросом.
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <a href={FOUNDER_CONTACTS.whatsappLink} target="_blank" rel="noopener noreferrer">
                    <AppButton variant="primary" size="md">
                      <Phone className="size-4" /> WhatsApp
                    </AppButton>
                  </a>
                  <a href={FOUNDER_CONTACTS.telegramLink} target="_blank" rel="noopener noreferrer">
                    <AppButton variant="secondary" size="md">
                      <MessageCircle className="size-4" /> Telegram
                    </AppButton>
                  </a>
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </AppContainer>
      </section>
    </>
  );
}
