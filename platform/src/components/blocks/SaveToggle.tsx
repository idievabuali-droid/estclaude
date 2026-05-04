'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { toast } from '@/components/primitives/AppToast';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/track';
import { addAnonSave, hasAnonSave, removeAnonSave } from '@/lib/anon-saves';

export interface SaveToggleProps {
  type: 'building' | 'listing';
  /** UUID of the item to save. */
  id: string;
  className?: string;
}

/**
 * Bookmark button on cards. Real save now (was a stub during the pre-
 * auth era). Behaviour:
 *
 *   Not logged in → tapping shows a toast offering to log in via
 *                    Telegram. The toast is the entry point — we
 *                    don't redirect until the user explicitly chooses,
 *                    so misclicks don't yank them off the page.
 *
 *   Logged in     → tapping POSTs to /api/saved/toggle, optimistically
 *                    flips the icon, on error reverts and shows toast.
 *
 * Initial state: we ask /api/saved/status on mount. Renders the empty
 * bookmark for an instant before the answer arrives — that's
 * preferable to blocking the entire card on the lookup, and the
 * "fill" appears within ~50ms in practice (sub-perceptual).
 */
export function SaveToggle({ type, id, className }: SaveToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/saved/status?type=${type}&id=${id}`)
      .then((r) => r.json())
      .then((data: { saved: boolean; authenticated: boolean }) => {
        if (cancelled) return;
        setAuthenticated(!!data.authenticated);
        // Saved state: server is source of truth for logged-in users;
        // for anonymous, fall back to localStorage so the heart stays
        // filled across sessions (and migrates up at login time).
        if (data.authenticated) {
          setSaved(!!data.saved);
        } else {
          setSaved(hasAnonSave(type, id));
        }
      })
      .catch(() => {
        // Network blip — assume anon, read localStorage for the icon.
        if (cancelled) return;
        setAuthenticated(false);
        setSaved(hasAnonSave(type, id));
      });
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (authenticated === false) {
      // Anonymous flow: persist to localStorage immediately so the
      // bookmark sticks across sessions. We still fire the analytics
      // event so the founder dashboard sees these as "save_attempt
      // _logged_out" intent. A subtle toast on the FIRST anon save
      // explains the migration story without being naggy.
      track('save_attempt_logged_out', { type, target_id: id });
      const next = !saved;
      setSaved(next);
      if (next) {
        addAnonSave(type, id);
        toast.info('Сохранено в этом браузере', {
          description: 'Войдите через Telegram, чтобы синхронизировать с другими устройствами и получать уведомления.',
          action: {
            label: 'Войти',
            onClick: () =>
              router.push(`/voyti?redirect=${encodeURIComponent(pathname)}`),
          },
        });
      } else {
        removeAnonSave(type, id);
      }
      return;
    }

    if (pending) return;
    setPending(true);
    const optimistic = !saved;
    setSaved(optimistic);
    try {
      const res = await fetch('/api/saved/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      if (res.status === 401) {
        // Session expired between mount and click — revert + prompt.
        setSaved(!optimistic);
        setAuthenticated(false);
        toast.info('Сессия истекла. Войдите заново.', {
          action: {
            label: 'Войти',
            onClick: () =>
              router.push(`/voyti?redirect=${encodeURIComponent(pathname)}`),
          },
        });
        return;
      }
      if (!res.ok) throw new Error('toggle failed');
      const data = (await res.json()) as { saved: boolean };
      setSaved(data.saved);
      // Refresh the route's server data so /izbrannoe re-renders
      // with the new save state. Cheap on most pages (just reruns
      // the server component); essential on /izbrannoe where the
      // saved-list is the entire page.
      router.refresh();
    } catch {
      // Revert on error.
      setSaved(!optimistic);
      toast.error('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setPending(false);
    }
  }

  const Icon = saved ? BookmarkCheck : Bookmark;
  const label = saved ? 'Убрать из сохранённого' : 'Сохранить';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      onClick={onClick}
      disabled={pending}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white',
        saved
          ? 'text-terracotta-600 hover:text-terracotta-700'
          : 'text-stone-700 hover:text-terracotta-600',
        pending && 'opacity-60',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
