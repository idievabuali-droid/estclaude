# ARCHITECTURE.md

Slim reference — read only when building a new route, component, or service. Full detail in archived specs under `docs/`.

## Routes

```
/                                   Home
/novostroyki                        Projects list (+ ?view=karta for map)
/zhk/[slug]                         Building detail
/kvartiry                           Apartments list
/kvartira/[slug]                    Listing detail
/izbrannoe                          Saved items (login required)
/pomoshch-vybora                    Guided finder
/pomoshch-vybora/rezultaty          Finder results
/diaspora                           Diaspora landing
/tsentr-pomoshchi                   Help center
/tsentr-pomoshchi/[slug]            Help article
/voyti                              Login (Telegram bot)
/post                               Post flow (any phone-verified user; non-founder → pending_review)
/post/edit/[id]                     Edit listing
/post/edit/building/[id]            Edit building (founder only)
/kabinet                            Seller/founder dashboard
/kabinet/analytics                  Operator analytics
/kabinet/saved-searches             Saved searches dashboard
/sravnenie                          Compare (hidden — FEATURES.compare = false)
```

All routes live under `/[locale]/` via next-intl. Public queries are always scoped to `ACTIVE_CITY = 'vahdat'` in `services/buildings.ts`.

## src/ layout

```
src/
  app/[locale]/          # Page routes (App Router)
  app/api/               # API route handlers
  components/
    primitives/          # Layer 6 — AppButton, AppInput, AppSelect, NumberField, etc.
    blocks/              # Layer 7 — ListingCard, BuildingCard, ShareButton, etc.
    layout/              # SiteHeader, SiteFooter, MobileBottomNav
  services/              # Supabase SDK calls + business logic
  lib/                   # Formatters, helpers, saved-search logic, analytics, filters
  types/                 # Generated Supabase types + domain types
  styles/                # Tailwind v4 @theme tokens
```

## Component layering (enforced — no exceptions)

1. **Primitives (`components/primitives/`)** — thin wrappers around shadcn/ui. App-prefixed. Pages never import shadcn directly.
2. **Blocks (`components/blocks/`)** — platform components built from primitives. Layer 7 building blocks (ListingCard, BuildingCard, SaveToggle, ShareButton, PhotoGallery, LocationSearch, etc.).
3. **Pages / features** — assemble blocks + primitives. No new visual atoms invented at page level.

Rule: grep `components/blocks/` before building anything new. The pattern almost certainly exists.

## Core entities (tables)

`buildings` · `listings` · `photos` · `users` · `user_roles` · `developers` · `districts` · `pois` · `saved_items` · `saved_searches` · `subscribe_sessions` · `contact_requests` · `events` · `intake_bot_sessions`

Shape: Developer → Buildings → Listings → Photos. `events` is the analytics source of truth. `saved_items.change_badges_seen_at` drives the «Изменения» badge.

## Locked technical patterns

Things you'll otherwise re-discover wrong. Each tied to a `DECISIONS.md` entry for the why.

- **Cookie-session auth, not Supabase Auth.** `auth.uid()` is null. Every server-side query that needs user data uses `createAdminClient()` (bypasses RLS), with the API route having already verified the user via `getCurrentUser()`. RLS policies still in place for defence in depth.
- **PostgREST embed hint syntax.** Foreign-key joins like `cover_photo:photos!buildings_cover_photo_fk(storage_path)` need the **named constraint** as the hint, not the column name. Always use `BUILDING_SELECT` / `LISTING_SELECT` constants in `services/buildings.ts` — never bare `select('*')`.
- **`anon_id` cookie set in `proxy.ts`** (Next 16 calls middleware "proxy"). 1-year HttpOnly. Every visitor has one. Stitched to `user_id` at login by `/api/auth/poll`.
- **`events` table is the analytics source of truth.** All analytics queries aggregate from `events`. Don't denormalise into separate tables.
- **`displayNameFromFilters()` in `src/lib/saved-searches/format.ts`** is the single canonical filter-to-Russian-label converter. Use it everywhere a filter set is shown to a human (saved searches list, 0-result dashboard rows, alerts).
- **Match-on-publish runs inline** at `/api/inventory/create` and `/api/listings/moderate`, not via cron. `notifyMatchingListing()` in `src/lib/saved-searches/match.ts`. Idempotent (claim-before-send).
- **Filter logic centralised** in `src/lib/filters/` — `listings.ts` and `buildings.ts`. Single source for filter parsing + application.
- **Feedback-loop stack:** first-party `events` + Microsoft Clarity (session replay/heatmaps) + real-time Telegram friction alerts. PostHog deliberately NOT adopted — would dual-source with `events` + `/kabinet/analytics`. Clarity env var: `NEXT_PUBLIC_CLARITY_PROJECT_ID`. Friction alerts live in `src/lib/analytics/friction-alerts.ts`, fire from inside `/api/events` after insert, route through `notifyFounder()` in `src/lib/analytics/founder-notify.ts` (reads founder's `tg_chat_id` via `user_roles.role IN ('admin','staff')` — joining both roles avoided silently-dropped alerts when the founder's row used `staff`). Re-evaluate at ~50 weekly actives.
- **Intake bot** is a separate Telegram bot (`INTAKE_BOT_TOKEN`, webhook at `/api/intake-bot`). Self-contained in `src/lib/intake-bot/`. Shares nothing with the `@VafoTjBot` login bot. State in `intake_bot_sessions` table. No buyer-facing surface.
