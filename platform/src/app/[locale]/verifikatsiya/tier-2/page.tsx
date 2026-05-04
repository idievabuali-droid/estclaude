import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

/**
 * V1-cut: Tier 2 verification flow is not part of the launch surface
 * (see DECISIONS.md). Direct URL access used to render the full
 * multi-step flow with no nav back (MobileBottomNav also hides on
 * /verifikatsiya/*). 404 here keeps the code (so we can re-enable
 * later by removing this guard) without exposing the dead route.
 */
export default async function Tier2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
