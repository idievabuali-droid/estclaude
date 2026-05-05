'use client';

import { useState } from 'react';
import { Bell, Send, Phone, Sparkles } from 'lucide-react';
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
  /** When set, render a wizard-acknowledgement headline ABOVE the
   *  subscribe form: count + filter summary in the same card. Used on
   *  ?wizard=1 destinations so the buyer sees one consolidated panel
   *  instead of a stacked banner+form pair (the user reported the
   *  duplication felt confusing — "two places say subscribe to this"). */
  resultCount?: number;
  /** Plain-Russian filter recap for the wizard headline, e.g.
   *  "2-комн · без ремонта · до 4к TJS / мес". */
  filterSummary?: string;
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
export function SaveSearchPrompt({
  page,
  filters,
  noResults,
  resultCount,
  filterSummary,
}: SaveSearchPromptProps) {
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

  // Wizard mode = caller passed resultCount. Promotes the headline to
  // a celebration line ("Мы подобрали 2 варианта по вашим ответам")
  // and inlines the filter summary right below — same content the
  // standalone WizardResultBanner used to render in a separate card
  // above this one. Merging eliminates the "two places say subscribe"
  // confusion buyers reported.
  const isWizard = resultCount != null;
  const countWord =
    resultCount === 1
      ? 'вариант'
      : resultCount && resultCount >= 2 && resultCount <= 4
        ? 'варианта'
        : 'вариантов';
  const wizardHeadline =
    resultCount === 0
      ? 'Пока ничего не подходит'
      : `Мы подобрали ${resultCount} ${countWord} по вашим ответам`;
  const headline = isWizard
    ? wizardHeadline
    : noResults
      ? 'Подходящих квартир пока нет'
      : 'Получать уведомления о новых';
  const helper = isWizard
    ? resultCount === 0
      ? 'Подпишитесь — пришлём в Telegram или WhatsApp, как только появится подходящая квартира.'
      : 'Хотите получать новые квартиры по этим параметрам? Подпишитесь — пришлём в Telegram или WhatsApp.'
    : noResults
      ? 'Подпишитесь — мы напишем, как только появится подходящая квартира.'
      : 'Сохраните этот поиск — мы напишем сразу, как появится новое объявление.';

  // Wizard panel uses the warmer terracotta gradient that the old
  // banner had, so the wizard payoff still reads as a "moment" rather
  // than a generic alert prompt. No-results stays in its existing
  // softer terracotta tint.
  const cardClass = isWizard
    ? 'border-terracotta-200 bg-gradient-to-br from-terracotta-50/80 to-amber-50/60'
    : noResults
      ? 'border-terracotta-300 bg-terracotta-50/50'
      : undefined;

  const HeaderIcon = isWizard ? Sparkles : Bell;
  const iconClass = isWizard
    ? 'size-5 shrink-0 text-terracotta-700'
    : `size-5 shrink-0 ${noResults ? 'text-terracotta-700' : 'text-stone-500'}`;

  return (
    <AppCard className={cardClass}>
      <AppCardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <HeaderIcon className={iconClass} aria-hidden />
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-h3 font-semibold text-stone-900">{headline}</h3>
              {isWizard && filterSummary ? (
                <p className="text-caption text-stone-600">{filterSummary}</p>
              ) : null}
              <p className="text-meta text-stone-700">{helper}</p>
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
