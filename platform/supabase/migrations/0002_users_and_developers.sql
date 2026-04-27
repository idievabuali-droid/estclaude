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
