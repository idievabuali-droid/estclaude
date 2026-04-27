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
