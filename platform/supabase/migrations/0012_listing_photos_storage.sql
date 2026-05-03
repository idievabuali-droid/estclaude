-- ============================================================
-- Migration 0012: listing-photos storage bucket
--
-- Creates the bucket and RLS policies that let the admin (service-
-- role) client upload photos and the public read them. We never let
-- the anon key write directly — uploads always flow through our
-- /api/storage/upload route which auth-checks the user first.
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('listing-photos', 'listing-photos', true)
  on conflict (id) do nothing;

-- Public read: every uploaded photo is meant to be visible on the
-- public listing pages, so we don't need signed URLs.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'public_read_listing_photos'
  ) then
    create policy "public_read_listing_photos" on storage.objects
      for select using (bucket_id = 'listing-photos');
  end if;
end $$;

-- Service-role write: only our backend can write. The /api/storage/
-- upload route checks getCurrentUser() before forwarding to the
-- admin client, so this policy effectively means "authenticated
-- through our app".
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'service_role_write_listing_photos'
  ) then
    create policy "service_role_write_listing_photos" on storage.objects
      for all
      using (bucket_id = 'listing-photos' and auth.role() = 'service_role')
      with check (bucket_id = 'listing-photos' and auth.role() = 'service_role');
  end if;
end $$;
