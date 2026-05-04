/**
 * POST /api/saved-searches/save
 *
 * Body:
 *   {
 *     page: 'novostroyki' | 'kvartiry',
 *     filters: { ... },               // URL searchParams object
 *     channel: 'telegram' | 'whatsapp',
 *     phone?: string,                 // required when channel=whatsapp
 *   }
 *
 * Response:
 *   - For Telegram path: { id, deep_link } — client opens the
 *     deep_link to finish the subscribe handshake.
 *   - For WhatsApp path: { id } — done in one round-trip (no bot
 *     ceremony needed; on match the founder is pinged with the
 *     phone and messages the buyer manually).
 *
 * Authentication: not required. Anonymous visitors get the row tied
 * to their anon_id cookie; logged-in users get user_id set too.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/session';
import { readAnonIdServer } from '@/lib/analytics/anon-id';
import { getBotUsername } from '@/lib/telegram/bot';
import { displayNameFromFilters } from '@/lib/saved-searches/format';

interface SaveBody {
  page: 'novostroyki' | 'kvartiry';
  filters: Record<string, string | string[] | undefined>;
  channel: 'telegram' | 'whatsapp';
  phone?: string;
}

export async function POST(req: NextRequest) {
  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (body.page !== 'novostroyki' && body.page !== 'kvartiry') {
    return NextResponse.json({ error: 'invalid page' }, { status: 400 });
  }
  if (body.channel !== 'telegram' && body.channel !== 'whatsapp') {
    return NextResponse.json({ error: 'invalid channel' }, { status: 400 });
  }
  if (body.channel === 'whatsapp' && !body.phone?.trim()) {
    return NextResponse.json({ error: 'phone required for whatsapp channel' }, { status: 400 });
  }

  const anonId = await readAnonIdServer();
  if (!anonId) {
    return NextResponse.json({ error: 'no anon_id cookie' }, { status: 400 });
  }
  const user = await getCurrentUser();

  const supabase = createAdminClient();
  const displayName = displayNameFromFilters(body.page, body.filters);

  // For an already-logged-in Telegram user we can attach their
  // chat_id directly — no deep-link round-trip needed.
  let notifyChatId: number | null = null;
  let notifyPhone: string | null = null;
  if (body.channel === 'telegram' && user?.tg_chat_id) {
    notifyChatId = user.tg_chat_id;
  } else if (body.channel === 'whatsapp') {
    notifyPhone = body.phone!.trim();
  }

  const { data: search, error: insertErr } = await supabase
    .from('saved_searches')
    .insert({
      anon_id: anonId,
      user_id: user?.id ?? null,
      page: body.page,
      filters: body.filters,
      display_name: displayName,
      notify_chat_id: notifyChatId,
      notify_phone: notifyPhone,
      active: true,
    })
    .select('id')
    .single();
  if (insertErr || !search) {
    console.error('saved_searches insert failed:', insertErr);
    return NextResponse.json({ error: 'save failed' }, { status: 500 });
  }

  // For the Telegram path with no existing chat_id, mint a one-time
  // token + return the deep-link. The bot's /start handler completes
  // the binding when the visitor taps it.
  if (body.channel === 'telegram' && !notifyChatId) {
    const token = randomBytes(16).toString('hex');
    const { error: sessErr } = await supabase
      .from('subscribe_sessions')
      .insert({ token, saved_search_id: search.id, status: 'pending' });
    if (sessErr) {
      console.error('subscribe_sessions insert failed:', sessErr);
      return NextResponse.json({ error: 'save failed' }, { status: 500 });
    }
    let botUsername: string;
    try {
      botUsername = getBotUsername();
    } catch {
      return NextResponse.json({ error: 'bot not configured' }, { status: 500 });
    }
    return NextResponse.json({
      id: search.id,
      deep_link: `https://t.me/${botUsername}?start=subscribe_${token}`,
    });
  }

  return NextResponse.json({ id: search.id });
}
