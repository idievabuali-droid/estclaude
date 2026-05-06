# ARCHITECTURE

Slim reference — read only when building a new route, component, or service.
Full detail in archived specs under `docs/`.

---

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
/post                               Post flow (founder only — everyone else sees ContactCard)
/post/edit/[id]                     Edit listing
/kabinet                            Seller/founder dashboard
/kabinet/analytics                  Operator analytics
/sravnenie                          Compare (hidden — FEATURES.compare = false)
```

All routes live under `/[locale]/` via next-intl. Public queries are always scoped to `ACTIVE_CITY = 'vahdat'` in `services/buildings.ts`.

---

## src/ layout

```
src/
  app/[locale]/          # Page routes (App Router)
  app/api/               # API route handlers
  components/
    primitives/          # Layer 6 — AppButton, AppInput, AppSelect, etc.
    blocks/              # Layer 7 — ListingCard, BuildingCard, ShareButton, etc.
    layout/              # SiteHeader, SiteFooter, MobileBottomNav
  services/              # Supabase SDK calls + business logic
  lib/                   # Formatters, helpers, saved-search logic, analytics
  types/                 # Generated Supabase types + domain types
  styles/                # Tailwind v4 @theme tokens
```

---

## Component layering (enforced — no exceptions)

1. **Primitives (`components/primitives/`)** — thin wrappers around shadcn/ui. App-prefixed. Pages never import shadcn directly.
2. **Blocks (`components/blocks/`)** — platform components built from primitives. These are the Layer 7 building blocks (ListingCard, BuildingCard, SaveToggle, ShareButton, PhotoGallery, etc.).
3. **Pages / features** — assemble blocks + primitives. No new visual atoms invented at page level.

Rule: grep `components/blocks/` before building anything new. The pattern almost certainly exists.

---

## Core entities (tables)

`buildings` · `listings` · `photos` · `users` · `user_roles` · `developers` · `saved_items` · `saved_searches` · `subscribe_sessions` · `contact_requests` · `events` · `pois` · `districts`

Key shape: Developer → Buildings → Listings → Photos. `events` is analytics source of truth. `saved_items.change_badges_seen_at` drives the «Изменения» badge.
