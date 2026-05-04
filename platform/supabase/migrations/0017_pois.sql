-- ============================================================
-- Migration 0017: POIs (points of interest)
--
-- Backs the location search on / + /novostroyki + /kvartiry.
-- Buyers type "Дусти" and the autocomplete suggests «Площадь Дусти»,
-- «улица Дусти», «парк Дусти» etc. Selecting one filters listings
-- to a radius around the POI's lat/lng.
--
-- Source: pulled from OpenStreetMap via Overpass on a one-shot
-- script (see scripts/seed-vahdat-pois.mjs). Refresh annually or
-- when buyers report missing landmarks.
-- ============================================================

-- pg_trgm enables fast LIKE / ILIKE on `name` for the autocomplete
-- prefix match. Same extension we use elsewhere for fuzzy search.
create extension if not exists pg_trgm;

create table if not exists pois (
  id uuid primary key default gen_random_uuid(),
  -- Stable upstream key so re-imports from Overpass don't create
  -- duplicates. Format: "node/123456" / "way/789012".
  osm_id text not null unique,
  -- Russian display name (Tajik fallback handled at render time).
  -- jsonb so we can extend later, but for V1 we ingest a single
  -- string and store as { ru, tg }.
  name jsonb not null,
  -- High-level kind for filter chips and icon picking. Free string
  -- (matches the existing PoiCategory enum in services/poi.ts):
  -- mosque / school / kindergarten / supermarket / hospital /
  -- pharmacy / transit / park / square / street.
  kind text not null,
  -- Sub-classification (e.g. "primary school" vs "secondary school")
  -- when Overpass provides one. Optional, used for tooltips later.
  subkind text,
  city varchar(50) not null default 'vahdat',
  -- Optional: parent district by slug for quick "in Гулистон" labels
  -- in the autocomplete dropdown. Set by the seed script via point-
  -- in-polygon if district polygons are available; nullable until
  -- then.
  district_slug varchar(100),
  latitude double precision not null,
  longitude double precision not null,
  -- Sort hint: buyers type a string and we want well-known POIs to
  -- rank higher than obscure ones. Higher = more popular. Set
  -- manually or by a curated list in the seed script.
  popularity int not null default 0,
  created_at timestamptz not null default now()
);

-- Trigram index for fast `ILIKE '%foo%'` autocomplete matching the
-- name field. The casts pull out the Russian name for the index.
create index if not exists pois_name_ru_trgm_idx
  on pois using gin ((name->>'ru') gin_trgm_ops);

create index if not exists pois_kind_idx on pois(kind);
create index if not exists pois_city_idx on pois(city);

-- Geographic index for the radius filter. B-tree on lat/lng is
-- sufficient at our scale (<1000 POIs); upgrade to PostGIS GIST when
-- the catalogue grows.
create index if not exists pois_geo_idx on pois(latitude, longitude);
