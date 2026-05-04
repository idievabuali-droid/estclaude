-- ============================================================
-- Migration 0015: visitor analytics + saved searches
--
-- Two new tables that together let us understand who's using the
-- platform and let buyers subscribe to "tell me when an apartment
-- like this appears".
--
--   events           — per-action timeline (page_view, listing click,
--                      search_run, search_no_results, contact button
--                      click, etc.). Anonymous and identified visits
--                      both write to this table; the identified path
--                      sets user_id at stitch time so a single user's
--                      pre-login + post-login activity reads as one
--                      timeline.
--
--   saved_searches   — buyers (anonymous or identified) saying "ping
--                      me when a listing matches these filters".
--                      Notification destination is either
--                      notify_chat_id (Telegram bot DMs them directly)
--                      or notify_phone (founder gets a Telegram nudge
--                      with the phone, then WhatsApps them manually).
-- ============================================================

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  -- anon_id is set by middleware on every request (1y cookie). Always
  -- present, even for logged-in users — so a single browser session is
  -- traceable end-to-end including the moment they auth'd in.
  anon_id text not null,
  -- user_id starts null for anonymous events. When the user later
  -- completes Telegram auth, we run an UPDATE to backfill it on every
  -- event with their anon_id — that's the stitch.
  user_id uuid references users(id),
  event_type text not null,
  -- Free-form per-event payload. Examples:
  --   listing_card_click  → { listing_id, listing_slug, source }
  --   search_run          → { page, filters, result_count }
  --   contact_button_click → { channel, source }
  properties jsonb not null default '{}'::jsonb,
  -- Request context — captured to make the per-visitor timeline
  -- readable without joining other tables.
  url text,
  referrer text,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index if not exists events_anon_id_idx on events(anon_id, occurred_at desc);
create index if not exists events_user_id_idx on events(user_id, occurred_at desc) where user_id is not null;
create index if not exists events_type_idx on events(event_type, occurred_at desc);

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  anon_id text,
  user_id uuid references users(id),
  -- Which list page this search was made on. 'novostroyki' for
  -- buildings, 'kvartiry' for listings — the matcher uses this to
  -- know which entity type to compare new rows against.
  page text not null,
  -- The URL search-params object as JSON. Same shape that the page
  -- already produces, so we can drive the matcher off it without a
  -- parse step. e.g. { rooms: ['1','2'], priceTo: '20000000', ... }.
  filters jsonb not null default '{}'::jsonb,
  -- Auto-generated readable name like "1-комн до 200к TJS · Гулистон".
  -- Built once on insert; user can rename later from /kabinet.
  display_name text not null,
  -- Notification destination — exactly one is set after subscribe
  -- completes. Both null = saved as a draft (intent visible to
  -- founder analytics) but no alerts will fire.
  notify_chat_id bigint,
  notify_phone varchar(20),
  -- Last listing id we successfully notified for this search. Used to
  -- avoid re-sending the same listing if the matcher runs again.
  last_seen_listing_id uuid references listings(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Either anon_id or user_id must identify the owner.
  constraint saved_searches_owner_check
    check (anon_id is not null or user_id is not null),
  -- Telegram OR phone, never both (or neither at subscribe time —
  -- but allow both null while the row is still a draft).
  constraint saved_searches_one_channel
    check (notify_chat_id is null or notify_phone is null)
);

create index if not exists saved_searches_anon_idx on saved_searches(anon_id) where anon_id is not null;
create index if not exists saved_searches_user_idx on saved_searches(user_id) where user_id is not null;
create index if not exists saved_searches_active_idx on saved_searches(active) where active = true;

-- A short-lived token table for the Telegram bot deep-link subscribe
-- flow. Visitor clicks "Подписаться через Telegram" → we insert a row
-- here → they tap the deep-link → /start subscribe_<token> in the bot
-- looks up this row and writes the chat_id back to saved_searches.
-- Mirrors auth_sessions in shape; expires fast (15 min) because the
-- whole flow takes seconds in practice.
create table if not exists subscribe_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  saved_search_id uuid not null references saved_searches(id) on delete cascade,
  status text not null default 'pending', -- 'pending' | 'completed' | 'expired'
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  completed_at timestamptz
);

create index if not exists subscribe_sessions_token_idx on subscribe_sessions(token);
