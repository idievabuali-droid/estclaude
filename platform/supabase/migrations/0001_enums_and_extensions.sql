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
