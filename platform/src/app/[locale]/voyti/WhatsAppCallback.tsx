'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { AppCard, AppCardContent, AppButton, AppInput } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { track } from '@/lib/analytics/track';

const PHONE_RE = /^[0-9+\s\-()]{6,20}$/;

/**
 * WhatsApp acquisition path on /voyti — opens the door for the slice
 * of buyers who don't use Telegram (much of the local Tajik market).
 * Captures phone, fires a Telegram nudge to the founder, who reaches
 * out manually to onboard. Intentionally NOT an automated login —
 * V1 leverages the founder relationship; "log in" in this flow means
 * "we'll get you set up over WhatsApp".
 */
export function WhatsAppCallback({ source = '/voyti' }: { source?: string }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (submitting) return;
    const trimmed = phone.trim();
    if (!PHONE_RE.test(trimmed)) {
      toast.error('Введите номер телефона');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/login-callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: trimmed, name: name.trim() || undefined, source }),
      });
      if (!res.ok) {
        toast.error('Не удалось отправить. Попробуйте ещё раз.');
        return;
      }
      track('login_callback_submitted', { source });
      setDone(true);
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AppCard className="border-emerald-200 bg-emerald-50/60">
        <AppCardContent>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Phone className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-meta font-semibold text-stone-900">
                Спасибо! Мы свяжемся в течение часа.
              </p>
              <p className="text-caption text-stone-600">
                Напишем в WhatsApp на номер, который вы оставили. Поможем
                подобрать варианты и настроить уведомления.
              </p>
            </div>
          </div>
        </AppCardContent>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Phone className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-h3 font-semibold text-stone-900">
                Нет Telegram? Свяжемся в WhatsApp
              </h2>
              <p className="text-meta text-stone-600">
                Оставьте номер — напишем сами, поможем найти подходящие
                квартиры и настроить уведомления.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <AppInput
              type="tel"
              inputMode="tel"
              placeholder="+992 93 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Номер телефона"
            />
            <AppInput
              type="text"
              placeholder="Ваше имя (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Имя"
            />
            <AppButton variant="primary" size="lg" onClick={submit} loading={submitting}>
              Связаться в WhatsApp
            </AppButton>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
