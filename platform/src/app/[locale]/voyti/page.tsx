import { setRequestLocale } from 'next-intl/server';
import { AppContainer } from '@/components/primitives';
import { LoginForm } from './LoginForm';

export default async function VoytiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  return (
    <section className="bg-stone-50 py-7 md:py-8">
      <AppContainer className="lg:max-w-md">
        <LoginForm redirect={sp.redirect ?? '/'} />
      </AppContainer>
    </section>
  );
}
