-- ============================================================
-- Migration 0014: transfer all existing listings to the founder
--
-- V1 publishing model is founder-only — non-founders no longer post
-- through the self-serve form. The user has confirmed that all the
-- pre-existing test listings under "non-founder" phone numbers are
-- actually theirs (testing accounts), so we move ownership of every
-- listing to the founder so they all show up under one /kabinet.
--
-- Idempotent: re-running this is a no-op (everything already points
-- at the founder). Safe to apply multiple times.
--
-- Founder lookup: we pick any user_id with role 'admin' from
-- user_roles. There should only be one in V1; if there are several
-- we take the lowest user_id by lexical order so the choice is
-- deterministic across re-runs.
-- ============================================================

do $$
declare
  founder_id uuid;
begin
  select user_id
    into founder_id
    from user_roles
    where role = 'admin'
    order by user_id asc
    limit 1;

  if founder_id is null then
    raise notice 'No admin role found in user_roles — skipping listing transfer.';
    return;
  end if;

  -- Transfer ownership. We keep `deleted_at` rows alone (no point
  -- moving tombstoned data) and skip drafts (those belong to whoever
  -- started them — drafts are user-private state). Active, pending,
  -- hidden, sold, expired, and rejected all move.
  update listings
    set seller_user_id = founder_id
    where seller_user_id <> founder_id
      and deleted_at is null
      and status in ('active', 'pending_review', 'hidden', 'sold', 'expired', 'rejected');
end $$;
