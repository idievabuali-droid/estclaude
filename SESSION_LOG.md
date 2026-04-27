# SESSION_LOG

Track of build progress across sessions. Most recent first.

---

## Session 7 — 2026-04-26 — Audit-driven UX fixes + 3 wedge features

**Goal:** Fix every visible bug + journey gap from the audit, then build the three wedge features that make us genuinely different from Somon.tj / Cian for the Tajik market.

### Audit fixes (bugs + removals + journey gaps)

11 visible bugs, 9 user-journey gaps, 3 removals — all addressed. Highlights:

- **Building detail icon overlap** (BUG-1) — removed the centered Building Lucide that was bleeding through the title; cleaner status chip in top-left
- **Listing detail hero** (BUG-2/3) — compact 16:9 hero with title overlaid; redundant h1 dropped
- **Dashboard rows** (BUG-4) — 64×64 thumbnail instead of 4:3 placeholder eating the viewport
- **Compare on mobile** (BUG-5) — vertical stacked cards on mobile (one full-width per listing with diff highlight); table only on tablet+
- **Map markers** (BUG-7) — `price_from_dirams` computed at read time so markers show "от 567K TJS" instead of falling back to building names
- **Sticky bar** (BUG-8) — WhatsApp = labeled CTA, Call + Visit = icon-only secondary buttons; no more text squeeze
- **Stats grids** (BUG-9) — 3-column horizontal even on mobile
- **Fairness signal** (BUG-10) — colored chip per level instead of weak gray text
- **Homepage hero** (BUG-11) — trimmed so featured projects peek above the fold
- **Bookmark login prompt** (REMOVE-2 + JOURNEY-3) — `<SaveToggle>` shows a toast "Войдите, чтобы сохранять" with a one-tap login link instead of a silent no-op
- **Compare button visibility** (REMOVE-3) — secondary action, smaller and quieter until used
- **Building detail sticky sub-nav** (JOURNEY-4) — Квартиры (3) / Ход стройки / Описание / Что рядом / Застройщик anchor links
- **Guided finder routing** (JOURNEY-5) — passes all 5 answers; routes to `/kvartiry` when unit-level criteria are picked, `/novostroyki` otherwise
- **ChangeBadge links** (JOURNEY-6) — each badge wraps in a Link to the affected listing/building with context label
- **Post draft localStorage** (JOURNEY-7) — Zustand store persisted to localStorage; wired into details step
- **Empty dashboard** (JOURNEY-8) — hides the 0/0/0 stats grid when there are no listings
- **Breadcrumbs** (JOURNEY-9) — listing detail shows "Квартиры > ЖК Sitora Hills > 2-комн · 64,5 м²"

### 3 wedge features — what makes us actually different

**WEDGE-1: Construction-progress timeline** (`/zhk/[slug]/progress`)
- New route — every Cian ЖК has `/hod-stroitelstva/`. We now do too.
- Photos grouped by month (Апрель 2026 / Март 2026 / ...)
- Each tile shows date stamp + "Загружено · Ситора Девелопмент" attribution
- Trust block at the bottom explaining provenance: "Каждое фото загружено застройщиком (или командой при выезде). Мы проверяем дату, метаданные..."
- Linked from the building detail sub-nav with a camera-icon chip
- Seeded 6 monthly placeholder photos per under-construction building (12 total). When real Storage uploads land, the same data layer renders real images.

**WEDGE-2: "Что рядом" POI section** with real OpenStreetMap data
- New `services/poi.ts` queries Overpass API for 8 categories per building's lat/lng
- Categories: 🕌 Мечети, 🏫 Школы, 👶 Детсады, 🏥 Поликлиники, 🛒 Магазины, 🚌 Транспорт, 🌳 Парки, 💊 Аптеки
- **Mosque is first-class** — no Russian platform offers it as a category. Cultural differentiator for Tajikistan.
- Format: nearest 3 per category with walking minutes + meters
- Source attribution: "Источник — OpenStreetMap" — halal-by-design, no opaque scoring
- 24h fetch cache via `next: { revalidate }`
- Required `User-Agent` header (Overpass returns 406 without it — caught and fixed during build)
- Rendered on building detail (`/zhk/[slug]`) and listing detail (`/kvartira/[slug]`)
- Real data confirmed: at Sitora Hills (38.5598, 68.787) we get 3 nearby mosques, "Средняя школа № 20", "Детский садик Minions", actual bus stops with Tajik names like "Истгоҳи Парки Рӯдакӣ"

**WEDGE-3: Source-transparent verified-developer dialog**
- New `<VerifiedDeveloperButton>` — wraps the existing badge as a clickable button
- On tap, opens a modal listing exactly what was checked:
  - ✓ Контакт с офисом застройщика — Подтверждено по телефону 12 января 2026 г.
  - ✓ Лицензия на строительство — Документ загружается ↗ (placeholder until real PDFs)
  - ✓ Эскроу-счёт
  - ✓ Разрешение на строительство (РНС)
  - ✓ Опыт — 8 лет на рынке · 12 сданных проектов
- Bottom card: "Мы не выдаём гарантий — только проверяем источники. Если что-то здесь окажется неточным, напишите нам, и мы пересмотрим статус."
- Beats Cian's opaque "Проверено" badge by being honest about what was checked.

### Files changed

- `services/buildings.ts` — `fillPriceFrom` for read-time `price_from_dirams`; `getBuildingsByIds` for compare batch
- `services/listings.ts` — `getListingsByIds` for compare batch
- `services/saved.ts` — `getRecentChangeEvents` enriches each row with `href` + `context`
- `services/seller.ts` — wired earlier; reused
- `services/benchmarks.ts` — used by /kvartiry for fairness signal
- `services/poi.ts` (new) — Overpass API integration
- `services/progress.ts` (new) — month-grouped progress photos
- `app/[locale]/zhk/[slug]/page.tsx` — full rebuild: compact hero, sticky sub-nav, POI, verified dialog
- `app/[locale]/zhk/[slug]/progress/page.tsx` (new) — construction timeline
- `app/[locale]/kvartira/[slug]/page.tsx` — breadcrumbs, compact hero, POI, redundant h1 removed
- `app/[locale]/sravnenie/page.tsx` — mobile vertical cards
- `app/[locale]/kabinet/page.tsx` — compact rows, conditional stats
- `app/[locale]/page.tsx` — trimmed hero
- `app/[locale]/izbrannoe/page.tsx` — change badges as Links
- `app/[locale]/post/details/page.tsx` — Zustand draft persistence
- `components/blocks/{SaveToggle,VerifiedDeveloperButton,NearbyPois}.tsx` (new)
- `components/blocks/{ListingCard,BuildingCard,FairnessIndicator,StickyContactBar,CompareToggle}.tsx` — improved
- `lib/post-draft-store.ts` (new) — Zustand persisted draft

### Verification

- `npm run build` — clean, **23 routes** (added `/zhk/[slug]/progress`)
- `npm run lint` — clean
- Mobile screenshots confirm:
  - Building detail hero is clean (no icon overlap)
  - Sticky sub-nav works with Ход стройки + Что рядом chips
  - "Проверенный застройщик" badge opens a 5-row dialog with explicit checks
  - "Что рядом" renders real OSM mosques + schools + kindergartens
  - Construction progress timeline groups photos by month with date stamps

### What's next

Per the audit, top remaining items:
- **WEDGE-4**: response-time + response-rate stats on developer cards (needs real contact_requests data)
- **WEDGE-5**: Расчёт рассрочки + Доступность жилья calculators (no Russian platform has these)
- Photo carousel on listing cards (universal pattern; M cost, High value)
- "Ready to move in" filter (single most-asked filter on new-build platforms)
- Real photos pipeline (heic2any → Supabase Storage)
- Telegram Bot OTP for auth → unlocks save, contact submission, post-listing DB writes

---

## Session 6 — 2026-04-26 — Compare bar, mobile filters, map view, more DB wiring

**Goal:** Build the remaining UI features that don't need external accounts. Wire the seller dashboard, saved page, and compare page to real Supabase queries.

### What was built

**Map view at `/novostroyki?view=karta`**
- `MapView` component using **MapLibre GL JS + OpenFreeMap** (free, OSM tiles, no API key)
- Pan/zoom controls top-right, fitBounds across all visible buildings on load
- Each building rendered as a clickable price-pill marker; click reveals a floating preview card with cover, name, address, "от X TJS" and a tap-through to `/zhk/[slug]`
- Toggle between list and map via "Карта" / "Список" button in the page header
- Caught a layout bug along the way (Maplibre overrides `position: absolute`); fixed by giving the container an explicit `width: 100%; height: 100%` instead of relying on Tailwind utilities

**Compare set + sticky bar**
- `lib/compare-store.ts` — Zustand store persisted to `sessionStorage`. Holds the type (`buildings` or `listings`) and an array of IDs. Caps at 4 items per Architecture. Switching type clears.
- `CompareToggle` component — small ⚖ icon button overlaid on every card cover (next to the bookmark). Filled terracotta with checkmark when active.
- `CompareBar` (Layer 7.13) — sticky bottom bar that appears when 1+ items are selected. Shows count, item chips (desktop), `Очистить` and `Сравнить` actions. Sits above the mobile bottom-nav. Uses manual hydration to avoid SSR mismatch.
- Mounted in locale layout once, available on every page.
- Compare page (`/sravnenie`) rewired to fetch by IDs from Supabase via new `getListingsByIds` / `getBuildingsByIds` services. Includes ALL statuses (active + sold + expired) so shared compare links never break — sold/snyato items render greyed-out (per Tech Spec §8.13).

**Mobile filters wrapper**
- `MobileFiltersWrapper` — collapses inline chip filters into a `AppBottomSheet` triggered by the "Фильтры" button on mobile. On tablet+ (`md:`) the chips render inline as before.
- Active filter count is shown as a terracotta badge on the trigger button.
- Wired into both `/novostroyki` and `/kvartiry`.

**Dashboard, saved, fairness — all wired to DB**
- `services/seller.ts`: `listMyListings()`, `getMyDashboardStats()`, `getMyNotifications()` all query Supabase. Hard-coded `MOCK_FOUNDER_USER_ID` until Telegram auth lands; comment marks the swap point.
- `services/saved.ts`: `getMySavedItems()`, `getRecentChangeEvents()` query saved_items + change_events tables.
- `services/benchmarks.ts`: `getDistrictBenchmark(id)` and `getDistrictBenchmarks(ids[])` read `district_price_benchmarks`. Fairness signal on listing cards now pulls real medians from the DB (was using hand-picked mock numbers).

**Seed data extension**
- District price benchmarks for all 5 districts (sample sizes 5–18)
- 5 saved items + 3 change events for the founder user (so /izbrannoe shows real content)
- 3 Storage buckets created via service-role: `public-photos`, `progress-photos`, `verification`

### Bugs caught + fixed during the session

- **`--spacing: initial;` was killing every height utility.** Earlier session — buttons were rendering at 96px tall. Removed the override; documented the convention.
- **Maplibre container had 0 height.** Replaced Tailwind arbitrary value with inline `style={{ height: '100%' }}` — Maplibre's runtime CSS overrode the absolute positioning.
- **Verified-developer badge wrapping in cards.** Restructured ListingCard / BuildingCard so the badge sits above the price instead of competing for horizontal space.
- **Placeholder covers looked like wireframes.** Added building-icon overlay + "2-комн · 64,5 м²" text overlay so empty cards feel intentional.
- **Stale Turbopack parser errors** kept reporting deleted code as broken — wasted ~30 min before realizing `npm run build` was clean. Now I trust the production build over dev-server console errors.

### Verification

- `npm run build` clean — **22 routes** total
- All 4 buyer pages render real Supabase data (homepage, /novostroyki, /kvartiry, /zhk/[slug], /kvartira/[slug])
- /novostroyki?view=karta renders Maplibre map with 4 building markers
- /kabinet shows real founder listings + stats
- /izbrannoe shows real saved items + change badges
- /sravnenie fetches by URL IDs from Supabase
- Mobile (375px viewport) screenshot confirmed: filter sheet trigger, compare button, compare bar all working

### What's still pending (needs your accounts)

Per `WHAT_I_NEED.md` — Telegram bot is the biggest remaining unlock. After that I can wire login, save, contact submission, and seller-side DB writes for real.

---

## Session 5 — 2026-04-25 — Supabase wired, real data flowing

**Goal:** Provision the real Supabase project, apply the schema, seed minimal data, and swap every page from mock to real DB queries.

### Setup decisions made along the way

- **Supabase CLI access token was the wrong path.** The CLI's `link` command requires a personal access token from your Supabase account. Skipped that — the project ref + DB password is enough for direct SQL access.
- **Tried direct DB connection via `pg` package — got "Tenant or user not found".** Free tier projects route everything through Supavisor and the regional pooler hostname wasn't matching. Pivoted to the SQL editor in the dashboard.
- **Combined all 7 migrations into one file** (`supabase/_combined.sql`) and pasted into the dashboard SQL editor. First run failed on `coalesce(finishing_type::text, 'all')` because enum→text cast is STABLE not IMMUTABLE — fixed by switching to `unique nulls not distinct` (Postgres 15+). Also dropped the PostGIS gist index in favour of a B-tree on (latitude, longitude) since PostGIS extension activation was unreliable.
- **Schema verified via the supabase-js SDK** with the service_role key. All 17 tables responded.
- **Seed data inserted via `scripts/verify-and-seed.mjs`** using the service_role key (bypasses RLS): 5 districts, 3 developers (2 verified), 1 founder user, 4 buildings, 8 listings.

### What's now wired

- **services/buildings.ts** queries Supabase directly:
  - `listBuildings(filters)` — applies district/status/price filters server-side, joins district by slug
  - `listFeaturedBuildings(limit)` — for the homepage
  - `getBuilding(slug)` — detail page (pulls building + developer + district + active listings in 4 queries)
  - `getDeveloperById`, `getDistrictById`, `listDistricts`, `getListingsForBuildingId`
- **services/listings.ts** queries Supabase directly:
  - `listListings(filters)` — applies filters then sorts client-side by **effective trust tier** (Tech Spec §9.4), batching the developer-verified lookup
  - `getListing(slug)` — detail page (pulls listing + building + developer + district + similar in parallel)
  - `submitContactRequest()` still a stub until auth context lands
- **All 4 buyer pages** now call services instead of `lib/mock`:
  - Homepage
  - `/novostroyki` — projects browsing
  - `/zhk/[slug]` — building detail
  - `/kvartiry` — apartments browsing
  - `/kvartira/[slug]` — listing detail
- **Hand-written `Database` type** in `src/types/supabase.ts` covers the 4 main tables. SDK clients no longer pass the generic — mappers in services do explicit row→domain coercion (handles bigint, JSON shapes). When we get a CLI access token we'll regenerate via `supabase gen types`.
- **Coexistence with mock data** — `lib/mock.ts` still exists for the seller dashboard and other places that aren't yet wired. They'll get migrated as needed.

### Verification

- `npm run build` — clean, **20 routes** (now hitting Supabase for the buyer-facing 5)
- Screenshots confirm:
  - Homepage shows 3 featured buildings from DB (Sitora Hills, Rudaki Residence, Bahor Park)
  - `/novostroyki` shows "4 проектов" with 5 district chips loaded from `districts` table
  - `/zhk/sitora-hills` shows full building detail with "Проверенный застройщик" badge (developer.status='active' AND verified_at not null)
  - `/kvartira/444401-101` shows the seeded 2-комн listing with proper source chip

### What's still mock vs real

| Area | State |
|---|---|
| Districts | ✅ Supabase |
| Developers | ✅ Supabase |
| Buildings | ✅ Supabase |
| Listings | ✅ Supabase |
| District price benchmarks (fairness) | ⚠️ Mock — need to seed `district_price_benchmarks` |
| Saved items | ⚠️ Mock — needs auth |
| Compare batch | ⚠️ Mock — endpoint not built |
| Notifications inbox | ⚠️ Mock — need auth + real events |
| Photos | ⚠️ Colored placeholders — need Supabase Storage upload pipeline |
| Auth (login, post, save, contact) | ⚠️ Mock toasts — needs Telegram bot |

### Files added or significantly changed

- `scripts/apply-migrations.mjs` — direct pg-based migration runner (kept for future)
- `scripts/verify-and-seed.mjs` — schema check + initial seed
- `supabase/_combined.sql` — single-file migration for SQL editor
- `src/types/supabase.ts` — hand-written Database type
- `src/services/buildings.ts`, `src/services/listings.ts` — full Supabase implementation
- `src/lib/supabase/{client,server}.ts` — dropped Database generic so SDK returns inferred types

### What I need from you next

Per `WHAT_I_NEED.md` — Telegram bot (~5 min) is the biggest remaining unlock. After that I can wire login, save, contact submission, and all the seller-side flows for real.

---

## Session 4 — 2026-04-25 — All UI-only pages I can build without your accounts

**Goal:** Build everything that can be done without external accounts (Supabase, Telegram bot, etc.) so when those get wired, the swap is mechanical. End the session with a clear list of what I need from the user.

### What was built

**Services layer scaffolding** (`src/services/`)
- `services/buildings.ts` — `listBuildings(filters)`, `getBuilding(slug)`, `listFeaturedBuildings()`
- `services/listings.ts` — `listListings(filters)` with the Tech Spec §9.4 trust-weighted ranking baked in, `getListing(slug)`, `submitContactRequest()` stub
- `services/auth.ts` — `requestOtp({ phone })`, `verifyOtp({ phone, code })`, `getCurrentUserPhone()` stubs marked SPEC-GAP for Telegram bot wiring
- All currently delegate to `lib/mock.ts`. The page-level imports point at `services/*` so swapping mock → real Supabase is one file change per service.

**Login page** — `/voyti`
- Phone input pre-filled with `+992 ` (Tajikistan country code)
- Two-stage flow: phone entry → "code sent" toast → 6-digit OTP entry → success
- Toast confirms which channel sent the code (Telegram vs SMS)
- Error states with inline help text under each field
- `?redirect=/some/path` query param so we can route back after auth

**8-step posting flow** — `/post/*`
- Each step is a distinct route per UI Spec Page 12 (refresh-resilient): `/post/phone`, `/post/ownership`, `/post/building`, `/post/details`, `/post/photos`, `/post/review`, `/post/published`
- Shared `PostShell` component renders a step counter + progress bar at top, "Назад" link to previous step
- `phone`: same OTP UX as `/voyti`, integrated into the flow
- `ownership`: 3 large source-type cards (Owner / Intermediary / Developer), with conditional warning when Developer is picked ("сначала подтвердим застройщика")
- `building`: search + select existing buildings with district/address, plus "Add new" CTA
- `details`: rooms, m², floor, price, finishing radio group, conditional installment fields (3 sub-fields appear when toggled), description textarea with counter
- `photos`: file picker with camera-capture, 5–15 enforced, drag-to-cover-via-star, remove button per photo, live count, blue tip card
- `review`: summary table + halal-by-design reminder + agreement checkbox + Publish button (mock 600ms latency for feel)
- `published`: success state + Tier 3 verification upsell card

**Guided finder** — `/pomoshch-vybora`
- 5 questions: districts (multi), budget, rooms, finishing, timing
- Step counter + progress bar
- Multi-select chips for districts and rooms; cards for budget / finishing / timing
- Skip option on districts ("все районы")
- Final answer routes to `/novostroyki?district=...&price_to=...` so the result page is the existing browsing page with filters pre-applied — clean integration, no separate "results" page needed for the demo

**Tier 2 verification** — `/verifikatsiya/tier-2`
- Inline 5-step state machine: intro → ID photo → selfie → review → submitted
- Camera-capture file inputs (mobile camera opens directly via `capture="environment"`)
- Live previews after upload
- Final state shows expected 24-48h review time and links to Tier 3

**Tier 3 verification** — `/verifikatsiya/tier-3`
- Intro card with bullet list of what to expect
- Listing picker (which apartment to verify)
- 3-tap scheduling per UI Spec Page 14: pick day from next-8-days chips → pick time slot from 5 windows → confirm
- Final state with date + slot confirmation

**Mobile bottom navigation** (`MobileBottomNav`)
- 4 items: Новостройки, Квартиры, Избранное, Кабинет
- Each with Lucide icon + label
- Active state highlights current section in terracotta
- Auto-hides on `/post/*` and `/verifikatsiya/*` flows so it doesn't fight the in-flow next/back UI
- Safe-area inset bottom padding
- Layout's main element gets `pb-16 md:pb-0` to clear the bottom nav

**Help center** — `/tsentr-pomoshchi`
- Static markdown-style FAQ index (8 articles): verification tiers, finishing types, fairness signal, source chips, installment, safety, becoming verified, diaspora flow
- Linked from the existing footer
- Article-detail pages (`/tsentr-pomoshchi/[slug]`) intentionally not built yet — Blueprint §20.1 was deferred to "static markdown for V1," real markdown rendering is its own slice

### Verification

- `npm run build` clean — **20 routes total** across `/ru` and `/tg`
- `npm run lint` clean
- Screenshot-verified: `/voyti`, `/post/phone`, `/pomoshch-vybora`, `/verifikatsiya/tier-3`, mobile homepage with bottom nav

### What I CANNOT do without you

See `WHAT_I_NEED.md` at the project root.

---

## Session 3 — 2026-04-25 — Visual bug fixes + 4 more pages

**Goal:** Catch and fix visual bugs by screenshotting the running dev server, then build out the remaining buyer surface (saved, compare, diaspora) plus the seller dashboard.

### Visual bug fixed (the big one)

**`--spacing: initial;` was breaking every component dimension.**
- The Design System spec says to set `--spacing: initial;` in `@theme` to "force only the 9 named values."
- Following that literally killed Tailwind v4's default spacing multiplier — so every utility like `h-9` (button-sm = 36px), `h-11` (button-md = 44px), `size-9` (bookmark circle), `px-4`, `gap-3` started falling back to the explicit `--spacing-N` tokens. `--spacing-9 = 96px` (page-section padding), so buttons became 96px tall and bookmark circles became 96px wide.
- Fixed by removing `--spacing: initial;` and documenting the new convention: keep Tailwind's dynamic scale, enforce the 9-step layout discipline via code review.
- After-screenshot confirmed: buttons and chips are proper sizes, no more "buttons-as-cards."

### Visual polish caught and fixed via screenshot review

- **"Проверенный застройщик" badge wrapping to 2 lines** in ListingCard — squeezed price into narrow column. Restructured ListingCard so the verification badge sits above the price (full-width row), not next to it.
- **BuildingCard verified badge** — moved to its own row, with truncated district + address line.
- **Placeholder covers looked like wireframes** — added a centered building-icon + name overlay on BuildingCard covers, and rooms+m² overlay on ListingCard + listing detail hero. Subtle bottom gradient for legibility. Looks intentional now instead of "we forgot to add photos."
- **Building detail hero** — added centered Building icon overlay and gradient.

### 4 new pages built

- `/[locale]/izbrannoe` — Saved page with tabs (Квартиры / Новостройки), `Что изменилось` strip rendering ChangeBadges in proper calm colors (green/stone/amber, never red), and proper empty state.
- `/[locale]/sravnenie` — Compare table with sticky first column, "best price" highlighted in green with checkmark, supports both `type=listings` and `type=buildings`. URL-only state per Architecture.
- `/[locale]/diaspora` — Landing for buyers in Russia/abroad: terracotta hero with badge, 3 trust pillars (verification / source / messengers), featured projects, contact channel cards (WhatsApp / Telegram / IMO).
- `/[locale]/kabinet` — Seller dashboard: stats grid (active / views / requests / visits), two-column layout with listings (left, 2/3 width) + notifications inbox (right, 1/3 width), each listing row has mini cover + title + source/verification chips + price + Edit/Hide/Upgrade-Tier-3 buttons.

### Workflow improvement

Now using `preview_screenshot` + `preview_resize` + `preview_eval` after every visible change to catch issues before moving on. The spacing bug above proves the value — it would have shipped invisible if I hadn't actually looked.

### Verification

- `npm run build` clean, **9 routes generated** (was 5 last session)
- `npm run lint` clean
- Visual confirmation via screenshots on /, /novostroyki, /kvartiry, /zhk/sitora-hills, /kvartira/..., /izbrannoe, /sravnenie, /diaspora, /kabinet

### What's next

**Remaining buyer surface:**
- Page 2 — `/pomoshch-vybora` guided finder (5-step wizard)
- Page 4 — `/novostroyki?view=karta` map view (MapLibre)

**Remaining seller surface:**
- Page 12 — `/post/*` 8-step posting flow
- Page 14 — `/verifikatsiya/tier-2` and `/verifikatsiya/tier-3` flows

**Backend wiring** (when Supabase is provisioned): swap `lib/mock.ts` imports for service-layer queries, wire Telegram Bot OTP, Server Actions for save/contact, photo upload pipeline.

---

## Session 2 — 2026-04-25 — Buyer browsing journey

**Goal:** Wire up a clickable buyer journey end-to-end with mock data: homepage → projects list → building detail → apartments list → listing detail → contact modal.

### What was built

**Remaining Layer 6 primitives**
- `AppSelect` — native select styled to match AppInput (mobile bottom-sheet upgrade deferred)
- `AppCheckbox` — 20×20 visible / 44×44 hit area, terracotta-600 fill when checked
- `AppTextarea` — min 4 rows, optional counter when `maxLength` is set, `'use client'` for state
- `AppRadio` + `AppRadioGroup` — context-driven, single-select
- `AppModal` — native `<dialog>` with backdrop click-to-close, optional close button
- `AppBottomSheet` — native `<dialog>` styled to slide from bottom, safe-area-inset bottom padding
- `AppToaster` + re-exported `toast` — sonner wrapper, top-center, single-toast (AI_CONTRACT rule 6)

All 12 primitives now exist. shadcn CLI not run — primitives built directly.

**Mock data module** (`src/lib/mock.ts`)
- 5 districts (4 in Dushanbe + 1 Vahdat) with bilingual names
- 3 developers (2 verified, 1 not, mixed `has_female_agent`)
- 4 buildings across all 4 statuses (announced / under_construction / near_completion / delivered)
- 8 listings with mixed sources (developer / owner / intermediary), all 4 finishings, all 3 verification tiers, installment plans where applicable
- District price benchmarks for fairness signal computation
- Helper functions: `getDeveloper`, `getDistrict`, `getBuildingBySlug`, `getListingBySlug`, `getListingsForBuilding`, `getDistrictMedianPerM2`
- Shapes mirror Data Model v2 §5 — swap to Supabase by replacing the imports

**Layer 7 platform components**
- `InstallmentDisplay` — card + inline variants. AI_CONTRACT rule 4: NO interest rate, just monthly + first payment + duration
- `ListingCard` — full Layer 7.7 spec: cover, source chip, bookmark, price, per-m², verification, rooms+size+finishing, building name, fairness, installment hint
- `BuildingCard` — Layer 7.8: cover, status chip, name, district, from-price, handover, optional matching-units preview (Blueprint §8.6 Row 5)
- `StickyContactBar` — mobile sticky bottom bar with WhatsApp / Call / Visit (Layer 7.10), safe-area inset
- `ChangeBadge` — 5 change types, all using calm colors (amber for status — never red, halal-by-design)

**Pages — buyer surface (locale-aware, server-rendered)**
- `/[locale]/` — Homepage rebuilt to show 3 featured projects via real `BuildingCard` instead of smoke-test
- `/[locale]/novostroyki` — Projects browsing with district + status filters in URL state, empty state, "card grid" responsive layout
- `/[locale]/kvartiry` — Apartments browsing with rooms/source/finishing filters in URL state, **trust-weighted sort** (verified developer ranks above tier 3, then by published date)
- `/[locale]/zhk/[slug]` — Building detail: hero, identity row, key stats grid, developer-verified trust block, about section, available units grid, developer card, finishing legend
- `/[locale]/kvartira/[slug]` — Listing detail: hero, title block with price + fairness, key facts grid, finishing description, installment block, description, building summary, similar listings + **mobile sticky contact bar with working "request visit" modal**
- Listing detail has Open Graph metadata via `generateMetadata` for WhatsApp/Telegram link sharing (AI_CONTRACT engineering rule 9)

**Verification**
- `npm run typecheck` clean
- `npm run lint` clean (1 unused-import warning, fixed)
- `npm run build` clean — 6 routes generated, 4 dynamic, 2 static SSG

### Notable decisions during this session

- Skipped shadcn CLI init for speed; wrote primitives directly. Adding shadcn-via-Radix later (especially for Dialog/Sheet keyboard trap) is a one-session swap.
- Used native `<dialog>` for both `AppModal` and `AppBottomSheet` — accessible (focus trap, ESC to close, backdrop) and zero-dep.
- Filter chips use full-page navigation (`<Link>` with new query string) instead of client-side nuqs for the first pass. Will upgrade to nuqs when we add the FilterSheet primitive.
- ListingCard and BuildingCard are `'use client'` because they have an interactive bookmark button. Could refactor to extract just the bookmark to a child client component if SSR perf becomes a concern.
- Trust-weighted sort implemented inline in `/kvartiry/page.tsx` — to be promoted into a `services/listings.ts` once Supabase is wired and we'd want the same logic in SQL.

### What's NOT done — pick from this list next session

**Foundation finish**
- [ ] Init shadcn CLI for Radix-backed accessible primitives (Select with bottom-sheet on mobile, RadioGroup, Dialog focus trap)
- [ ] Build remaining 3 Layer 7 components: ProgressPhotoCarousel, FilterSheet, CompareBar
- [ ] Vitest config + first primitive test
- [ ] Playwright config + first page smoke test

**Buyer surface remaining**
- [ ] Page 2 — `/pomoshch-vybora` guided finder (5-question flow → results)
- [ ] Page 4 — `/novostroyki?view=karta` map view (MapLibre + OpenFreeMap)
- [ ] Page 8 — `/sravnenie` compare page (URL state)
- [ ] Page 9 — `/izbrannoe` saved page (login required) + ChangeBadge integration
- [ ] Page 10 — Contact flow refinement (phone OTP login modal, female-agent checkbox visibility logic)
- [ ] Page 11 — `/diaspora` landing
- [ ] Help center markdown pages

**Seller surface (entire)**
- [ ] Page 12 — `/post/*` 8-step posting flow
- [ ] Page 13 — `/kabinet` seller dashboard
- [ ] Page 14 — `/verifikatsiya/tier-2` and `/verifikatsiya/tier-3` flows + slot picker

**Backend wiring**
- [ ] Service layer files in `services/`
- [ ] Replace mock data with Supabase queries
- [ ] Telegram Bot OTP server actions
- [ ] Server Actions for save / contact / post-listing / verification submit
- [ ] API route handlers (notifications, listings batch for compare, verification slots)
- [ ] Photo upload pipeline (heic2any → resize → Supabase Storage)
- [ ] Cron API endpoints (notifications cleanup, drafts cleanup, Tier 3 expiry, etc.)

**External services to set up (when ready to deploy)**
- [ ] Supabase project + apply migrations + generate types
- [ ] Telegram Bot token
- [ ] Cloudflare Pages deployment + Workers Cron
- [ ] PostHog free tier
- [ ] Cloudflare Turnstile
- [ ] Domain registration

### How to see the work

```bash
cd platform
npm run dev
```

Open http://localhost:3000 → redirects to `/ru` → click around:
- Homepage shows 3 featured projects with full source/verification/fairness chips
- Click any project → building detail page
- Click "Available units" → listing detail page
- On mobile, bottom sticky bar shows WhatsApp/Call/Visit
- Click Visit → modal opens with full contact form
- Submit form → toast confirms (mock — no real submission yet)

Filter pages:
- http://localhost:3000/ru/novostroyki — try `?district=sino`, `?status=under_construction,near_completion`
- http://localhost:3000/ru/kvartiry — try `?source=owner,intermediary`, `?finishing=owner_renovated`

---

## Session 1 — 2026-04-25 — Foundation

**Goal:** Stand up Next.js 16 project, install full dep stack, lay down design tokens, schema, base primitives, and a homepage shell. By the end the repo must build cleanly.

### What was built

**Project setup**
- `platform/` — Next.js 16 project with TypeScript strict, Tailwind v4, App Router, Turbopack
- All Tech Spec deps installed (Supabase, TanStack Query, Zustand, nuqs, next-intl, lucide-react, react-hook-form, zod, sonner, date-fns, MapLibre, react-map-gl, heic2any, posthog, @upstash/ratelimit, @upstash/redis, supabase CLI)
- Sentry skipped — does not yet support Next.js 16 (peer dep `next ^15.0.0-rc.0`). Add when @sentry/nextjs ships Next 16 support.
- Strict TS config: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`
- Prettier with `prettier-plugin-tailwindcss`
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `test`, `test:e2e`, `supabase:start`, `supabase:gen-types`

**Directory structure** (`platform/src/`)
```
app/
  [locale]/
    layout.tsx      # NextIntlClientProvider, header, footer
    page.tsx        # Homepage (Page 1) shell with smoke-test
  layout.tsx        # Root layout, Inter font
  globals.css       # All Layer 2-5 tokens
api/                # Empty, ready for route handlers
components/
  primitives/       # Layer 6 — AppButton, AppInput, AppCard, AppBadge, AppChip, AppContainer
  blocks/           # Layer 7 — SourceChip, VerificationBadge, FairnessIndicator
  layout/           # SiteHeader, SiteFooter
features/           # Empty
services/           # Empty
lib/
  utils.ts          # cn() helper
  format.ts         # Price/m²/floor formatters
  supabase/
    client.ts       # createBrowserClient
    server.ts       # createServerClient with cookie sync
i18n/
  routing.ts        # ru + tg, default ru, locale prefix as-needed
  navigation.ts     # localized Link/router
  request.ts        # message loader per locale
messages/
  ru.json           # Russian copy
  tg.json           # Tajik copy
proxy.ts            # next-intl middleware (Next.js 16 renamed it)
types/
  domain.ts         # All Data Model enums as TS unions
  supabase.ts       # Placeholder (regenerate via `npm run supabase:gen-types`)
```

Plus root: `supabase/migrations/`, `content/help/{ru,tg}/`, `public/icons/`, `.env.example`.

**Database schema** — 7 migration files in `platform/supabase/migrations/`:
- `0001_enums_and_extensions.sql` — all 15 enums + uuid-ossp, pgcrypto, pg_trgm, postgis
- `0002_users_and_developers.sql` — users (with `has_female_agent`), user_roles, districts, developers (with `has_female_agent`)
- `0003_buildings_listings_photos.sql` — buildings (PostGIS spatial index), listings (with `unit_number_internal`, generated `price_per_m2_dirams`, `owner_renovated`-source check constraint), photos (with `perceptual_hash` for dedup)
- `0004_buyer_tables.sql` — saved_items (registration-required via NOT NULL user_id), contact_requests (with `prefer_female_agent`, `buyer_country_code`), change_events
- `0005_verification_and_trust.sql` — verification_submissions, verification_slots (2h windows, capacity check), verification_visits (with `slot_id` FK), fraud_reports, district_price_benchmarks
- `0006_system_tables.sql` — phone_verifications, notifications (with `expires_at` default `now() + 7 days`)
- `0007_rls_policies.sql` — RLS on every table; `is_staff()` helper; per-table policies for select/insert/update/delete

All 17 tables. Matches Data Model v2 exactly.

**Design tokens** — full Layer 2-5 in `globals.css`:
- Terracotta scale 50–950 + semantic aliases (`primary`, `primary-hover`, `primary-pressed`)
- Verification tier colors (1, 2, 3, developer)
- Source chip colors (developer, owner, intermediary)
- Finishing chip colors (4 levels)
- Fairness colors (great, fair, high, alert — never red)
- Semantic colors (error, warning, success, info)
- 7-step type scale + 3 weights + paired line heights
- Restricted 9-step spacing scale (`--spacing: initial` kills the dynamic default)
- 3 breakpoints (md + lg only — sm/xl/2xl killed)
- 1200px container
- 3 radii, 3 shadows, focus-visible ring

**Layer 6 primitives** (in `components/primitives/`)
- `AppButton` — 4 variants × 3 sizes, loading state, focus ring
- `AppInput` — label + helper/error, leftSlot/rightSlot, no-zoom-on-iOS sizing
- `AppCard` + `Header/Title/Description/Content/Footer` slots
- `AppBadge` — tier-1/2/3/developer + neutral
- `AppChip` — interactive or static, source/finishing/terracotta tones
- `AppContainer` — applies the Layer 4.3 max-width + padding rules

**Layer 7 platform components** (in `components/blocks/`)
- `SourceChip` — Lucide `Building2` / `User` / `Handshake`, i18n labels
- `VerificationBadge` — with `developerVerified` flag that swaps in the gold developer badge per Blueprint §2.3
- `FairnessIndicator` + `computeFairness()` helper that returns `null` when `sample_size < 5`

**Pages**
- `/[locale]/` (Russian and Tajik) — homepage with hero, search, navigation chips, and a smoke-test card showing all source/badge/fairness combinations

**Verification**
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — succeeds, generates `/ru` and `/tg` as SSG, proxy middleware compiled

### What's NOT done yet — pick from this list next session

**Immediate (foundation finish):**
- [ ] Init shadcn CLI for production-ready Radix-backed primitives (Dialog, Sheet, RadioGroup, Select, Checkbox)
- [ ] Build remaining 6 primitives: AppSelect, AppCheckbox, AppRadio, AppTextarea, AppModal, AppBottomSheet, AppToast
- [ ] Build remaining 8 Layer 7 components: InstallmentDisplay, ProgressPhotoCarousel, ListingCard, BuildingCard, StickyContactBar, FilterSheet, CompareBar, ChangeBadge
- [ ] Locale-aware `not-found.tsx`
- [ ] Set up Vitest config + first primitive test
- [ ] Set up Playwright config + first page smoke test

**Buyer surface:**
- [ ] Page 3 — `/novostroyki` projects browsing (list + filters + URL state)
- [ ] Page 4 — `/novostroyki?view=karta` map view (MapLibre + OpenFreeMap)
- [ ] Page 5 — `/zhk/[slug]` building detail
- [ ] Page 6 — `/kvartiry` apartments browsing
- [ ] Page 7 — `/kvartira/[slug]` listing detail with OG meta
- [ ] Page 8 — `/sravnenie` compare (URL state)
- [ ] Page 9 — `/izbrannoe` saved (login required)
- [ ] Page 10 — Contact modal (overlay invoked from 4/5/7/8/9)
- [ ] Page 11 — `/diaspora` landing
- [ ] Page 2 — `/pomoshch-vybora` guided finder (5-question flow)

**Seller surface:**
- [ ] Page 12 — `/post/*` 8-step posting flow
- [ ] Page 13 — `/kabinet` seller dashboard
- [ ] Page 14 — `/verifikatsiya/tier-2` and `/verifikatsiya/tier-3` flows

**Backend:**
- [ ] Service layer files in `services/`
- [ ] API route handlers (notifications, listings batch, verification slots)
- [ ] Telegram Bot OTP auth handler
- [ ] Server Actions for save / contact / post-listing / verification submit
- [ ] Cron API endpoints (notifications cleanup, drafts cleanup, Tier 3 expiry, etc.)
- [ ] Photo upload pipeline (heic2any → resize → Supabase Storage)
- [ ] Search ranking expression (`effective_trust_tier` view per Tech Spec §9.4)

**External services to set up (when ready to deploy):**
- [ ] Supabase project (free tier) — run migrations, generate types
- [ ] Telegram Bot — for free OTP
- [ ] Cloudflare Pages deployment + Workers Cron
- [ ] PostHog free tier
- [ ] Upstash Redis free tier (optional for local dev)
- [ ] Cloudflare Turnstile site key
- [ ] Domain registration

### Known gaps vs spec

Already flagged in the spec docs:
- Saved-list share URL: choose token-table vs JWT during build
- First-visit tooltip tracking mechanism (cookie? user setting?)
- Cover photo selection UX in post flow
- Tier 3 prerequisite (whether Tier 2 is required first)
- Login modal vs full-page route — currently both `/voyti` exists and the spec mentions modals; reconcile during contact-flow build

### How to run

```bash
cd platform
npm run dev       # http://localhost:3000 → redirects to /ru
npm run build     # production build
npm run typecheck # strict TS check
npm run lint      # ESLint
```

Once Supabase is provisioned:
```bash
npm run supabase:start         # local Supabase
npm run supabase:gen-types     # regen src/types/supabase.ts
```

### Spec status

All 9 critical/medium spec issues from the pre-build review are resolved. See the four `*.md` files at the project root and the 7 docs in `docs/` for the canonical spec stack.
