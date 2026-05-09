'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { AppButton } from '@/components/primitives';
import { toast } from '@/components/primitives/AppToast';

/**
 * §R retention surface on the home page — one-tap Telegram subscribe
 * to all new Vahdat listings.
 *
 * POSTs an empty-filter saved search (`page: 'kvartiry'`, no filters;
 * ACTIVE_CITY = 'vahdat' is enforced server-side by listings queries
 * so the subscriber receives matches across the whole city). The
 * endpoint returns a `deep_link` to @VafoTjBot which finishes the
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
        // the server (notify_chat_id was bound from their session).
        // Show success feedback so the tap doesn't feel like nothing
        // happened — without this the spinner just disappears and
        // users wonder if it worked. Identified pre-launch (P0).
        setPending(false);
        toast.success('Подписка активирована — пришлём в Telegram, когда появятся новые квартиры.');
      }
    } catch (e) {
      console.error('home-subscribe error', e);
      setPending(false);
    }
  }

  return (
    // Premium-dark "secondary primary" button — stone-900 solid.
    // Earlier blue (semantic-info) introduced a fourth hue that
    // fragmented the palette and clashed with the warm stone brand.
    // Stone-900 differentiates from the header's terracotta CTA
    // through value (near-black vs warm orange) without adding a hue.
    // Same pattern Notion / Stripe use for important secondary
    // actions — the visual weight comes from contrast, not colour.
    // text-white explicit so tailwind-merge doesn't drop it when
    // primary variant's bg-* gets overridden.
    <AppButton
      variant="primary"
      size="lg"
      onClick={handleSubscribe}
      disabled={pending}
      className="bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-700"
    >
      <MessageSquare className="size-4" />
      {pending ? 'Открываем Telegram...' : 'Подписаться в Telegram'}
    </AppButton>
  );
}
