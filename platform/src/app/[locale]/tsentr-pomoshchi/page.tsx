import { setRequestLocale } from 'next-intl/server';
import { MessageCircle, Phone } from 'lucide-react';
import { AppContainer, AppCard, AppCardContent, AppButton } from '@/components/primitives';
import { Link } from '@/i18n/navigation';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

/**
 * Help center — V1 editorial layout.
 *
 * Per the senior-design audit:
 *   - Full-width hero with serif H1 + subhead.
 *   - Two-column body on desktop: left rail with sticky anchor links
 *     to each question, right column with the actual content.
 *   - Each question is a section with: small terracotta uppercase
 *     eyebrow ("ПРОВЕРКА ЗАСТРОЙЩИКА", "ОТДЕЛКА", ...) + serif H2 +
 *     readable body (max-w-[640px], comfortable line-height).
 *   - Bullet lines inside answers (— prefix) render as proper list
 *     items with terracotta dot markers, not default browser bullets.
 *   - "Не нашли ответ?" card at the bottom — same WhatsApp + Telegram
 *     pattern used elsewhere on the platform.
 *
 * Replaces the prior <details> accordion. Editorial sections always-
 * open + side-rail nav is the magazine pattern (Stripe Docs, Linear
 * Method) — buyers can scan the rail, jump to the question, and read
 * the answer without expanding/collapsing UI. Native <details> still
 * worked but felt list-like; the magazine pattern reads as a
 * considered explanation rather than a FAQ stub.
 */
const FAQ: ReadonlyArray<{
  id: string;
  eyebrow: string;
  q: string;
  a: readonly string[];
}> = [
  {
    id: 'verified-developer',
    eyebrow: 'Проверка застройщика',
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
    id: 'finishing-types',
    eyebrow: 'Отделка',
    q: 'Без ремонта, предчистовая, с ремонтом — в чём разница?',
    a: [
      'Четыре типа отделки в новостройках Таджикистана:',
      '— Без ремонта (черновая): голые стены, чёрный пол, нет сантехники. Отделку делает покупатель. Дешевле всего, но добавьте расходы на ремонт.',
      '— Предчистовая: стяжка пола, штукатурка стен, разводка коммуникаций. Финишную отделку — обои, плитку, двери — выбираете сами.',
      '— С ремонтом (от застройщика): чистовая отделка, сантехника, базовые покрытия. Может потребоваться мебель и техника; готовность к заезду зависит и от стадии всего ЖК.',
      '— Отремонтировано владельцем: ремонт сделал предыдущий владелец. Состояние смотрите лично.',
    ],
  },
  {
    id: 'installments',
    eyebrow: 'Рассрочка',
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
    id: 'safe-buying',
    eyebrow: 'Безопасная покупка',
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
    id: 'diaspora-buying',
    eyebrow: 'Диаспора',
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
      {/* ─── HERO ─────────────────────────────────────────────────
          Editorial full-width hero on warm canvas. Serif H1 + subhead
          frames the page as a guide, not a support FAQ. */}
      <section className="border-b border-stone-200 bg-gradient-to-b from-terracotta-50/30 via-stone-50 to-stone-50 py-12 md:py-20">
        <AppContainer className="flex flex-col items-center gap-4 text-center">
          <h1
            className="text-h1 font-semibold leading-[var(--leading-h1)] tracking-[-0.01em] text-stone-900 md:text-display"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Центр помощи
          </h1>
          <p className="max-w-xl text-body text-stone-600">
            Ответы на вопросы, которые задают чаще всего перед покупкой
            новостройки в Таджикистане.
          </p>
        </AppContainer>
      </section>

      {/* ─── BODY: rail + content ─────────────────────────────────
          Desktop two-column with sticky anchor rail on the left.
          Mobile collapses; the rail becomes a quiet horizontal pill
          row above the content. */}
      <AppContainer>
        <div className="flex flex-col gap-6 py-10 md:flex-row md:gap-12 md:py-16">
          {/* LEFT RAIL — anchor nav. Sticky on desktop scroll. */}
          <aside className="md:sticky md:top-20 md:w-[240px] md:shrink-0 md:self-start">
            {/* Mobile: horizontal scroll of anchor pills */}
            <div className="-mx-4 md:mx-0">
              <nav
                aria-label="Разделы"
                className="flex gap-2 overflow-x-auto px-4 md:flex-col md:gap-1 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <span className="hidden text-caption font-medium uppercase tracking-widest text-stone-500 md:mb-2 md:block">
                  Разделы
                </span>
                {FAQ.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-meta text-stone-600 transition-colors hover:bg-stone-100 hover:text-terracotta-700 md:rounded-sm md:px-2 md:text-meta"
                  >
                    {item.eyebrow}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* RIGHT CONTENT — sections per FAQ entry. */}
          <div className="flex min-w-0 flex-1 flex-col gap-12 md:gap-16">
            {FAQ.map((item) => (
              <section
                key={item.id}
                id={item.id}
                className="scroll-mt-20 flex flex-col gap-3"
              >
                <span className="text-caption font-medium uppercase tracking-widest text-terracotta-700">
                  {item.eyebrow}
                </span>
                <h2
                  className="text-h2 font-semibold leading-[var(--leading-h2)] text-stone-900 md:text-h1"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  {item.q}
                </h2>
                <FaqAnswer paragraphs={item.a} />
              </section>
            ))}

            {/* "Не нашли ответ?" card — bg-surface (stone-50) per the
                prescription, serif H3 + WhatsApp + Telegram. */}
            <AppCard className="bg-stone-50">
              <AppCardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex max-w-md flex-col gap-2">
                    <h3
                      className="text-h3 font-semibold text-stone-900"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                    >
                      Не нашли ответ?
                    </h3>
                    <p className="text-body text-stone-600">
                      Напишите — поможем разобраться с вашим вопросом и подберём
                      подходящие квартиры.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                    <a
                      href={FOUNDER_CONTACTS.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <AppButton variant="primary" size="md" className="w-full sm:w-auto">
                        <Phone className="size-4" /> WhatsApp
                      </AppButton>
                    </a>
                    <a
                      href={FOUNDER_CONTACTS.telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <AppButton variant="secondary" size="md" className="w-full sm:w-auto">
                        <MessageCircle className="size-4" /> Telegram
                      </AppButton>
                    </a>
                  </div>
                </div>
              </AppCardContent>
            </AppCard>

            {/* Quiet link out for buyers who landed here from elsewhere
                and want the actual catalog. */}
            <p className="text-meta text-stone-500">
              <Link
                href="/novostroyki"
                className="font-medium text-terracotta-700 hover:text-terracotta-800 hover:underline"
              >
                Смотреть новостройки →
              </Link>
            </p>
          </div>
        </div>
      </AppContainer>
    </>
  );
}

/**
 * Answer body renderer. Detects "— "-prefixed lines as bullet items
 * and groups consecutive bullets into a proper <ul> with custom
 * terracotta-dot markers; everything else renders as paragraphs.
 *
 * Editorial body styling per the prescription: max-w-[640px] keeps
 * line length readable, line-height roomy, body text size for
 * comfortable reading rhythm.
 */
function FaqAnswer({ paragraphs }: { paragraphs: readonly string[] }) {
  // Group consecutive bullet lines into a single <ul>, paragraphs
  // stay as <p>. Walk once, build a list of blocks.
  type Block = { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };
  const blocks: Block[] = [];
  for (const para of paragraphs) {
    const isBullet = para.startsWith('— ');
    if (isBullet) {
      const item = para.slice(2);
      const last = blocks[blocks.length - 1];
      if (last && last.kind === 'ul') {
        last.items.push(item);
      } else {
        blocks.push({ kind: 'ul', items: [item] });
      }
    } else {
      blocks.push({ kind: 'p', text: para });
    }
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-3 text-body leading-[1.7] text-stone-700">
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i} className="flex flex-col gap-2 pl-1">
            {b.items.map((it, j) => (
              <li key={j} className="flex items-start gap-3">
                <span
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-terracotta-600"
                  aria-hidden
                />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
