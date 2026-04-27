import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { Tier2Flow } from './Tier2Flow';

export default async function Tier2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="bg-stone-50 py-5 md:py-7">
      <AppContainer className="lg:max-w-2xl">
        <Tier2Flow />
      </AppContainer>
    </section>
  );
}
