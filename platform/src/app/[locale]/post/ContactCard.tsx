import { MessageCircle, Phone, Send } from 'lucide-react';
import { AppCard, AppCardContent, AppButton } from '@/components/primitives';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';

/**
 * Shown at /post to non-founders (and unauthenticated visitors). V1
 * keeps publishing founder-only — everyone else messages us and we
 * post on their behalf after a quick call. Better quality control,
 * fewer half-finished listings, and we already have to verify every
 * non-founder submission anyway.
 *
 * Three contact channels (WhatsApp / Telegram / direct call) all
 * resolve to the founder's phone, with Telegram pointing at the
 * personal handle in lib/founder-contacts.ts.
 */
export function ContactCard() {
  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-h2 font-semibold text-stone-900">
              Разместите квартиру через нас
            </h2>
            <p className="text-body text-stone-700">
              Свяжитесь с нами любым удобным способом — мы зададим
              несколько коротких вопросов о вашей квартире и сами
              разместим объявление с фотографиями. Это бесплатно и
              занимает 5–10 минут.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <a
              href={FOUNDER_CONTACTS.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Написать в WhatsApp на ${FOUNDER_CONTACTS.phoneDisplay}`}
            >
              <AppButton variant="primary" size="lg" className="w-full">
                <MessageCircle className="size-4" />
                WhatsApp
              </AppButton>
            </a>
            <a
              href={FOUNDER_CONTACTS.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Написать в Telegram: @${FOUNDER_CONTACTS.telegramHandle}`}
            >
              <AppButton variant="secondary" size="lg" className="w-full">
                <Send className="size-4" />
                Telegram
              </AppButton>
            </a>
            <a
              href={`tel:${FOUNDER_CONTACTS.phone}`}
              aria-label={`Позвонить ${FOUNDER_CONTACTS.phoneDisplay}`}
            >
              <AppButton variant="secondary" size="lg" className="w-full">
                <Phone className="size-4" />
                Позвонить
              </AppButton>
            </a>
          </div>

          <p className="text-caption text-stone-500">
            {FOUNDER_CONTACTS.phoneDisplay} · @{FOUNDER_CONTACTS.telegramHandle}
          </p>

          <div className="flex flex-col gap-2 border-t border-stone-200 pt-4">
            <h3 className="text-h3 font-semibold text-stone-900">
              Что мы у вас спросим
            </h3>
            <ul className="ml-5 list-disc text-body text-stone-700">
              <li>Адрес и название ЖК (если новостройка)</li>
              <li>Этаж, площадь, количество комнат</li>
              <li>Цена и условия оплаты (наличные / ипотека / рассрочка)</li>
              <li>Тип отделки (без ремонта, предчистовая, с ремонтом)</li>
              <li>3–5 фотографий квартиры (отправите в чат)</li>
              <li>Удобный телефон для покупателей</li>
            </ul>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
