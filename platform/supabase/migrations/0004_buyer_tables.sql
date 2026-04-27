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
