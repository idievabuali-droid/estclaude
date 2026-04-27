/**
 * Domain types matching Data Model v2 enums and key entities.
 * These mirror the Postgres enums in supabase/migrations/0001_initial.sql.
 *
 * Once Supabase is set up, run `supabase gen types typescript` to generate
 * the full Database type into types/supabase.ts. These domain types remain
 * the canonical hand-written TypeScript surface.
 */

// ─── §3.1 user_role ───────────────────────────────────────────
export type UserRole = 'buyer' | 'seller' | 'staff' | 'admin';

// ─── §3.2 source_type ─────────────────────────────────────────
export type SourceType = 'developer' | 'owner' | 'intermediary';

// ─── §3.3 verification_tier ───────────────────────────────────
export type VerificationTier = 'phone_verified' | 'profile_verified' | 'listing_verified';

// ─── §3.4 finishing_type ──────────────────────────────────────
export type FinishingType = 'no_finish' | 'pre_finish' | 'full_finish' | 'owner_renovated';

// ─── §3.5 listing_status ──────────────────────────────────────
export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'hidden'
  | 'sold'
  | 'expired'
  | 'rejected';

// ─── §3.6 building_status ─────────────────────────────────────
export type BuildingStatus =
  | 'announced'
  | 'under_construction'
  | 'near_completion'
  | 'delivered';

// ─── §3.7 developer_status ────────────────────────────────────
export type DeveloperStatus = 'pending' | 'active' | 'suspended';

// ─── §3.8 contact_request_status ──────────────────────────────
export type ContactRequestStatus = 'new' | 'responded' | 'auto_no_response' | 'closed';

// ─── §3.9 change_event_type ───────────────────────────────────
export type ChangeEventType =
  | 'price_changed'
  | 'status_changed'
  | 'new_unit_added'
  | 'construction_photo_added'
  | 'seller_slow_response';

// ─── §3.10 photo_kind ─────────────────────────────────────────
export type PhotoKind =
  | 'building_exterior'
  | 'building_interior'
  | 'building_amenity'
  | 'unit_living'
  | 'unit_bedroom'
  | 'unit_kitchen'
  | 'unit_bathroom'
  | 'unit_view'
  | 'unit_floor_plan'
  | 'progress'
  | 'other';

// ─── §3.11 contact_channel_preference ─────────────────────────
export type ContactChannelPreference = 'whatsapp' | 'call' | 'imo' | 'telegram' | 'visit';

// ─── §3.12 purchase_timeline ──────────────────────────────────
export type PurchaseTimeline = 'now' | 'three_months' | 'six_months' | 'twelve_plus_months';

// ─── §3.13 language_code ──────────────────────────────────────
export type LanguageCode = 'ru' | 'tg';

// ─── §3.15 notification_type ──────────────────────────────────
export type NotificationType =
  | 'contact_request_received'
  | 'visit_request_received'
  | 'listing_expiring_soon'
  | 'listing_expired'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_visit_scheduled'
  | 'verification_expiring_soon'
  | 'developer_account_confirmed'
  | 'slow_response_warning';

// ─── Bilingual JSONB shape ────────────────────────────────────
export type Bilingual = {
  ru: string;
  tg?: string;
};

// ─── Effective trust tier (Tech Spec §9.4 ranking) ────────────
export type EffectiveTrustTier =
  | 'verified_developer'
  | 'listing_verified'
  | 'profile_verified'
  | 'phone_verified';
