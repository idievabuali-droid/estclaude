'use client';

import { useState } from 'react';
import { Phone, CalendarCheck, Video } from 'lucide-react';
import {
  AppButton,
  AppInput,
  AppTextarea,
  AppCheckbox,
  AppModal,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { StickyContactBar } from '@/components/blocks/StickyContactBar';
import { MessagingPopoverButton } from '@/components/blocks/MessagingPopoverButton';
import { buildContactLinks } from '@/lib/contact-links';

export interface ContactBarWithModalProps {
  listingTitle: string;
  /** Single seller phone — drives all four channel deep-links. */
  sellerPhone: string;
  /** True when buyer is in diaspora context (currency cookie set or
   *  arriving via /diaspora). Switches the intent CTA from "Запросить
   *  визит" to "Запросить онлайн-показ" since they can't physically
   *  visit, and tweaks the form copy to match. */
  isDiaspora?: boolean;
  /** Total apartment price — passed through to the mobile sticky bar
   *  as the "от X TJS" anchor. Per the senior-design prescription
   *  the mobile bar reads as price-on-left + single CTA-on-right, not
   *  a generic toolbar of channels. */
  priceFromDirams?: bigint | null;
}

/**
 * Encapsulates the full contact UI for an apartment detail page:
 *
 * 1. Desktop section — two clear groups:
 *    - "Связаться с продавцом": WhatsApp (primary) + Telegram + IMO + Phone
 *      (the CHANNELS — pick HOW to reach the seller)
 *    - "Запланировать": one CTA — Запросить визит (or Запросить
 *      онлайн-показ for diaspora). Opens the form modal below.
 *      (the INTENT — pick WHAT you want to do)
 *
 * 2. Mobile sticky bottom bar — same four channels + intent button,
 *    compact icon-mostly layout.
 *
 * 3. Visit-request modal — the original platform-mediated form, kept
 *    as-is. Form copy adapts based on isDiaspora.
 *
 * Separating channels from intent is the convention used by Avito,
 * Cian, and Bayut — solves the "five identical buttons" choice
 * paralysis we'd otherwise have.
 */
export function ContactBarWithModal({
  listingTitle,
  sellerPhone,
  isDiaspora,
  priceFromDirams,
}: ContactBarWithModalProps) {
  const [open, setOpen] = useState(false);
  const links = buildContactLinks(sellerPhone, `Здравствуйте! Интересует ${listingTitle}.`);

  const intentLabel = isDiaspora ? 'Запросить онлайн-показ' : 'Запросить визит';
  const intentShortLabel = isDiaspora ? 'Онлайн-показ' : 'Визит';
  const IntentIcon = isDiaspora ? Video : CalendarCheck;
  const modalDescription = isDiaspora
    ? 'Команда платформы организует видео-показ квартиры. Продавец свяжется с вами для согласования времени.'
    : 'Продавец свяжется с вами и согласует удобное время для визита.';
  const messagePlaceholder = isDiaspora
    ? 'Удобное время для видео-показа?'
    : 'Когда удобно посмотреть квартиру?';

  return (
    <>
      {/* Desktop CTA stack — per the senior-design prescription the
          intent CTA ("Запросить визит" / "Запросить онлайн-показ")
          is the primary action: terracotta filled, full-width inside
          the price card. Сообщения + Позвонить become outlined
          secondaries below it. Reorders the prior layout where
          Сообщения was primary — visit-request is the higher-intent
          buyer signal and earns the visual weight. */}
      <div className="hidden flex-col gap-2 md:flex">
        <AppButton
          variant="primary"
          size="lg"
          onClick={() => setOpen(true)}
          className="w-full"
        >
          <IntentIcon className="size-4" /> {intentLabel}
        </AppButton>
        <div className="grid grid-cols-2 gap-2">
          <MessagingPopoverButton
            variant="secondary-lg"
            whatsappHref={links.whatsapp}
            telegramHref={links.telegram}
            imoHref={links.imo}
          />
          <a href={links.call} className="w-full">
            <AppButton variant="secondary" size="lg" className="w-full">
              <Phone className="size-4" /> Позвонить
            </AppButton>
          </a>
        </div>
      </div>

      {/* Suppress unused-var warning for intent short-label which used
          to drive the icon-stack mobile button — now subsumed into the
          single Связаться popover trigger. */}
      <span className="hidden" aria-hidden>
        {intentShortLabel}
      </span>

      {/* Mobile sticky bar — price + Связаться. Visit-request stays
          accessible via the popover's WhatsApp/Telegram options where
          buyers naturally start the conversation; the modal form is
          a desktop pattern. */}
      <StickyContactBar links={links} priceFromDirams={priceFromDirams} />

      {/* Visit / online-showing modal */}
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title={intentLabel}
        description={modalDescription}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast.success('Запрос отправлен. Продавец ответит в течение 24 часов.');
            setOpen(false);
          }}
        >
          <AppInput
            name="name"
            label="Ваше имя"
            placeholder="Имя"
            required
            autoComplete="name"
          />
          <AppInput
            name="phone"
            type="tel"
            label="Телефон"
            placeholder="+992 ___ __ __ __"
            required
            autoComplete="tel"
          />
          <AppTextarea
            name="message"
            label="Сообщение (необязательно)"
            placeholder={messagePlaceholder}
            maxLength={500}
            showCounter
          />
          <AppCheckbox
            name="prefer_female_agent"
            label="Предпочитаю, чтобы связалась женщина-агент"
          />
          <div className="flex justify-end gap-2 pt-2">
            <AppButton type="button" variant="secondary" onClick={() => setOpen(false)}>
              Отмена
            </AppButton>
            <AppButton type="submit" variant="primary">
              Отправить запрос
            </AppButton>
          </div>
        </form>
      </AppModal>
    </>
  );
}
