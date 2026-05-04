import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

/**
 * V1-cut: Tier 3 (on-site) verification flow is not part of launch
 * (see DECISIONS.md). 404 here keeps the code (so we can re-enable
 * later) without exposing a half-real flow that has no nav back.
 */
export default async function Tier3Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
