import { Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { formatPriceNumber, formatPostedAgo, pluralRu } from '@/lib/format';
import type { ListingStats, PriceHistoryEntry } from '@/services/listing-stats';

export interface ListingTrustSignalsProps {
  stats: ListingStats;
}

/**
 * Compact trust-signal strip shown under the price/posted-ago line on
 * /kvartira detail. Two pieces:
 *
 *   1. View count ("247 просмотров · 12 за сегодня") — same Cian
 *      pattern that says "yes other buyers are also looking, this
 *      isn't a dead listing." Only render when the count is non-zero
 *      so a brand-new listing with no traffic doesn't read as
 *      uninteresting.
 *
 *   2. Most-recent price change ("Цена снижена на 200 000 TJS · 8 апр")
 *      — the biggest missing transparency signal. Only the latest
 *      entry shown inline; detailed timeline is a future extension.
 *
 * The whole block is muted greys (caption tier) so it stays a
 * supporting signal beneath the price hero, not a distraction.
 */
export function ListingTrustSignals({ stats }: ListingTrustSignalsProps) {
  const { viewsTotal, viewsToday, priceHistory } = stats;
  const lastChange = priceHistory[0] ?? null;
  if (viewsTotal === 0 && !lastChange) return null;

  return (
    <div className="flex flex-col gap-1.5 text-caption text-stone-500">
      {viewsTotal > 0 ? (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Eye className="size-3.5 text-stone-400" aria-hidden />
          {viewsTotal} {pluralRu(viewsTotal, ['просмотр', 'просмотра', 'просмотров'])}
          {viewsToday > 0 ? (
            <>
              <span className="text-stone-300">·</span>
              <span>{viewsToday} за сегодня</span>
            </>
          ) : null}
        </span>
      ) : null}
      {lastChange ? <PriceChangeLine entry={lastChange} /> : null}
    </div>
  );
}

function PriceChangeLine({ entry }: { entry: PriceHistoryEntry }) {
  const dropped = entry.deltaPct < 0;
  // Display the absolute delta so the user sees "Цена снижена на 200к",
  // not "Цена изменена на -200к". Sign carried by the verb instead.
  const absDelta = entry.fromDirams > entry.toDirams
    ? entry.fromDirams - entry.toDirams
    : entry.toDirams - entry.fromDirams;
  const verb = dropped ? 'снижена' : 'повышена';
  const Icon = dropped ? TrendingDown : TrendingUp;
  // Drop tone is emerald (good news for buyer); raise is amber (worth
  // noticing). Calm — same caption size, just the icon hue carries the
  // signal.
  const tone = dropped ? 'text-emerald-600' : 'text-amber-600';
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${tone}`}>
      <Icon className="size-3.5" aria-hidden />
      Цена {verb} на {formatPriceNumber(absDelta)} TJS · {formatPostedAgo(entry.changedAt)}
    </span>
  );
}
