-- ============================================================
-- Migration 0021: intake_bot_sessions
--
-- Backend-only state for the developer-data-collection Telegram bot.
-- This bot is a SEPARATE bot from the @VafoTjBot login bot — it only
-- shares this deployment for hosting and has no link to the buyer
-- product. One row per Telegram chat holds an in-progress collection
-- session (the founder's answers + which message to edit next).
--
-- Nothing in the buyer-facing product reads or writes this table.
-- Accessed exclusively by /api/intake-bot via the service-role admin
-- client. RLS is enabled with no policies, so the anon / authenticated
-- roles get zero access; the service role bypasses RLS as usual.
-- ============================================================

create table intake_bot_sessions (
  chat_id bigint primary key,
  -- { [questionId]: string | string[] | { photoCount, text? } }
  answers jsonb not null default '{}'::jsonb,
  -- Question id the bot is currently waiting for a typed / photo
  -- answer to. NULL when the bot is idle on the menu.
  awaiting text,
  -- The current menu message + the open prompt message, so the
  -- stateless webhook can edit / delete them across invocations.
  menu_message_id bigint,
  prompt_message_id bigint,
  updated_at timestamptz not null default now()
);

alter table intake_bot_sessions enable row level security;
-- No policies on purpose: anon + authenticated get no access at all.
-- The bot uses the service-role client, which bypasses RLS.
