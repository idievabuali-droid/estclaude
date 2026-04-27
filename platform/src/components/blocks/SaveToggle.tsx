'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { toast } from '@/components/primitives/AppToast';
import { cn } from '@/lib/utils';

export interface SaveToggleProps {
  type: 'building' | 'listing';
  /** ID of the item to save. Used once auth + saved_items writes are wired. */
  id: string;
  className?: string;
}

/**
 * Bookmark button on cards. Until auth is wired (Telegram bot), tapping
 * shows a toast + redirects to /voyti so the user knows save requires login.
 *
 * REMOVE-2 + JOURNEY-3: previously this was a no-op preventDefault — the user
 * thought save was broken. Now it's an honest "log in to save" prompt.
 */
export function SaveToggle({ type, id, className }: SaveToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hovering, setHovering] = useState(false);
  // void id for now — real save will use it when auth lands
  void type;
  void id;

  const Icon = hovering ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      aria-label="Сохранить (требуется вход)"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toast.info('Войдите, чтобы сохранять', {
          action: {
            label: 'Войти',
            onClick: () => router.push(`/voyti?redirect=${encodeURIComponent(pathname)}`),
          },
        });
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-stone-700 transition-colors hover:bg-white hover:text-terracotta-600',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
