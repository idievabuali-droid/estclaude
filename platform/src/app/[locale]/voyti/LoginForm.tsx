'use client';

import { useState } from 'react';
import { Phone, MessageCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  AppCard,
  AppCardContent,
  AppButton,
  AppInput,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import * as auth from '@/services/auth';

export function LoginForm({ redirect }: { redirect: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+992 ');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await auth.requestOtp({ phone });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Не удалось отправить код');
      return;
    }
    setStep('code');
    toast.success(
      res.channel === 'telegram'
        ? 'Код отправлен в Telegram'
        : 'Код отправлен по SMS',
    );
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await auth.verifyOtp({ phone, code });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Неверный код');
      return;
    }
    toast.success('Вход выполнен');
    router.push(redirect);
  }

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-center">
            <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
              <Phone className="size-5" />
            </span>
            <h1 className="text-h2 font-semibold text-stone-900">
              {step === 'phone' ? 'Войти через телефон' : 'Введите код'}
            </h1>
            <p className="text-meta text-stone-500">
              {step === 'phone'
                ? 'Мы отправим код подтверждения в Telegram. Это бесплатно и без роуминга.'
                : `Код отправлен на ${phone}. Если не пришёл, проверьте Telegram.`}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={onRequest} className="flex flex-col gap-4">
              <AppInput
                type="tel"
                inputMode="tel"
                label="Номер телефона"
                placeholder="+992 ___ __ __ __"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                autoComplete="tel"
                required
                errorText={error ?? undefined}
                helperText={error ? undefined : 'Telegram должен быть установлен на этом номере.'}
              />
              <AppButton type="submit" variant="primary" size="lg" loading={loading}>
                <MessageCircle className="size-4" /> Получить код в Telegram
              </AppButton>
              <p className="text-center text-caption text-stone-500">
                Регистрируясь, вы соглашаетесь с условиями платформы.
              </p>
            </form>
          ) : (
            <form onSubmit={onVerify} className="flex flex-col gap-4">
              <AppInput
                inputMode="numeric"
                label="6-значный код"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                maxLength={6}
                required
                errorText={error ?? undefined}
                helperText={error ? undefined : 'Введите 6 цифр из сообщения от бота.'}
              />
              <AppButton type="submit" variant="primary" size="lg" loading={loading}>
                <ShieldCheck className="size-4" /> Подтвердить
              </AppButton>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                className="text-meta font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Изменить номер
              </button>
            </form>
          )}
        </div>
      </AppCardContent>
    </AppCard>
  );
}
