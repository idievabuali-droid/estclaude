# Platform audit — UX, journey, and competitive gaps

**Date:** 2026-04-26
**Scope:** Walked every key page on mobile (375px). Researched Cian, Domclick, Avito Realty, Yandex Realty, Idealista, Zillow, Redfin via web sources.
**Method:** Screenshots of our app + agent-driven competitor research.

This document is **findings only** — no code changes. Each finding is tagged by **severity** (🔴 critical / 🟠 important / 🟡 polish) and **type** (BUG = visible now, GAP = missing capability, JOURNEY = user-flow weakness, COMPETITIVE = competitor has it, we don't).

---

## TL;DR — top 8 things to fix or build, prioritized

These are the highest-impact items that materially change whether a real user trusts and completes their journey. In order:

1. **🔴 BUILD: Construction-progress timeline page per project** (`/zhk/[slug]/progress`). Monthly date-stamped photos. **This is the #1 trust signal for new builds** — every Cian ЖК page has a `/hod-stroitelstva/` route with this. For your "trust + decision support" wedge it's mission-critical, not optional.

2. **🔴 BUILD: Infrastructure / POI section on every listing** ("Что рядом"). Nearest 3 mosques, schools, hospitals, supermarkets, transit stops with walking minutes + meters. **Mosque as a first-class category is the cultural differentiator no Russian platform offers** — it's your wedge in Tajikistan.

3. **🔴 BUG: Mobile listing cards on the dashboard are too tall**. The 4:3 colored placeholder eats the entire mobile viewport, hiding Edit/Hide/Sold actions. Compress to 16:9 or remove the placeholder when no real photo.

4. **🔴 BUG: Building detail hero — Building icon overlay overlaps the "ЖК Sitora Hills" title.** Looks like a layout bug. Move the icon to top-center far above the title, or remove it and use a real cover-photo placeholder treatment.

5. **🟠 BUG: Compare page on mobile shows only 1.5 columns at a time.** Practically impossible to actually compare. Switch to **vertical stacked compare cards on mobile** (one item per row, with diff highlights), keep the table only on tablet+.

6. **🟠 BUILD: Map view → mobile bottom-sheet pattern.** Right now the map shows at the bottom of a tall page header — no list visible. Make it fullscreen with a swipe-up bottom sheet showing 1–2 listing previews + a "Map / List" toggle. This is the universal pattern (Cian, Zillow, Redfin, Idealista).

7. **🟠 BUILD: Price bubbles as map markers + clustering.** Right now markers show the building name as a label (because `price_from_dirams` is null and the fallback is the name). Build a "min price per active listing" computation, show **"от 567K TJS"** in a neutral white pill. At low zoom, cluster.

8. **🟠 GAP: Saved-search alerts via Telegram bot.** Once Telegram bot lands for OTP, extend it: user can save a search, bot pings them when a new match appears. This is the single highest-retention pattern from Idealista/Cian and aligns with the Tajik messenger reality.

Everything else below is supporting detail.

---

## Critical visual bugs caught in mobile screenshots

These are visible RIGHT NOW on http://172.20.10.3:3000/ru and would be embarrassing to show a real user.

### 🔴 BUG-1 — Building detail icon overlaps the title
On `/zhk/sitora-hills`, the centered Building Lucide icon I added (to make the colored hero feel less wireframe-y) lands directly behind the "ЖК Sitora Hills" h1. It looks like broken layout, not intentional design. **Fix:** move the icon to the very top of the hero (away from the title block), reduce its opacity to ~25%, and use the title block's bottom-aligned position so they never overlap.

### 🔴 BUG-2 — Listing detail hero wastes ~35% of viewport
The colored hero block with "2-комн · 64,5 м²" overlay takes 35% of the mobile screen before any useful info. Users are scrolling past wireframe to reach price + specs. **Fix:** when no real photo, shrink the hero to ~20% of viewport (`aspect-[16/9]` instead of `aspect-[4/3]`), or surface the price overlaid ON the hero so the screen earns its real estate.

### 🔴 BUG-3 — Listing detail title repeats the hero
The hero says "2-комн · 64,5 м²", then directly below the h1 says "2-комнатная, 64,5 м²". Same data, two different formats, stacked. **Fix:** drop the redundant h1; replace with the building name + district (currently the secondary text).

### 🔴 BUG-4 — Dashboard listing cards have 4:3 colored placeholder = 80% of viewport
On `/kabinet`, each listing row's mini-cover renders as a giant colored block on mobile because the same `aspect-[4/3]` from the buyer's ListingCard is being used. Edit/Hide/Sold buttons are below the fold per row. **Fix:** dashboard listing rows should use a 64×64 thumbnail on mobile, not a full-width 4:3 placeholder. Different component, not the buyer card.

### 🟠 BUG-5 — Compare table on mobile = 1.5 columns visible
Horizontally scrolling a compare table on a 375px viewport shows ~1.5 listings at a time. The whole point of compare is side-by-side. **Fix:** on mobile, switch to a **vertical card stack** (one full-width listing per row) with diff highlights — bold the cheapest price, color the better fairness signal, etc. Keep the table on tablet+.

### 🟠 BUG-6 — Map markers stack on top of each other in Dushanbe
3 of 4 mock buildings sit within ~2km in central Dushanbe. The markers physically overlap. No clustering. Real data will be 10-100x worse. **Fix:** add MapLibre marker clustering (group at low zoom into "3" / "12" pills, expand on zoom-in or click).

### 🟠 BUG-7 — Map markers show building name instead of price
Because the seeded buildings have `price_from_dirams = null` (the trigger I planned in the data model isn't built), the marker fallback uses the building name. This makes price-shopping-on-map impossible. **Fix:** compute `price_from_dirams` from active listings either (a) at write time via a Postgres trigger, or (b) at read time in `services/buildings.ts`. Show "от 567K TJS" in a neutral white pill.

### 🟠 BUG-8 — Sticky contact bar WhatsApp text squeezes
On `/kvartira/[slug]` the bottom bar's three buttons (WhatsApp / Позвонить / Визит) compete for narrow space — the WhatsApp icon takes half the button leaving "WhatsApp" text squeezed. **Fix:** drop the icon labels for one or two buttons (icon-only with aria-label), OR use 2 actions (WhatsApp + Визит) and put Call inside an overflow.

### 🟠 BUG-9 — Building detail stats stacked vertically on mobile
`Этажей 16`, `Квартир 218`, `Сдача 2026-Q4` each take a full row on mobile. Three stats = 30% of viewport. **Fix:** 3-column grid even on mobile (smaller text, smaller padding).

### 🟡 BUG-10 — Fairness signal too weak
"↓ Цена в рынке" renders as small gray text easy to miss. This is one of your three signature wow features and it should pop. **Fix:** render as a colored AppChip (`fair` = stone-500 chip, `great` = green chip, `high` = gold chip, `alert` = rust chip) instead of text. Same colors I already defined in tokens.

### 🟡 BUG-11 — Hero on homepage takes the whole first screen
User sees zero inventory above the fold. **Fix:** trim hero by ~30% (smaller h1, tighter padding, single-row search+button on tablet+) so the first featured project peeks above the fold.

---

## User-journey weaknesses

These are places where users will get stuck, confused, or quit, even if no individual element is "broken."

### 🔴 JOURNEY-1 — There's no "Show phone" pattern; phone is one tap away
Tapping `Позвонить` on a listing immediately initiates a call to `+992 90 0000000` (the placeholder number). For real listings, this means phones are exposed without ANY friction or attribution. **Risk:** seller phones get spammed by tire-kickers / phone-number scrapers. **Fix:** show "Показать номер" first; on tap, reveal the number AND log a contact_request row tying buyer to listing. Cian/Domclick both do this with proxy numbers — for V1 just track the reveal event.

### 🔴 JOURNEY-2 — The contact form on the listing detail submits a fake toast, not a real request
`Запросить визит` modal collects buyer name, phone, message — but the submit handler is a `toast.success(...)`. No row is written to `contact_requests`. **Risk:** if you show this to a beta user and they fill the form expecting the seller to call them back, NOTHING happens. **Fix:** wire `submitContactRequest` in `services/listings.ts` to actually INSERT (it's a stub right now). Even before auth, you can capture the buyer phone in the row.

### 🔴 JOURNEY-3 — No way for a logged-out user to know they need to log in to save
Tapping the bookmark icon on a card does nothing visibly (the inline `e.preventDefault()` swallows the click). User thinks save is broken. **Fix:** on tap when not logged in, show a small toast: "Войдите, чтобы сохранять" with an inline action linking to `/voyti?redirect=...`. Cian does this exact pattern.

### 🟠 JOURNEY-4 — Building detail has no "Доступные квартиры" jump above the fold
On a real building page with 5-30 listings, the user wants to scroll directly to the apartments. Right now they have to scroll past hero + stats + trust block + about section. **Fix:** add a sticky sub-nav under the hero: "Квартиры (8) | Описание | Расположение | Застройщик". Anchor links. Standard pattern on Cian.

### 🟠 JOURNEY-5 — Guided finder doesn't actually personalize results
After answering 5 questions on `/pomoshch-vybora`, the redirect goes to `/novostroyki?district=...&price_to=...`. Only district + price are used. Rooms, finishing, timing — all collected but ignored. **Risk:** user feels their answers were a waste. **Fix:** thread all 5 answers through to the URL state; the apartments page (not projects) is probably the better destination since rooms/finishing matter at the unit level.

### 🟠 JOURNEY-6 — Saved page shows "Что изменилось" badges with no link
The change badges on `/izbrannoe` say "Цена снижена · 742 000 TJS" but tapping them does nothing. **Fix:** each ChangeBadge should be a Link to the affected listing (with a query param that auto-scrolls to the change history section).

### 🟠 JOURNEY-7 — Post flow loses state on refresh
Each step is its own route (good for refresh-resilience per spec) but step state isn't persisted between routes. If a seller fills `/post/details` and accidentally taps Back, all data is lost. **Fix:** persist the in-progress draft to `localStorage` keyed by phone (or to a `listings` row with `status='draft'` once auth is wired). Even sessionStorage would be better than nothing.

### 🟡 JOURNEY-8 — No empty state on `/kabinet` when there are zero listings
Currently shows the "У вас пока нет объявлений" empty state only inside the listings column — but the stats grid above still shows "Активных 0 / Просмотров 0 / Новых заявок 0", which feels sad. **Fix:** if zero listings, hide the stats grid entirely; show a single big "Опубликуйте первое объявление за 3 минуты" CTA card.

### 🟡 JOURNEY-9 — No breadcrumbs on detail pages
On `/kvartira/[slug]` the only way back to the building is a small inline link. On a long detail page with 30+ scrollable sections, breadcrumbs help re-orient. **Fix:** sticky top-bar showing "Новостройки › ЖК Sitora Hills › 2-комн".

---

## Wedge-strengthening opportunities (high-leverage)

Your wedge vs Somon.tj is "trust + decision support + source transparency." These items widen that moat.

### 🔴 WEDGE-1 — Construction-progress timeline (signature feature, not built)
Every Cian ЖК has a `/hod-stroitelstva/` page: monthly photos with date stamps, side-by-side year comparison, a "сегодня vs два года назад" slider. **For new builds in Tajikistan where buyers are choosing between unfinished projects, this single feature wins more trust than any badge.** Build it as `/zhk/[slug]/progress`.

**Implementation:**
- New `progress_photos` table (or reuse `photos` with `kind = 'progress'`, already in spec) keyed by building + month
- Page renders a chronological grid with month labels
- Optional: side-by-side compare slider for two months
- Every photo has the date overlaid and a "Загружено застройщиком · 12 янв 2026" attribution

### 🔴 WEDGE-2 — POI / "Что рядом" section on listings
Cian, Domclick, Yandex Realty all have this. None show **mosque proximity**, which is culturally load-bearing in Tajikistan. **Format:**
- Section "Что рядом" mid-listing (below photos, above developer block)
- Embedded mini-map with category filter chips: 🕌 Мечети · 🏫 Школы · 🏥 Поликлиники · 🛒 Базары · 🚌 Транспорт · 🌳 Парки · 💊 Аптеки
- Default shows nearest 3 of each category with walking minutes + meters
- Data source for V1: OpenStreetMap Overpass API (free, decent coverage in Dushanbe). Cache per building.
- Halal note: don't compute a numerical "infrastructure score" — just show raw POI list. Trust the user to judge.

### 🔴 WEDGE-3 — Source-transparent verification badges that LINK to documents
Cian's "Проверено" badge is opaque — users don't know what was checked. Beat them at this game. **Format:** when developer is verified, the Тier-developer badge expands on tap to a small dialog:
- ✓ Лицензия №… (link to PDF)
- ✓ Эскроу-счёт в банке Х
- ✓ РНС №… (link)
- ✓ Команда платформы посетила офис 12 янв 2026
Each line either present (with link) or missing. **The criteria are visible, not hidden.** This is a textual change to existing components — small build, big trust gain.

### 🟠 WEDGE-4 — Response-time + response-rate stats on developer cards
Cian shows "обычно отвечает за 2 часа" — this is a halal trust signal (no urgency, no manufactured scarcity). Compute from `contact_requests` rows — `avg(responded_at - created_at)` and `count(responded_at) / count(*)` for each seller. Show as small text on developer card and listing detail. Replaces the "view counter" pattern entirely (which the agent confirmed is widely gamed/faked on Avito).

### 🟠 WEDGE-5 — "Расчёт рассрочки" + "Доступность жилья" calculators
**Halal substitutes for mortgage calculators.** No CIS competitor has these.
- **Расчёт рассрочки:** user inputs the apartment price, sees "первый взнос 30% = 222 600 TJS · ежемесячно 8 750 TJS · 84 месяца" laid out as a payment timeline. Pull from `installment_*` fields already in `listings`. No interest, no compounding.
- **Доступность:** user inputs household income, sees "при ваших 5 000 TJS/мес — 12 лет покупать в полную · 3 года при 30% первом взносе". Educational, no urgency, no calculator gymnastics.

Both could live as small inline widgets on listing detail.

### 🟠 WEDGE-6 — Per-listing AI Q&A from listing data + developer documents
Redfin and Cian/Domclick are heading here. For V2, but plant the seed: a small "Спросите о квартире" textarea below the description that answers questions like "Есть ли парковка?" or "Какая отделка?" using only the structured listing data + developer's PDFs (if any). **Always cite the source** ("источник: проектная декларация, стр. 12"). This is your decision-support wedge weaponized.

---

## Features competitors have that we should consider

Ranked by build cost vs trust value.

| # | Feature | Where seen | Build cost | Trust value | Verdict |
|---|---|---|---|---|---|
| 1 | Photo carousel on listing card (swipeable on mobile) | All | M | High | **Build** — current cards show 1 cover only. Cian/Avito/Domclick all swipe. |
| 2 | Photo count badge on cover | All | S | M | **Build** — adds expectation of media depth. |
| 3 | Floor plan as separate tab | Cian, Domclick | M | High for new builds | **Build** when real floor plans exist. |
| 4 | Tour / video icons on cover | Cian | S | M | **Build** stub now — render conditionally on real metadata later. |
| 5 | Map area drawing (polygon) | Idealista, Redfin | L | M | **Skip V1.** Rectangle bounds enough. |
| 6 | "Search this area" button after pan | Cian, Zillow, Redfin | S | M | **Build with the map upgrade**. |
| 7 | Saved-search alerts via Telegram | Idealista alerts + Cian | M | High | **Build** with Telegram bot — top-3 priority once auth lands. |
| 8 | "Ready to move in" / по этапу строительства filter | Cian, Avito | S | High | **Build** — single most-asked question on a new-build platform. |
| 9 | Yandex's district scoring overlays | Yandex Realty | L | M | **Skip V1** — needs methodology defense. |
| 10 | Cian's "Future Infrastructure" 5-year POI timeline | Cian | L | High | **Skip V1** — only valuable if you have credible municipal plans. V3+. |
| 11 | Domclick's GigaChat free-text search | Domclick | L | M | **Skip V1** — needs inventory volume + LLM cost. V2+. |
| 12 | Domclick's "Юр. чистота" guarantee | Domclick | L | High | **Skip V1** — needs legal + insurance partner. V2+. |
| 13 | Short video walkthrough in carousel | Zillow Showcase | M | M | **Build** when sellers can upload video. |

---

## Features we have that don't pull weight (consider removing)

### 🟡 REMOVE-1 — The Building icon centered overlay on building detail hero
It overlaps the title (BUG-1). It was added as a "less-wireframe-y" treatment, but it actually makes the page look broken. **Remove** when we add real cover photo support — until then, replace with a subtle pattern fill.

### 🟡 REMOVE-2 — Bookmark icon doing nothing on cards
Currently every bookmark click is `e.preventDefault()` to avoid breaking. Either make it work (with login modal trigger) or remove until auth is wired. Right now it sets a wrong expectation.

### 🟡 REMOVE-3 — "Compare" button visibility on cards when no items selected
The CompareToggle button (⚖) appears on every card cover unconditionally. Until the user has tapped one, the button has no context — they don't know what it does. **Better:** show only after the user has tapped one card OR add a small tooltip on first hover/long-press explaining.

---

## Things that are currently fine — don't over-fix

For your peace of mind, these things actually work well as-is and should NOT be re-engineered:

- **Source chips** (Layer 7.2) — Lucide icons with calm color tints. Reads clean. Ship as-is.
- **Verification badges** — color hierarchy is correct (gray → blue → green → gold).
- **Mobile bottom nav** — 4 tabs, active state in terracotta. Good.
- **Token system** — restricted spacing/type/color tokens, after the `--spacing: initial` fix, are working. Don't widen the system.
- **Dual-locale routing** (`/ru`, `/tg`) — works, both routes generate.
- **Trust-weighted ranking** in `services/listings.ts` — verified developers float to top, then Tier 3, then 2, then 1. Matches spec.
- **Halal-by-design discipline** — no countdowns, no red alerts, no fake urgency. Don't drift.

---

## Recommended build order (next 2-3 sessions)

Based on impact × effort:

**Next session — quick wins from this audit (~half day):**
1. Fix BUG-1 (icon overlap), BUG-3 (title repeat), BUG-9 (stats grid horizontal), BUG-10 (fairness chip), BUG-11 (hero trim) → 1 hour
2. Compute `buildings.price_from_dirams` at read time in `services/buildings.ts` → fixes BUG-7 → 30 min
3. Add MapLibre clustering → fixes BUG-6 → 1 hour
4. Compress dashboard listing rows → fixes BUG-4 → 30 min
5. Vertical compare cards on mobile → fixes BUG-5 → 1 hour

**Following session — wedge features (~1 day):**
1. WEDGE-1: construction-progress page per project
2. WEDGE-2: "Что рядом" POI section using OpenStreetMap Overpass
3. WEDGE-3: source-transparent verified-developer dialog

**Then — backend wiring (needs Telegram bot):**
1. JOURNEY-1: phone-reveal pattern + log to contact_requests
2. JOURNEY-2: real submit handler for contact form
3. JOURNEY-3: login-prompt toast for save action
4. Saved-search alerts via Telegram bot

After all of these, you have something genuinely competitive with Cian for new-builds in Dushanbe — with the cultural / halal / source-transparency edge they can't match.
