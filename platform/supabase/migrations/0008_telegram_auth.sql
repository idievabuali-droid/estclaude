-- ============================================================
-- Migration 0008: Telegram-based authentication + sessions
--
-- Adds the columns and tables needed for the Telegram bot auth flow:
--   1. tg_* identity fields on users (linked from a Share Contact tap
--      inside the bot)
--   2. auth_sessions — short-lived QR/deep-link tokens awaiting the
--      Telegram side of the handshake; the web tab polls these to
--      detect when the user has completed the bot interaction
--   3. user_sessions — long-lived web sessions; cookie value = id
--
-- Notification automation:
--   change_events.dispatched_at lets a periodic worker pick up unsent
--   events and message the affected users via Telegram, then mark them
--   dispatched so they're never sent twice.
-- ============================================================

-- ─── 1. Telegram identity on users ──────────────────────────
alter table users
  add column tg_user_id bigint,
  add column tg_chat_id bigint,
  add column tg_username varchar(100),
  add column tg_first_name varchar(100),
  add column notifications_enabled boolean not null default true,
  add column tg_linked_at timestamptz;

-- Telegram user_id is globally unique once set; null for users not
-- linked yet (legacy founder seed user, future SMS-only fallback).
create unique index users_tg_user_id_unique on users(tg_user_id) where tg_user_id is not null;
create index users_tg_chat_id_idx on users(tg_chat_id) where tg_chat_id is not null;

-- ─── 2. Pending auth sessions (QR / polling) ────────────────
-- One row per "Sign in with Telegram" click. Frontend polls by token
-- to know when the user has shared their phone via the bot.
create table auth_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Random URL-safe token shown in the QR / deep link
  token varchar(64) not null,
  -- Filled in when the bot side of the handshake completes
  user_id uuid references users(id) on delete cascade,
  status varchar(20) not null default 'pending',  -- pending | completed | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz
);

create unique index auth_sessions_token_unique on auth_sessions(token);
create index auth_sessions_status_expires_idx on auth_sessions(status, expires_at);

-- ─── 3. Logged-in user sessions (cookie = id) ───────────────
-- Standard rotating session pattern: cookie value is this row's UUID;
-- on every request we look up the session, verify not expired, get
-- user. Logout just deletes the row so the cookie becomes inert.
create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Light fingerprinting so admins can audit if a session looks weird;
  -- not used for auth decisions, just for visibility.
  user_agent varchar(500),
  ip_address inet
);

create index user_sessions_user_id_idx on user_sessions(user_id);
create index user_sessions_expires_at_idx on user_sessions(expires_at);

-- ─── 4. Notification dispatch tracking on change_events ─────
-- A change_event is "dispatched" once we've sent the corresponding
-- Telegram messages to all affected users. The notification worker
-- looks for rows where dispatched_at IS NULL and processes them.
alter table change_events
  add column dispatched_at timestamptz;

create index change_events_undispatched_idx on change_events(created_at) where dispatched_at is null;
