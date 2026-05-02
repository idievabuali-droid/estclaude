-- ============================================================
-- Migration 0009: Persist Telegram chat_id on pending auth_sessions
-- so the bot remembers which session a chat is bound to across
-- serverless cold starts.
--
-- The previous version held the chat_id ↔ token mapping in an
-- in-memory Map inside the webhook handler. That works when the
-- same warm Lambda instance handles both /start and the subsequent
-- Share Contact, but cold starts (or serving on different region
-- instances) lose the mapping — the bot then can't tell which
-- auth_session the contact share completes.
--
-- Storing it on auth_sessions itself solves the problem and gives
-- us one source of truth for "this chat is mid-handshake".
-- ============================================================

alter table auth_sessions
  add column tg_chat_id bigint;

-- Lookup by chat_id (the webhook does this every message to know
-- whether the chat is mid-handshake and which token to complete).
create index auth_sessions_tg_chat_id_idx on auth_sessions(tg_chat_id) where tg_chat_id is not null;
