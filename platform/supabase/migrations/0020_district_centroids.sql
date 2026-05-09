-- ============================================================
-- Migration 0020: backfill Vahdat district centroids
--
-- Discovered during the standalone-listing roleplay: every district
-- in the `districts` table had NULL center_latitude / center_longitude.
-- post/page.tsx fell back to the Vahdat town-centre constant for ALL
-- five rows, which collapsed nearestDistrictId() into "always returns
-- districts[0] (Центр)" — the seller's actual pin location was ignored.
--
-- Centroids below are best-effort approximations (Vahdat is a small
-- town; OSM polygon boundaries aren't published for these admin
-- divisions). Tighten via Supabase Studio when better data is available.
--
-- Idempotent: only updates rows that are still NULL — manually-edited
-- centroids are preserved. Re-running this migration is a no-op.
-- ============================================================

-- Центр (downtown — площадь Дусти, центральный рынок).
update districts
set center_latitude = 38.5511, center_longitude = 69.0214
where slug = 'vahdat-center'
  and (center_latitude is null or center_longitude is null);

-- Гулистон — northeastern neighbourhood, schools + поликлиника.
update districts
set center_latitude = 38.5610, center_longitude = 69.0290
where slug = 'gulistan'
  and (center_latitude is null or center_longitude is null);

-- Шарора — up the hill, panoramic side of town.
update districts
set center_latitude = 38.5680, center_longitude = 69.0150
where slug = 'sharora'
  and (center_latitude is null or center_longitude is null);

-- Истиқлол — toward the Душанбе trassa, western edge.
update districts
set center_latitude = 38.5440, center_longitude = 68.9920
where slug = 'istiqlol'
  and (center_latitude is null or center_longitude is null);

-- Сарбозор — along the Кофарнихон river, southern strip.
update districts
set center_latitude = 38.5380, center_longitude = 69.0080
where slug = 'sarbozor'
  and (center_latitude is null or center_longitude is null);
