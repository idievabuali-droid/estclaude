/**
 * Hand-written Database type covering only the tables we currently query
 * from the application. Mirrors the SQL schema in supabase/migrations/.
 *
 * When we get a personal access token for the Supabase CLI we'll replace
 * this with `supabase gen types typescript --linked` output. Until then,
 * keep this in sync by hand when migrations land.
 */
import type {
  Bilingual,
  BuildingStatus,
  DeveloperStatus,
  FinishingType,
  ListingStatus,
  SourceType,
  VerificationTier,
} from './domain';

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type DistrictRow = {
  id: string;
  city: 'dushanbe' | 'vahdat';
  name: Bilingual;
  slug: string;
  center_latitude: number | null;
  center_longitude: number | null;
  display_order: number;
  created_at: string;
};

type DeveloperRow = {
  id: string;
  name: string;
  display_name: Bilingual;
  primary_contact_phone: string;
  primary_contact_whatsapp: string | null;
  office_address: Bilingual | null;
  description: Bilingual | null;
  years_active: number | null;
  projects_completed_count: number | null;
  has_female_agent: boolean;
  logo_photo_id: string | null;
  status: DeveloperStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

type BuildingRow = {
  id: string;
  slug: string;
  developer_id: string;
  district_id: string;
  city: 'dushanbe' | 'vahdat';
  name: Bilingual;
  address: Bilingual;
  latitude: number;
  longitude: number;
  description: Bilingual | null;
  status: BuildingStatus;
  handover_estimated_quarter: string | null;
  total_units: number | null;
  total_floors: number | null;
  amenities: string[] | null;
  is_published: boolean;
  is_featured: boolean;
  featured_rank: number | null;
  price_from_dirams: number | null;
  price_per_m2_from_dirams: number | null;
  last_inventory_refresh_at: string | null;
  created_at: string;
  updated_at: string;
};

type ListingRow = {
  id: string;
  slug: string;
  building_id: string;
  seller_user_id: string;
  source_type: SourceType;
  status: ListingStatus;
  rooms_count: number;
  size_m2: number;
  floor_number: number;
  total_floors: number | null;
  building_block: string | null;
  unit_number_internal: string | null;
  price_total_dirams: number;
  price_per_m2_dirams: number;
  finishing_type: FinishingType;
  installment_available: boolean;
  installment_first_payment_percent: number | null;
  installment_monthly_amount_dirams: number | null;
  installment_term_months: number | null;
  handover_estimated_quarter: string | null;
  unit_description: Bilingual | null;
  bathroom_count: number | null;
  balcony: boolean | null;
  ceiling_height_cm: number | null;
  orientation: string | null;
  view_notes: Bilingual | null;
  floor_plan_photo_id: string | null;
  cover_photo_id: string | null;
  verification_tier: VerificationTier;
  listing_verified_at: string | null;
  listing_verified_expires_at: string | null;
  listing_verified_by: string | null;
  posted_on_behalf_owner_phone: string | null;
  posted_on_behalf_owner_confirmed_at: string | null;
  special_offer_text: Bilingual | null;
  published_at: string | null;
  last_activity_at: string;
  view_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      districts: { Row: DistrictRow; Insert: Partial<DistrictRow>; Update: Partial<DistrictRow> };
      developers: { Row: DeveloperRow; Insert: Partial<DeveloperRow>; Update: Partial<DeveloperRow> };
      buildings: { Row: BuildingRow; Insert: Partial<BuildingRow>; Update: Partial<BuildingRow> };
      listings: { Row: ListingRow; Insert: Partial<ListingRow>; Update: Partial<ListingRow> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      source_type: SourceType;
      verification_tier: VerificationTier;
      finishing_type: FinishingType;
      listing_status: ListingStatus;
      building_status: BuildingStatus;
      developer_status: DeveloperStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
