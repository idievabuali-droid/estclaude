'use client';

import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { AppCard, AppCardContent } from '@/components/primitives';

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
}: WizardResultBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  // Count copy — pluralisation matters in Russian. "Мы подобрали"
  // with 0 reads as a soft fail (the SaveSearchPrompt below the
  // banner offers subscribe-on-publish for that case); with N
  // reads as a celebration.
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
  // Helper points DOWN to the SaveSearchPrompt rendered below the
  // banner. Was previously a button on the banner itself with no
  // handler — broken UI. Now the actual subscribe form sits right
  // below and the banner just acknowledges + redirects attention.
  const helper =
    resultCount === 0
      ? 'Подпишитесь ниже — пришлём, как только появится подходящее.'
      : 'Хотите получать новые квартиры по этим параметрам? Подпишитесь ниже — пришлём в Telegram или WhatsApp.';

  return (
    <AppCard className="border-terracotta-200 bg-gradient-to-br from-terracotta-50/80 to-amber-50/60">
      <AppCardContent>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-terracotta-700 shadow-sm">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-h3 font-semibold text-stone-900">{headline}</h3>
            {filterSummary ? (
              <p className="text-caption text-stone-600">{filterSummary}</p>
            ) : null}
            <p className="text-meta text-stone-700">{helper}</p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Скрыть"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-white hover:text-stone-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </AppCardContent>
    </AppCard>
  );
}
