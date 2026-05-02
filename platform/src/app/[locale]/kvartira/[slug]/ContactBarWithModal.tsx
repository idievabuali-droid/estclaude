'use client';

import { useState } from 'react';
import { MessageCircle, Send, Phone, Image as ImageIcon, CalendarCheck, Video } from 'lucide-react';
import {
  AppButton,
  AppInput,
  AppTextarea,
  AppCheckbox,
  AppModal,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { StickyContactBar } from '@/components/blocks/StickyContactBar';
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
      {/* Desktop section: two grouped rows (channels vs intent) */}
      <div className="hidden flex-col gap-4 pt-2 md:flex">
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
            Связаться с продавцом
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
              <AppButton variant="primary" size="lg">
                <MessageCircle className="size-4" /> WhatsApp
              </AppButton>
            </a>
            <a href={links.telegram} target="_blank" rel="noopener noreferrer">
              <AppButton variant="secondary" size="lg">
                <Send className="size-4" /> Telegram
              </AppButton>
            </a>
            <a href={links.imo} target="_blank" rel="noopener noreferrer">
              <AppButton variant="secondary" size="lg">
                <ImageIcon className="size-4" /> IMO
              </AppButton>
            </a>
            <a href={links.call}>
              <AppButton variant="secondary" size="lg">
                <Phone className="size-4" /> Позвонить
              </AppButton>
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium uppercase tracking-wide text-stone-500">
            Запланировать
          </span>
          <AppButton
            variant="secondary"
            size="lg"
            onClick={() => setOpen(true)}
            className="w-fit"
          >
            <IntentIcon className="size-4" /> {intentLabel}
          </AppButton>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <StickyContactBar
        links={links}
        intentShortLabel={intentShortLabel}
        IntentIcon={IntentIcon}
        onIntent={() => setOpen(true)}
      />

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
