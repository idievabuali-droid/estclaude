'use client';

import { useState } from 'react';
import { Bell, Send, Phone, Sparkles, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AppCard, AppCardContent, AppButton, AppInput } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { track } from '@/lib/analytics/track';
import { FOUNDER_CONTACTS } from '@/lib/founder-contacts';
import { displayNameFromFilters } from '@/lib/saved-searches/format';

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
    if (done === 'telegram') {
      return (
        <AppCard>
          <AppCardContent>
            <div className="flex items-center gap-3">
              <Bell className="size-5 shrink-0 text-terracotta-700" aria-hidden />
              <p className="text-meta text-stone-700">
                Подписаны через Telegram. Напишем сразу, как появится подходящая квартира.
              </p>
            </div>
          </AppCardContent>
        </AppCard>
      );
    }
    // WhatsApp success — honest about the relay flow + give the buyer a
    // direct tap to open the founder's WhatsApp pre-loaded with context.
    // Without that tap they sit waiting for an automated message that
    // never comes (we don't have WhatsApp Business API in V1; the
    // founder personally writes the buyer when a match arrives). The
    // "Написать сейчас" affordance lets the buyer kick off the
    // conversation themselves so they get an immediate human reply.
    const summary = filterSummary ?? displayNameFromFilters(page, filters);
    const introMessage = `Здравствуйте! Я подписался на поиск: ${summary}. Можете подсказать, если что-то подходящее уже есть?`;
    const waHref = `${FOUNDER_CONTACTS.whatsappLink}?text=${encodeURIComponent(introMessage)}`;
    const tgHref = `${FOUNDER_CONTACTS.telegramLink}?text=${encodeURIComponent(introMessage)}`;
    return (
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <MessageCircle
                className="size-5 shrink-0 text-emerald-700"
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                <p className="text-meta font-medium text-stone-900">
                  Сохранили ваш номер.
                </p>
                <p className="text-meta text-stone-700">
                  Напишу вам в WhatsApp, как только появится подходящая
                  квартира. Если хотите ответ быстрее — напишите нам сами.
                </p>
              </div>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-meta font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" aria-hidden />
              Написать в WhatsApp сейчас
            </a>
            {/* Telegram fallback link — buyers who have both apps
                might prefer Telegram for faster response (the founder
                checks Telegram more often than WhatsApp during the
                day). Smaller / less prominent than the WhatsApp CTA
                so it doesn't compete with the channel they just
                chose, but visible so it's not "WhatsApp-only or
                nothing". */}
            <a
              href={tgHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 self-center text-meta font-medium text-stone-600 underline-offset-4 hover:text-terracotta-700 hover:underline"
            >
              <Send className="size-3.5" aria-hidden />
              Или в Telegram
            </a>
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
              WhatsApp expands the phone-input row inline.

              Telegram = primary (terracotta) since it's the only
              channel with TRULY automated delivery (bot sends direct
              message). WhatsApp stays as a secondary outline button
              even when expanded — promoting it to primary on tap made
              both buttons identical-terracotta and the buyer couldn't
              tell which one they'd just tapped. The chevron flip is
              the state cue instead. */}
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
              variant="secondary"
              onClick={() => setShowWhatsApp((v) => !v)}
              aria-expanded={showWhatsApp}
            >
              <Phone className="size-4" />
              Через WhatsApp
              {showWhatsApp ? (
                <ChevronUp className="size-4" aria-hidden />
              ) : (
                <ChevronDown className="size-4" aria-hidden />
              )}
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
