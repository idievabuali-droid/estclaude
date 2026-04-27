'use client';

import { useState } from 'react';
import { Phone, MessageCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { PostShell } from '../PostShell';
import {
  AppCard,
  AppCardContent,
  AppButton,
  AppInput,
} from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';
import * as auth from '@/services/auth';

export default function PostPhoneStep() {
  const router = useRouter();
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+992 ');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await auth.requestOtp({ phone });
    setLoading(false);
    if (!res.ok) return setError(res.error ?? 'Ошибка');
    setStage('code');
    toast.success('Код отправлен в Telegram');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await auth.verifyOtp({ phone, code });
    setLoading(false);
    if (!res.ok) return setError(res.error ?? 'Неверный код');
    router.push('/post/ownership');
  }

  return (
    <PostShell step="phone">
      <AppCard>
        <AppCardContent>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
                <Phone className="size-5" />
              </span>
              <h1 className="text-h2 font-semibold text-stone-900">
                {stage === 'phone' ? 'Подтвердите телефон' : 'Введите код'}
              </h1>
              <p className="text-meta text-stone-500">
                {stage === 'phone'
                  ? 'Чтобы разместить объявление, нужен только проверенный номер телефона. Никаких документов или email.'
                  : `Код отправлен на ${phone}.`}
              </p>
            </div>

            {stage === 'phone' ? (
              <form onSubmit={send} className="flex flex-col gap-4">
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
                />
                <AppButton type="submit" variant="primary" size="lg" loading={loading}>
                  <MessageCircle className="size-4" /> Получить код
                </AppButton>
              </form>
            ) : (
              <form onSubmit={verify} className="flex flex-col gap-4">
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
                />
                <AppButton type="submit" variant="primary" size="lg" loading={loading}>
                  <ShieldCheck className="size-4" /> Подтвердить и продолжить
                </AppButton>
              </form>
            )}
          </div>
        </AppCardContent>
      </AppCard>
    </PostShell>
  );
}
