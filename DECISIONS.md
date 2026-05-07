# DECISIONS

Direction changes that override the original spec stack. Read at session start. Append when a new direction lands.

**Format rule — strictly enforced:** each entry is 4–6 lines max: title + date, what locked (1–2 lines), why (1 line), what it affects (key files/routes/tables only). No commit SHAs, persona notes, deferred lists, or verification logs — those belong in `git log`.

Newest at top.

---

## 2026-05-06 · Brand consistency ripple across buyer-facing platform

**Locked:** Lora serif H1 via inline `style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}` on /izbrannoe, /kvartiry, /novostroyki, /zhk/[slug] (statement headings). Eyebrow labels (uppercase tracking-widest stone-500) above section H2s on /zhk + /kvartira detail pages. Verified developer pill standardised: white bg + stone-200 border + green dot (replaces amber inline badge). /diaspora rebuilt to home pattern: pill + serif H1 with italic accent + 3 icon-tile trust cards + dark-band CTA with WhatsApp/Telegram. /kvartira H1 stays sans (numeric).
**Why:** Home shipped a distinct editorial-luxury voice; every other surface read as a different product, breaking the brand the moment the buyer tapped a card.
**Affects:** `/diaspora`, `/zhk/[slug]`, `/kvartira/[slug]`, `/kvartiry`, `/novostroyki`, `/izbrannoe` page files. Cards (`BuildingCard`, `ListingCard`) deliberately untouched — separate global card pass. `/pomoshch-vybora` (GuidedFinder) + operator surfaces deferred. Inline fontFamily because Tailwind v4's default `--font-serif` shadows the @theme custom one.

---

## 2026-05-04 · Share, photo carousel, contact affordances, USP strip, developer filter

**Locked:** ShareButton on /kvartira + /zhk heroes (Web Share API / popover fallback). Photo carousel + fullscreen lightbox on /kvartira. WhatsApp contact pill on BuildingCard. 3-USP strip on home. Developer filter on /novostroyki. OpenGraph metadata on both detail pages.
**Why:** Multi-decision-maker buyers had no share affordance; static photo grid looked broken vs Cian/Bayut; buyers couldn't ask questions before clicking through.
**Affects:** `ShareButton`, `PhotoGallery`, `BuildingContactButton` blocks; `/novostroyki` FilterParams (`developer` param); `BuildingFilters.developerId`; OG metadata in both detail layouts.

---

## 2026-05-04 · Faridun walkthrough — anon saves, WhatsApp login, price chip, sort, relax counts

**Locked:** Anon saves via localStorage (migrated on login). WhatsApp callback card on /voyti (manual onboarding by design). PriceChip retargeted to total price. SortChip on list pages. MonthlyChip on /kvartiry. Relax-option buttons show live counts; no-op options dropped.
**Why:** Login wall on save heart killed shopping intent; WhatsApp-first market was Telegram-only; buyers think "до 220k total" not per-m².
**Affects:** `SaveToggle`, `AnonSavedView`, `/api/anon-saves/hydrate`, `/api/login-callback`, `/api/saved/migrate-anon`, `ListingFilters.maxMonthlyDirams`.

---

## 2026-05-04 · Retention loop — «Изменения» badge, view count, POI map, location filter in matcher

**Locked:** «Изменения» badge on /izbrannoe (from `saved_items.change_badges_seen_at`). View count + price-history trust signals on /kvartira. POI map overlay (pin + radius polygon). Saved-search matcher filters by `near_lat/lng` (haversine).
**Why:** No "did anything change?" signal meant no reason to revisit. View count + price drops are Cian's two most decisive comparison signals.
**Affects:** `services/listing-stats.ts`, `ListingTrustSignals` block, `MarkSavedItemsSeen`, `/api/saved/mark-seen`, `MapView` POI mode, `lib/filters/{listings,buildings}.ts`, `match.ts`.

---

## 2026-05-04 · POI search + browse-by-location

**Locked:** `pois` table + `/api/pois/search` + `LocationSearch` component. `near_lat/lng/radius` filter params on /novostroyki + /kvartiry. Home hero leads with LocationSearch.
**Why:** "Новостройки / Квартиры" speaks product taxonomy; buyers think "near my mom in Гулистон."
**Affects:** Migration 0017 (`pois`), `services/pois-search.ts`, `LocationSearch` block, `BuildingFilters` + `ListingFilters` `nearLat/nearLng/nearRadiusM`.

---

## 2026-05-04 · Audit fixes — auth nav, V1-cut 404s, mobile overflow, analytics hardening

**Locked:** SiteHeader is async server component (auth-aware). `/verifikatsiya/tier-2` + `/tier-3` → `notFound()`. Founder Telegram = `@idievabuali`. Mobile card chips: `max-w-full min-w-0`. Events API whitelist + rate limit. Filter logic in `lib/filters/`. `notifyMatchingListing` idempotent (claim-before-send).
**Why:** Browsing as actual user role surfaced whole-page bugs invisible from reading code alone.
**Affects:** `SiteHeader`, `MobileBottomNav`, `/api/events`, `lib/filters/`, `lib/saved-searches/match.ts`.

---

## 2026-05-04 · Analytics rebuild — decision-ready operator view

**Locked:** `/kabinet/analytics` shows 4-stage funnel + "Горячие лиды" + 0-result inventory gaps via `displayNameFromFilters()`. "Без команды" toggle on by default. Per-visitor drill-down with buyer profile + frictions.
**Why:** Raw counts + JSON events force reverse-engineering. Founder needs 30-second glance → know what to do.
**Affects:** `src/lib/analytics/profile.ts`, `src/lib/analytics/event-format.ts`, migration 0016 (`contact_requests.anon_id`).

---

## 2026-05-03 · Visitor analytics + saved searches + Telegram alerts

**Locked:** `events` table is analytics source of truth (free-form `properties jsonb`). `anon_id` cookie in `proxy.ts` (1y, HttpOnly). `saved_searches` + `subscribe_sessions` tables. Match-on-publish runs inline in `/api/inventory/create` + `/api/listings/moderate` (not cron).
**Why:** Founder needs to know what anonymous visitors do and how to follow up for inventory + iteration.
**Affects:** Migration 0015, `src/lib/saved-searches/match.ts`, `notifyMatchingListing()`, `/api/auth/poll` (anon_id stitch).

---

## 2026-05-03 · Founder-only publishing + ContactCard

**Locked:** `/post` shows `PostFlow` for founder role only; everyone else sees `ContactCard` (WhatsApp / Telegram / phone). Founder contacts in `src/lib/founder-contacts.ts`.
**Why:** Founder reviews every listing anyway — removing self-serve removes a whole UX surface with no benefit at V1 volume.
**Affects:** `/post` route, `/kabinet` CTAs, migration 0014.

---

## 2026-05-03 · Post form — location picker, developer modal, number input fix

**Locked:** `LocationPicker` (MapLibre drag pin) replaces centroid fallback. `NewDeveloperModal` for inline developer creation. `NumberField` replaces all `type="number"` inputs (fixes clear-on-type bug).
**Why:** Buildings were stacking on district centroids; developer dropdown was a dead end; number inputs couldn't be fully cleared.
**Affects:** `LocationPicker` block, `NewDeveloperModal`, `NumberField` primitive, `/api/developers/create`.

---

## 2026-05-02 · Photos end-to-end

**Locked:** `listing-photos` Storage bucket. `buildings.cover_photo_id` with named FK `buildings_cover_photo_fk`. Always use `BUILDING_SELECT` / `LISTING_SELECT` constants in `services/buildings.ts` — never bare `select('*')`. Auto-publish building on first listing approval.
**Why:** Placeholder color cards read as empty/fake to real users. Photos are a V1 trust requirement, not V2.
**Affects:** Migrations 0012–0013, `services/photos.ts`, `PhotoPicker`, `/api/storage/upload`, all card + hero components.

---

## 2026-05-01 · Listing lifecycle, bathroom convention, edit form

**Locked:** `bathroom_separate` boolean (migration 0011) — TJ convention is type (раздельный / совмещённый), not count. Re-moderation on non-founder edits: price drop ≥10% / rooms change / size >5m². Compare hidden via `FEATURES.compare = false`.
**Why:** First-pass had no data persistence; bathroom count is the wrong convention for the TJ market.
**Affects:** `services/buildings.ts` lifecycle methods, migration 0011, `/post/edit/[id]`.

---

## 2026-04-25 · V1 = Vahdat-only

**Locked:** `ACTIVE_CITY = 'vahdat'` in `services/buildings.ts` is the master filter on every public query. District filter UI hidden (too few buildings per district to be useful).
**Why:** Smaller market validates the playbook; founder can do manual ops locally. Flip the constant to re-introduce Dushanbe.
**Affects:** All public queries in `services/buildings.ts`.
