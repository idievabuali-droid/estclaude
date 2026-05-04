'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { AppCard, AppCardContent, AppButton, AppInput } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface CallbackWidgetProps {
  listingId: string;
}

/**
 * Phone-capture widget on the /kvartira detail page. No login
 * required — anonymous visitors can leave their number, the founder
 * gets pinged in Telegram and follows up via WhatsApp.
 *
 * Sits below the price block (most visitors see it without scrolling
 * the gallery). Once submitted, swaps to a confirmation message so
 * the user doesn't accidentally double-submit.
 */
export function CallbackWidget({ listingId }: CallbackWidgetProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/callback-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          phone: phone.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error || 'Не удалось отправить');
        return;
      }
      setDone(true);
      toast.success('Спасибо! Мы свяжемся с вами в WhatsApp.');
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AppCard>
        <AppCardContent>
          <div className="flex items-center gap-3">
            <Phone className="size-5 text-terracotta-700" aria-hidden />
            <p className="text-meta text-stone-700">
              Запрос отправлен. Мы напишем в WhatsApp по номеру {phone}.
            </p>
          </div>
        </AppCardContent>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Phone className="size-5 shrink-0 text-stone-500" aria-hidden />
            <div className="flex flex-col gap-1">
              <h3 className="text-h3 font-semibold text-stone-900">
                Хотите больше информации об этой квартире?
              </h3>
              <p className="text-meta text-stone-700">
                Оставьте номер — напишем вам в WhatsApp.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <AppInput
              type="tel"
              inputMode="tel"
              placeholder="+992 93 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="md:flex-1"
            />
            <AppInput
              placeholder="Ваше имя (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="md:flex-1"
            />
            <AppButton variant="primary" onClick={handleSubmit} loading={submitting}>
              Отправить
            </AppButton>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
