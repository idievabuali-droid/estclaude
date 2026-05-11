import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPriceNumber, formatPostedAgo } from '@/lib/format';
import type { ListingStats, PriceHistoryEntry } from '@/services/listing-stats';

export interface ListingTrustSignalsProps {
  stats: ListingStats;
}

/**
 * Compact trust-signal strip shown under the posted-ago line on
 * /kvartira detail. Renders the most-recent price change
 * ("Цена снижена на 200 000 TJS · 8 апр") — the biggest transparency
 * signal we have. Drop = emerald (good news for the buyer), raise =
 * amber (worth noticing). Only the latest entry shown inline; detailed
 * timeline is a future extension.
 *
 * The view counter was removed 2026-05-11 per founder critique: showing
 * "247 просмотров · 12 за сегодня" introduces a vague social-proof
 * signal that doesn't help the buyer decide on the apartment itself
 * (and at V1 traffic it can read as "nobody's looking" rather than
 * the intended "you're in the right place"). Listings.stats.viewsTotal
 * is still aggregated server-side for the founder's /kabinet/analytics
 * dashboard; we just don't expose it on the buyer surface.
 *
 * Returns null when there's no price-change entry — nothing to show.
 */
export function ListingTrustSignals({ stats }: ListingTrustSignalsProps) {
  const lastChange = stats.priceHistory[0] ?? null;
  if (!lastChange) return null;

  return (
    <div className="flex flex-col gap-1.5 text-caption text-stone-500">
      <PriceChangeLine entry={lastChange} />
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
