-- ============================================================
-- Migration 0023: developers stage-bucketed portfolio counts
--
-- Replaces the free-text portfolio_notes (added 0022, kept but
-- unused) with three structured stage-bucket counts so the founder
-- can ENTER portfolio info via number-stepper selectors in the
-- building form, and /zhk can render the breakdown as a consistent
-- 4-cell grid instead of free text.
--
--   projects_announced_count       — "Котлован" (announced stage)
--   projects_under_construction_count — "Строится"
--   projects_near_completion_count  — "Почти готов"
--
-- "Сдано" stays on the existing projects_completed_count column
-- (added in 0002). Together the four columns describe the developer's
-- full portfolio breakdown across BuildingStatus enum values.
--
-- All nullable, default null. Founder enters them when picking a
-- developer in the building create / edit form; existing developer
-- rows without these counts render with the structured grid hidden
-- until set.
-- ============================================================

alter table developers add column projects_announced_count integer;
alter table developers add column projects_under_construction_count integer;
alter table developers add column projects_near_completion_count integer;
