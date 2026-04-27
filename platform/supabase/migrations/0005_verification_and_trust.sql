-- ============================================================
-- Migration 0005: Verification, fraud reports, district benchmarks
-- Implements Data Model v2 §5.10, §5.11, §5.12, §5.14, §5.17
-- ============================================================

-- §5.10 verification_submissions (Tier 2)
create table verification_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  id_photo_storage_path text not null,
  selfie_photo_storage_path text not null,
  status varchar(20) not null default 'pending',  -- pending|approved|rejected
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  rejection_reason jsonb,                         -- bilingual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_submissions_user_idx on verification_submissions(user_id, created_at desc);
create index verification_submissions_status_idx on verification_submissions(status);

-- §5.17 verification_slots (added per UI Spec Page 14 §14.5)
-- Created BEFORE verification_visits because visits FK to slots.
create table verification_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 1,
  booked_count int not null default 0,
  is_open boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_slots_2h_window check (
    ends_at = starts_at + interval '2 hours'
  ),
  constraint verification_slots_capacity_check check (
    booked_count <= capacity
  )
);

create index verification_slots_window_idx on verification_slots(starts_at, is_open);

-- §5.11 verification_visits (Tier 3)
create table verification_visits (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  requested_by_user_id uuid not null references users(id),
  slot_id uuid references verification_slots(id),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz,
  status verification_visit_status not null default 'requested',
  visited_by_user_id uuid references users(id),
  visited_at timestamptz,
  outcome_notes jsonb,                            -- bilingual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_visits_listing_idx on verification_visits(listing_id, created_at desc);
create index verification_visits_status_idx on verification_visits(status);
create index verification_visits_slot_idx on verification_visits(slot_id) where slot_id is not null;

-- §5.12 fraud_reports
create table fraud_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  reporter_phone varchar(20),
  reason varchar(50) not null,                    -- 'duplicate_photos','wrong_price','already_sold','fake_listing','other'
  details text,
  status varchar(20) not null default 'open',     -- open|confirmed|dismissed
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index fraud_reports_listing_idx on fraud_reports(listing_id, created_at desc) where listing_id is not null;
create index fraud_reports_status_idx on fraud_reports(status);

-- §5.14 district_price_benchmarks
create table district_price_benchmarks (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts(id) on delete cascade,
  rooms_count int,                                -- null = all rooms aggregated
  finishing_type finishing_type,                  -- null = all finishing types
  sample_size int not null,
  median_price_per_m2_dirams bigint not null,
  computed_at timestamptz not null default now(),
  -- Per §5.14 / Architecture: hidden when sample_size < 5
  constraint benchmarks_sample_min check (sample_size >= 1)
);

-- Postgres 15+: NULLS NOT DISTINCT treats NULLs as equal so we can index
-- the columns directly without the enum::text cast (which is STABLE, not
-- IMMUTABLE, and so cannot be used in an index expression).
create unique index benchmarks_lookup_unique on district_price_benchmarks(
  district_id, rooms_count, finishing_type
) nulls not distinct;
create index benchmarks_computed_idx on district_price_benchmarks(computed_at desc);
