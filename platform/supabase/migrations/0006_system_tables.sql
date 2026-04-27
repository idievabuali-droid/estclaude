-- ============================================================
-- Migration 0006: System tables
-- phone_verifications (OTP), notifications
-- Implements Data Model v2 §5.15, §5.16
-- ============================================================

-- §5.15 phone_verifications
create table phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) not null,
  code_hash varchar(100) not null,                -- never plaintext
  attempts_count int not null default 0,
  verified_at timestamptz,
  expires_at timestamptz not null,                -- 10 minutes from creation
  voice_call_requested_at timestamptz,
  created_at timestamptz not null default now()
);

create index phone_verifications_phone_idx on phone_verifications(phone, created_at desc);
create index phone_verifications_expires_idx on phone_verifications(expires_at);

-- §5.16 notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index notifications_user_idx on notifications(user_id, created_at desc);
create index notifications_expires_idx on notifications(expires_at);
create index notifications_unread_idx on notifications(user_id) where read_at is null;
