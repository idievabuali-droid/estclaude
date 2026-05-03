'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, MessageCircle, Send, Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShareButtonProps {
  /** Absolute URL to share. Should include https://. */
  url: string;
  /** Pre-filled text for chat apps that accept it. */
  text?: string;
  /** Title for native share sheet. */
  title?: string;
  className?: string;
}

/**
 * Share button with three channels: WhatsApp, Telegram, and copy link.
 *
 * Mobile-first: tries `navigator.share()` (the native iOS / Android share
 * sheet) when available — buyer picks IMO, WhatsApp, Telegram, SMS, etc.
 * from the OS's full app list instead of being limited to our menu.
 *
 * Falls back to a small popover with our three explicit channels for
 * desktop browsers (which don't have the Web Share API outside HTTPS
 * mobile contexts) and any mobile that doesn't support it.
 *
 * Why these three specifically: WhatsApp + Telegram are the dominant
 * messaging apps in TJ + diaspora destinations (RU, KZ, TR). IMO is also
 * popular but has no public deep-link spec — buyers using IMO pick it
 * from the native share sheet on mobile.
 */
export function ShareButton({ url, text = '', title, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Outside-click close — same pattern as PriceChip / MultiSelectChip.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Reset "Скопировано" check after 2s so the user knows the action
  // completed but the button reverts to its normal state.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleClick() {
    // Try the native share sheet first — best UX on mobile because the
    // buyer picks any installed app (IMO, WhatsApp, Telegram, SMS, mail).
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url, text, title });
        return;
      } catch {
        // User canceled, or share failed — fall through to the menu.
      }
    }
    // No native share or user dismissed it — open our explicit menu.
    setOpen((v) => !v);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard API can fail on insecure contexts or when permission
      // is denied — fallback prompt so the user can copy manually.
      window.prompt('Скопируйте ссылку:', url);
    }
  }

  // Build the channel deep-links once so the menu render is cheap.
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text ? `${text}\n${url}` : url);
  const whatsappHref = `https://wa.me/?text=${encodedText}`;
  // Telegram's /share/url accepts both url and text params.
  const telegramHref = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text || title || '')}`;

  return (
    <div ref={wrapperRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-meta font-medium text-stone-900 transition-colors hover:border-stone-400 hover:bg-stone-50"
      >
        <Share2 className="size-4" aria-hidden />
        <span>Поделиться</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Поделиться"
          className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-meta text-stone-900 transition-colors hover:bg-stone-50"
          >
            <span
              className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-fairness-great)] text-white"
              aria-hidden
            >
              <MessageCircle className="size-3.5" />
            </span>
            WhatsApp
          </a>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-meta text-stone-900 transition-colors hover:bg-stone-50"
          >
            <span
              className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-semantic-info)] text-white"
              aria-hidden
            >
              <Send className="size-3.5" />
            </span>
            Telegram
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-3 border-t border-stone-100 px-3 py-2.5 text-left text-meta text-stone-900 transition-colors hover:bg-stone-50"
          >
            <span
              className="inline-flex size-7 items-center justify-center rounded-full bg-stone-100 text-stone-700"
              aria-hidden
            >
              {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
            </span>
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
