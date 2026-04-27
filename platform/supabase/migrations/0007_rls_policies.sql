-- ============================================================
-- Migration 0007: Row-Level Security policies
-- Per Tech Spec §11 — RLS does the auth work at the row level.
-- ============================================================

-- Helper: check current user has staff/admin role
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- ─── users: read self, staff reads all ────────────────────────
alter table users enable row level security;
create policy users_select_self on users for select
  using (auth.uid() = id or is_staff());
create policy users_update_self on users for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ─── user_roles: read self, manage by staff ───────────────────
alter table user_roles enable row level security;
create policy user_roles_select_self on user_roles for select
  using (user_id = auth.uid() or is_staff());
create policy user_roles_admin_only on user_roles for all
  using (is_staff()) with check (is_staff());

-- ─── developers: public read of active, staff manages ─────────
alter table developers enable row level security;
create policy developers_public_read on developers for select using (true);
create policy developers_staff_write on developers for all
  using (is_staff()) with check (is_staff());

-- ─── districts: public read ───────────────────────────────────
alter table districts enable row level security;
create policy districts_public_read on districts for select using (true);
create policy districts_staff_write on districts for all
  using (is_staff()) with check (is_staff());

-- ─── buildings: public read of published, staff manages ───────
alter table buildings enable row level security;
create policy buildings_public_read on buildings for select
  using (is_published = true or is_staff());
create policy buildings_staff_write on buildings for all
  using (is_staff()) with check (is_staff());

-- ─── listings: public read of active; sellers manage own ──────
alter table listings enable row level security;
create policy listings_public_read on listings for select
  using (
    status = 'active'
    or seller_user_id = auth.uid()
    or is_staff()
  );
create policy listings_seller_insert on listings for insert
  with check (seller_user_id = auth.uid());
create policy listings_seller_update on listings for update
  using (seller_user_id = auth.uid() or is_staff())
  with check (seller_user_id = auth.uid() or is_staff());
create policy listings_seller_delete on listings for delete
  using (seller_user_id = auth.uid() or is_staff());

-- ─── photos: read with parent, write for owners ───────────────
alter table photos enable row level security;
create policy photos_public_read on photos for select using (true);
create policy photos_owner_write on photos for all
  using (
    uploaded_by = auth.uid() or is_staff()
  ) with check (
    uploaded_by = auth.uid() or is_staff()
  );

-- ─── saved_items: read/write own only ─────────────────────────
alter table saved_items enable row level security;
create policy saved_items_own_only on saved_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── contact_requests: buyer reads own, seller reads for own listings ─
alter table contact_requests enable row level security;
create policy contact_requests_buyer_read on contact_requests for select
  using (
    buyer_user_id = auth.uid()
    or exists (
      select 1 from listings
      where listings.id = contact_requests.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );
create policy contact_requests_buyer_insert on contact_requests for insert
  with check (
    buyer_user_id = auth.uid() or buyer_user_id is null
  );
create policy contact_requests_seller_update on contact_requests for update
  using (
    exists (
      select 1 from listings
      where listings.id = contact_requests.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );

-- ─── change_events: public read ───────────────────────────────
alter table change_events enable row level security;
create policy change_events_public_read on change_events for select using (true);
create policy change_events_system_write on change_events for all
  using (is_staff()) with check (is_staff());

-- ─── verification_submissions: own only, staff reviews ────────
alter table verification_submissions enable row level security;
create policy verification_submissions_own on verification_submissions for select
  using (user_id = auth.uid() or is_staff());
create policy verification_submissions_own_insert on verification_submissions for insert
  with check (user_id = auth.uid());
create policy verification_submissions_staff_update on verification_submissions for update
  using (is_staff()) with check (is_staff());

-- ─── verification_visits: own listing's seller + staff ────────
alter table verification_visits enable row level security;
create policy verification_visits_own on verification_visits for select
  using (
    requested_by_user_id = auth.uid()
    or exists (
      select 1 from listings
      where listings.id = verification_visits.listing_id
        and listings.seller_user_id = auth.uid()
    )
    or is_staff()
  );
create policy verification_visits_seller_insert on verification_visits for insert
  with check (requested_by_user_id = auth.uid());
create policy verification_visits_staff_update on verification_visits for update
  using (is_staff()) with check (is_staff());

-- ─── verification_slots: bookable visible to all ──────────────
alter table verification_slots enable row level security;
create policy verification_slots_public_read on verification_slots for select
  using (
    is_open = true and starts_at > now() and booked_count < capacity
  );
create policy verification_slots_staff_write on verification_slots for all
  using (is_staff()) with check (is_staff());

-- ─── fraud_reports: own + staff reads, anyone with auth inserts ─
alter table fraud_reports enable row level security;
create policy fraud_reports_own_read on fraud_reports for select
  using (user_id = auth.uid() or is_staff());
create policy fraud_reports_insert on fraud_reports for insert
  with check (user_id = auth.uid() or user_id is null);
create policy fraud_reports_staff_update on fraud_reports for update
  using (is_staff()) with check (is_staff());

-- ─── district_price_benchmarks: public read ───────────────────
alter table district_price_benchmarks enable row level security;
create policy benchmarks_public_read on district_price_benchmarks for select using (true);

-- ─── phone_verifications: server-only (no client policy = no access) ─
alter table phone_verifications enable row level security;
-- intentionally no policies; service role only

-- ─── notifications: own only, system inserts via service role ─
alter table notifications enable row level security;
create policy notifications_own_read on notifications for select
  using (user_id = auth.uid());
create policy notifications_own_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on notifications for delete
  using (user_id = auth.uid());
-- inserts: no client policy; service role only
