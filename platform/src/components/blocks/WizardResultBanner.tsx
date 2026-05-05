'use client';

import { Sparkles, Bell, X } from 'lucide-react';
import { useState } from 'react';
import { AppCard, AppCardContent, AppButton } from '@/components/primitives';

export interface WizardResultBannerProps {
  /** How many listings/buildings matched after the wizard's
   *  filters. Drives the headline number — the "magic moment" the
   *  wizard was missing. */
  resultCount: number;
  /** Plain-Russian summary of what was searched for, e.g.
   *  "2-комн · до 800 000 TJS · с ремонтом". Renders as a calm
   *  caption beneath the headline so the buyer can confirm we
   *  understood them before exploring. */
  filterSummary: string;
  /** Onclick that opens the same SaveSearchPrompt subscribe flow
   *  buyers see on regular filtered list pages. We don't render
   *  the full prompt inline here because the page already mounts
   *  SaveSearchPrompt below the cards — the banner just nudges
   *  the buyer down to it instead of duplicating the form. */
  onSubscribeClick?: () => void;
}

/**
 * Banner shown at the top of /kvartiry (or /novostroyki) when the
 * URL carries `?wizard=1`. The /pomoshch-vybora wizard now appends
 * that flag on completion so the destination page can acknowledge
 * the buyer's 5 questions of effort instead of looking identical to
 * a normal filtered list visit.
 *
 * Was the wizard's biggest UX gap: 5 questions → no celebration,
 * no count, no save-as-alert prompt. The buyer landed on a generic
 * /kvartiry?rooms=2 page that gave them no signal the platform
 * heard their answers.
 *
 * Dismissable so the banner doesn't follow the buyer around if
 * they reload or paste the URL into a new tab.
 */
export function WizardResultBanner({
  resultCount,
  filterSummary,
  onSubscribeClick,
}: WizardResultBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // Count copy — pluralisation matters in Russian. "Мы подобрали"
  // with 0 reads as a soft fail (the SaveSearchPrompt below picks up
  // and offers subscribe-on-publish); with N reads as a celebration.
  const countWord =
    resultCount === 1
      ? 'вариант'
      : resultCount >= 2 && resultCount <= 4
        ? 'варианта'
        : 'вариантов';
  const headline =
    resultCount === 0
      ? 'Пока ничего не подходит'
      : `Мы подобрали ${resultCount} ${countWord} по вашим ответам`;
  const helper =
    resultCount === 0
      ? 'Расширьте параметры или подпишитесь — пришлём, как только появится подходящее.'
      : 'Сохраните этот поиск и получайте новые квартиры в Telegram или WhatsApp, когда они появятся.';

  return (
    <AppCard className="border-terracotta-200 bg-gradient-to-br from-terracotta-50/80 to-amber-50/60">
      <AppCardContent>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-terracotta-700 shadow-sm">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-h3 font-semibold text-stone-900">{headline}</h3>
              {filterSummary ? (
                <p className="text-caption text-stone-600">{filterSummary}</p>
              ) : null}
              <p className="text-meta text-stone-700">{helper}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton variant="primary" size="sm" onClick={onSubscribeClick}>
                <Bell className="size-3.5" /> Подписаться на уведомления
              </AppButton>
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => setDismissed(true)}
              >
                <X className="size-3.5" /> Скрыть
              </AppButton>
            </div>
          </div>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
