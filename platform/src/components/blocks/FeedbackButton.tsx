'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X } from 'lucide-react';
import { AppButton, AppInput, AppTextarea } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';

/** Routes where the floating "Сообщить о проблеме" button does NOT
 *  render. Two reasons to skip:
 *
 *  1. Operator surfaces — founder doesn't need to report bugs to
 *     herself: /kabinet, /post, /post/edit.
 *  2. Wizard — Typeform-style focused experience; floating CTAs
 *     break the one-question-at-a-time flow.
 *
 *  Detail pages (/zhk/<slug>, /kvartira/<slug>) USED to be in this
 *  list under "don't compete with the listing sticky-bar CTA" — but
 *  back then the feedback button was bottom-RIGHT and stacked with
 *  the contact CTA at 375px. With the button now at bottom-LEFT
 *  (opposite corner) there's no overlap, AND those detail pages are
 *  exactly where buyers face the most friction (broken photos,
 *  missing info, contact-button quirks). Hiding feedback there
 *  meant the buyer couldn't report a problem on the only surface
 *  where the problem actually mattered. Pre-launch fix: show the
 *  feedback button on detail pages so we hear about real friction
 *  while the buyer is still on the page that frustrated them. */
function shouldHideOnPath(pathname: string): boolean {
  // Strip locale prefix (e.g. "/ru/kabinet/..." → "/kabinet/...")
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
  return stripped.startsWith('/kabinet') || stripped.startsWith('/post');
}

/**
 * Persistent floating "Помогите улучшить" feedback button. Mounted
 * globally in `[locale]/layout.tsx`, hidden on operator paths
 * (`/kabinet`, `/post*`) by the layout itself.
 *
 * Why this exists: the platform already has `CallbackWidget` for
 * apartment-specific phone capture, and prefilled WhatsApp/Telegram
 * buttons everywhere a buyer wants to ask about a specific listing.
 * What's missing is a catch-all path for "the site itself isn't
 * working" / "I'm confused" / "I have an idea" — feedback that
 * isn't tied to a single listing. This widget covers that.
 *
 * Submitting fires a `feedback_submitted` event with category +
 * text + optional contact + page_url. The events route picks the
 * insert up like any other event AND triggers a real-time Telegram
 * DM to the founder with a drill-down link to the visitor's full
 * timeline (see `lib/analytics/friction-alerts.ts`).
 *
 * No new database table — just one event in the existing `events`
 * table. The /kabinet/analytics dashboard already surfaces every
 * event in the per-visitor drill-down, so the founder sees feedback
 * inline with the rest of the visitor's session.
 */
const CATEGORIES: ReadonlyArray<{
  id: 'bug' | 'confusion' | 'missing' | 'idea';
  label: string;
}> = [
  { id: 'bug', label: 'Что-то сломалось' },
  { id: 'confusion', label: 'Непонятно' },
  { id: 'missing', label: 'Не нашёл' },
  { id: 'idea', label: 'Идея' },
];

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id'] | null>(null);
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc-to-close + focus trap (lightweight). The textarea gets focus
  // on open so the buyer can start typing immediately. This effect
  // runs UNCONDITIONALLY (per react-hooks/rules-of-hooks); the body
  // bails early when the dialog isn't open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Move initial focus into the dialog.
    dialogRef.current?.querySelector('textarea')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Render nothing on hidden surfaces (operator + detail-page-with-
  // sticky-bar + wizard). The early return MUST come after every
  // hook above so React's hook-order invariant holds.
  if (shouldHideOnPath(pathname || '')) return null;

  function reset() {
    setCategory(null);
    setText('');
    setContact('');
    setDone(false);
    setSubmitting(false);
  }

  function close() {
    setOpen(false);
    // Reset on a small delay so the buyer doesn't see fields wipe
    // mid-close — the panel slides out first, then state clears.
    setTimeout(reset, 200);
  }

  async function submit() {
    if (submitting) return;
    if (!category) {
      toast.error('Выберите категорию');
      return;
    }
    if (!text.trim()) {
      toast.error('Опишите, что произошло');
      return;
    }
    setSubmitting(true);
    // The track() helper is fire-and-forget + keepalive-safe, but we
    // still await a microtask so the panel doesn't close before the
    // request leaves the page (in a fast-typing user this matters).
    track('feedback_submitted', {
      category,
      text: text.trim(),
      contact: contact.trim() || null,
      page_url:
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : null,
    });
    setDone(true);
    setSubmitting(false);
    // Auto-close after 2s with a thank-you visible.
    setTimeout(() => close(), 2000);
  }

  return (
    <>
      {/* Floating trigger — bottom-LEFT (deliberate, to NOT collide
          with sticky-bar Связаться/contact CTAs on listing surfaces).
          Quiet white pill with a small alert icon. The label is
          "Сообщить о проблеме" / "Что не работает?" — clear that
          this is for REPORTING, not requesting help. The earlier
          "Помогите улучшить" framing read as a backwards "you help
          US" ask in Russian and got confused with the listing
          contact CTAs. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Сообщить о проблеме"
        className={cn(
          'fixed z-30 inline-flex h-10 items-center gap-1.5 rounded-full',
          'border border-stone-200 bg-white px-3 text-caption font-medium',
          'text-stone-600 shadow-sm transition-all',
          'hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900',
          // Bottom-LEFT — opposite corner from the listing contact
          // sticky bar. Lifted above the mobile-bottom-nav.
          'bottom-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))] left-4',
          'md:bottom-5 md:left-5',
        )}
      >
        <MessageSquare className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">Сообщить о проблеме</span>
        {/* Was "Проблема?" — too narrow (only fits bug-reporting
            mental model) and loaded with negative framing for a
            buyer mid-research. The chip is a catch-all for bugs,
            confusion, and ideas, so the mobile label should invite
            ANY kind of message. "Сообщить?" matches the action
            verb of the dialog without presuming what's wrong. */}
        <span className="sm:hidden">Сообщить?</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Помогите улучшить платформу"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
          >
            {done ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span
                  className="size-10 rounded-full bg-[color:var(--color-fairness-great)]/10 inline-flex items-center justify-center text-[color:var(--color-fairness-great)]"
                  aria-hidden
                >
                  ✓
                </span>
                <h3
                  className="text-h3 font-semibold text-stone-900"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  Спасибо!
                </h3>
                <p className="text-meta text-stone-600">
                  Мы прочитаем каждое сообщение. Если вы оставили контакт —
                  ответим лично.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3
                      className="text-h2 font-semibold text-stone-900"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                    >
                      Что не получилось?
                    </h3>
                    <p className="text-meta text-stone-600">
                      На старте платформы каждое сообщение бесценно — расскажите,
                      что сломалось или непонятно.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Закрыть"
                    className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-caption font-medium uppercase tracking-widest text-stone-500">
                    Категория
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((c) => {
                      const active = category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex h-10 items-center justify-center rounded-md px-3 text-meta font-medium transition-colors',
                            active
                              ? 'bg-terracotta-50 text-terracotta-900 ring-1 ring-terracotta-300'
                              : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50',
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AppTextarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Опишите, что произошло…"
                  rows={4}
                  maxLength={500}
                  showCounter
                />

                <AppInput
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Telegram или WhatsApp (если хотите ответ)"
                  inputMode="tel"
                />

                <div className="flex gap-2 pt-1">
                  <AppButton
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    onClick={close}
                  >
                    Отмена
                  </AppButton>
                  <AppButton
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={submit}
                    loading={submitting}
                    disabled={!category || !text.trim()}
                  >
                    Отправить
                  </AppButton>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
