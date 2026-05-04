'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useRouter } from '@/i18n/navigation';
import {
  AppCard,
  AppCardContent,
  AppButton,
} from '@/components/primitives';

const POLL_INTERVAL_MS = 2_000;

interface StartResponse {
  token: string;
  tgDeepLink: string;
  httpsLink: string;
  expiresAt: string;
}

interface PollResponse {
  status: 'pending' | 'completed' | 'expired' | 'invalid';
}

/**
 * Telegram-based login UI. Three states:
 *
 *   intro    → button "Войти через Telegram" — calls /api/auth/start
 *              and transitions to qr.
 *   qr       → shows QR + deep-link button + polling spinner. Polls
 *              /api/auth/poll every 2s. Transitions to expired on
 *              session timeout, or redirects on completion.
 *   expired  → "Ссылка устарела" with a retry button.
 *
 * On successful poll, the server has already set the session cookie
 * — we just navigate. router.push triggers a server re-render that
 * picks up the new cookie automatically.
 */
export function TelegramLogin({ redirect }: { redirect: string }) {
  const router = useRouter();
  const [state, setState] = useState<'intro' | 'qr' | 'expired' | 'starting'>('intro');
  const [session, setSession] = useState<StartResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Cleanup the poller when the component unmounts (avoid pinging
  // /api/auth/poll for a token nobody's looking at anymore).
  useEffect(() => () => stopPolling(), []);

  async function startLogin() {
    setError(null);
    setState('starting');
    try {
      const res = await fetch('/api/auth/start', { method: 'POST' });
      if (!res.ok) throw new Error('Не удалось начать вход');
      const data = (await res.json()) as StartResponse;
      setSession(data);

      // Build the QR for the https link (works whether or not
      // Telegram is installed — phones with Telegram will open the
      // app; phones without will get a "open in Telegram" page).
      const dataUrl = await QRCode.toDataURL(data.httpsLink, {
        width: 240,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      setState('qr');

      // Begin polling
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/auth/poll?token=${data.token}`);
          if (!pollRes.ok) return;
          const pollData = (await pollRes.json()) as PollResponse;
          if (pollData.status === 'completed') {
            stopPolling();
            // Lift any anonymous saves the visitor accumulated before
            // logging in into their saved_items. Best-effort: doesn't
            // block the redirect on success or failure. Idempotent on
            // the server (saved_items unique indexes dedupe).
            const { migrateAnonSavesToUser } = await import('@/lib/anon-saves');
            void migrateAnonSavesToUser();
            // The cookie has been set server-side. Navigate; the
            // destination will render with the user's identity.
            router.push(redirect || '/');
            router.refresh();
          } else if (pollData.status === 'expired' || pollData.status === 'invalid') {
            stopPolling();
            setState('expired');
          }
          // status === 'pending' → keep polling
        } catch {
          // Network blip — stay in qr state, next tick will retry.
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setState('intro');
    }
  }

  function reset() {
    stopPolling();
    setSession(null);
    setQrDataUrl(null);
    setError(null);
    setState('intro');
  }

  return (
    <AppCard>
      <AppCardContent>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700">
              <Send className="size-5" />
            </span>
            <h1 className="text-h2 font-semibold text-stone-900">
              Вход через Telegram
            </h1>
            <p className="text-meta text-stone-500">
              {state === 'expired'
                ? 'Ссылка устарела. Нажмите, чтобы попробовать снова.'
                : state === 'qr'
                  ? 'Откройте бота в Telegram и поделитесь номером.'
                  : 'Один тап в Telegram — без SMS и без кодов.'}
            </p>
          </div>

          {state === 'intro' || state === 'starting' ? (
            <div className="flex flex-col gap-3">
              <AppButton
                variant="primary"
                size="lg"
                onClick={startLogin}
                loading={state === 'starting'}
              >
                <MessageCircle className="size-4" /> Войти через Telegram
              </AppButton>
              {error ? (
                <p className="text-center text-meta text-rose-600">{error}</p>
              ) : null}
              <p className="text-center text-caption text-stone-500">
                Telegram должен быть установлен. Никаких SMS — только тап в боте.
              </p>
            </div>
          ) : null}

          {state === 'qr' && session && qrDataUrl ? (
            <div className="flex flex-col items-center gap-4">
              {/* Mobile primary action: deep-link button. Tapping
                  opens the bot directly in the Telegram app —
                  buyers on phones almost never scan a QR with
                  another device, so the link is the dominant CTA. */}
              <a
                href={session.tgDeepLink}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-terracotta-600 px-4 text-meta font-semibold text-white hover:bg-terracotta-700 md:hidden"
              >
                <MessageCircle className="size-4" /> Открыть в Telegram
              </a>

              {/* Desktop primary action: QR for scanning with a
                  phone that has Telegram installed. */}
              <div className="hidden flex-col items-center gap-3 md:flex">
                {/* Plain <img> not next/image — this is a runtime-
                    generated data URL from the qrcode lib, not a
                    server image asset, so next/image's optimisation
                    pipeline doesn't apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR код для входа в Telegram"
                  width={240}
                  height={240}
                  className="rounded-md border border-stone-200"
                />
                <p className="text-meta text-stone-600">
                  Отсканируйте QR в Telegram на телефоне
                </p>
                <a
                  href={session.httpsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-meta font-medium text-terracotta-700 hover:text-terracotta-800"
                >
                  Или откройте в Telegram Web ↗
                </a>
              </div>

              <div className="flex items-center gap-2 text-caption text-stone-500">
                <span className="inline-block size-2 animate-pulse rounded-full bg-terracotta-500" />
                Ждём подтверждения в боте…
              </div>

              <button
                type="button"
                onClick={reset}
                className="text-caption font-medium text-stone-500 hover:text-stone-700"
              >
                Отменить
              </button>
            </div>
          ) : null}

          {state === 'expired' ? (
            <AppButton variant="primary" size="lg" onClick={startLogin}>
              Попробовать снова
            </AppButton>
          ) : null}
        </div>
      </AppCardContent>
    </AppCard>
  );
}
