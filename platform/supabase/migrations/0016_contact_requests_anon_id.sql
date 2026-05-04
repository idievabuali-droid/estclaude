-- ============================================================
-- Migration 0016: contact_requests.anon_id
--
-- Plumbs the visitor's anon_id cookie into contact_requests so
-- anonymous CallbackWidget submissions show up in the per-visitor
-- analytics drill-down. Without this, "Запросы обратной связи" can
-- only join via buyer_user_id — which is null for anonymous
-- visitors, breaking the "complete picture" goal of the dashboard.
-- ============================================================

alter table contact_requests
  add column if not exists anon_id text;

create index if not exists contact_requests_anon_id_idx
  on contact_requests(anon_id)
  where anon_id is not null;
