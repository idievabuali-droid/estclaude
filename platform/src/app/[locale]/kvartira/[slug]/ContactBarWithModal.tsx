'use client';

import { useState } from 'react';
import { StickyContactBar } from '@/components/blocks';
import { AppModal, AppButton, AppInput, AppTextarea, AppCheckbox } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface ContactBarWithModalProps {
  listingTitle: string;
  whatsappPhone: string;
}

export function ContactBarWithModal({ listingTitle, whatsappPhone }: ContactBarWithModalProps) {
  const [open, setOpen] = useState(false);
  const cleanPhone = whatsappPhone.replace(/[^0-9+]/g, '');
  const message = encodeURIComponent(`Здравствуйте! Интересует ${listingTitle}.`);

  return (
    <>
      <StickyContactBar
        whatsappHref={`https://wa.me/${cleanPhone.replace('+', '')}?text=${message}`}
        callHref={`tel:${cleanPhone}`}
        onRequestVisit={() => setOpen(true)}
      />
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Запросить визит"
        description="Платформа свяжется с продавцом и согласует удобное время."
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
            placeholder="Когда удобно посмотреть квартиру?"
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
