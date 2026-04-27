-- ============================================================
-- Migration 0001: Enums and extensions
-- Implements Data Model v2 §3 (Enum catalog).
-- ============================================================

-- Extensions per Tech Spec §2 (no pg_cron — handled in app code)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";       -- Tajik full-text search
-- PostGIS deferred — we use B-tree on (latitude, longitude) for V1.

-- §3.1 user_role
create type user_role as enum ('buyer', 'seller', 'staff', 'admin');

-- §3.2 source_type
create type source_type as enum ('developer', 'owner', 'intermediary');

-- §3.3 verification_tier
create type verification_tier as enum (
  'phone_verified',
  'profile_verified',
  'listing_verified'
);

-- §3.4 finishing_type
create type finishing_type as enum (
  'no_finish',
  'pre_finish',
  'full_finish',
  'owner_renovated'
);

-- §3.5 listing_status
create type listing_status as enum (
  'draft',
  'pending_review',
  'active',
  'hidden',
  'sold',
  'expired',
  'rejected'
);

-- §3.6 building_status
create type building_status as enum (
  'announced',
  'under_construction',
  'near_completion',
  'delivered'
);

-- §3.7 developer_status
create type developer_status as enum ('pending', 'active', 'suspended');

-- §3.8 contact_request_status
create type contact_request_status as enum (
  'new',
  'responded',
  'auto_no_response',
  'closed'
);

-- §3.9 change_event_type
create type change_event_type as enum (
  'price_changed',
  'status_changed',
  'new_unit_added',
  'construction_photo_added',
  'seller_slow_response'
);

-- §3.10 photo_kind
create type photo_kind as enum (
  'building_exterior',
  'building_interior',
  'building_amenity',
  'unit_living',
  'unit_bedroom',
  'unit_kitchen',
  'unit_bathroom',
  'unit_view',
  'unit_floor_plan',
  'progress',
  'other'
);

-- §3.11 contact_channel_preference
create type contact_channel_preference as enum (
  'whatsapp',
  'call',
  'imo',
  'telegram',
  'visit'
);

-- §3.12 purchase_timeline
create type purchase_timeline as enum (
  'now',
  'three_months',
  'six_months',
  'twelve_plus_months'
);

-- §3.13 language_code
create type language_code as enum ('ru', 'tg');

-- §3.15 notification_type (added per UI Spec Page 13 §13.4)
create type notification_type as enum (
  'contact_request_received',
  'visit_request_received',
  'listing_expiring_soon',
  'listing_expired',
  'verification_approved',
  'verification_rejected',
  'verification_visit_scheduled',
  'verification_expiring_soon',
  'developer_account_confirmed',
  'slow_response_warning'
);

-- §3.5 verification_visit status (used inside verification_visits)
create type verification_visit_status as enum (
  'requested',
  'scheduled',
  'completed',
  'rejected',
  'cancelled',
  'no_show'
);

-- Account status enum (used inside users)
create type account_status as enum ('active', 'suspended', 'deleted');
-- ============================================================
-- Migration 0002: Users, user_roles, developers, districts
-- Implements Data Model v2 §5.1, §5.2, §5.3, §5.13
-- ============================================================

-- §5.1 users
create table users (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) not null,
  name varchar(200),
  preferred_language language_code not null default 'ru',
  is_diaspora boolean not null default false,
  has_female_agent boolean not null default false,
  phone_verified_at timestamptz,
  profile_verified_at timestamptz,
  profile_verified_by uuid references users(id),
  account_status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_phone_unique on users(phone);
create index users_phone_verified_at_idx on users(phone_verified_at);
create index users_account_status_idx on users(account_status);

-- §5.2 user_roles
create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references users(id),
  primary key (user_id, role)
);

create index user_roles_role_idx on user_roles(role);

-- §5.13 districts (referenced by buildings — created here for FK ordering)
create table districts (
  id uuid primary key default gen_random_uuid(),
  city varchar(50) not null,
  name jsonb not null,                          -- {"ru": "...", "tg": "..."}
  slug varchar(100) not null,
  center_latitude double precision,
  center_longitude double precision,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index districts_slug_unique on districts(slug);
create index districts_city_idx on districts(city);

-- §5.3 developers
create table developers (
  id uuid primary key default gen_random_uuid(),
  name varchar(300) not null,
  display_name jsonb not null,                  -- {"ru": "...", "tg": "..."}
  primary_contact_phone varchar(20) not null,
  primary_contact_whatsapp varchar(20),
  office_address jsonb,
  description jsonb,
  years_active int,
  projects_completed_count int,
  has_female_agent boolean not null default false,
  logo_photo_id uuid,                           -- FK added in 0003 after photos table
  status developer_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index developers_status_idx on developers(status);
create index developers_verified_at_idx on developers(verified_at);
-- ============================================================
-- Migration 0003: Buildings, listings, photos
-- Implements Data Model v2 §5.4, §5.5, §5.6
-- ============================================================

-- §5.4 buildings
create table buildings (
  id uuid primary key default gen_random_uuid(),
  slug varchar(200) not null,
  developer_id uuid not null references developers(id),
  district_id uuid not null references districts(id),
  city varchar(50) not null,
  name jsonb not null,                           -- {"ru":"...","tg":"..."}
  address jsonb not null,
  latitude double precision not null,
  longitude double precision not null,
  description jsonb,
  status building_status not null default 'announced',
  handover_estimated_quarter varchar(7),         -- e.g., "2026-Q4"
  total_units int,
  total_floors int,
  amenities jsonb,                               -- ["parking","playground", ...]
  is_published boolean not null default false,
  is_featured boolean not null default false,
  featured_rank int,
  -- Denormalized fields (computed via triggers per §6)
  price_from_dirams bigint,
  price_per_m2_from_dirams bigint,
  last_inventory_refresh_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index buildings_slug_unique on buildings(slug);
create index buildings_developer_idx on buildings(developer_id);
create index buildings_district_idx on buildings(district_id);
create index buildings_status_idx on buildings(status);
create index buildings_is_published_idx on buildings(is_published);
create index buildings_featured_idx on buildings(is_featured, featured_rank);
create index buildings_search_idx on buildings(city, district_id, status, is_published);
-- B-tree index on lat/lng — sufficient for the bbox queries in the map view.
-- Upgrade to a PostGIS GIST index in a later migration when traffic justifies it.
create index buildings_geo_idx on buildings(latitude, longitude);

-- §5.5 listings
create table listings (
  id uuid primary key default gen_random_uuid(),
  slug varchar(200) not null,
  building_id uuid not null references buildings(id),
  seller_user_id uuid not null references users(id),
  source_type source_type not null,
  status listing_status not null default 'draft',
  rooms_count int not null,
  size_m2 numeric(6, 2) not null,
  floor_number int not null,
  total_floors int,
  building_block varchar(10),
  unit_number_internal varchar(20),
  price_total_dirams bigint not null,
  price_per_m2_dirams bigint generated always as (
    (price_total_dirams / size_m2)::bigint
  ) stored,
  finishing_type finishing_type not null,
  installment_available boolean not null default false,
  installment_first_payment_percent int,
  installment_monthly_amount_dirams bigint,
  installment_term_months int,
  handover_estimated_quarter varchar(7),
  unit_description jsonb,
  bathroom_count int,
  balcony boolean,
  ceiling_height_cm int,
  orientation varchar(20),
  view_notes jsonb,
  floor_plan_photo_id uuid,
  cover_photo_id uuid,
  verification_tier verification_tier not null default 'phone_verified',
  listing_verified_at timestamptz,
  listing_verified_expires_at timestamptz,
  listing_verified_by uuid references users(id),
  posted_on_behalf_owner_phone varchar(20),
  posted_on_behalf_owner_confirmed_at timestamptz,
  special_offer_text jsonb,
  published_at timestamptz,
  last_activity_at timestamptz not null default now(),
  view_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Invariants per §5.5
  constraint listings_size_positive check (size_m2 > 0),
  constraint listings_price_positive check (price_total_dirams > 0),
  constraint listings_rooms_min check (rooms_count >= 1),
  constraint listings_owner_renovated_only_resale check (
    finishing_type <> 'owner_renovated' or source_type in ('owner', 'intermediary')
  )
);

create unique index listings_slug_unique on listings(slug);
create index listings_building_idx on listings(building_id);
create index listings_seller_idx on listings(seller_user_id);
create index listings_source_idx on listings(source_type);
create index listings_tier_idx on listings(verification_tier);
create index listings_status_idx on listings(status);
create index listings_published_idx on listings(published_at desc) where status = 'active';
-- Fraud dedup: building + floor + unit_number
create unique index listings_unit_dedup on listings(building_id, floor_number, unit_number_internal)
  where status in ('active', 'pending_review') and unit_number_internal is not null;

-- §5.6 photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,                    -- Supabase storage path
  building_id uuid references buildings(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  developer_id uuid references developers(id) on delete cascade,
  kind photo_kind not null,
  width int not null,
  height int not null,
  file_size_bytes int not null,
  caption jsonb,
  taken_at timestamptz,
  display_order int not null default 0,
  perceptual_hash varchar(100),                  -- imghash output for dedup
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now(),
  -- One of building/listing/developer must be set
  constraint photos_owner_check check (
    num_nonnulls(building_id, listing_id, developer_id) >= 1
  )
);

create index photos_building_idx on photos(building_id, display_order) where building_id is not null;
create index photos_listing_idx on photos(listing_id, display_order) where listing_id is not null;
create index photos_developer_idx on photos(developer_id) where developer_id is not null;
create index photos_perceptual_hash_idx on photos(perceptual_hash) where perceptual_hash is not null;
create index photos_kind_idx on photos(kind);

-- Now add the FK references that needed photos to exist
alter table developers add constraint developers_logo_fk
  foreign key (logo_photo_id) references photos(id);
alter table listings add constraint listings_floor_plan_photo_fk
  foreign key (floor_plan_photo_id) references photos(id);
alter table listings add constraint listings_cover_photo_fk
  foreign key (cover_photo_id) references photos(id);
-- ============================================================
-- Migration 0004: Buyer-facing tables
-- saved_items, contact_requests, change_events
-- Implements Data Model v2 §5.7, §5.8, §5.9
-- ============================================================

-- §5.7 saved_items
create table saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,  -- §10: registration required to save
  building_id uuid references buildings(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  saved_at timestamptz not null default now(),
  change_badges_seen_at timestamptz,
  notes text,                                    -- buyer's private note
  -- Exactly one of building_id / listing_id is set
  constraint saved_items_one_target check (
    num_nonnulls(building_id, listing_id) = 1
  )
);

create index saved_items_user_idx on saved_items(user_id, saved_at desc);
create index saved_items_building_idx on saved_items(building_id) where building_id is not null;
create index saved_items_listing_idx on saved_items(listing_id) where listing_id is not null;
create unique index saved_items_user_building_unique on saved_items(user_id, building_id)
  where building_id is not null;
create unique index saved_items_user_listing_unique on saved_items(user_id, listing_id)
  where listing_id is not null;

-- §5.8 contact_requests
create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  buyer_user_id uuid references users(id),       -- null if anon WhatsApp click was tracked
  buyer_phone varchar(20),                       -- captured even if not registered
  buyer_name varchar(200),
  channel contact_channel_preference not null,
  message_text text,
  visit_requested_for date,
  prefer_female_agent boolean not null default false,
  status contact_request_status not null default 'new',
  responded_at timestamptz,
  buyer_country_code varchar(5),                 -- e.g., 'TJ', 'RU'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_requests_listing_idx on contact_requests(listing_id, created_at desc);
create index contact_requests_buyer_idx on contact_requests(buyer_user_id) where buyer_user_id is not null;
create index contact_requests_status_idx on contact_requests(status);
create index contact_requests_pending_idx on contact_requests(created_at)
  where status = 'new';

-- §5.9 change_events
create table change_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  building_id uuid references buildings(id) on delete cascade,
  type change_event_type not null,
  payload jsonb not null default '{}'::jsonb,    -- old/new prices, status transitions
  created_at timestamptz not null default now(),
  constraint change_events_one_target check (
    num_nonnulls(listing_id, building_id) = 1
  )
);

create index change_events_listing_idx on change_events(listing_id, created_at desc) where listing_id is not null;
create index change_events_building_idx on change_events(building_id, created_at desc) where building_id is not null;
create index change_events_type_idx on change_events(type);
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
-- ============================================================
-- Migration 0007: Row-Level Security policies
-- Per Tech Spec §11 — RLS does the auth work at the row level.
-- ============================================================

-- Helper: check current user has staff/admin role
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- ─── users: read self, staff reads all ────────────────────────
alter table users enable row level security;
create policy users_select_self on users for select
  using (auth.uid() = id or is_staff());
create policy users_update_self on users for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ─── user_roles: read self, manage by staff ───────────────────
alter table user_roles enable row level security;
create policy user_roles_select_self on user_roles for select
  using (user_id = auth.uid() or is_staff());
create policy user_roles_admin_only on user_roles for all
  using (is_staff()) with check (is_staff());

-- ─── developers: public read of active, staff manages ─────────
alter table developers enable row level security;
create policy developers_public_read on developers for select using (true);
create policy developers_staff_write on developers for all
  using (is_staff()) with check (is_staff());

-- ─── districts: public read ───────────────────────────────────
alter table districts enable row level security;
create policy districts_public_read on districts for select using (true);
create policy districts_staff_write on districts for all
  using (is_staff()) with check (is_staff());

-- ─── buildings: public read of published, staff manages ───────
alter table buildings enable row level security;
create policy buildings_public_read on buildings for select
  using (is_published = true or is_staff());
create policy buildings_staff_write on buildings for all
  using (is_staff()) with check (is_staff());

-- ─── listings: public read of active; sellers manage own ──────
alter table listings enable row level security;
create policy listings_public_read on listings for select
  using (
    status = 'active'
    or seller_user_id = auth.uid()
    or is_staff()
  );
create policy listings_seller_insert on listings for insert
  with check (seller_user_id = auth.uid());
create policy listings_seller_update on listings for update
  using (seller_user_id = auth.uid() or is_staff())
  with check (seller_user_id = auth.uid() or is_staff());
create policy listings_seller_delete on listings for delete
  using (seller_user_id = auth.uid() or is_staff());

-- ─── photos: read with parent, write for owners ───────────────
alter table photos enable row level security;
create policy photos_public_read on photos for select using (true);
create policy photos_owner_write on photos for all
  using (
    uploaded_by = auth.uid() or is_staff()
  ) with check (
    uploaded_by = auth.uid() or is_staff()
  );

-- ─── saved_items: read/write own only ─────────────────────────
alter table saved_items enable row level security;
create policy saved_items_own_only on saved_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── contact_requests: buyer reads own, seller reads for own listings ─
alter table contact_requests enable row level security;
create policy contact_requests_buyer_read on contact_requests for select
  using (
    buyer_user_id = auth.uid()
    or exists (
      select 1 from listings
      where listings.id = contact_requests.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );
create policy contact_requests_buyer_insert on contact_requests for insert
  with check (
    buyer_user_id = auth.uid() or buyer_user_id is null
  );
create policy contact_requests_seller_update on contact_requests for update
  using (
    exists (
      select 1 from listings
      where listings.id = contact_requests.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );

-- ─── change_events: public read ───────────────────────────────
alter table change_events enable row level security;
create policy change_events_public_read on change_events for select using (true);
create policy change_events_system_write on change_events for all
  using (is_staff()) with check (is_staff());

-- ─── verification_submissions: own only, staff reviews ────────
alter table verification_submissions enable row level security;
create policy verification_submissions_own on verification_submissions for select
  using (user_id = auth.uid() or is_staff());
create policy verification_submissions_own_insert on verification_submissions for insert
  with check (user_id = auth.uid());
create policy verification_submissions_staff_update on verification_submissions for update
  using (is_staff()) with check (is_staff());

-- ─── verification_visits: own listing's seller + staff ────────
alter table verification_visits enable row level security;
create policy verification_visits_own on verification_visits for select
  using (
    requested_by_user_id = auth.uid()
    or exists (
      select 1 from listings
      where listings.id = verification_visits.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );
create policy verification_visits_seller_insert on verification_visits for insert
  with check (requested_by_user_id = auth.uid());
create policy verification_visits_staff_update on verification_visits for update
  using (is_staff()) with check (is_staff());

-- ─── verification_slots: bookable visible to all ──────────────
alter table verification_slots enable row level security;
create policy verification_slots_public_read on verification_slots for select
  using (
    is_open = true and starts_at > now() and booked_count < capacity
  );
create policy verification_slots_staff_write on verification_slots for all
  using (is_staff()) with check (is_staff());

-- ─── fraud_reports: own + staff reads, anyone with auth inserts ─
alter table fraud_reports enable row level security;
create policy fraud_reports_own_read on fraud_reports for select
  using (user_id = auth.uid() or is_staff());
create policy fraud_reports_insert on fraud_reports for insert
  with check (user_id = auth.uid() or user_id is null);
create policy fraud_reports_staff_update on fraud_reports for update
  using (is_staff()) with check (is_staff());

-- ─── district_price_benchmarks: public read ───────────────────
alter table district_price_benchmarks enable row level security;
create policy benchmarks_public_read on district_price_benchmarks for select using (true);

-- ─── phone_verifications: server-only (no client policy = no access) ─
alter table phone_verifications enable row level security;
-- intentionally no policies; service role only

-- ─── notifications: own only, system inserts via service role ─
alter table notifications enable row level security;
create policy notifications_own_read on notifications for select
  using (user_id = auth.uid());
create policy notifications_own_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on notifications for delete
  using (user_id = auth.uid());
-- inserts: no client policy; service role only
