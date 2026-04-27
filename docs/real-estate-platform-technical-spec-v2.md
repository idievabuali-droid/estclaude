# Real Estate Platform — Technical Spec v2

## 1. Document purpose

This document defines the exact technology choices, architecture, and conventions for building the platform. It is the final layer of decisions before code is written.

It answers:
- what languages, frameworks, and libraries we use
- where the application is deployed
- how authentication works end-to-end
- how files and images are stored and served
- how maps render
- how SMS is sent
- how bilingual content is delivered
- how search works
- how the API is structured
- how client state is managed
- how we handle errors, rate limits, and abuse
- how we monitor the system
- how we run the build pipeline

Every decision in this document is locked. When Codex builds, it reads this document and follows it. No independent technology decisions required.

This spec assumes the Data Model v2, PRD v3, Blueprint v2, and User Flows v2 are already locked. Every technical decision here serves features defined in those documents — nothing speculative, nothing beyond V1 scope.

---

## 2. Stack summary

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Best AI-tool compatibility, largest React ecosystem, Server Components + Server Actions eliminate API boilerplate |
| UI library | React 19 | Required by Next.js 16; brings stable Server Components, `use` hook, async transitions |
| Language | TypeScript (strict mode) | Type safety matters more when AI generates code |
| Database | Supabase Postgres (managed) | Bundles Postgres with auth, storage, and RLS in one platform |
| Auth | Supabase Auth (phone OTP only) | Matches PRD "post-first-verify-later" rule |
| SMS provider | Twilio (primary), Vonage (fallback) | Both natively supported by Supabase; Twilio has broadest global coverage |
| File storage | Supabase Storage | Same project as the database, integrated CDN, RLS-backed access control |
| Image processing | Supabase Storage transforms | On-the-fly resize and thumbnail without a separate service |
| Maps | MapLibre GL JS + OpenFreeMap | Open source, no per-request fees, OpenStreetMap data covers Dushanbe |
| Bilingual i18n | next-intl | Mature Next.js i18n library, supports JSONB pattern from Data Model |
| Search | Postgres full-text (`tsvector`) | Sufficient for V1 scale; no separate search service |
| Client state (server data) | TanStack Query (React Query) | Industry standard for data caching and mutations |
| Client state (UI) | Zustand | Minimal boilerplate, good DX, small bundle |
| URL state | Native Next.js `useSearchParams` + `nuqs` | For filter state, compare state, shareable links |
| Styling | Tailwind CSS v4 | Matches design system spec, fast iteration |
| Component primitives | shadcn/ui | Copy-paste components, full Tailwind control |
| Deployment | Vercel | First-class Next.js support, zero-config, global CDN |
| Error tracking | Sentry | Standard for frontend + backend error capture |
| Analytics | PostHog | Product analytics, funnel tracking, session replay |
| Rate limiting | Upstash Redis + middleware | Battle-tested Redis-based rate limits |
| CI/CD | GitHub Actions + Vercel auto-deploy | Free for public repos, tight Vercel integration |
| Testing | Vitest + Playwright | Unit tests + end-to-end tests |

---

## 3. Framework choice: Next.js 16

### 3.1 Why Next.js and not Remix or SvelteKit

The choice was between Next.js 16, Remix (now React Router v7), and SvelteKit. Next.js won for three reasons specific to our situation:

**AI-tool compatibility.** The platform will be built primarily by AI (Codex). Next.js has roughly 4x more training data in AI models than Remix or SvelteKit. When Codex generates code, it generates better Next.js code than it generates Remix code. This is not hypothetical — this is how the tools behave today.

**Ecosystem gravity.** Next.js has the largest third-party library support, the most documentation, the most examples for the exact problems we need to solve (phone auth, image upload, bilingual i18n, maps). When something goes wrong, the answer exists somewhere online. This matters for a solo builder.

**App Router maturity.** Next.js 16 made the App Router fully stable, promoted Turbopack to the default bundler, and locked in Server Components + Server Actions as the standard pattern. This eliminates the entire separate API layer — database queries run directly in components, and mutations run as Server Actions. Less code to write, less code to get wrong.

Remix was the close second. It's technically excellent and some teams would pick it. We don't because AI tooling favors Next.js more strongly.

### 3.2 Next.js version and conventions

- **Version:** Next.js 16.x (latest stable at build time — currently 16.1)
- **React version:** React 19 (required by Next.js 16)
- **Router:** App Router only. Pages Router is still supported by Next.js but we don't use it — we build only in App Router for consistency with Server Components and Server Actions.
- **Bundler:** Turbopack (default in Next.js 16). Fallback to webpack via `--webpack` flag only if a specific tooling incompatibility surfaces.
- **Rendering:** Server Components by default. Client Components only when interactivity is needed (marked with `"use client"`).
- **Data fetching on reads:** Directly in Server Components. No separate API endpoint.
- **Data fetching on mutations:** Server Actions. No separate API endpoint.
- **Middleware:** If needed, use the new `proxy.ts` file name (Next.js 16 deprecated the `middleware.ts` name in favor of `proxy.ts` to clarify its network-boundary role).
- **TypeScript:** Strict mode enabled. No implicit `any`. Typed routes enabled (stable in 16).
- **Folder structure:** `app/` for routes. `components/` for reusable components. `lib/` for shared logic. `types/` for shared TypeScript types.

### 3.3 Folder layout

```
/app
  /[locale]                  # bilingual route group, ru or tg
    /page.tsx                # homepage
    /novostroyki             # Projects-first browsing (Новостройки)
    /kvartiry                # Apartments-first browsing (Квартиры)
    /zhk/[slug]              # Building detail page
    /kvartira/[slug]         # Listing detail page
    /sravnenie               # Compare page
    /izbrannoe               # Saved page
    /diaspora                # Diaspora landing page
    /pomoshch-vybora         # Guided quick finder (Blueprint item 2)
    /tsentr-pomoshchi        # Help center: badge meanings, finishing types, FAQ (Blueprint item 10)
    /voyti                   # Phone OTP login / registration (Blueprint item 14)
    /post                    # Posting flow (requires auth)
      /layout.tsx            # auth-guarded layout
    /verifikatsiya           # Verification upgrade flows — Tier 2 and Tier 3 (Blueprint item 13)
      /layout.tsx            # auth-guarded layout
    /kabinet                 # Seller dashboard (requires auth)
      /layout.tsx            # auth-guarded layout
  /api                       # Only for webhooks, cron, and external callbacks
    /cron/<job-name>         # Vercel Cron handlers
    /webhooks                # Twilio status, Supabase auth hooks
/components
  /ui                        # shadcn/ui primitives
  /building                  # Building page blocks
  /listing                   # Listing page blocks
  /filters                   # Filter components
  /compare                   # Compare page components
/lib
  /supabase                  # Supabase client + types
  /maps                      # Map utilities
  /i18n                      # Translation utilities
  /utils                     # Shared helpers
/types                       # Shared TypeScript types
/messages                    # Translation JSON files (ru.json, tg.json)
proxy.ts                     # Next.js 16 proxy file (was middleware.ts); runs rate limits and auth guards
```

Slug choices are Russian-transliterated because the default locale is Russian. Codex chooses one slug per route and uses it consistently across `app/`, `next-intl` config, and sitemap generation.

### 3.4 What we do NOT use from Next.js

- Pages Router — still supported upstream but we build in App Router only for consistency
- API Routes (except for webhooks and cron endpoints) — Server Actions replace them for mutations
- `getServerSideProps` / `getStaticProps` — App Router patterns replace them
- ISR (Incremental Static Regeneration) — we don't need it; pages are rendered on demand
- Edge runtime — we use the Node runtime for everything because Supabase SDK works best with it
- Cache Components / `"use cache"` directive — new in Next.js 16, but we don't use it in V1; all dynamic pages render per-request to keep freshness semantics simple

---

## 4. Database and auth: Supabase

### 4.1 Why Supabase

Supabase bundles Postgres + auth + file storage + CDN + Row-Level Security in one managed platform. For a solo builder shipping an MVP, this is the correct tradeoff: a small amount of vendor coupling in exchange for cutting setup time from days to hours.

The alternative (Neon for Postgres + Clerk/Auth0 for auth + S3/R2 for storage + CloudFront for CDN) is more flexible but takes meaningfully longer to set up and maintain. We accept the tradeoff.

Migration path is preserved: everything we store is standard Postgres. If we later want to leave Supabase, we export the database, switch auth, and move storage. Not trivial but doable.

### 4.2 Supabase project structure

One Supabase project per environment:
- `production` — the live platform
- `staging` — for testing migrations and risky changes (optional, V2)

V1 runs with production only. Local development uses the Supabase CLI's local instance (`supabase start`).

### 4.3 Postgres version and extensions

- Postgres 15+ (Supabase default is current)
- **Extensions enabled:**
  - `uuid-ossp` — UUID generation
  - `postgis` — spatial queries (for map view)
  - `pg_trgm` — trigram search for fuzzy matching in search queries
  - `unaccent` — for case- and accent-insensitive search

Extensions not needed in V1:
- `pgvector` (no AI recommendation engine in V1)
- `pg_cron` (scheduled jobs run via Vercel Cron instead, see section 14)

### 4.4 Row-Level Security (RLS) policy approach

Every table has RLS enabled. Policies are defined per table based on these roles:

- `anon` — unauthenticated visitor (can read public listings, buildings, photos, etc.)
- `authenticated` — logged-in user (can read own saved_items, contact_requests, etc. plus public data)
- `service_role` — server-side only (bypass RLS for admin operations)

**Default policy pattern:**
- Public read tables (buildings, listings, photos, districts, change_events, district_price_benchmarks) — allow `anon` SELECT where status is public
- User-owned tables (saved_items, contact_requests, verification_submissions) — allow `authenticated` CRUD only where `user_id = auth.uid()`
- Staff-only tables (fraud_reports write access, verification reviews) — require a user in the `user_roles` table with `role IN ('staff', 'admin')`

Policies are specified inline with each table migration, not as a separate policy file. This keeps policies close to the table definition so they're harder to forget when the table changes.

### 4.5 Auth: phone OTP only

Per PRD 18.9: posting requires phone OTP only. No email, no password.

**Flow:**
1. User enters phone number (E.164 format, validated client-side)
2. Client calls Supabase Auth `signInWithOtp({ phone })`
3. Supabase triggers Twilio to send 6-digit code
4. User enters code, client calls `verifyOtp({ phone, token })`
5. Supabase returns session (JWT access token, refresh token)
6. Client stores tokens in cookies (Supabase SSR package handles this)

**Supabase default OTP configuration (we accept the defaults):**
- 6-digit code
- 60-second cooldown between OTP requests per phone number
- 1-hour expiry
- Supabase-level rate limit: 30 SMS per hour across the whole project (project-wide limit, configurable in the dashboard — we increase this as traffic grows)
- Additional per-IP and per-phone rate limits we apply via Upstash Redis (see section 15)

**Voice-call fallback (per User Flows Flow S1):**
After 3 failed OTP entries, a "Позвонить мне с кодом" button appears. This triggers Twilio's voice-call OTP — Supabase does not support this natively, so we implement it as a custom Server Action that calls Twilio's Verify API directly. Voice OTP is sent as a phone call with the code read aloud.

### 4.6 Database migrations

Migrations are tracked as SQL files in `/supabase/migrations/`. Each migration has a timestamp prefix. Migrations are applied via the Supabase CLI.

**Migration discipline:**
- Never edit a migration that has been applied to production
- New schema changes always go in a new migration file
- Every migration is reversible where possible (has a corresponding down migration documented in the file header)
- Migrations are reviewed before being applied to production

### 4.7 Database queries from Next.js

We use the Supabase JavaScript SDK (`@supabase/supabase-js`) inside Server Components and Server Actions. The client is initialized per-request using `createServerClient` from `@supabase/ssr`.

No ORM (no Prisma, no Drizzle). Rationale:
- Supabase SDK has built-in type generation from the schema
- ORMs add a layer of abstraction that can obscure RLS policies
- For V1 scale and query complexity, the SDK is sufficient

Query examples live in `/lib/supabase/queries/` organized by domain (buildings, listings, users, etc.).

### 4.8 Type safety for database queries

Supabase CLI generates TypeScript types from the database schema:
```
supabase gen types typescript --local > types/supabase.ts
```

This runs automatically via a pre-commit hook so types are always current. Breaking schema changes surface as TypeScript errors.

---

## 5. File storage and image processing

### 5.1 Supabase Storage for V1

All images are stored in Supabase Storage. Buckets:

- `listings` — public bucket, all listing photos
- `constructions` — public bucket, construction progress photos
- `buildings` — public bucket, building gallery and cover photos
- `developers` — public bucket, developer logos
- `verifications` — **private bucket**, selfie + ID photos for Tier 2 verification. Access restricted to the submitting user and staff.

### 5.2 Image upload flow

1. Client reads file from `<input type="file">`
2. Client requests a signed upload URL via a Server Action
3. Server Action generates a UUID-based filename and returns a signed Supabase upload URL
4. Client uploads directly to Supabase (no proxy through our server)
5. On success, client calls a second Server Action to record the photo metadata in the `photos` table
6. Server Action optionally triggers perceptual hash computation for fraud detection (async, non-blocking)

This direct-upload pattern means photos never pass through our Vercel functions (which have size limits).

### 5.3 Image size limits and validation

- **Max file size:** 10 MB per image
- **Accepted formats:** JPEG, PNG, WebP. HEIC files (common on iPhones) are converted to JPEG client-side before upload using the `heic2any` library, because Supabase Storage transformations only support JPEG/PNG/WebP (not HEIC).
- **Min dimensions:** 800 × 600 (smaller rejected with a clear error message)
- **Max dimensions:** 8000 × 8000 (larger auto-downsized by Supabase transforms)
- **Per-listing limit:** 15 photos maximum (minimum 5 enforced per UI Spec Page 12 §12.11). The app code enforces 5–15; this 15 is the hard ceiling. Curating to 15 keeps the listing page focused and fast — anti-classifieds wedge.
- **Per-building gallery limit:** 50 photos maximum (developer-uploaded — separate from per-listing)

Validation runs both client-side (for fast feedback) and server-side (for security).

### 5.4 Image delivery and transformations

Supabase Storage includes on-the-fly image transformations. Images are requested with query parameters:

```
https://<project>.supabase.co/storage/v1/render/image/public/listings/<uuid>.jpg?width=800&quality=80&format=webp
```

**Standard sizes we request:**
- `thumb` — 400 × 300 (card images)
- `medium` — 1200 × 900 (listing detail gallery)
- `large` — 2000 × 1500 (lightbox view)
- `cover` — 1600 × 900 (building cover photo)

Sizes are defined as constants in `/lib/images/sizes.ts`. No component hardcodes dimensions.

**Cost note:** Supabase Image Transformations require the Pro plan and are billed per "origin image" transformed per month (currently $5 per 1,000 origin images beyond the included quota). Smart CDN caches transformed variants so repeated views of the same image don't re-bill. We pre-generate the four standard sizes above on first request and rely on CDN caching thereafter.

### 5.5 Image component

All `<img>` elements in the app use the `<Image>` component from `next/image`. It handles:
- Responsive `srcset`
- Lazy loading below the fold
- Blur placeholder while loading
- Automatic WebP/AVIF delivery

For Supabase-hosted images, we configure `next.config.ts` to allow the Supabase domain and to use Supabase's transform endpoint as the loader.

### 5.6 Migration path to Cloudflare R2

Supabase Storage is fine for V1. At scale, egress costs can become significant. If monthly egress exceeds ~500 GB, migrating listings and buildings photos to Cloudflare R2 (zero egress fees) is worth doing. The `photos.file_url` field stores full URLs so this migration is a backfill operation, not a schema change.

---

## 6. SMS and OTP

### 6.1 Primary provider: Twilio

Twilio is the primary SMS provider for phone OTP, configured via Supabase Auth's built-in Twilio integration.

Configuration in Supabase dashboard:
- Twilio Account SID
- Twilio Auth Token
- Twilio Message Service SID (for sender ID routing)

### 6.2 Tajikistan coverage check

Twilio covers Tajikistan (+992) but delivery rates can vary by carrier (Megafon, Tcell, Zet-Mobile, Babilon-M). Before launch, we run a delivery test: send 10 test OTPs to real phone numbers on each major carrier and confirm delivery success rate is above 95%.

If delivery rates are poor, we switch to Vonage (Supabase also supports it natively) or integrate a local Tajik SMS gateway (Babilon-M offers A2P SMS directly). Integration with a local provider requires a custom SMS handler instead of Supabase's built-in — this is documented but not built in V1 unless needed.

### 6.3 Voice OTP fallback

Per User Flows Flow S1 Step 2, after 3 failed OTP entries the user gets a "Позвонить мне с кодом" option. This uses Twilio's Voice API, not Supabase. Flow:

1. User taps "Позвонить мне с кодом"
2. Server Action generates a new 6-digit code (not the same as the SMS code), stores the hashed code with a 5-minute expiry
3. Server Action calls Twilio Voice API to place a call that reads out the code twice in Russian (and a second time in Tajik if the user's preferred language is Tajik)
4. User enters the code, standard verify flow continues

Voice calls cost roughly $0.03 per call — acceptable for a fallback path used rarely.

### 6.4 Rate limits on SMS

- **Supabase project-wide default:** 30 SMS per hour across the whole project (configurable)
- **Supabase per-phone default:** 60-second cooldown between OTP requests for the same phone
- **Our additional per-phone limit (Upstash Redis):** 5 OTP requests per phone per hour
- **Our additional per-IP limit (Upstash Redis):** 10 OTP requests per IP per hour
- **Voice-call OTP:** 3 per phone per 24 hours (hard cap)

These layered limits prevent SMS pumping fraud where attackers trigger paid SMS delivery at scale. The Supabase-level limits catch abuse that bypasses our IP/phone checks.

---

## 7. Maps: MapLibre GL JS + OpenFreeMap

### 7.1 Why MapLibre + OpenFreeMap

**MapLibre GL JS** is an open-source fork of Mapbox GL JS (last BSD-licensed version before Mapbox moved to proprietary). Full feature parity with early Mapbox, no license fees, no API key requirement, no per-tile costs.

**OpenFreeMap** provides free global vector tiles based on OpenStreetMap data. No rate limits, no API key, served from a CDN. OpenStreetMap coverage of Dushanbe is solid — major streets, buildings, amenities are mapped.

This combination gives us interactive maps with zero vendor dependencies and zero incremental cost per user. The alternative (Google Maps, Mapbox) would cost real money as traffic scales and lock us into a vendor.

### 7.2 When we might reconsider

**Against 2GIS:** The deep research report for this project notes 2GIS has significantly better Dushanbe coverage than OSM (153,000 buildings mapped by a local team vs. OSM's sporadic community contributions). 2GIS offers a developer API (`MapGL JS`) with a free trial. Reasons we still pick MapLibre+OpenFreeMap for V1:
1. 2GIS is 72% owned by Sberbank (under US/EU sanctions). The iOS app was removed from the US App Store in September 2022. Web API usage is legally uncertain; we defer this decision to legal counsel before relying on 2GIS.
2. OSM coverage in Dushanbe is adequate for our use case — we show our own pins on top of the base map, and the base map only needs to render streets and general city context.
3. We store amenity distances (school, mosque, transport, market) directly on the `buildings` table rather than depending on map POI data, so OSM POI gaps don't hurt us.

**Against MapTiler:** If we find OpenFreeMap tile style doesn't match our visual design, we switch to MapTiler (free tier: 100k tiles/month). MapTiler uses the same MapLibre SDK, so the migration is a config change.

**Against self-hosting tiles:** If OpenFreeMap becomes unreliable at our traffic, we can self-host tiles using OpenMapTiles or Protomaps PMTiles served from Cloudflare R2 (zero egress).

### 7.3 Map usage in the product

Three places use maps:

1. **Building detail page Block J** — a small map centered on the building with a single pin
2. **Map view on Projects/Apartments browsing** — a larger map with multiple pins for all buildings/listings matching the current filter
3. **Address picker during posting** — for sellers to confirm the location

All three use the same `Map` component from `/components/maps/Map.tsx` with different props.

### 7.4 Pin clustering

When many buildings/listings are in view (e.g., a district overview), pins cluster into grouped circles with a count. MapLibre's built-in clustering handles this via `cluster: true` on the GeoJSON source.

### 7.5 Performance considerations

- Tile loading is lazy — tiles are only fetched when the map is interacted with or scrolled into view
- GeoJSON data for pins is loaded from a Server Action that returns only the current viewport's buildings (not all of them)
- Max pins rendered at once: 500 (if more match, client-side clustering kicks in)

### 7.6 Mobile behavior

On mobile, maps are hidden by default and revealed on tap ("Показать на карте"). This keeps the initial page weight low on the 3G/4G connections common in Tajikistan.

---

## 8. Bilingual content: next-intl

### 8.1 Why next-intl

`next-intl` is the mature i18n library for Next.js App Router. It handles:
- Locale-prefixed routes (`/ru/...`, `/tg/...`)
- Server and client translations
- Rich message formatting (pluralization, number formatting, date formatting)
- Automatic locale detection from URL, cookie, or user profile

### 8.2 Static vs dynamic translations

**Static translations** (UI labels, button text, error messages) live in JSON files:
- `/messages/ru.json`
- `/messages/tg.json`

These are loaded at build time. Missing keys in `tg.json` automatically fall back to `ru.json` (per User Flows Flow B13).

**Dynamic translations** (listing descriptions, building names, developer names) live in the database as JSONB columns with `{ru, tg}` structure (per Data Model section 2.4).

A helper `t(jsonbField, locale)` returns the right language value with silent fallback to Russian:

```typescript
function t(field: { ru: string; tg?: string } | null, locale: 'ru' | 'tg'): string {
  if (!field) return '';
  return field[locale] || field.ru || '';
}
```

### 8.3 Locale routing

Every page is under `/[locale]/...`. The default locale is `ru`. Users can switch language via a header toggle, which:
1. Updates a `preferred_language` cookie
2. If logged in, updates `users.preferred_language` via a Server Action
3. Navigates to the same path under the new locale prefix
4. Preserves all state (filters, compare set, scroll position) per User Flows Flow B13

### 8.4 Translation workflow

Russian translations are the source of truth. Tajik translations are added afterward.

Missing translation logging: when `next-intl` falls back from Tajik to Russian, it logs to the server console. A weekly review finds the most-common missing keys and prioritizes them for Tajik translation.

For dynamic content (listing descriptions), sellers can post in Russian only. The Tajik translation is either added by them later or auto-translated via a batch job (phase 2 — not V1).

---

## 9. Search

### 9.1 V1 search scope

The search experience in V1 (per Blueprint section 6.3 Block D and Blueprint sections 8 and 11 for the filter panels):
- Quick-search input on homepage that matches district names, building names, or price numbers and navigates to results (see 9.3 below)
- Full filter panel on Projects and Apartments browsing
- Sort options per Blueprint: recommended (trust-weighted), lowest price, newest, nearest handover

The search scope is small enough that Postgres full-text is sufficient. We do not need Elasticsearch, Algolia, or Typesense in V1.

### 9.2 Postgres full-text search setup

Each searchable entity gets a generated `tsvector` column combining key text fields:

**On `buildings`:**
```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('russian',
    coalesce(name->>'ru', '') || ' ' ||
    coalesce(district_name, '') || ' ' ||
    coalesce(developer_name, '')
  )
) STORED
```

Similar columns on `listings` and `districts`. Indexed with GIN indexes.

Text stored as Russian uses the `russian` dictionary. Tajik text has no bundled Postgres dictionary, so Tajik is searched with trigram similarity via `pg_trgm`.

### 9.3 Homepage quick-search matching

Per Blueprint Block D: a single search field where the buyer types "a district, building name, or budget number" and taps **Найти**.

The matching logic is intentionally simple:

1. **District name match:** if the input matches (case- and accent-insensitive, via `unaccent` + `pg_trgm`) a district name in either Russian or Tajik, set the `district_id` filter and navigate to Apartments browsing.
2. **Building name match:** if the input matches a building name, navigate directly to that building's detail page.
3. **Price number match:** if the input is purely numeric (e.g., "800000" or "800 000"), treat it as a max price in TJS and set the `price_total_dirams` filter.
4. **Fallback:** if none of the above matches, treat the input as a free-text search against `search_vector` on buildings, and navigate to Apartments browsing with that query as a keyword filter.

The four suggestion chips below the input (per Blueprint Block D) are shortcuts, not parsed input — tapping each applies a fixed preset filter and navigates to results:
- **Квартиры до 800 000 TJS** → `price_total_dirams <= 80_000_000`
- **С ремонтом** → `finishing_type = 'full_finish'`
- **Сдача в 2026** → `handover_estimated_quarter LIKE '2026-%'`
- **В Исмоили Сомони** → `district_id = <id of Исмоили Сомони>`

This is simpler than full natural-language parsing and matches the blueprint exactly. No phrase-level NLP in V1.

### 9.4 Search ranking

Results are ranked by **effective trust tier** first, then freshness, then text relevance, then price.

**Effective trust tier (highest to lowest):**
1. `verified_developer` — `listings.source_type = 'developer'` AND the joined `developers.status = 'active'` AND `developers.verified_at IS NOT NULL`. Treated as equivalent to `listing_verified` (Tier 3) per Blueprint §2.3 and Data Model §3.3 — the developer badge replaces individual tier badges on developer listings, so for ranking they tie at the top.
2. `listing_verified` — Tier 3 listing verification (`verification_tier = 'listing_verified'` and `listing_verified_expires_at > now()`).
3. `profile_verified` — Tier 2 (`verification_tier = 'profile_verified'`).
4. `phone_verified` — Tier 1, the default (`verification_tier = 'phone_verified'`).

A developer listing whose `verification_tier` column is still `'phone_verified'` (the default after publish) but whose developer is verified ranks at the top, NOT the bottom. This is the rule the SQL ranking expression must implement explicitly — `verification_tier` alone is not sufficient.

**Then by:**
1. Effective trust tier (above)
2. Freshness (`published_at` descending)
3. Text relevance (if a text query is present)
4. Price ascending (tiebreaker for same trust + freshness)

This implements PRD 12.6 "Listings rank in search results by trust tier first, then freshness, then relevance."

**Implementation note:** the effective-tier computation is a `CASE WHEN` expression in the search query. Putting it in a Postgres view (`listings_with_trust`) keeps the query bodies readable and prevents drift between search endpoints.

### 9.5 When we'll move off Postgres search

If V1 traffic exceeds ~10k daily searches or we need features like typo tolerance, autocomplete, or faceted filtering with counts, we add Typesense (open-source, self-hostable) or Meilisearch. For V1, Postgres is enough.

---

## 10. API design

### 10.1 Server Actions for mutations

All mutations (create listing, save building, submit contact request, etc.) are Next.js Server Actions. They live in `/app/**/actions.ts` files near the pages that use them.

**Pattern:**
```typescript
"use server";

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveBuilding(buildingId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from('saved_items')
    .insert({ user_id: user.id, item_type: 'building', building_id: buildingId });

  if (error) throw error;
  // Revalidate Saved page across all locales
  revalidatePath('/[locale]/izbrannoe', 'layout');
}
```

**Conventions:**
- Server Actions are co-located with the page that calls them
- Every action checks auth explicitly
- Errors throw, they don't return error objects (Next.js displays errors in error boundaries)
- Actions call `revalidatePath` or `revalidateTag` to invalidate server-rendered caches

### 10.2 Server Components for reads

Data reads happen directly in Server Components. No fetch API, no separate read endpoint:

```typescript
// app/[locale]/zhk/[slug]/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

type Params = Promise<{ locale: 'ru' | 'tg'; slug: string }>;

export default async function BuildingPage({ params }: { params: Params }) {
  const { slug, locale } = await params; // In Next.js 15+, params is async
  const supabase = await createServerClient();
  const { data: building } = await supabase
    .from('buildings')
    .select('*, developer:developers(*), photos(*)')
    .eq('slug', slug)
    .single();

  if (!building) notFound();

  return <BuildingDetail building={building} locale={locale} />;
}
```

### 10.3 When we do use API routes

The `app/api/` folder is reserved for:
- **Webhook receivers** (Twilio status callbacks, Supabase auth hooks)
- **Cron endpoints** called by Vercel Cron for scheduled jobs
- **Public endpoints** consumed by non-Next.js clients (none planned in V1)

We do NOT create REST endpoints for our own pages to call. Server Components and Server Actions replace that.

### 10.4 Data validation

All Server Action inputs are validated with Zod schemas before touching the database:

```typescript
const RequestVisitSchema = z.object({
  listing_id: z.string().uuid(),
  buyer_name: z.string().min(1).max(200),
  buyer_phone: z.string().regex(/^\+\d{10,15}$/),
  preferred_contact_channel: z.enum(['whatsapp', 'call']),
  purchase_timeline: z.enum(['soon', 'within_3_months', 'within_6_months', 'just_researching']),
  note: z.string().max(1000).optional(),
});
```

Validation errors are surfaced inline next to the offending field (per User Flows error-handling patterns).

---

## 11. Messaging deep links

Per PRD and User Flows, the platform uses WhatsApp, Telegram, and IMO as outbound contact channels. These are implemented as deep links, not integrations — no OAuth, no API calls.

### 11.1 WhatsApp

**Link format:**
```
https://wa.me/PHONE_WITHOUT_PLUS?text=URL_ENCODED_MESSAGE
```

Example:
```
https://wa.me/992901234567?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%2C%20%D1%8F%20%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D1%8E%D1%81%D1%8C%20%D0%BA%D0%B2%D0%B0%D1%80%D1%82%D0%B8%D1%80%D0%BE%D0%B9
```

**Pre-filled message template:**
> "Здравствуйте, я интересуюсь квартирой в ЖК [building name], [rooms] комнаты, [size] м². Ссылка: [listing URL]"

On fallback (WhatsApp not installed), the modal from User Flows Flow B7 appears with Call and Request Visit alternatives.

### 11.2 Telegram

**Link format (phone-number based):**
```
https://t.me/+PHONE_WITH_PLUS
```

Example:
```
https://t.me/+992901234567
```

This works per Telegram's official deep-link spec, but depends on the recipient's "Who can find me by my number" privacy setting. If the recipient set this to "Nobody," the link will not resolve. This is a known limitation — a seller who wants Telegram contact to work must allow their number to be findable.

**Pre-filled messages:** Telegram's official deep-link spec documents `?text=` support for username-based links (`t.me/username?text=...`). Pre-fill support for phone-number-based links (`t.me/+PHONE?text=...`) is inconsistent across clients. We implement `?text=` in the link, but treat the pre-fill as best-effort — messaging copy in the UI does not claim "message will be pre-filled." Development task: verify current behavior on iOS and Android Telegram clients before launch; if pre-fill breaks, fall back to link without `?text`.

**Pre-filled message template (when supported):**
> "Здравствуйте, я интересуюсь квартирой в ЖК [building name], [rooms] комнаты, [size] м². Ссылка: [listing URL]"

### 11.3 IMO

IMO does not provide a public deep link format for initiating contact. On the diaspora landing page, we display the phone number and a "Скопировать номер" button — users open IMO manually and dial. This is the same pattern IMO's own web presence uses.

We test during development whether `imo://` custom scheme deep links work on older Android devices (IMO's main platform) — if yes, we use them. If no, the copy-number fallback is the baseline.

### 11.4 Share links

Share buttons on listings, buildings, and compare pages trigger the native Web Share API where available (`navigator.share()`), which lets the user pick any installed app (WhatsApp, Telegram, IMO, native share sheet). Fallback for browsers without Web Share: a share menu with explicit buttons, each generating the right deep link:
- WhatsApp share: `https://wa.me/?text=<encoded text with link>` (no phone, opens WhatsApp contact picker)
- Telegram share: `https://t.me/share/url?url=<encoded url>&text=<encoded text>` (Telegram's official share endpoint)
- Copy link: copies the URL to clipboard

Compare share encodes the compared IDs in the URL so recipients see the same state without login:
```
https://<final-domain>/sravnenie?buildings=id1,id2,id3&lang=ru
```

The final domain is TBD (placeholder `platform.tj` used in this document for illustration). The URL-parameter approach means no server-side storage needed for shared sets (per Data Model section 10).

---

## 12. Client state management

### 12.1 Three kinds of state

The app has three kinds of state, each handled differently:

1. **Server data** — buildings, listings, user profile. Managed by TanStack Query (React Query) on the client side when needed.
2. **UI state** — modal open/closed, form values, sheet visibility. Managed by local `useState` or Zustand for app-wide UI state.
3. **URL state** — current filters, compare set, sort order, language. Managed via URL query parameters.

### 12.2 URL state with nuqs

We use `nuqs` (Next.js URL state library) for any state that should be shareable, bookmarkable, or preserved on back/forward navigation. This includes:

- All filter values on Projects and Apartments browsing
- Sort order
- Map viewport (center, zoom)
- Compare set (list of IDs)
- Guided finder progress (to allow refresh without losing answers)

Rationale: shareable state in the URL means compare links and filter links "just work" (per User Flows Flow B14). No server-side storage needed for ephemeral filter/compare state.

### 12.3 TanStack Query for server data

TanStack Query handles:
- Caching of data returned from Server Actions when re-fetched on the client
- Optimistic updates for save/unsave actions (icon fills immediately, rolls back on error)
- Mutations with automatic invalidation
- Infinite scrolling (for long lists of listings)

Query keys are defined as constants in `/lib/queries/keys.ts` to prevent typo-based cache misses.

### 12.4 Zustand for UI state

Zustand handles app-wide UI state that isn't server data or URL state:
- Compare bar visibility and count
- Language toggle state before the router change completes
- Mobile menu open/closed
- Toast notifications queue

Stores live in `/lib/stores/`. Each store is a plain object with actions. No middleware (no Redux DevTools, no persistence) in V1.

### 12.5 Forms

Forms use `react-hook-form` with Zod for validation. Rationale:
- Controlled inputs without re-render thrash
- Zod schemas shared between client (form validation) and server (Server Action validation)
- Good error handling out of the box

---

## 13. Styling and UI primitives

### 13.1 Tailwind CSS v4

Tailwind v4 is the styling system. Configuration lives in CSS using the `@theme` directive (Tailwind v4 eliminated the JavaScript config file). Theme tokens (colors, spacing, fonts, breakpoints) are defined in `/app/globals.css` and referenced throughout the app. The Design System Spec (forthcoming) defines the exact `@theme` block.

**No CSS-in-JS** (no styled-components, no Emotion). Tailwind utility classes only.

**No Bootstrap, Chakra UI, or Material UI.** Those component libraries have opinionated defaults that we'd spend time fighting.

### 13.2 shadcn/ui for component primitives

`shadcn/ui` is a collection of Tailwind-styled Radix UI primitives (accessible, unstyled components) that you copy into your codebase rather than installing as a dependency. This gives us:
- Full control over every component's markup and styles
- No version-lock from an external library
- Accessible-by-default interactions (keyboard navigation, screen reader, focus trap)

Components we'll copy in from shadcn/ui: Button, Input, Select, Dialog, Sheet, DropdownMenu, Toast, Tooltip, Tabs, Toggle, Accordion, Skeleton.

### 13.3 Icon library

**Lucide** (successor to Feather). Tree-shakeable, consistent visual style, free.

All icons imported individually:
```typescript
import { Heart, Search, X } from 'lucide-react';
```

Custom icons (like the three source-type chips with emoji) are SVG files in `/public/icons/`.

### 13.4 Fonts

- **Primary:** Inter (Latin + Cyrillic) via `next/font` — supports both Russian and Tajik Cyrillic
- **Numbers:** Inter's tabular-nums variant for prices (so numbers align in compare tables)

No Tajik-specific font needed — Tajik Cyrillic is fully supported by Inter.

---

## 14. Scheduled jobs

Several operations run on a schedule, not triggered by user actions.

**Important infrastructure note:** Vercel Cron on the Hobby (free) plan allows only **one cron job per day**. The Hobby plan also prohibits commercial use. Since this platform is commercial and requires multiple scheduled jobs (some hourly), **we use the Vercel Pro plan ($20/month)**. This cost is included in the operating budget. All cron schedules below are expressed in UTC (Vercel Cron does not support local-time scheduling).

| Job | Schedule (UTC) | Purpose |
|---|---|---|
| Expire Tier 3 verifications | Daily 03:00 | Drop `verification_tier` back to user's lower tier when `listing_verified_expires_at` passes |
| Auto-hide inactive listings | Daily 03:30 | Set `status = 'expired'` when `last_activity_at` > 60 days |
| Flag no-response contact requests | Hourly at :00 | Set `status = 'auto_no_response'` on requests older than 72 hours still at `status = 'new'` |
| Recompute district price benchmarks | Daily 04:00 | Update `district_price_benchmarks` from current active listings |
| Send Tier 3 expiration reminders | Daily 02:00 (equals 07:00 Dushanbe, UTC+5) | SMS sellers whose Tier 3 expires in 7 days. Job queries only sellers whose reminder hasn't been sent today; database function handles per-seller dedup. |
| Send no-response follow-ups | Every 6 hours at :00 | SMS buyers whose contact requests have no seller response |
| Cleanup expired OTP records | Daily 02:30 | Delete `phone_verifications` older than 24 hours |
| Cleanup expired notifications | Daily 02:45 | Delete `notifications` rows past `expires_at` (created_at + 7 days) per Data Model §5.16 |
| Cleanup expired drafts | Daily 03:15 | Delete `listings` where `status='draft'` and `updated_at` > 30 days (one SMS warning was sent at day 23 per User Flows S2) |

**Local-time sensitive jobs** (like the 07:00 Dushanbe seller reminder) are scheduled at the UTC offset equivalent — Tajikistan is UTC+5 year-round (no daylight saving), so 07:00 Dushanbe = 02:00 UTC. This is hardcoded in `vercel.json` schedules with a comment explaining the offset. If we later add users in other timezones, we'll switch to a per-user scheduling pattern via a Supabase Database Function.

**Fallback if the Pro plan becomes unaffordable:** the same API routes can be triggered by external cron services (cron-job.org free tier, EasyCron free tier) with a bearer-token secret. This is documented as a recovery path but not the default.

**Implementation:** Vercel Cron. Each cron job is an API route at `/api/cron/<job-name>` protected by a secret header check (`CRON_SECRET` env var). Vercel Cron calls these on the schedule defined in `vercel.json`.

**Why not Supabase pg_cron:** we keep scheduled logic in TypeScript code instead of SQL functions because it's easier to test, version-control, and debug. Supabase pg_cron is available as a fallback.

### 14.1 Notifications API

The seller dashboard (UI Spec Page 13 §13.4 Block E) reads the `notifications` table (Data Model §5.16) through these endpoints. All require auth; RLS enforces user_id ownership.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/notifications` | List current user's unread + last 20 read notifications. Sorted by `created_at DESC`. Joins payload IDs with referenced records (listing title, contact requester phone) for one-shot dashboard render. Returns `{ items: [...], unread_count: N }`. |
| `PATCH` | `/api/notifications/[id]/read` | Mark one notification as read (set `read_at = now()`). 204 on success. |
| `POST` | `/api/notifications/mark-all-read` | Bulk mark all of the user's unread as read. 204 on success. |
| `DELETE` | `/api/notifications/[id]` | Dismiss (immediate delete, not soft). 204 on success. |

Server-side `INSERT` only — never from client. System events that create notifications:
- `change_events` insert with seller-affecting type → trigger inserts a `notifications` row in the same transaction (per Data Model §5.16 note on `slow_response_warning`).
- Verification approval/rejection in admin tools → insert via service role.
- Cron jobs in §14 emit `listing_expiring_soon`, `listing_expired`, `verification_expiring_soon` as side effects of their main work.

The server payload is type-discriminated; render strings are i18n keys, never persisted text. See `types/notifications.ts` (generated from Supabase types + hand-written discriminator).

---

## 15. Rate limiting and abuse prevention

### 15.1 Rate limits

Rate limits use Upstash Redis (serverless Redis) with the `@upstash/ratelimit` library, called from a Next.js `proxy.ts` file (the renamed middleware in Next.js 16) and from individual Server Actions where per-action limits apply.

| Action | Limit | Identifier |
|---|---|---|
| OTP request | 5 per hour | phone number |
| OTP request | 10 per hour | IP address |
| Voice OTP | 3 per 24h | phone number |
| Listing creation | 5 per day | user ID |
| Contact request submit | 10 per day | user ID |
| Fraud report submit | 3 per day | user ID |
| Search requests | 120 per minute | IP address |
| Image upload | 50 per hour | user ID |

Exceeded limits return HTTP 429 with a clear message ("Слишком много запросов. Попробуйте через X минут.").

### 15.2 Bot protection

We use Cloudflare Turnstile (invisible by default, challenges suspicious visitors) on:
- Phone OTP request form
- Contact request submit form
- Listing creation form

Turnstile is free and privacy-respecting (unlike reCAPTCHA). Token validation happens in the Server Action.

### 15.3 Fraud detection

Per PRD 12.7:
- **Perceptual photo hash duplicate detection:** computed via the `sharp` + `imghash` libraries in a background job after upload. Matches against existing hashes in `photos.perceptual_hash`. On match, the listing is flagged for staff review.
- **User reporting with three-strike suspension:** buyers can report listings via the Data Model `fraud_reports` table. When a single seller accumulates 3 confirmed fraud reports across their listings, the seller account is suspended pending staff review. Individual listings with 3+ confirmed reports are auto-hidden for staff review.
- **Building + floor + unit deduplication:** when a seller tries to post a listing with the same `(building_id, floor_number, unit_number_internal)` combination as an existing listing, the posting flow blocks it with a clear message and a link to the existing listing.
- **Suspicious posting patterns:** a Postgres view surfaces listings posted from the same phone in rapid succession across different buildings. Per section 23, V1 has no dedicated admin UI — staff review this via the Supabase SQL editor. A real admin dashboard is Phase 2.
- **Mystery-buyer spot checks:** per PRD — staff periodically contact sellers as buyers to verify listings are real. Not an automated feature; tracked manually.

---

## 16. Monitoring and error tracking

### 16.1 Sentry for errors

Sentry is configured for:
- **Client-side errors** — React errors, unhandled promise rejections
- **Server-side errors** — Server Action failures, Server Component errors, API route errors
- **Source maps** — uploaded at build time for readable stack traces

Sentry project: `platform-web`. Alerts configured to notify the founder via email and Telegram.

### 16.2 PostHog for product analytics

PostHog captures:
- Page views (auto-captured)
- Key events: listing viewed, contact request submitted, save, compare added, WhatsApp clicked, Call clicked
- User identification (once logged in)
- Session replay (sampled at 10% for debugging UX issues)

Events are defined as constants in `/lib/analytics/events.ts` so event names don't drift.

**Privacy:** PostHog is configured to mask personal data (phone numbers, names) in session replays. Session replay is disabled on seller-dashboard and verification-submission pages.

### 16.3 Uptime monitoring

**Better Stack** (formerly Better Uptime) pings critical endpoints every minute:
- Homepage (`/ru`)
- Projects browsing (`/ru/novostroyki`)
- A known building detail page
- Supabase health endpoint

Downtime alerts go to the founder via Telegram.

### 16.4 Logging

Server-side logs go to Vercel's built-in log aggregation (available in the Vercel dashboard). Structured log format: JSON with fields for `level`, `event`, `user_id` (if known), and custom payload.

We do NOT log: phone numbers, OTP codes, ID photos, or any personal data. Logging is for operational debugging, not user tracking.

---

## 17. Deployment: Vercel

### 17.1 Why Vercel

Vercel is built by the same team that builds Next.js. Zero-config deployment, automatic preview environments per pull request, global edge CDN, built-in analytics, first-class Next.js support.

The alternative (self-hosting on a VPS) is cheaper at high scale but costs engineering time we don't have.

**Plan required: Vercel Pro ($20/month).** Two reasons we can't use Hobby:
1. Hobby forbids commercial use per Vercel's fair-use policy. This platform is commercial.
2. Hobby limits cron jobs to once per day. Section 14 defines several hourly and daily jobs that only run on Pro.

$20/month is included in the operating budget.

### 17.2 Environments

- **Production** — `platform.tj` (placeholder domain, final domain TBD) — deploys from `main` branch
- **Preview** — every pull request gets a unique preview URL — auto-deployed on push

No separate staging environment in V1. Preview deployments serve that purpose.

### 17.3 Environment variables

All secrets live in Vercel env vars, never in code:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGE_SERVICE_SID`, `TWILIO_VOICE_FROM`
- `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- `POSTHOG_KEY`, `POSTHOG_HOST`
- `CRON_SECRET` (random string shared between Vercel Cron and our cron handlers)
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

Public env vars (those exposed to the client) are prefixed `NEXT_PUBLIC_`. Everything else is server-only.

A `.env.example` file in the repo documents every variable needed.

### 17.4 Domain and SSL

Vercel provisions SSL automatically via Let's Encrypt. Custom domain is added via DNS CNAME.

### 17.5 Build and runtime configuration

`next.config.ts` configures:
- Allowed image domains (Supabase storage URL)
- Redirects (e.g., legacy URLs to canonical paths)
- Locale routing base
- Turbopack-specific options if needed (most projects need none)

No custom webpack config in V1. Turbopack is the default and stable bundler in Next.js 16 — we use it for both `next dev` and `next build`.

---

## 18. Testing

### 18.1 Test pyramid

- **Unit tests (Vitest):** pure functions in `/lib/` — search parsing, date formatting, fairness badge calculation
- **Integration tests (Vitest):** Server Actions with a local Supabase instance
- **End-to-end tests (Playwright):** critical user flows — posting a listing, saving, contact request

### 18.2 What we test in V1

Not everything. V1 test coverage priorities:
- Phone OTP signup and login (if this breaks, nothing works)
- Listing creation flow (if this breaks, no supply)
- Contact request flow (if this breaks, no leads)
- Search filter logic (if this silently returns wrong results, buyers lose trust)
- Fairness badge calculation (if this is wrong, we lose credibility)

Visual regression testing is not in V1 scope.

### 18.3 CI configuration

GitHub Actions workflow on every PR:
1. TypeScript check (`tsc --noEmit`)
2. Lint (`eslint` — Next.js 16 removed `next lint`; we use ESLint directly with flat config `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`)
3. Unit tests (`vitest run`)
4. Integration tests (against ephemeral Supabase instance)
5. Playwright E2E tests (against the Vercel preview URL)

All five must pass before merge.

---

## 19. Development workflow

### 19.1 Local setup

1. Clone repo
2. Install dependencies: `pnpm install`
3. Start local Supabase: `supabase start`
4. Copy `.env.example` to `.env.local` and fill in values
5. Run migrations: `supabase db reset`
6. Seed data: `pnpm seed`
7. Start dev server: `pnpm dev`

Documented in `README.md` at repo root.

### 19.2 Package manager

`pnpm`. Faster, more disk-efficient than npm/yarn, works well with Next.js.

### 19.3 Git workflow

- `main` — production branch, always deployable
- Feature branches off `main`, PRs back to `main`
- Preview deployments per PR
- Squash-merge on approval

No long-lived branches, no release branches. V1 is too small for that complexity.

### 19.4 Seed data

A `pnpm seed` script populates the local Supabase with:
- 1 admin user
- 5 districts in Dushanbe + 2 in Vahdat
- 3 sample developers
- 10 sample buildings across those developers
- 30 sample listings
- 10 sample construction photos (from Unsplash for development)
- Sample contact requests and change events

Seed data is useful for both local development and staff onboarding. It lives at `/supabase/seed.sql`.

### 19.5 Library versions to install

Codex picks the latest stable at `pnpm install` time, but these minimum major versions are required because the rest of the spec assumes their behavior. If Codex sees a newer major version, it should check the upgrade notes before installing.

| Package | Minimum major | Why pinned |
|---|---|---|
| `next` | 16.x | Section 3 assumes App Router, Turbopack default, `proxy.ts`, typed routes, async `params` |
| `react`, `react-dom` | 19.x | Required by Next.js 16 |
| `@supabase/supabase-js` | 2.x | Current stable major; SDK-generated types assume 2.x |
| `@supabase/ssr` | Current stable | Replaces deprecated `@supabase/auth-helpers-nextjs` |
| `tailwindcss` | 4.x | Section 13.1 assumes CSS-first `@theme` directive (v3 uses JS config file, incompatible) |
| `@tailwindcss/postcss` | 4.x | Required by Tailwind v4 |
| `next-intl` | Current stable that supports App Router + async params | Earlier versions break with Next.js 16 async params |
| `eslint` | 9.x | Required for flat config used by `eslint-config-next` |
| `eslint-config-next` | 16.x | Tracks Next.js version |

For everything else (`zustand`, `@tanstack/react-query`, `nuqs`, `react-hook-form`, `zod`, `@upstash/ratelimit`, `maplibre-gl`, `heic2any`, `sharp`, `lucide-react`, Sentry, PostHog), Codex installs latest stable. No version pin needed because they don't have behavior this document depends on.

---

## 20. Security

### 20.1 Security principles

- **Defense in depth:** RLS on the database + validation in Server Actions + Turnstile on public forms
- **Least privilege:** service_role key only used in Server Actions, never exposed to the client
- **Never trust client input:** every Server Action validates inputs with Zod before touching the database
- **Never store secrets in code:** all secrets in env vars, `.env.local` is gitignored

### 20.2 What we don't do in V1

- **No PCI compliance needed** — we don't process payments
- **No GDPR formal compliance program** — we're not targeting EU users; we still follow good data hygiene (minimal collection, clear purpose, deletion on request)
- **No SOC 2** — not required at this scale
- **No penetration testing** — done later if the platform grows significantly

### 20.3 Known security considerations

- **ID photos (Tier 2 verification):** stored in private Supabase Storage bucket; signed URLs expire after 60 seconds; only staff and the submitting user can access
- **Phone numbers:** stored in plain text in the database (required for SMS delivery); never shown in logs, never included in analytics events
- **Session cookies:** HTTPOnly, Secure, SameSite=Lax via Supabase SSR defaults
- **Password hashing:** N/A — we don't use passwords

---

## 21. Accessibility

### 21.1 Accessibility targets

- WCAG 2.1 Level AA for all public pages
- Keyboard navigation works everywhere
- Screen reader support (semantic HTML, ARIA where needed)
- Color contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI elements
- Focus visible at all times

### 21.2 Implementation

- shadcn/ui primitives are accessible by default (based on Radix UI)
- All images have `alt` text (from `photos.alt_text` JSONB or auto-generated descriptive text)
- All form fields have `<label>` elements
- Error messages are associated with fields via `aria-describedby`
- Page has a proper heading hierarchy (one `<h1>`, nested headings)

---

## 22. Mobile and performance

### 22.1 Performance budgets

Given Tajikistan's 3G/4G reality and the mobile-first principle (Blueprint section 2.1), we target these Core Web Vitals:
- **Largest Contentful Paint (LCP):** < 2.5s on 3G
- **Interaction to Next Paint (INP):** < 200ms (INP replaced FID as a Core Web Vital in March 2024)
- **Cumulative Layout Shift (CLS):** < 0.1
- **Initial JS bundle:** < 150 KB gzipped
- **Homepage total weight:** < 500 KB on first load

### 22.2 How we achieve them

- Server Components render on the server, minimizing client JS
- Images served through `next/image` with responsive `srcset` and lazy loading
- Tailwind generates only used CSS (tree-shaken at build)
- Third-party scripts (PostHog, Sentry) loaded with `next/script` strategy `afterInteractive`
- Maps lazy-loaded (not rendered on mobile until user taps)
- Code splitting per route (automatic with App Router)

### 22.3 Offline and unstable connections

Per PRD 7.10 and the reality of Tajikistan connections:
- Forms preserve state across connection drops (form data stored in localStorage until submit succeeds)
- Failed image uploads retry automatically (exponential backoff, up to 3 attempts)
- Saved items sync when connection returns (if a user saves an item offline, the action is queued and replayed on reconnect)
- All essential pages work without JavaScript enabled (buildings, listings, search results render as Server Components)

---

## 23. What this spec does not cover

These are intentionally out of scope for V1:

- **Native mobile app** — V1 is a responsive website only
- **Email delivery** — no transactional emails in V1 (all notifications are SMS)
- **Payment processing** — no paid subscriptions in V1
- **Advanced SEO** — basic meta tags and sitemap only; full SEO work (schema.org markup, canonical URL strategy beyond basics, multi-locale hreflang) is Phase 2
- **Admin panel** — V1 admin tools are SQL queries and Supabase dashboard access; a dedicated admin UI is Phase 2
- **Background job queue** — scheduled jobs use Vercel Cron; long-running background jobs (bulk emails, large imports) are Phase 2 with something like Inngest or Trigger.dev
- **Multi-region database** — V1 runs in a single Supabase region (likely EU or US closest to Tajikistan); multi-region is Phase 2

---

## 24. Technical alignment checklist

This checklist has two parts. **Part A** is verified in this document — the spec makes these choices explicitly. **Part B** is enforced at build time by Codex reading the spec — these need to stay true as code gets written.

### Part A — spec-level decisions (verified in this document)

- [x] Framework chosen with AI-tool compatibility as top criterion (Next.js 16, section 3.1)
- [x] Database includes auth + storage to minimize V1 setup (Supabase, section 4.1)
- [x] SMS provider supports Tajikistan and works with Supabase Auth (Twilio primary, Vonage fallback, section 6.1–6.2)
- [x] Map solution has zero per-request costs (MapLibre + OpenFreeMap, section 7.1)
- [x] Phone OTP auth matches PRD 18.9 "phone only, no documents" rule (section 4.5)
- [x] File storage integrates with auth for Tier 2 verification photos (Supabase Storage private bucket, section 5.1)
- [x] Bilingual rendering matches Data Model JSONB pattern (next-intl + `t()` helper, section 8)
- [x] Compare state is URL-based, not server-side (section 12.2; Data Model section 10 confirms no compare table)
- [x] Search is Postgres-only in V1 (section 9; no Typesense/Meilisearch dependency)
- [x] Vercel Pro plan cost is acknowledged upfront (section 17.1)

### Part B — must stay true as Codex builds (verify at PR review)

- [ ] Saved state is server-side and requires login before save works
- [ ] Contact requests require login; WhatsApp/Call deep links do not
- [ ] All Server Action inputs validated with Zod before any database write
- [ ] Rate limits applied on OTP, contact submit, listing creation, image upload
- [ ] Scheduled jobs running: Tier 3 expiration, inactive listings auto-hide, no-response flagging, district price benchmarks, OTP cleanup
- [ ] Analytics events never include phone numbers or ID photo URLs
- [ ] Performance budgets measured on a real 3G throttled connection: LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] No feature exists in code that isn't traceable to PRD / Blueprint / User Flows / Data Model
- [ ] No RLS policy is missing on any table containing user data
- [ ] HEIC photos from iPhones successfully upload (client-side conversion to JPEG works)
- [ ] Russian-to-Tajik language toggle preserves URL state (filters, compare, sort)

Items in Part B are not checked now because they're about the running system, not the spec. Codex reading this document is responsible for making them true.

---

## 25. Build order

This section orders the initial build phases so Codex can work through them without blocking itself.

1. **Foundation:** repo setup, Next.js skeleton, Supabase project, env vars, TypeScript + Tailwind + shadcn/ui installed
2. **Schema:** run all migrations from Data Model v2, seed minimum data
3. **Auth:** phone OTP signup and login flow, session management, protected route wrapper
4. **Public pages:** Homepage, Projects browsing, Apartments browsing, Building detail, Listing detail — rendered from seed data, no posting flow yet
5. **Search and filters:** working filter panels, URL state, Postgres search
6. **Buyer features:** Save, Compare, Contact flow (WhatsApp, Call, Request Visit Server Action)
7. **Posting flow:** phone OTP, source selection, building selection, unit details, photo upload, publish
8. **Seller dashboard:** listings list, edit, mark sold, verification upgrade flows
9. **Verification:** Tier 2 ID submission UI, Tier 3 visit request UI, verification submissions visible to staff via Supabase SQL editor (no staff UI in V1 per section 23)
10. **Change events and retention:** change_events creation triggers, Homepage Block C, Saved page badges
11. **Maps:** Building page map, browsing map view
12. **Diaspora funnel:** landing page, IMO contact option
13. **Bilingual polish:** translate all static strings to Tajik, test language switching
14. **Hardening:** rate limits, Turnstile, error tracking, analytics events, monitoring

Each phase is a distinct piece of work that can be shipped and tested independently.

---

## 26. Final technical statement

This spec defines exactly one path to build each V1 feature. Codex reads this document and picks technologies, libraries, and patterns directly from it. No independent technical decisions are required.

Every choice here serves features in the PRD, blueprint, flows, and data model. Nothing is speculative. Nothing is overbuilt for hypothetical future scale.

When Codex finishes building from this spec, the result is a running platform that matches the product documentation exactly.
