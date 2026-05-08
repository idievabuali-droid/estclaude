-- ============================================================
-- Migration 0019: Standalone apartments — listings without ЖК
--
-- Until now `listings.building_id` was NOT NULL, modelling every
-- listing as living inside a ЖК. That excludes a real chunk of the
-- Vahdat market: older second-hand apartments where the seller
-- doesn't know the developer / construction year / official ЖК
-- name. Mature classifieds (Cian, Avito, Bayut, Domain, Rightmove)
-- treat listings as independent address-anchored entities; project
-- / "ЖК" is optional metadata that groups some of them. This
-- migration aligns our schema with that convention.
--
-- Standalone listings (`building_id IS NULL`) carry their own
-- address / district / coords / structural fields. Listings inside
-- a ЖК continue to read these from the parent building. Display
-- code branches on `building_id IS NULL`.
-- ============================================================

-- 1. Drop the NOT NULL constraint on building_id. The FK reference
--    stays (when set, must point to a real building).
alter table listings
  alter column building_id drop not null;

-- 2. Address line for standalone listings. Free text — sellers
--    rarely have postal-code-precise addresses in TJ, and locals
--    use landmark-based descriptions ("дом 14 на ул. Айни,
--    напротив базара"). Stored as-typed; the map pin is the
--    machine-readable source of truth.
alter table listings
  add column street_address text;

-- 3. Direct district FK so standalones still group under a known
--    Vahdat district (the platform's master geographic axis).
--    Listings inside a ЖК continue to inherit district from the
--    parent building — this column stays NULL for them.
alter table listings
  add column district_id uuid references districts(id);

-- 4. Coordinates — for the per-listing map pin. NULL when the
--    seller skipped the pin step (rare but possible).
alter table listings
  add column latitude numeric(9, 6);
alter table listings
  add column longitude numeric(9, 6);

-- 5. Structural fields that today live on `buildings`. Surfacing
--    them on standalone listings lets buyers see "5-этажный дом,
--    лифт есть, 2003 года" without us synthesizing a fake ЖК.
--
--    Tri-state nullable booleans match the bathroom_separate /
--    has_technical_passport conventions established in 0011 + 0018.
alter table listings
  add column has_elevator boolean;
alter table listings
  add column year_built int;

-- 6. Sanity invariant — at minimum we always know the listing's
--    district. Either it inherits from a building (building_id is
--    set) or it's a standalone with district_id explicitly set.
--    Anything else would float without a geographic anchor and
--    silently disappear from the city/district filters.
alter table listings
  add constraint listings_standalone_or_in_building check (
    building_id is not null or district_id is not null
  );

-- 7. Year-built sanity (1800–2100). Catches typos like "20" or
--    "2050" — defensive, not exhaustive. App-level validation does
--    the friendlier "must be between X and current year" message.
alter table listings
  add constraint listings_year_built_sane check (
    year_built is null or (year_built between 1800 and 2100)
  );

-- 8. Index on district_id for the public-list query path. Without
--    this, /kvartiry's district filter becomes a seq-scan once
--    standalone-listing volume grows past trivial.
create index if not exists listings_district_idx on listings(district_id);
