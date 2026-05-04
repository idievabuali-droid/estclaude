'use client';

import { useState } from 'react';
import { Bell, Send, Phone } from 'lucide-react';
import { AppCard, AppCardContent, AppButton, AppInput } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { track } from '@/lib/analytics/track';

export interface SaveSearchPromptProps {
  page: 'novostroyki' | 'kvartiry';
  /** URL search-params object the page already produces. Sent
   *  verbatim into saved_searches.filters. */
  filters: Record<string, string | string[] | undefined>;
  /** Show the "buyers told us nothing matches" version of the copy.
   *  Visually larger and more directive than the always-on prompt. */
  noResults?: boolean;
}

/**
 * "Save this search & get notified" card. Lives above the results on
 * /novostroyki and /kvartiry, and grows in prominence when the search
 * returned 0 hits — the moment a buyer most needs us to capture their
 * intent and call back later.
 *
 * Two channels, in order of preference:
 *   1. Telegram bot deep-link (one tap, instant delivery later)
 *   2. WhatsApp number (founder gets pinged with the phone, messages
 *      manually)
 *
 * The component does no filter-validity check — the parent decides
 * whether to mount it (we hide it on bare /novostroyki visits with
 * no active filters, since there's nothing meaningful to "save").
 */
export function SaveSearchPrompt({ page, filters, noResults }: SaveSearchPromptProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState<null | 'telegram' | 'whatsapp'>(null);

  async function subscribeViaTelegram() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/saved-searches/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ page, filters, channel: 'telegram' }),
      });
      const data = (await res.json()) as { id?: string; deep_link?: string; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error || 'Не удалось сохранить поиск');
        return;
      }
      track('saved_search_subscribed', { search_id: data.id, via: 'telegram' });
      if (data.deep_link) {
        // Anonymous (or logged-in non-Telegram) path: bounce to bot
        // to complete the chat_id binding.
        window.location.href = data.deep_link;
      } else {
        // Already-linked Telegram user — done in one round-trip.
        setDone('telegram');
        toast.success('Подписаны! Напишем вам в Telegram, как только появится подходящая квартира.');
      }
    } catch {
      toast.error('Сеть не отвечает. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function subscribeViaWhatsApp() {
    if (submitting) return;
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/saved-searches/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ page, filters, channel: 'whatsapp', phone: phone.trim() }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error || 'Не удалось сохранить поиск');
        return;
      }
      track('saved_search_subscribed', { search_id: data.id, via: 'whatsapp' });
      setDone('whatsapp');
      toast.success('Спасибо! Мы напишем вам в WhatsApp, как только появится подходящее.');
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
            <Bell className="size-5 text-terracotta-700" aria-hidden />
            <p className="text-meta text-stone-700">
              {done === 'telegram'
                ? 'Подписаны через Telegram. Напишем сразу, как появится подходящая квартира.'
                : 'Сохранили ваш номер. Напишем в WhatsApp при появлении подходящих вариантов.'}
            </p>
          </div>
        </AppCardContent>
      </AppCard>
    );
  }

  return (
    <AppCard className={noResults ? 'border-terracotta-300 bg-terracotta-50/50' : undefined}>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Bell
              className={`size-5 shrink-0 ${noResults ? 'text-terracotta-700' : 'text-stone-500'}`}
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-h3 font-semibold text-stone-900">
                {noResults
                  ? 'Подходящих квартир пока нет'
                  : 'Получать уведомления о новых'}
              </h3>
              <p className="text-meta text-stone-700">
                {noResults
                  ? 'Подпишитесь — мы напишем, как только появится подходящая квартира.'
                  : 'Сохраните этот поиск — мы напишем сразу, как появится новое объявление.'}
              </p>
            </div>
          </div>

          {/* Two equal-weight buttons. Tajik buyers skew WhatsApp, so
              hiding it behind a "У меня нет Telegram" link (the old
              UX) treated the dominant local channel as a fallback.
              Now both methods are visible at first sight; tapping
              WhatsApp expands the phone-input row inline. */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <AppButton
              variant="primary"
              onClick={subscribeViaTelegram}
              loading={submitting && !showWhatsApp}
            >
              <Send className="size-4" />
              Через Telegram
            </AppButton>
            <AppButton
              variant={showWhatsApp ? 'primary' : 'secondary'}
              onClick={() => setShowWhatsApp((v) => !v)}
            >
              <Phone className="size-4" />
              Через WhatsApp
            </AppButton>
          </div>
          {showWhatsApp ? (
            <div className="flex flex-col gap-2 md:flex-row md:items-start">
              <AppInput
                type="tel"
                inputMode="tel"
                placeholder="+992 93 ..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="md:flex-1"
              />
              <AppButton
                variant="primary"
                onClick={subscribeViaWhatsApp}
                loading={submitting && showWhatsApp}
              >
                Сохранить номер
              </AppButton>
            </div>
          ) : null}
        </div>
      </AppCardContent>
    </AppCard>
  );
}
