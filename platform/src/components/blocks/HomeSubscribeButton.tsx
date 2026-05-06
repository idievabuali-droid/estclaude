'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { AppButton } from '@/components/primitives';

/**
 * §R retention surface on the home page — one-tap Telegram subscribe
 * to all new Vahdat listings.
 *
 * POSTs an empty-filter saved search (`page: 'kvartiry'`, no filters;
 * ACTIVE_CITY = 'vahdat' is enforced server-side by listings queries
 * so the subscriber receives matches across the whole city). The
 * endpoint returns a `deep_link` to @zhk_tj_bot which finishes the
 * subscribe handshake. We open the link in the same tab — Telegram
 * intercepts the URL via the OS app handler on mobile, falls back to
 * the web bot page on desktop.
 *
 * Design intent: lowest-friction retention for a first-time visitor.
 * One tap, no form, no decision. Browse-now intent is covered by the
 * affordability chip in the hero; this surface is for notify-later.
 */
export function HomeSubscribeButton() {
  const [pending, setPending] = useState(false);

  async function handleSubscribe() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/saved-searches/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'kvartiry',
          filters: {},
          channel: 'telegram',
        }),
      });
      if (!res.ok) {
        console.error('home-subscribe save failed', res.status, await res.text());
        setPending(false);
        return;
      }
      const data = (await res.json()) as { id: string; deep_link?: string };
      if (data.deep_link) {
        window.location.href = data.deep_link;
      } else {
        // Logged-in Telegram user: subscribe is already complete on
        // the server (notify_chat_id set). Brief feedback then reset.
        setPending(false);
      }
    } catch (e) {
      console.error('home-subscribe error', e);
      setPending(false);
    }
  }

  return (
    <AppButton variant="primary" size="lg" onClick={handleSubscribe} disabled={pending}>
      <MessageSquare className="size-4" />
      {pending ? 'Открываем Telegram...' : 'Подписаться в Telegram'}
    </AppButton>
  );
}
