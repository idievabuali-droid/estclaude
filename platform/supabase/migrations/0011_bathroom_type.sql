-- ============================================================
-- Migration 0011: bathroom_separate boolean on listings
--
-- The Tajik market only cares whether the bathroom is СОВМЕЩЁННЫЙ
-- (toilet + bath in one room) or РАЗДЕЛЬНЫЙ (toilet separate from
-- bathroom). Number of bathrooms is rarely above 1 in apartments
-- here, so the existing `bathroom_count` column over-models the
-- common case. We keep that column for any future need but capture
-- the type as a separate boolean that sellers can fill quickly.
--
-- NULL = not specified (legacy listings + sellers who skip the field).
-- TRUE = раздельный (separate)
-- FALSE = совмещённый (combined)
-- ============================================================

alter table listings
  add column bathroom_separate boolean;
