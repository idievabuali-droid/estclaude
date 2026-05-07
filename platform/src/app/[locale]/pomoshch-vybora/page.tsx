import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GuidedFinder } from './GuidedFinder';

/**
 * /pomoshch-vybora — guided finder ("подбор за 2 минуты").
 *
 * Per the senior-design prescription this surface is single-screen
 * focused: warm canvas background, narrow centered column (max-w
 * 540px), minimal top bar with the wordmark + a "Сохранить и выйти"
 * escape link. The page's own SiteHeader still renders above (route-
 * group-based chrome strip is deferred to a polish pass), but the
 * wizard's content is wrapped in its own quiet branded shell so the
 * whole flow reads as a Typeform/Cal.com onboarding moment rather
 * than a SaaS form embedded in a marketing site.
 *
 * No anxiety, generous whitespace — every step is one decision.
 */
export default async function PomoshchVyboraPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-terracotta-50/30 via-stone-50 to-stone-50 py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-[540px] flex-col gap-8 px-4 md:gap-10">
        {/* Minimal wizard top bar — wordmark on the left, "Сохранить
            и выйти" on the right. Lets a buyer back out without
            losing context (the link routes to /izbrannoe so any
            anchor or saves they tapped earlier remain). */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-h3 font-semibold tracking-[-0.01em] text-terracotta-700"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            ЖК.tj
          </Link>
          <Link
            href="/izbrannoe"
            className="text-meta font-medium text-stone-600 hover:text-terracotta-700 hover:underline"
          >
            Сохранить и выйти
          </Link>
        </div>

        <GuidedFinder />
      </div>
    </section>
  );
}
