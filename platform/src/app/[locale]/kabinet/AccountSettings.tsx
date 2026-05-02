'use client';

import { useState } from 'react';
import { LogOut, Bell, BellOff } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppButton } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

export interface AccountSettingsProps {
  initialNotificationsEnabled: boolean;
  phone: string;
  tgFirstName: string | null;
  tgUsername: string | null;
}

/**
 * Account settings panel — notification toggle + logout.
 *
 * The toggle is optimistic: flips immediately on click, reverts +
 * shows toast on API error. We don't show a loading spinner for the
 * sub-second roundtrip; the icon itself is the indicator (Bell vs
 * BellOff).
 */
export function AccountSettings({
  initialNotificationsEnabled,
  phone,
  tgFirstName,
  tgUsername,
}: AccountSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialNotificationsEnabled);
  const [pending, setPending] = useState(false);

  async function toggleNotifications() {
    if (pending) return;
    setPending(true);
    const next = !enabled;
    setEnabled(next);
    try {
      const res = await fetch('/api/me/notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success(
        next
          ? 'Уведомления включены'
          : 'Уведомления отключены',
      );
    } catch {
      setEnabled(!next);
      toast.error('Не удалось сохранить настройку');
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the request fails, navigate — server-side cookie
      // will sort itself out next request, and at worst the user
      // is logged out locally only.
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Identity row — what the user sees about themselves. */}
      <div className="flex flex-col gap-1">
        <span className="text-h3 font-semibold text-stone-900">
          {tgFirstName ?? 'Пользователь'}
        </span>
        <span className="text-meta text-stone-500 tabular-nums">{phone}</span>
        {tgUsername ? (
          <span className="text-caption text-stone-500">@{tgUsername} · Telegram</span>
        ) : null}
      </div>

      {/* Notifications toggle */}
      <div className="flex items-start justify-between gap-4 border-t border-stone-200 pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-meta font-medium text-stone-900">
            Уведомления в Telegram
          </span>
          <span className="text-caption text-stone-500">
            Сообщим, когда снизится цена, появится новая квартира в
            сохранённом ЖК или изменится статус строительства.
          </span>
        </div>
        <button
          type="button"
          onClick={toggleNotifications}
          aria-pressed={enabled}
          disabled={pending}
          className={
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-meta font-medium transition-colors ' +
            (enabled
              ? 'border-terracotta-300 bg-terracotta-50 text-terracotta-800 hover:bg-terracotta-100'
              : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100')
          }
        >
          {enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          {enabled ? 'Включены' : 'Выключены'}
        </button>
      </div>

      {/* Logout */}
      <div className="border-t border-stone-200 pt-4">
        <AppButton variant="secondary" onClick={logout}>
          <LogOut className="size-4" /> Выйти
        </AppButton>
      </div>
    </div>
  );
}
