/**
 * POST /api/callback-request
 *
 * Body: { listing_id: string, phone: string, name?: string }
 *
 * Anonymous-friendly: no auth required. Inserts a contact_requests
 * row with buyer_user_id (when logged in) OR just buyer_phone (when
 * anonymous) — the contact_requests schema permits either since
 * anonymous WhatsApp clicks were always meant to be tracked here.
 *
 * Also fires a callback_request_submitted event so the founder's
 * /kabinet/analytics dashboard sees this as an outcome on the
 * visitor's timeline.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { readAnonIdServer } from '@/lib/analytics/anon-id';
import { sendMessage } from '@/lib/telegram/bot';

interface CallbackBody {
  listing_id: string;
  phone: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!body.listing_id || !body.phone?.trim()) {
    return NextResponse.json({ error: 'listing_id + phone required' }, { status: 400 });
  }

  const user = await getCurrentUser();
  const supabase = createAdminClient();

  // anon_id stored alongside buyer_user_id so the per-visitor
  // analytics drill-down can show this callback for an anonymous
  // visitor too — without anon_id, anonymous callbacks are orphans
  // (buyer_user_id is null, no other join key exists).
  const anonIdEarly = await readAnonIdServer();

  const { error: insertErr } = await supabase.from('contact_requests').insert({
    listing_id: body.listing_id,
    buyer_user_id: user?.id ?? null,
    anon_id: anonIdEarly,
    buyer_phone: body.phone.trim(),
    buyer_name: body.name?.trim() || null,
    // V1 callback widget always implies WhatsApp — that's the dominant
    // channel and what the founder's manual outreach plan assumes.
    channel: 'whatsapp',
    status: 'new',
  });
  if (insertErr) {
    console.error('contact_requests insert failed:', insertErr);
    return NextResponse.json({ error: 'save failed' }, { status: 500 });
  }

  // Tracking event — ties to the visitor's timeline in /kabinet/analytics.
  const anonId = anonIdEarly;
  if (anonId) {
    void supabase
      .from('events')
      .insert({
        anon_id: anonId,
        user_id: user?.id ?? null,
        event_type: 'callback_request_submitted',
        properties: { listing_id: body.listing_id, phone_provided: true },
        url: req.headers.get('referer'),
        user_agent: req.headers.get('user-agent'),
      })
      .then(({ error }) => {
        if (error) console.error('event insert (callback) failed:', error);
      });
  }

  // Ping the founder right away so they can WhatsApp the buyer while
  // the listing is fresh in their head. Best-effort, looked up by
  // user_roles admin → tg_chat_id; if the lookup fails the request
  // still succeeded (it's in contact_requests for the dashboard).
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
      await sendMessage(
        tgChatId,
        `📞 Запрос обратной связи\n${body.phone.trim()}${body.name ? ` (${body.name})` : ''}\nКвартира: /kvartira/${body.listing_id}`,
      );
    }
  } catch (err) {
    console.error('founder notify (callback) failed:', err);
  }

  return NextResponse.json({ ok: true });
}
