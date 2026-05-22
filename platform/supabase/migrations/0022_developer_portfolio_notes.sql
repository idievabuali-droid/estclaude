-- ============================================================
-- Migration 0022: developers.portfolio_notes
--
-- Free-form text column for the developer's CURRENT in-progress work
-- (the "В работе 4: 1 котлован, 2 строится, 1 почти готов" answer
-- the intake bot already collects). The auto-computed devStats grid
-- on /zhk only counts projects published on Vafo; this captures the
-- developer's full portfolio context including off-platform work.
--
-- Nullable on purpose — older developer rows + minimal NewDeveloperModal
-- entries leave it blank. Rendered on /zhk/[slug] §G developer card
-- as a quiet paragraph under the verification block when set.
-- ============================================================

alter table developers add column portfolio_notes text;
