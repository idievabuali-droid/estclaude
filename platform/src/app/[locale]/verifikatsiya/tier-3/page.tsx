import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { Tier3Flow } from './Tier3Flow';

export default async function Tier3Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="bg-stone-50 py-5 md:py-7">
      <AppContainer className="lg:max-w-2xl">
        <Tier3Flow />
      </AppContainer>
    </section>
  );
}
