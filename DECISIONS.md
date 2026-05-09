# DECISIONS

Direction changes that override the original spec stack. Read at session start. Append when a new direction lands.

**Format rule — strictly enforced:** each entry is 4–6 lines max: title + date, what locked (1–2 lines), why (1 line), what it affects (key files/routes/tables only). No commit SHAs, persona notes, deferred lists, or verification logs — those belong in `git log`.

Newest at top.

---

## 2026-05-09 · Pre-launch hardening pass — auth, /kabinet polish, standalone-listings rendering

**Locked:** Three exploration agents audited navigation / auth-and-save / kabinet visual cohesion before opening Vafo.tj to real users; findings tiered P0/P1/P2 and fixed in one PR + a roleplay-found follow-up. **Functional:** open-redirect on `/voyti?redirect=` rewrites absolute URLs to `/`; HomeSubscribeButton shows a success toast for already-logged-in Telegram users (was a silent fail); SaveToggle stashes its intent into sessionStorage on a 401 and a layout-mounted `RetrySaveOnReturn` re-fires it after login (was lost). **Visual cohesion across operator pages:** `/kabinet`, `/kabinet/saved-searches`, `/post`, `/post/edit/[id]` get Source Serif H1s + uppercase-tracked stone-500 eyebrows + py-8 md:py-10 spacing — they used to read as a different product than the buyer-facing pages. ModerationList rows now wrap in `AppCard` (was raw divs); empty state added; mobile phone+timestamp split. ListingActions delete confirm changed from rose-600 → stone-700 (no-red rule). **Critical roleplay bug:** /kabinet "Мои объявления" was silently dropping every standalone listing (post-migration 0019, building_id null) via `if (!building) return null;` — sellers with only standalone listings saw "34 объявлений" and zero cards. Now renders the standalone with `street_address` + `Без ЖК` chip + skipped developer-verification.
**Why:** Founder explicitly flagged kabinet "looks off" + "back button takes me to wrong place" + "asks me to log in again when I save" before launch. The pass closed every issue with a real user-impact root cause; the rest are V2 polish.
**Affects:** `src/components/blocks/{HomeSubscribeButton,SaveToggle,RetrySaveOnReturn}.tsx` (last is new), `src/app/[locale]/voyti/page.tsx`, `src/app/[locale]/kabinet/{page,ModerationList,ListingActions,saved-searches/page}.tsx`, `src/app/[locale]/post/{page,edit/[id]/page}.tsx`, `src/app/[locale]/layout.tsx` (mounts RetrySaveOnReturn). Build/lint/typecheck clean; manual roleplay across home → /kvartiry → filter+back → save → /izbrannoe → /post → /kabinet (operator) → /kabinet/saved-searches → /diaspora → /tsentr-pomoshchi → /pomoshch-vybora done with no remaining functional regressions.

---

## 2026-05-09 · Rebrand from ЖК.tj to Vafo.tj

**Locked:** New name **Vafo.tj** (Latin script, `.tj` is part of the wordmark, not just the domain — same CIS pattern as Krisha.kz / Bina.az / Somon.tj). The word *vafo* is Tajik/Persian for "faithfulness, loyalty, fidelity" — interpersonal trust, not institutional. Visual system kept unchanged (terracotta-700 + stone palette + Source Serif 4); only the wordmark text + favicon (`V` glyph) + edge-rendered OG image change. 17 wordmark instances across 9 files updated; root metadata gets `metadataBase`, `Vafo.tj` title template, OpenGraph siteName + favicon references. Added `public/favicon.svg` and `src/app/opengraph-image.tsx` (1200×630 PNG via `next/og` at the edge). Telegram-bot copy updated; bot username @zhk_tj_bot → @VafoTjBot referenced in comments only (actual handle is read from `TELEGRAM_BOT_USERNAME` env var, swapped at deploy time). Fallback chain if Vafo is blocked at procurement: Эътимод → Меҳр → Боварӣ.
**Why:** "ЖК" is Russian real-estate jargon (no warmth, no positioning) and the brand needed Latin script + `.tj` suffix for parity with the established CIS pattern. *Vafo* bakes trust + warmth into a single 4-letter word with a 1000-year cultural pedigree without anchoring to one city or segment.
**Affects:** `src/components/layout/{SiteHeader,SiteFooter}.tsx`, `src/app/[locale]/{page,voyti/page,pomoshch-vybora/page,sravnenie/page,diaspora/page}.tsx`, `src/app/api/telegram/webhook/route.ts`, `src/app/layout.tsx`, `src/app/opengraph-image.tsx` (new), `src/lib/{analytics/friction-alerts,saved-searches/format,founder-contacts}.ts`, `scripts/{setup-telegram,fire-test-notification,seed-vahdat-pois}.mjs`, `public/favicon.svg` (new). Domain procurement (`vafo.tj`), bot username (`@VafoTjBot`), and env var swap (`NEXT_PUBLIC_SITE_URL`, `TELEGRAM_BOT_USERNAME`) are founder-side deploy steps; legacy `ЖК.tj` 301-redirects for at least 12 months.

---

## 2026-05-07 · `/post` location-pick correctness pass

**Locked:** LocationSection now tracks an explicit `target` (lat/lng/key) — POI picks set target to the POI's own coords; LocationPicker flies to / re-emits whatever the parent passes (no more centroid overwrite). `nearestDistrictId` skips districts whose centroid matches the Vahdat-fallback (was always returning districts[0] = Центр when all five rows had NULL centroids). PostFlow redirect after submit branches on mode + uses `data.created[0].slug` for standalone / single-apartment posts (was hitting /novostroyki). AddressAutocomplete dropdown shows Russian POI kind + district labels. Migration 0020 backfills the five Vahdat district centroids with rough approximations.
**Why:** Prod roleplay caught the bugs end-to-end — POI picks saved Vahdat-center coords, district stuck on Центр, standalone post landed on /novostroyki, dropdown rows read "supermarket · gulistan."
**Affects:** `src/app/[locale]/post/{LocationSection,LocationPicker,AddressAutocomplete,PostFlow}.tsx`, `src/lib/listings/nearest-district.ts`, `supabase/migrations/0020_district_centroids.sql`.

---

## 2026-05-07 · Seller self-serve `/post` with founder moderation + verification call

**Locked:** Pivoted off the V1 "founder-only publishing" lock. Any phone-verified user (Telegram bot login captures `users.phone`) sees PostFlow at `/post`; non-founder submissions land in `status='pending_review'` and surface in the founder's `/kabinet` ModerationList. Founder reviews each row, calls/visits the seller using the captured phone, then approves via `/api/listings/moderate` — approval flips status, auto-publishes the parent building, fires saved-search match-on-publish, sends seller a Telegram DM. Founder gets a Telegram DM via `notifyPendingListing()` the moment a non-founder submits. Anonymous /post → redirect to /voyti?redirect=/post. Form gained: required-field markers + inline error highlighting (A1), per-m² hint with district benchmark (A2), localStorage autosave with 24h restore banner (A3), confirm-before-publish modal (A4), partial-failure inline block (A5), photo-first nudge for sellers (A6).
**Why:** Manual "message us, we'll post for you" was a conversion drag; sellers can self-serve safely now that every login is phone-verified and every submission is founder-reviewed before going public.
**Affects:** `src/app/[locale]/post/page.tsx`, `src/app/[locale]/post/PostFlow.tsx`, `src/app/[locale]/post/draft-storage.ts` (new), `src/app/api/inventory/create/route.ts`, `src/lib/analytics/founder-notify.ts`, `src/app/[locale]/kabinet/page.tsx`, `src/components/primitives/{AppInput,AppSelect}.tsx` (red `*` on `required`). Pipeline that was already wired (moderation route, queue UI, listing actions) reused untouched.

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
