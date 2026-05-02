-- ============================================================
-- Migration 0010: Lock down auth_sessions + user_sessions
--
-- These tables hold sensitive identity material:
--   - auth_sessions.token = the QR/deep-link payload that, if known,
--     lets anyone complete the login flow as the original user.
--   - user_sessions.id = the cookie value that proves a logged-in
--     user. Possession = full account takeover.
--
-- Both tables were created without RLS in 0008/0009 — anyone with
-- the public anon key could query them via the Supabase REST API
-- and steal credentials.
--
-- Fix: enable RLS with NO policies. That denies every read/write
-- from anon + authenticated roles. Our server-side code uses the
-- service-role key (createAdminClient) which bypasses RLS, so the
-- legitimate auth flow keeps working — only public REST access is
-- blocked.
-- ============================================================

alter table auth_sessions enable row level security;
alter table user_sessions enable row level security;

-- No policies = effective default-deny for anon/authenticated. The
-- service-role key bypasses RLS so server-side code is unaffected.
