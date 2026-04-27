# ARCHITECTURE

## Purpose
The intended system structure for V1 — what the app is made of, how the pieces connect, and where each kind of code lives.

## High-level system

Three buyer/seller surfaces, one shared platform:

1. **Buyer-facing app** — discovery, evaluation, contact (Pages 1–11 of UI Spec)
2. **Seller surfaces** — posting, dashboard, verification (Pages 12–14 of UI Spec)
3. **Internal admin/moderation** — staff tools (out of UI Spec scope, built minimally as needed)

All three surfaces share one Next.js 16 application, one Supabase backend, one design system.

## Tech stack (locked in Technical Spec v2)

- **Framework:** Next.js 16 (App Router), React 19, TypeScript strict, Turbopack
- **Database / Auth / Storage:** Supabase (Postgres + phone OTP + Storage + RLS)
- **SMS / OTP:** Twilio primary, Vonage fallback
- **Maps:** MapLibre GL JS + OpenFreeMap (free, OSM tiles)
- **Deployment:** Vercel Pro
- **i18n:** next-intl with JSONB `{ru, tg}` silent Russian fallback
- **Search:** Postgres full-text + pg_trgm for Tajik
- **Client state:** TanStack Query (server) + Zustand (client) + nuqs (URL state)
- **Styling:** Tailwind v4 (CSS-first `@theme`) + shadcn/ui primitives + Lucide icons + Inter font
- **Error / Analytics:** Sentry + PostHog
- **Rate limiting:** Upstash Redis + Next.js proxy.ts middleware
- **Testing:** Vitest (unit), Playwright (E2E)

No ORM. No Drizzle. Supabase SDK with CLI-generated types is the data access pattern.

## Buyer-facing routes

URL scheme: Russian transliteration under `/[locale]/...` per Technical Spec §3.3. Matches Cian, Avito, DomClick conventions for SEO with Russian-speaking buyers (including diaspora).

```
/                                          Page 1 — Homepage
/pomoshch-vybora                           Page 2 — Guided quick finder (5 steps)
/pomoshch-vybora/rezultaty                 Page 2 — Finder results
/novostroyki                               Page 3 — Projects browsing
/novostroyki?view=karta                    Page 4 — Map view (same route, view param)
/zhk/[slug]                                Page 5 — Building detail
/kvartiry                                  Page 6 — Apartments browsing
/kvartira/[slug]                           Page 7 — Listing detail
/sravnenie?type=...&ids=...                Page 8 — Compare (URL state only)
/izbrannoe                                 Page 9 — Saved (login required)
/diaspora                                  Page 11 — Diaspora landing
/tsentr-pomoshchi                          Help center (V1: static markdown FAQ — see Blueprint §20.1)
/tsentr-pomoshchi/[slug]                   Individual help article
/voyti                                     Phone OTP login / registration
```

Contact flow (Page 10) is not a route — it's a modal overlay invoked from Pages 4, 5, 7, 8, 9.

## Seller-facing routes

```
/post                                      Page 12 — Post listing flow
/post/phone, /post/ownership, /post/building, /post/details,
/post/photos, /post/review, /post/published, /post/verify
/kabinet                                   Page 13 — Seller dashboard (login required)
/verifikatsiya/tier-2                      Page 14 — Tier 2 verification flow
/verifikatsiya/tier-3                      Page 14 — Tier 3 verification flow
/verifikatsiya/tier-3/raspisanie           Page 14 — Visit scheduling
```

`/post` and the Tier numbers stay English: `/post` is now an established universal-meaning word in CIS dev practice, and Tier 1/2/3 is the user-facing label everywhere. Rest of seller surface uses Russian transliteration to stay consistent with buyer routes.

## Core entities

Per Data Model v2 §5, the system is built around 17 tables:

`users`, `user_roles`, `developers`, `buildings`, `listings`, `photos`, `saved_items`, `contact_requests`, `change_events`, `verification_submissions`, `verification_visits`, `verification_slots`, `fraud_reports`, `districts`, `district_price_benchmarks`, `phone_verifications`, `notifications`

Key relationships:
- Developer 1—N Buildings 1—N Listings
- User 1—N Listings (as seller_user_id)
- User 1—N Saved items (saved_items has user_id NOT NULL — registration required to save)
- Listing 1—N Contact requests
- Listing 1—N Change events (computed at write time, joined on read)
- Listing 1—1 Verification visit (most recent active)
- User 1—N Verification submissions (Tier 2 attempts)

Compare state lives in URL only — no compare table per UI Spec Page 8.

## Frontend architecture

```
src/
  app/                       # Next.js 16 App Router routes
    (buyer)/                 # Buyer routes group
    (seller)/                # Seller routes group
    api/                     # API route handlers
  components/
    primitives/              # Layer 6 wrappers (AppButton, AppInput, etc.)
    blocks/                  # Layer 7 platform components (SourceChip, ListingCard, etc.)
    layout/                  # Headers, footers, page chrome
  features/                  # Feature-scoped composition (search, post-listing, verify)
  services/                  # Server-state calls via Supabase SDK + TanStack Query
  lib/                       # Shared utilities (formatters, helpers)
  i18n/                      # Locale messages (ru, tg)
  styles/                    # Tailwind config + tokens
  types/                     # Generated Supabase types + custom domain types
```

## Component layering rules

Three layers, strictly enforced:

1. **Primitives (Layer 6)** in `components/primitives/`. App-prefixed wrappers around shadcn/ui. Pages and features never import shadcn directly.
2. **Platform components (Layer 7)** in `components/blocks/`. Built from primitives. The 11 components defined in Design System Spec §7.
3. **Pages and features** assemble platform components and primitives into UI Spec page layouts. No new visual primitives invented at the feature level.

Rule: if a UI Spec page references a component, it lives in `blocks/`. If a Layer 6 spec references a primitive, it lives in `primitives/`. Don't shortcut.

## Search architecture

Project-first by default (Page 3). The same backend powers Apartments browsing (Page 6) when buyer wants apartment-level results.

Search response for Page 3 includes:
- Building summary (Identity row data)
- Trust fields (verification tier, last-updated, construction progress)
- Map coordinates
- Matching unit count
- 2–3 unit previews when filters are active (per Blueprint §8.6 Row 5)

Search response for Page 6 includes:
- Full ListingCard data (6 rows per Blueprint §11.6)
- Source type, verification tier, fairness signal
- Building summary for context

Mixed-source ranking (Blueprint §11.7): trust-weighted — Tier 3 always rises first regardless of source. Tier 2 next. Tier 1 last.

## State architecture

**Server state** (TanStack Query):
- Search results, building details, listing details
- Saved items, contact requests, dashboard data
- Verification status

**URL state** (nuqs):
- All filter state on browsing pages
- Compare items (no server table)
- Page tab selections (e.g., Saved page tab)

**Client state** (Zustand or local React):
- Open/close UI states
- Temporary filter drafts before "Apply"
- Compare bar UI animation
- Toast queue

**localStorage**:
- Guided finder answers (until login or completion)
- Language preference (synced with next-intl cookie)

Never let client-only state become source of truth for inventory or trust data.

## Backend architecture

Layered per Technical Spec §6:

1. **Route handlers** (`app/api/.../route.ts`) — input validation, auth check, response formatting
2. **Service layer** (`services/`) — business logic, multi-step operations
3. **Data access** — Supabase SDK calls with generated types

No ORM, no repository pattern boilerplate. Supabase RLS policies do the auth work at the row level.

## Media architecture

All photos in Supabase Storage. Three buckets:
- `public-photos/` — building, listing, developer logos (publicly readable)
- `verification/` — Tier 2 ID + selfie (RLS-restricted to user + admin)
- `progress-photos/` — construction progress photos (publicly readable, admin-uploaded)

Client-side processing before upload:
- HEIC → JPEG via heic2any
- Resize to max 1920px longest side
- JPEG quality 85
- Parallel uploads via Promise.allSettled

## Trust architecture

Trust UI is built from explicit fields, not heuristics:
- `verification_tier` per listing and building
- `listing_verified_at` and `listing_verified_expires_at` for Tier 3 expiry
- `last_activity_at` for freshness signaling
- `verification_visits` for Tier 3 audit trail
- `developers.is_verified` for developer badge

Fairness signaling pulls from `district_price_benchmarks` joined at query time. Per Data Model §5.14, fairness is hidden when sample size <5.

## Change-event architecture

`change_events` table records meaningful state changes for retention. Read-time join with `saved_items.change_badges_seen_at` produces the "Что изменилось" strip on Saved page (Page 9).

Five enum types per Data Model §3.9 (price_changed, status_changed, new_unit_added, construction_photo_added, seller_slow_response). ChangeBadge component (Layer 7.12) renders these with calm colors — amber for status, never red.

## Verification architecture

Two flows in V1, both manual review:
- **Tier 2** (`verification_submissions`) — selfie + ID, 24–48h staff review
- **Tier 3** (`verification_visits`) — on-site visit by platform team, 45-day validity, 7-day renewal prompt before expiry

Developer-source listings in V1: founder manually onboards each developer (Data Model §5.5 note). No self-service developer verification flow in V1.

## Build phases (from Phase 1 plan)

**Phase 1 — Foundation**
- Repo setup, lint, typecheck, design tokens, base primitives
- Schema, core CRUD, search endpoint shells
- Buyer page shells (Pages 1, 3, 5, 7), Seller minimal (Pages 12, 13)

**Phase 2 — Decision layer**
- Save (Page 9), Compare (Page 8), Guided finder (Page 2), Map (Page 4)
- Construction progress, fairness, installment display fully wired
- Verification flows (Page 14)

**Phase 3 — Conversion and retention**
- Contact flow (Page 10) refinement
- Change events and saved-page badges
- Diaspora landing (Page 11)

**Phase 4 — Post-validation**
- Saved searches
- Lead inbox refinement
- Update badges across surfaces

## Architecture priorities (when in doubt)

When a local decision conflicts with stylistic preference, preserve in this order:
1. Data integrity
2. Trust-first consistency (source chips, verification badges always honest)
3. Clarity of buyer/seller journey
4. Modularity (small components, clear boundaries)
5. Visual consistency
