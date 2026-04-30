import { MessageCircle, Send, Phone, Globe, ShieldCheck } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  AppContainer,
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';
import { BuildingCard } from '@/components/blocks';
import {
  mockBuildings,
  getDeveloper,
  getDistrict,
  getListingsForBuilding,
} from '@/lib/mock';

/**
 * Page 11 — /diaspora.
 * Landing page for buyers in Russia / abroad. Per Blueprint §16: support
 * IMO + WhatsApp + Telegram, Russian by default, no fake testimonials.
 */
export default async function DiasporaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations('Common');

  // Featured projects for the diaspora segment — projects with installment available
  // are most relevant since families can save monthly from Russia
  const featured = mockBuildings.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-terracotta-50 to-white py-7 md:py-8">
        <AppContainer className="flex flex-col items-start gap-5 lg:max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-sm bg-white px-3 py-1 text-meta font-medium text-stone-700 shadow-sm">
            <Globe className="size-4 text-terracotta-600" />
            Для покупателей из России и других стран
          </span>
          <h1 className="text-display font-semibold leading-[var(--leading-display)] text-stone-900">
            Купите квартиру в Душанбе или Вахдате — не выходя из дома
          </h1>
          <p className="text-body text-stone-700">
            Все объявления подтверждены источником: застройщик, собственник или посредник.
            Связь через WhatsApp, Telegram или IMO. Платформа сопровождает удалённо: видео-обзор
            квартиры, проверка документов, помощь с переводом задатка.
          </p>

          <div className="flex flex-col gap-3 md:flex-row">
            <Link href="/novostroyki">
              <AppButton size="lg" variant="primary">
                {tCommon('search')} новостройку
              </AppButton>
            </Link>
            <Link href="/pomoshch-vybora">
              <AppButton size="lg" variant="secondary">
                Помощь в выборе
              </AppButton>
            </Link>
          </div>
        </AppContainer>
      </section>

      {/* Trust pillars */}
      <section className="border-y border-stone-200 bg-white py-6">
        <AppContainer className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <Pillar
            icon={<ShieldCheck className="size-5 text-[color:var(--color-badge-tier-3)]" />}
            title="Три уровня проверки"
            description="Телефон, профиль продавца, выезд команды на объект — всё видно прямо в карточке."
          />
          <Pillar
            icon={<Globe className="size-5 text-[color:var(--color-source-developer)]" />}
            title="Три источника объявления"
            description="Застройщик, собственник или посредник — без скрытых перепродавцов."
          />
          <Pillar
            icon={<MessageCircle className="size-5 text-[color:var(--color-fairness-great)]" />}
            title="Связь без роуминга"
            description="WhatsApp, Telegram, IMO — выбирайте удобный мессенджер."
          />
        </AppContainer>
      </section>

      {/* Featured */}
      <section className="py-7">
        <AppContainer className="flex flex-col gap-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-h2 font-semibold text-stone-900">
              Подходящие проекты для удалённой покупки
            </h2>
            <Link
              href="/novostroyki"
              className="text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              Все →
            </Link>
          </div>

          {/* Quick filters — link out to the main browse page with the
              preset applied. Keeps diaspora landing focused but lets
              users drill down by the criteria that matter most for
              remote purchases. */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
              Быстрый поиск
            </span>
            <div className="flex flex-wrap gap-2">
              <QuickFilter href="/novostroyki?city=dushanbe">Душанбе</QuickFilter>
              <QuickFilter href="/novostroyki?city=vahdat">Вахдат</QuickFilter>
              <QuickFilter href="/novostroyki?status=delivered">Сданные</QuickFilter>
              <QuickFilter href="/novostroyki?status=under_construction">Строится</QuickFilter>
              <QuickFilter href="/kvartiry?installment=true">С рассрочкой</QuickFilter>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {featured.map((b) => {
              const dev = getDeveloper(b.developer_id);
              const dist = getDistrict(b.district_id);
              if (!dev || !dist) return null;
              return (
                <BuildingCard
                  key={b.id}
                  building={b}
                  developer={dev}
                  district={dist}
                  matchingUnits={getListingsForBuilding(b.id).slice(0, 2)}
                />
              );
            })}
          </div>
        </AppContainer>
      </section>

      {/* Contact channels */}
      <section className="border-t border-stone-200 bg-stone-50 py-6 pb-9">
        <AppContainer className="flex flex-col gap-5">
          <h2 className="text-h2 font-semibold text-stone-900">Связаться с нашей командой</h2>
          <p className="text-body text-stone-700">
            Опишите, что ищете, и мы поможем подобрать квартиру и проверить продавца. Никаких
            навязчивых звонков.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ContactChannel
              href="https://wa.me/992900000000"
              icon={<MessageCircle className="size-5" />}
              label="WhatsApp"
              detail="+992 90 000 00 00"
              tone="bg-[color:var(--color-fairness-great)]"
            />
            <ContactChannel
              href="https://t.me/example"
              icon={<Send className="size-5" />}
              label="Telegram"
              detail="@example_bot"
              tone="bg-[color:var(--color-semantic-info)]"
            />
            <ContactChannel
              href="imo://addContact?phone=992900000000"
              icon={<Phone className="size-5" />}
              label="IMO"
              detail="+992 90 000 00 00"
              tone="bg-[color:var(--color-source-developer)]"
            />
          </div>
        </AppContainer>
      </section>
    </>
  );
}

function QuickFilter({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-sm border border-stone-200 bg-white px-3 text-meta font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
    >
      {children}
    </Link>
  );
}

function Pillar({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex flex-col gap-1">
            <span className="text-h3 font-semibold text-stone-900">{title}</span>
            <span className="text-meta text-stone-700">{description}</span>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}

function ContactChannel({
  href,
  icon,
  label,
  detail,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  tone: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-md border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300 hover:shadow-sm"
    >
      <span className={`inline-flex size-10 items-center justify-center rounded-full text-white ${tone}`}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-h3 font-semibold text-stone-900">{label}</span>
        <span className="text-meta tabular-nums text-stone-500">{detail}</span>
      </div>
    </a>
  );
}
