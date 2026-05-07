'use client';

import { Check, MessageCircle, Phone, Send } from 'lucide-react';
import { AppCard, AppCardContent, AppButton } from '@/components/primitives';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';
import { track } from '@/lib/analytics/track';

const QUESTIONS = [
  'Адрес и название ЖК (если новостройка)',
  'Этаж, площадь, количество комнат',
  'Цена и условия оплаты (наличные / ипотека / рассрочка)',
  'Тип отделки (без ремонта, предчистовая, с ремонтом)',
  '3–5 фотографий квартиры (отправите в чат)',
  'Удобный телефон для покупателей',
];

/**
 * Shown at /post to non-founders (and unauthenticated visitors). The
 * H1 + subhead now live in the page's hero section above; this card
 * carries the actionable contact channels + the "what we'll ask"
 * checklist with terracotta-checkmark icons (per the senior-design
 * prescription: "proper card with terracotta checkmark icons next to
 * each item, not default bullets").
 *
 * V1 keeps publishing founder-only — everyone else messages us and
 * we post on their behalf after a quick call. Better quality control,
 * fewer half-finished listings, and we already have to verify every
 * non-founder submission anyway.
 */
export function ContactCard() {
  return (
    <AppCard className="bg-stone-50">
      <AppCardContent>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
              Связаться
            </span>
            <h2
              className="text-h2 font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Напишите любым удобным способом.
            </h2>
            <p className="text-body text-stone-600">
              Это бесплатно и занимает 5–10 минут.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <a
              href={FOUNDER_CONTACTS.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Написать в WhatsApp на ${FOUNDER_CONTACTS.phoneDisplay}`}
              onClick={() => track('contact_button_click', { channel: 'whatsapp', source: 'post' })}
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
              onClick={() => track('contact_button_click', { channel: 'telegram', source: 'post' })}
            >
              <AppButton variant="secondary" size="lg" className="w-full">
                <Send className="size-4" />
                Telegram
              </AppButton>
            </a>
            <a
              href={`tel:${FOUNDER_CONTACTS.phone}`}
              aria-label={`Позвонить ${FOUNDER_CONTACTS.phoneDisplay}`}
              onClick={() => track('contact_button_click', { channel: 'phone', source: 'post' })}
            >
              <AppButton variant="secondary" size="lg" className="w-full">
                <Phone className="size-4" />
                Позвонить
              </AppButton>
            </a>
          </div>

          {/* Phone + Telegram handle as a single copyable line in
              monospace per the prescription — reads as "this is the
              actual number" rather than decorative metadata. */}
          <p className="font-mono text-caption text-stone-500 tabular-nums">
            {FOUNDER_CONTACTS.phoneDisplay}
            <span className="mx-2 text-stone-300" aria-hidden>
              ·
            </span>
            @{FOUNDER_CONTACTS.telegramHandle}
          </p>

          {/* Checklist with terracotta-checkmark icons (replaces the
              previous default-disc list). Each item gets a small
              outlined-circle check on the left. */}
          <div className="flex flex-col gap-3 border-t border-stone-200 pt-5">
            <h3
              className="text-h3 font-semibold text-stone-900"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Что мы у вас спросим
            </h3>
            <ul className="flex flex-col gap-2.5">
              {QUESTIONS.map((q) => (
                <li key={q} className="flex items-start gap-3 text-body text-stone-700">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-terracotta-700">
                    <Check className="size-3" aria-hidden />
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
