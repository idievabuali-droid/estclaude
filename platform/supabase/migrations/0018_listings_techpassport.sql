-- ============================================================
-- Migration 0018: has_technical_passport boolean on listings
--
-- Tajik buyers ask early in the conversation "есть техпаспорт?" —
-- whether the apartment has a registered technical passport
-- (cadastre document). For new-build off-plan units the answer is
-- usually "not yet" (issued at handover); for resale and ready
-- units it's the strongest pre-deal trust signal a seller can
-- offer. Surfacing it on the listing card / detail saves a round-
-- trip in WhatsApp.
--
-- Three states:
--   NULL  → not specified (legacy listings + sellers who skip)
--   TRUE  → есть техпаспорт
--   FALSE → нет техпаспорта (or "выдадут при сдаче")
--
-- We chose a nullable boolean rather than a 3-value enum because
-- the form already uses the same shape for `bathroom_separate`
-- (migration 0011) — keeps the mental model consistent and avoids
-- a one-off enum that adds zero value.
-- ============================================================

alter table listings
  add column has_technical_passport boolean;
