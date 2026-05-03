-- ============================================================
-- Migration 0013: buildings.cover_photo_id
--
-- Adds the cover photo reference to buildings. The combined schema
-- snapshot already had this field but the per-step migrations never
-- introduced it; without it /api/inventory/create's setCoverPhoto
-- step (and the building card / hero cover_photo_url) silently fail.
--
-- Also gives the FK a stable name so the PostgREST embed hint
-- `photos!buildings_cover_photo_fk` resolves correctly. The matching
-- constraint on listings (listings_cover_photo_fk) was named in 0003.
-- ============================================================

alter table buildings
  add column if not exists cover_photo_id uuid;

-- Named constraint so PostgREST embeds can disambiguate between
-- buildings.cover_photo_id → photos.id and photos.building_id →
-- buildings.id (the reverse FK from migration 0003).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'buildings_cover_photo_fk'
  ) then
    alter table buildings
      add constraint buildings_cover_photo_fk
      foreign key (cover_photo_id) references photos(id);
  end if;
end $$;
