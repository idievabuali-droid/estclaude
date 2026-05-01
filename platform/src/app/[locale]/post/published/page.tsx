import { CheckCircle2, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import {
  AppButton,
  AppCard,
  AppCardContent,
} from '@/components/primitives';

export default async function PostPublishedStep({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PostShell step="published">
      <div className="flex flex-col gap-5">
        <AppCard>
          <AppCardContent>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-green-50 text-[color:var(--color-fairness-great)]">
                <CheckCircle2 className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <h1 className="text-h1 font-semibold text-stone-900">Объявление опубликовано</h1>
                <p className="text-meta text-stone-500">
                  Покупатели уже видят его в поиске. Вы получите уведомление при первом запросе.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row">
                <Link href="/kabinet">
                  <AppButton variant="primary">
                    <LayoutDashboard className="size-4" /> Перейти в кабинет
                  </AppButton>
                </Link>
                <Link href="/kvartira/b-vahdat-park-vp-2k-a">
                  <AppButton variant="secondary">Открыть моё объявление</AppButton>
                </Link>
              </div>
            </div>
          </AppCardContent>
        </AppCard>

        {/* Verification upsell — Page 12.10 */}
        <AppCard className="border-amber-200/60 bg-amber-50/30">
          <AppCardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-[color:var(--color-badge-tier-3)]" />
                <div className="flex flex-col gap-1">
                  <span className="text-h3 font-semibold text-stone-900">
                    Поднимите доверие до Tier 3
                  </span>
                  <span className="text-meta text-stone-700">
                    Команда платформы выезжает на объект и подтверждает: квартира существует, цена
                    соответствует заявленной, продавец — реальный.
                  </span>
                </div>
              </div>
              <Link href="/verifikatsiya/tier-3">
                <AppButton variant="secondary">Запланировать визит</AppButton>
              </Link>
            </div>
          </AppCardContent>
        </AppCard>
      </div>
    </PostShell>
  );
}
