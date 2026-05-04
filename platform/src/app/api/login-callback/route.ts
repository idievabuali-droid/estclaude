/**
 * POST /api/login-callback
 *
 * Body: { phone: string, name?: string, source?: string }
 *
 * Anonymous-friendly captures buyers who don't use Telegram. The
 * /voyti page used to be a single-method dead end (Telegram only) for
 * a market that's predominantly WhatsApp. This endpoint lets the
 * visitor leave a phone; the founder gets a Telegram nudge and
 * onboards them manually — sets up alerts, walks them through
 * listings, etc. By design: not an automated login. Conversion via
 * relationship instead of automation, which is the V1 positioning.
 *
 * Tracks `login_callback_submitted` so the founder dashboard can
 * count this acquisition channel separately from listing-callbacks.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readAnonIdServer } from '@/lib/analytics/anon-id';
import { sendMessage } from '@/lib/telegram/bot';

interface Body {
  phone: string;
  name?: string;
  source?: string;
}

const PHONE_RE = /^[0-9+\s\-()]{6,20}$/;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const phone = (body.phone ?? '').trim();
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'phone invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const anonId = await readAnonIdServer();

  // Track as an event so the founder dashboard sees this acquisition
  // separately from listing-callbacks. No DB row beyond events — V1
  // doesn't need a separate table for this; the founder reads the
  // Telegram nudge below and follows up manually.
  if (anonId) {
    void supabase
      .from('events')
      .insert({
        anon_id: anonId,
        event_type: 'login_callback_submitted',
        properties: {
          phone_provided: true,
          name_provided: !!body.name?.trim(),
          source: body.source ?? 'voyti',
        },
        url: req.headers.get('referer'),
        user_agent: req.headers.get('user-agent'),
      })
      .then(({ error }) => {
        if (error) console.error('event insert (login-callback):', error);
      });
  }

  // Founder gets pinged so they can WhatsApp the buyer right away.
  // Best-effort; if the lookup fails the founder can still see the
  // event in /kabinet/analytics.
  try {
    const { data: founderRow } = await supabase
      .from('user_roles')
      .select('user_id, users:users!inner(tg_chat_id)')
      .eq('role', 'admin')
      .order('user_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    const tgChatId =
      ((founderRow?.users as unknown as { tg_chat_id?: number | null } | null) ?? null)
        ?.tg_chat_id ?? null;
    if (tgChatId) {
      const lines = [
        '📲 Новый запрос на вход через WhatsApp',
        `Телефон: ${phone}`,
      ];
      if (body.name?.trim()) lines.push(`Имя: ${body.name.trim()}`);
      lines.push(`Источник: ${body.source ?? '/voyti'}`);
      await sendMessage(tgChatId, lines.join('\n'));
    }
  } catch (err) {
    console.error('founder notify (login-callback) failed:', err);
  }

  return NextResponse.json({ ok: true });
}
