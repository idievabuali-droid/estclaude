# Real Estate Platform — UI Spec v1

## Purpose of this document

This is the final specification before build. It takes every page in the V1 product and describes the exact layout, component composition, and behavior — using the vocabulary from the Design System Spec (Layers 1–7).

**What this document is:** a page-by-page guide that tells Codex what goes where, which components to use, and what each screen must communicate at a glance.

**What this document is NOT:** a pixel-perfect Figma mock. It is not a replacement for running, testing, and refining the actual UI. It is the **starting blueprint** — tight enough that Codex doesn't invent layouts, loose enough that implementation details can flex during build.

**Reading order:**
- Locked strategy and product docs (PRD v3, Blueprint v2, User Flows v2, Data Model v2, Technical Spec v2)
- Design System Spec v1 (Layers 1–7) — the vocabulary this document uses
- This UI Spec — how each page assembles the vocabulary into a screen

---

## How this document is built

This document is written **incrementally, page by page**. Each page gets approved and locked before moving to the next. This prevents the same kind of fabrication-at-scale risk we've already caught twice in this project.

Each page section follows the same structure:
1. **What this page is for** — one sentence, no fluff
2. **Route and entry points** — URL and how users get here
3. **Mobile block order** — top to bottom, explicit
4. **Desktop layout difference** — only what changes from mobile
5. **Platform components used** — which of the 11 Layer 7 components appear
6. **Primitive components used** — which Layer 6 primitives
7. **Empty and edge states** — what to show when data is sparse
8. **What must not appear** — explicit exclusions so Codex doesn't decorate
9. **Acceptance criteria** — when is this page "done"

---

## Document status

| Page | Status |
|---|---|
| 1. Homepage | Locked |
| 2. Guided quick finder | Locked |
| 3. Projects browsing (Новостройки) | Locked |
| 4. Map view | Locked |
| 5. Building detail page | Locked |
| 6. Apartments browsing (Квартиры) | Locked |
| 7. Listing detail page | Locked |
| 8. Compare page | Locked |
| 9. Saved page | Locked |
| 10. Contact flow | Locked |
| 11. Diaspora landing page | Locked |
| 12. Post listing flow (seller) | Locked |
| 13. Seller dashboard | Locked |
| 14. Verification upgrade flows | Locked |

---

## Conventions used in this document

**"Block" vs "Section":** A block is the smallest labeled chunk of a page (e.g., "Block A — Hero"). Blocks stack vertically on mobile.

**"Sticky" means position: fixed.** When this document says a bar is "sticky," it stays pinned while the page scrolls.

**"Compact" vs "full" vs "map-preview":** ListingCard variants (from Layer 7.7). Compact is used in saved-items tight space. Full is the search-results default. Map-preview is the bottom sheet that opens when a pin is tapped.

**"Tap" means click on mobile, click on desktop too.** I use "tap" as the universal action verb.

**When a component is referenced like `ListingCard` or `AppButton`**, it points back to the Design System Spec (Layer 7 for platform components, Layer 6 for primitives). Codex imports those components — does not reinvent them per page.

**Cross-references to other docs** are marked explicitly: "(PRD §12.4)" means Strong PRD v3, section 12.4. "(Blueprint §11.6)" means Product Blueprint v2, section 11.6. "(Data Model §3.9)" means Data Model Spec v2, section 3.9.

---

## Working agreement for this document

1. **One page at a time.** Each page gets drafted, self-audited, presented, and locked before moving to the next.
2. **High-level, not pixel-perfect.** This is a layout specification — not Figma mocks. Codex fills in micro-details using the Design System.
3. **No fabricated details.** If PRD/Blueprint don't say something, I flag it as a design choice or a pending decision, not as a product rule.
4. **Cross-references must be verified.** Every PRD/Blueprint/Data Model reference gets checked before the page is presented.
5. **Acceptance criteria must be testable.** "Page feels clean" doesn't count. "Primary action reachable without scrolling on 375px viewport" does.

---

# Page 1 — Homepage

## 1.1 What this page is for

Explain the platform in ten seconds and send every type of buyer — ready, uncertain, returning — into the right path. The homepage is a **routing page**, not a search page and not a marketing page.

This follows Blueprint §6. Layer 7 components give the visual execution.

## 1.2 Route and entry points

**Route:** `/`

**Entry points:**
- Direct (typing the domain)
- Google/Yandex search for the brand or generic Tajik real-estate terms
- Social media / WhatsApp shared links
- Diaspora campaign (sends some users to `/diaspora` instead — see Page 11, but note that `/diaspora` also includes a "go to main site" option that lands here)

## 1.3 Design principles driving this page

Three constraints shape every decision on this page:

1. **Blueprint §6.3 locks the block order.** This UI spec does not re-decide it. Research from 2026 best-in-class homepages informs *how* each block looks, not *which* blocks appear.
2. **The homepage is the one place all three buyer archetypes land** — ready buyer, uncertain buyer, returning buyer (PRD §9.2). Each archetype needs its own visible entry without blocking the others.
3. **No marketing copy, no decoration.** The homepage's job is to move the user off the homepage into a useful page within 10 seconds.

## 1.4 Mobile block order (375px viewport, top to bottom)

Block order follows Blueprint §6.3 exactly.

### Block A — Header (sticky)
- Logo (left)
- Language toggle: `RU / TJ` (right) — preserves state when switched per Blueprint §6.3 Block A
- Profile icon if logged in, else menu icon (hamburger) right of language toggle — opens `AppBottomSheet` with: Saved, Compare, Post listing, For developers, Help

Height: ~56px. Background: white. Border-bottom: 1px stone-200 (from Layer 5).

### Block B — Hero with three entry paths (above the fold)

Per Blueprint §6.3 Block B, the hero has **three tappable paths** — one for each buyer archetype:

1. **Headline** — `text-h1` (24px) semibold stone-900, one line:
   "Квартиры в новостройках Душанбе и Вахдата"
2. **Supporting line** — `text-body` (16px) stone-700, one line:
   "Проверенные объекты от застройщиков, собственников и посредников"
3. **Three paths** — three large tappable cards, stacked vertically on mobile, each using `AppCard` with `shadow-sm` hover state:
   - **Новостройки · [N] проверенных проектов** → opens Projects browsing (Page 3)
   - **Квартиры · [N] проверенных объявлений** → opens Apartments browsing (Page 6)
   - **Помочь выбрать · около минуты** → opens Guided finder (Page 2)
   
   Each card has a tiny Lucide icon (building icon / apartment icon / sparkles icon) and one line of supporting text in `text-meta` stone-500 explaining what to expect.

4. **Trust strip** — one line below the three paths in `text-caption` (12px) stone-500:
   "Трёхуровневая проверка • Фото стройки с датами • Цена за м² с контекстом"
   
   Each of the three phrases is a subtle tappable link that opens a Help-center explanation in `AppModal`.

**The counts `[N]` are live numbers** from the database, not placeholder text. If the database has 47 verified projects and 312 verified listings, the numbers render as `47` and `312`. On initial load they render with skeleton until the count is ready.

**Above the fold on 375px viewport:** headline, supporting line, all three paths, and the trust strip — Blueprint §6.3 explicitly lists this as the above-the-fold requirement.

### Block C — Returning user strip (only shown to returning users)

Per Blueprint §6.3 Block C — **"the heart of the retention loop."** This is the key differentiator for returning buyers.

Only appears if the user has at least one saved item and has visited before.

Structure:
- Small section header `text-h2`: "С возвращением! Что изменилось с вашего последнего визита:"
- List of real change events, each rendered using `ChangeBadge` (Layer 7.12) + the affected item's mini-card (compact variant of `ListingCard` or `BuildingCard`)
- Each item tappable — links directly to the listing or building that changed

Empty-change variant (user visited before but nothing changed): show the alternative Blueprint §6.3 copy — "С момента вашего последнего визита изменений в ваших сохранённых объектах нет. Посмотрите что нового на платформе:" followed by a horizontal scroll of 3-5 newly-added buildings (using `BuildingCard`).

First-time-visitor variant: **Block C is entirely absent.** Skip to Block D.

### Block D — Quick search

Per Blueprint §6.3 Block D — a single search field for buyers who want to type something specific (district name, building name, budget number).

- `AppInput` variant `search`, full width, `lg` size
- Placeholder: "Район, ЖК или бюджет — например, Сино или 800 000"
- One button next to it: `AppButton primary md` "Найти"
- Below the field: a row of 4 `AppChip` suggestion shortcuts, horizontally scrollable if they don't fit:
  - "Квартиры до 800 000 TJS"
  - "С ремонтом"
  - "Сдача в 2026"
  - "В Исмоили Сомони"

Tapping a chip applies that single filter and opens the Apartments browsing page (Page 6) with the filter pre-set.

### Block E — Why this platform is different

Per Blueprint §6.3 Block E — three short reasons, one illustrative image or component each.

Three blocks stacked vertically on mobile (each `AppCard` with `p-4`):
1. **"Настоящие фото стройки, обновляются ежемесячно"** — one illustrative recent progress photo with date caption ("14 марта 2026")
2. **"Цена за м² в сравнении со средней по району"** — one illustrative `FairnessIndicator` rendering ("12% ниже среднего")
3. **"Каждое объявление проверено командой платформы"** — the three `VerificationBadge` tiers rendered inline, with the Tier 3 badge highlighted

Each block tappable — opens a Help-center article in a new page or `AppModal` explaining the system in depth.

### Block F — Featured buildings

Per Blueprint §6.3 Block F — **3 to 5** hand-picked buildings, using `BuildingCard` (Layer 7.8).

Mobile: horizontally scrollable row. Each card shows construction-progress cover photo, building name, district, price from, delivery date, and verification badge.

For returning users, the cards rotate to show buildings they haven't seen before (based on view history).

### Block G — How it works

Per Blueprint §6.3 Block G — three-step explanation.

Three short blocks, each one sentence in `text-body`:
1. **Выберите проект или квартиру**
2. **Сравните и сохраните**
3. **Свяжитесь напрямую через WhatsApp**

Each tappable → opens an illustrated explanation in `AppModal`.

### Block H — Diaspora entry strip

Per Blueprint §6.3 Block H — **visible but not dominant.**

A thin horizontal strip using `AppCard` with `stone-100` background (subtle, different from the main white card surface):
- Text: *"Покупаете из России? Мы поможем выбрать и связаться с застройщиком."*
- Right side: `AppButton ghost sm` "Узнать больше" → links to `/diaspora` (Page 11)

### Block I — Footer

Standard footer per Blueprint §6.3 Block I. Minimal.
- Left column: О платформе, Как работает проверка, Помощь, Контакты
- Center: small legal links (Условия, Конфиденциальность)
- Right: language toggle, social links (if any)

`text-caption` stone-500. No marketing copy.

## 1.5 Desktop layout difference (≥1024px)

Per Blueprint §6.4, block order is the same; only the visual arrangement changes.

- **Block A (Header):** hamburger replaced by inline nav — Saved, Compare, Post listing, For developers, Help. Language toggle stays right.
- **Block B (Hero):** headline scales up to `text-display` (40px, per Layer 3.6 desktop bump). The three entry paths render in a row of three (side by side) instead of stacked.
- **Block C (Returning user strip):** changed items render in a row of three or four instead of a vertical list.
- **Block D (Quick search):** search + 4 chips inline; they fit in one row.
- **Block E (Why this platform is different):** three blocks in a row of three instead of stacked.
- **Block F (Featured buildings):** row of 4 or 5 buildings instead of horizontally scrollable (per Blueprint §6.4).
- **Block G (How it works):** three steps in a row instead of stacked.
- **Block H (Diaspora strip):** stays horizontal, now full 1200px wide.

Nothing is added just because the screen is wider.

## 1.6 Platform components used

| Block | Platform components |
|---|---|
| A — Header | None (primitives only) |
| B — Hero | None (uses primitives + large tappable cards) |
| C — Returning user strip | `ChangeBadge` (7.12), compact `ListingCard`/`BuildingCard` (7.7, 7.8) |
| D — Quick search | None |
| E — Why different | `FairnessIndicator` (7.4), `VerificationBadge` (7.3) as illustrations |
| F — Featured buildings | `BuildingCard` (7.8) |
| G — How it works | None |
| H — Diaspora strip | None |
| I — Footer | None |

## 1.7 Primitive components used

`AppInput` (search variant), `AppButton` (primary, ghost), `AppChip`, `AppCard`, `AppBottomSheet` (mobile menu), `AppModal` (help-article popovers from blocks E/G).

## 1.8 Empty and edge states

Per Blueprint §6.6:

- **No featured buildings yet:** show three most recently added buildings instead of curated picks (not an empty state — just a source swap)
- **No active projects in database at all** (very first launch week): homepage shows a friendly message *"Мы скоро запускаемся — оставьте свой номер, и мы сообщим когда первые проекты появятся"* with a single phone input. Blocks B three paths are hidden; Block D suggestion chips are hidden. Blocks E (why different), G (how it works), H (diaspora), I (footer) remain visible so the brand and explanation still appear.
- **First-time visitor:** Block C (returning user strip) doesn't appear
- **Returning user with no changes:** Block C renders the empty-change copy from Blueprint (see Block C above)
- **Slow connection:** hero renders first (HTML + critical CSS). Block F images lazy-load. All tappable counts (e.g., `[N] проверенных проектов`) render with skeleton until the count arrives.

## 1.9 What must NOT appear on this page

Per Blueprint §6.7 and PRD §19 (halal-by-design):

1. No modal popups on load
2. No newsletter signup interruption
3. No cookie dark patterns (standard non-dark consent only)
4. No autoplay video
5. No mortgage calculator
6. No long explanatory text anywhere on the page
7. No more than five featured buildings above the fold

Additional exclusions from the Design System and PRD:

8. No "Limited time!" / "Hot deal!" / "Only X left" banners
9. No countdown timers
10. No chatbot auto-opening
11. No testimonials block for V1 (we have no testimonials yet; fake or stock ones would break trust)
12. No "As seen in" press-logo strip for V1 (same reason)
13. No full-bleed hero image or background video (slows load, pushes search below the fold)

## 1.10 Acceptance criteria

The homepage is done when:

1. On a 375px viewport, **headline + supporting line + all three entry paths + trust strip are all visible above the fold** (Blueprint §6.3 Block B requirement)
2. All three buyer archetypes (ready, uncertain, returning) have an obvious path without competing attention: ready → Новостройки or Квартиры; uncertain → Помочь выбрать; returning → Block C items
3. Block C (Returning user strip) is **completely absent** for first-time visitors — not a "no changes yet" empty state
4. Tapping any of the three entry paths navigates in under 200ms (not a page that opens a modal that then opens another page)
5. Primary page load renders above-the-fold content (Blocks A + B) without waiting for any image
6. Block F images lazy-load; the three entry paths in Block B are not image-dependent
7. Lighthouse mobile performance ≥ 90, accessibility = 100
8. No pattern from 1.9 appears anywhere
9. Russian and Tajik both render correctly (no layout break from longer Tajik words — the three entry path cards flex vertically if text wraps)
10. On a used-Somon.tj test user, the first reaction is "this looks cleaner and more trustworthy" — not "this looks flashy and is trying to sell me something"

---

# Page 2 — Guided quick finder

## 2.1 What this page is for

Take an uncertain buyer from "I don't know what I want" to "here are 3–5 apartments that fit me" in about a minute. This is the **magic moment** of the platform — the feature that converts uncertain buyers who would otherwise bounce.

This follows Blueprint §7 exactly. Layer 7 components and 2026 onboarding research inform the visual execution.

## 2.2 Route and entry points

**Route:** `/pomoshch-vybora` (the question flow)
**Results route:** `/pomoshch-vybora/rezultaty` — accessed after the flow completes or via a saved-state link

**Entry points:**
- Tap "Помочь выбрать" on the Homepage (Page 1, Block B)
- "Помочь выбрать" chip on any search results page (for buyers who entered a manual search but got too many or too few results)
- Direct link shared with the buyer (e.g., from diaspora landing, Page 11)

## 2.3 Design principles driving this page

Three research-validated rules from 2026 onboarding patterns shape this page:

1. **One question per screen.** Reduces cognitive load, matches mobile-first thinking. 2026 best practice for anything >3 questions.
2. **Time to value under 90 seconds.** Trello and Signals-level onboarding — the user sees real results in about a minute. Blueprint §7.1 locks this.
3. **Skip is always visible, never buried.** This is the defining difference between a helpful guided flow and an annoying wizard. 2026 research is unanimous: forced flows kill conversion.

Additional principles specific to this product:

4. **Never force registration during the flow.** Blueprint §7.2. The answers persist in session; if the user signs up later, they port over.
5. **Answers are defaults, not commitments.** A buyer who picks "2-3 комнаты" can still see 1-room results on the next page if they want — the guided flow pre-applies filters, doesn't lock them.

## 2.4 Mobile layout for question screens (one shared template, five screens)

Every question screen uses the same layout — the only thing that changes is the question content. This is Principle 5 (consistency) in action: the buyer learns the pattern once.

### Shared screen template (mobile, 375px)

Top to bottom:

1. **Progress bar** — thin 2px bar at the very top, `terracotta-600` fill against `stone-200` track. Shows "X из 5" in `text-caption` stone-500 to the right of the bar (e.g., "2 из 5"). Bar animates when advancing.

2. **Back button + Skip button row** — just under the progress bar, `space-3` vertical padding. Back chevron (`ChevronLeft` Lucide icon, ghost button) on the left. "Пропустить" ghost button on the right (`text-meta` stone-500). Both have 44×44 hit areas.

3. **Question headline** — `text-h1` (24px) semibold stone-900, centered. One line when possible. Maximum 2 lines.

4. **Optional helper text** — if the question needs a short explanation, `text-meta` (14px) stone-500, 1-2 lines, under the headline.

5. **Answer area** — scales based on question type. Minimum 44×44 tappable surface per option. Answer blocks stack vertically on mobile.

6. **Primary CTA** — `AppButton primary lg` at the bottom, full-width-minus-padding. Label changes per screen: "Далее" for Q1-Q4, "Показать квартиры" on Q5.
   - Disabled state (grayed) until at least one answer is selected OR the user taps Skip.
   - On Q5, the button commits and navigates to Results.

7. **Bottom spacing** — `space-6` safe-area-aware padding so the CTA doesn't touch the device bottom.

### Desktop layout difference (≥1024px)

- Max container width 640px centered (narrower than the usual 1200px — this is a focused flow, not a browsing page)
- Progress bar sticks at the top of the container, not the viewport
- Everything else identical; no extra content added

## 2.5 Screen-by-screen content (from Blueprint §7.3)

### Screen 1 of 5 — Budget

**Headline:** "Какой бюджет вы рассматриваете?"

**Answer area:** five large tappable cards (`AppCard`, single-select visual), stacked vertically:
- "До 500 000 TJS"
- "500 000 – 800 000 TJS"
- "800 000 – 1 200 000 TJS"
- "Более 1 200 000 TJS"
- "Указать точно" — expands on tap into an `AppInput` field (minimum + maximum number range)

**Skip label:** "Пока не знаю"

### Screen 2 of 5 — Rooms

**Headline:** "Сколько комнат вам нужно?"

**Answer area:** `AppChipGroup` with four chips in one row, multi-select: "1", "2", "3", "4+"

**Skip label:** "Не важно"

### Screen 3 of 5 — Area

**Headline:** "В каком районе?"

**Helper text:** "Можно выбрать несколько районов"

**Answer area:** two-part — map on top, list below (Blueprint §7.3 Screen 3).

- **Map preview** (top, `aspect-video`, `radius-md`) — static or light-interactive map of Dushanbe + Vahdat with district polygons. Tappable districts highlight with terracotta-100 fill.
- **District list** (below map) — `AppChipGroup` multi-select with the 10-12 most common Dushanbe and Vahdat districts. Horizontally scrollable.

**Build note (UI Spec deferral, not a Blueprint change):** If the interactive map is too much work for the first build wave, ship the district chip list alone and add the map in a second pass. The Blueprint requires both; this deferral should be a short-term gap, not a permanent design. The chip list alone meets the multi-select requirement but loses the spatial context that Blueprint intends.

**Skip label:** "Все районы"

### Screen 4 of 5 — Finishing

**Headline:** "Какая отделка вам подходит?"

**Helper text:** "Это влияет на цену и на то, сколько работы останется вам"

**Answer area:** four large tappable cards (`AppCard`), stacked vertically, each with:
- Small illustrative image (of that finishing type — can be a simple icon or a stock-free reference photo)
- Card title in `text-h3` semibold
- One-line explanation in `text-meta` stone-500
- Small `HelpCircle` icon (Lucide) in top-right corner — tap opens `AppModal` with a longer explanation

Five options:
- **Без ремонта** — "Дешевле, вы делаете ремонт сами"
- **Предчистовая** — "Черновая отделка готова, вы завершаете"
- **С ремонтом** — "Готово к заезду"
- **Отремонтировано владельцем** — "Готовое жильё, осмотрите лично" (resale only — selecting this filters results to owner/intermediary listings; developer listings are excluded since this finishing type is invalid for new builds per Data Model §5.5 invariants)
- **Не важно** — "Покажите все варианты"

Single-select.

**Skip label:** "Не важно"

### Screen 5 of 5 — Timing and payment

**Headline:** "Когда и как вы планируете платить?"

**Helper text:** "Две коротких вопроса — и мы покажем подходящие варианты"

**Answer area:** two sub-questions stacked vertically, each rendered as a chip group:

**Sub-question A: Когда нужна квартира?**
`AppChipGroup` single-select:
- "Сейчас"
- "В течение 6 месяцев"
- "В течение года"
- "Не важно"

**Sub-question B: Как планируете платить?**
`AppChipGroup` single-select:
- "Наличными"
- "В рассрочку"
- "Оба варианта"

Both can be skipped independently.

**Primary CTA:** "Показать подходящие квартиры" (longer label than Q1-Q4 because this is the commit moment)

## 2.6 Results screen (mobile, /pomoshch-vybora/rezultaty)

Per Blueprint §7.3 Results screen and PRD §9.2 (the magic moment = 3-5 strong matches).

Top to bottom:

1. **Header row** — `text-h2` "Мы нашли X квартир для вас" (where X is typically 3-5 for a strong match set). Below it in `text-meta` stone-500: "На основе ваших ответов · [show summary: 2-3 комн. · 500k-800k TJS · с ремонтом · Сино, Исмоили Сомони]"

2. **"Изменить ответы" ghost button** top-right of the header row — lets the buyer go back without losing context.

3. **Match cards** — 3-5 `ListingCard` components stacked vertically using a new `match` variant (extending the variants defined in Layer 7.7). The `match` variant adds two rows above the standard Identity row:
   - **Match confidence row** — `text-meta` semibold, color `fairness-great` (forest green): "Совпадение 92%"
   - **Why this fits row** — `text-caption` stone-700, 2-3 short bullet phrases separated by `·`: "В вашем бюджете · Нужное количество комнат · Отделка соответствует"
   
   This is a guided-flow-specific extension to the `ListingCard` primitive. The `match` variant is added to the existing variants list (`full`, `compact`, `map-preview` → `full`, `compact`, `map-preview`, `match`). Rest of the card body (price, key facts, installment, seller, actions) is identical to the `full` variant.
   
   **Pending technical decision:** the match percentage algorithm (how "92%" is computed from the user's answers) is not specified in Blueprint, PRD, or Technical Spec. This belongs to a matching-logic decision to be locked during build. Simplest acceptable V1 approach: compute a weighted match score from the 5 answer dimensions — each dimension that matches scores points, each missed criterion loses points, total normalized to 0-100%. Lock the exact weights before launch.

4. **Bottom CTA row** — sticky at the bottom of the viewport (uses the `StickyContactBar` primitive pattern but with different contents):
   - **"Посмотреть все подходящие · [N] вариантов"** — `AppButton primary lg`, full-width minus secondary button space. Links to Apartments browsing (Page 6) with filters pre-applied from the match answers.
   - **"Изменить ответы"** — `AppButton ghost md` next to it.

## 2.7 Platform components used

| Block | Platform components |
|---|---|
| Question screens (all 5) | None (primitives only) |
| Results header | None |
| Results match cards | `ListingCard` with new `match` variant (extends Layer 7.7 variants list) |
| Results bottom CTA | None (custom sticky bar pattern, built from `AppButton`) |

## 2.8 Primitive components used

`AppButton` (primary, ghost), `AppCard` (question answer cards), `AppChip` + `AppChipGroup` (single and multi-select), `AppInput` (custom-budget entry), `AppModal` (finishing-type explainer popup)

## 2.9 Empty and edge states

Per Blueprint §7.4:

- **Zero results after applying all filters:** Results screen shows the header "По вашим критериям пока нет подходящих квартир" and a subhead "Вот похожие варианты — мы указали, что не совпадает". Show 3-5 near-matches, each with a `text-meta` line explaining which criterion it misses (e.g., "Цена выше бюджета на 50 000 TJS"). Bottom CTA changes to "Изменить ответы" (primary) + "Смотреть все квартиры" (ghost).

- **Too many results (>50):** Intermediate screen between Q5 and the Results screen: "Мы нашли много вариантов. Давайте уточним." Shows one additional optional question (e.g., size range or floor preference) with a skip. Then goes to Results. This keeps the 3-5 strong match rule intact without losing the user's progress.

- **User skips every single question:** Results screen shows the platform's 5 most-verified active listings (highest trust tier, most recent, strongest fairness indicator). Header changes to "Популярные квартиры на платформе". No match confidence row on the cards (since there's no match to measure against).

- **Network error during question flow:** Answers already given persist locally. Show a retry banner at the top of whichever screen the error happened on. Never drop the user back to Screen 1.

- **Network error on Results screen:** Show the skeleton cards + a retry button. Don't navigate away.

## 2.10 What must NOT appear on this page

Per PRD §19 (halal-by-design) and Blueprint §7.2:

1. **No forced registration.** The buyer can complete the entire flow and view results without an account.
2. **No email/phone capture before showing results.** Results are shown first. If the buyer wants to save them, *then* account prompt appears.
3. **No "Create account to see your matches" wall.** This is the single most common anti-pattern in real-estate quiz UX, and Nawy (our analog) explicitly avoids it. Blueprint §7.2 bans it.
4. **No progress-blocking ads** between questions.
5. **No "skip at your own risk" warnings.** Skip is a first-class choice, not a penalty.
6. **No fake urgency on the results page** ("3 people just got their matches!" etc.).
7. **No more than 5 screens in the core flow.** If the buyer has many criteria, the extra filtering happens on the search results page, not inside the quiz.
8. **No skip buttons that lie.** Tapping "Пропустить" must truly skip — not move the question into a "maybe later" queue.
9. **No long explanations or helper text paragraphs.** Max 2 lines of helper text per screen.
10. **No celebration animation on Results screen** ("🎉 We found your perfect match!"). The results speak for themselves (Principle 2 — calm, not loud).

## 2.11 Acceptance criteria

The guided finder is done when:

1. From "Помочь выбрать" tap on Homepage to Results screen rendered, **under 90 seconds** at a normal tap pace (Blueprint §7.1, validated against 2026 onboarding research)
2. Every question screen has a **visible, reachable Skip option with 44×44 hit area**
3. Every question screen has a **visible Back option** that preserves previously entered answers when navigating back
4. Results screen shows **3-5 cards by default** (not 1, not 20); Blueprint §7.1 magic moment requirement
5. Each card on Results has a **match percentage row and a "why this fits" row** above the standard Identity row
6. Results can be viewed **without account creation**
7. Tapping "Посмотреть все подходящие" navigates to Apartments browsing with all filters pre-applied
8. Tapping "Изменить ответы" returns to Screen 5 with all answers preserved
9. Answers persist in browser session (localStorage) — if the buyer closes and reopens the browser within the same session, the Results screen is still reachable. Exact persistence duration is a technical decision locked during build; Blueprint §7.3 requires persistence but doesn't specify duration.
10. If the buyer registers during or after the flow, answers port over to their account
11. Zero-result and many-result edge cases (§2.9) both gracefully degrade
12. The experience does not include any pattern from §2.10

---

# Page 3 — Projects browsing (Новостройки list)

## 3.1 What this page is for

Let buyers browse and filter new-build **buildings** (not individual apartments) and understand at a glance which ones are worth opening. This is the default entry for "ready" buyers who tap "Новостройки" on the homepage.

This page is **project-first**: each result is a building, with a preview of matching apartments inside it. This reflects the locked strategic decision that buyers in our market typically evaluate a building's trust and location first, then drill into apartments.

Follows Blueprint §8 exactly. Layer 7 components and 2026 search-page research inform visual execution.

## 3.2 Route and entry points

**Route:** `/novostroyki`
**Route with filters in URL:** `/novostroyki?district=sino&price_to=1200000&finishing=full_finish`
**Map mode route:** `/novostroyki?view=karta` (see Page 4 for full map spec)

**Entry points:**
- "Новостройки · [N] проверенных проектов" card on Homepage (Page 1, Block B)
- Global nav "Новостройки" link (desktop top bar / mobile hamburger)
- Match results "Посмотреть все подходящие варианты" when guided-finder results were building-level (Page 2)
- A suggestion chip tap on the Homepage quick search
- Direct URL share (filters serialize into URL)

## 3.3 Design principles driving this page

Three research-validated rules from 2026 real-estate search patterns shape this page:

1. **Sticky filter bar always accessible.** Zillow-pattern: the buyer can adjust price, rooms, finishing without leaving the results view. Maintains flow.
2. **Filter count + result count visible at all times.** "X проектов найдено" answers the buyer's "am I narrowing correctly?" question in real time.
3. **Progressive disclosure on filters.** Core filters (district, price, rooms) visible and easy. Extended filters hidden behind "Больше фильтров." Nobody wants 30 filter options at once.

Additional principles specific to this product:

4. **Every building card shows source-proof trust signals inline.** Verification badge, developer name, last-updated date. Buyers decide which buildings to open *on the card*, not after opening them.
5. **Filtering reveals matching units inside each building** — when the buyer has filters active, each building card shows "X квартир подходят" with 2 preview lines. This bridges the project-first layout with the unit-level filter intent.

## 3.4 Mobile layout (375px viewport, top to bottom)

### Block A — Top sticky bar

Per Blueprint §8.3 Top sticky bar.

One row, `py-3 px-4`, background white, border-bottom stone-200:
- **Back button** (left) — `ChevronLeft` Lucide icon, 44×44 hit area
- **Page title** (center) — `text-h3` semibold: "Новостройки"
- **Action icons** (right, in order): Filters / Sort / Map — three Lucide icon buttons with 44×44 hit areas. The Filters icon has a small terracotta-600 numeric badge if any filters are active ("3" if 3 filters are applied).

The bar stays sticky at the top of the viewport as the list scrolls.

### Block B — Active filter chips (horizontally scrollable)

Per Blueprint §8.3 Active filter chips. Only renders when at least one filter is active.

- Row of `AppChip` variant `removable` (from Layer 6.10), horizontally scrollable with invisible scroll affordance (slight fade on the right edge to hint more chips exist)
- Each chip shows the filter label compactly: "Сино, Исмоили Сомони", "до 1 200 000 TJS", "С ремонтом", "Рассрочка", etc.
- Each chip has an × icon on the right — tap removes that filter and re-fetches results
- At the end of the row, when 2+ filters are active: **"Очистить все"** `AppButton ghost sm` — clears all filters

### Block C — Result count and freshness

Per Blueprint §8.3 Result count.

One line, `text-meta` (14px) stone-500, `py-2 px-4`:
- **"X проектов найдено · обновлено сегодня"**
- The freshness note ("обновлено сегодня") is a trust signal — platform activity is fresh.

If the data freshness is older than today, show the actual relative date ("обновлено 2 дня назад"). This implements the honesty principle from PRD §7.4 — don't fake a fresher date than reality.

### Block D — Building cards list

Per Blueprint §8.6. Stacked vertically on mobile, `gap-4` between cards.

Each card uses the `BuildingCard` platform component (Layer 7.8) **extended with Blueprint §8.6 structure** — see §3.7 below for the spec alignment note.

The list lazy-loads additional cards as the buyer scrolls. **UI Spec decision (not in Blueprint):** infinite scroll pattern with a "Load more" fallback button at the end for accessibility and orientation. This is the 2026 mobile norm, but the alternative (explicit pagination) is equally valid — final pattern choice can be revised during build based on testing.

### Block E — Floating map-toggle button (bottom right)

Per Blueprint §8.3 Map toggle floating button.

- `AppButton primary` with Map icon + text "Карта"
- Position: `fixed bottom-6 right-4` (respects safe-area-inset-bottom)
- `radius-full` (pill-shaped)
- `shadow-md`
- Switches to Map mode (Page 4) while preserving all current filters in the URL

## 3.5 Desktop layout (≥1024px)

Per Blueprint §8.4.

Three-column arrangement (max container 1200px from Layer 4):
- **Left column (280px fixed):** persistent filter panel — not a drawer, always visible. Uses the same filters as mobile but rendered inline rather than hidden behind a button.
- **Middle column (flex):** result count + building cards list, 2-up grid
- **Right column (optional):** map preview. Toggle at top of middle column switches between "List only" and "Split list + map". In split mode, map takes right ~40%.

The Filters button in the top bar is hidden on desktop (filters are already visible in the left column). The Sort and Map toggles remain in the top bar.

## 3.6 Filters sheet (mobile) / panel (desktop) contents

Per Blueprint §8.5. Exact filter set:

| Filter | Control | Multi/Single | Notes |
|---|---|---|---|
| District | `AppChipGroup` multi-select | Multi | 10-12 most common Dushanbe + Vahdat districts |
| Price from | Range slider | Single range | Min + max in TJS, tabular figures |
| Price per m² | Range slider | Single range | Min + max in TJS/m², shown only when "Больше фильтров" is open |
| Rooms available | `AppChipGroup` multi-select | Multi | "1, 2, 3, 4, 5+" |
| Delivery date | `AppSelect` or `AppChipGroup` | Multi | Quarters up to 2+ years |
| Building status | `AppChipGroup` multi-select | Multi | "Объявлен / Строится / Почти готов / Сдан" — matches `building_status` enum (Data Model §3.6) |
| Finishing options available | `AppChipGroup` multi-select | Multi | "Без ремонта / Предчистовая / С ремонтом / Отремонтировано владельцем" — all 4 finishing enum values per Data Model §3.4. Uses `finishing-*` chip colors from Layer 2.6. Selecting "Отремонтировано владельцем" implies owner/intermediary source — backend filters accordingly. |
| Installment available | `AppCheckbox` or toggle | Single | Single yes/no toggle |
| Verification level | `AppChipGroup` single-select | Single | "Все / Только проверенные застройщики" |
| Developer | `AppSelect` multi-select | Multi | Hidden until 5+ developers are in the database |

**Primary filters** (always visible): District, Price from, Rooms available, Finishing, Installment available.
**Extended filters** (behind "Больше фильтров"): Price per m², Delivery date, Building status, Verification level, Developer.

### Filter sheet footer (mobile)
Sticky at the bottom of the sheet:
- "Очистить" `AppButton ghost md` (left)
- "Показать X проектов" `AppButton primary md` (right, expands to fill remaining width) — count updates live as filters change

## 3.7 Building card structure (per Blueprint §8.6)

**Important alignment note:** Blueprint §8.6 specifies a 6-row BuildingCard structure that extends what's currently in Layer 7.8. The platform component needs to be updated to match Blueprint. This UI Spec uses the Blueprint-correct structure:

### Row 1 — Visual preview
- One large hero image (cover photo OR latest construction photo — platform team's dated photo preferred when available)
- Small row of 2–3 thumbnails below the hero
- Save heart icon top-right over the hero photo

### Row 2 — Identity
- Building name in `text-h3` semibold
- District in `text-meta` stone-500 on the line below
- Developer name + `VerificationBadge` (tier-developer variant, Layer 7.3) if the developer is verified

### Row 3 — Key facts
- **Price from** in `text-h2` (20px) semibold, tabular figures
- **Price per m²** in `text-meta` stone-700, tabular: "от 8 500 TJS/м²"
- **Delivery date** in `text-meta` stone-700: "Сдача: IV кв. 2027"
- **Room types available** in `text-meta` stone-700: "1–4 комнаты"
- **Finishing chips** — inline `AppChip` variant `finishing` for each type available (Layer 6.10), using Layer 2.6 finishing colors

### Row 4 — Trust strip
- **`VerificationBadge`** (Layer 7.3) — highest tier the building has
- **Last-updated date** in `text-caption` stone-500: "Обновлено 14 марта"
- **Small construction-progress indicator** (if available) — one line: "Сейчас: 62% готово" with a 2px terracotta-600 progress bar below the text

### Row 5 — Matching units preview (conditional)
Only renders when the buyer has at least one filter applied AND at least one unit in the building matches.

- One line: **"[N] квартир подходят вашим фильтрам"** in `text-meta` semibold stone-900
- Up to 2 preview lines below in `text-meta` stone-700:
  - "2 комн. · 64 м² · с ремонтом · от 820 000 TJS"
  - "2 комн. · 72 м² · без ремонта · от 690 000 TJS"
- Preview lines are tappable — tap opens the unit directly (bypasses the building page). Use `stopPropagation` so this doesn't also trigger the card tap.

### Row 6 — Actions
- **"Смотреть проект"** `AppButton primary sm` — opens the building detail page (Page 5)
- **"Все квартиры"** `AppButton secondary sm` — opens the Apartments browsing page (Page 6) pre-filtered to this building's matching units

Whole card (except action row buttons, save icon, and unit preview lines) is wrapped in a clickable `<Link>` to the building detail page, with `stopPropagation` on the nested interactive elements.

## 3.8 Platform components used

| Block | Platform components |
|---|---|
| A — Top bar | None (primitives) |
| B — Active filter chips | `AppChip` removable variant |
| C — Result count | None |
| D — Building cards | `BuildingCard` (Layer 7.8 — **needs update to match Blueprint §8.6**), embedded `VerificationBadge` (Layer 7.3) |
| E — Map toggle | None |
| Filter sheet | `FilterSheet` (Layer 7.10) |

## 3.9 Primitive components used

`AppButton` (primary, secondary, ghost, icon buttons), `AppChip` + `AppChipGroup` (multi-select, removable), `AppInput`, `AppSelect`, `AppCheckbox`, `AppBottomSheet` (mobile filter sheet), `AppCard` (building cards are built on AppCard)

## 3.10 Empty and edge states

Per Blueprint §8.7. This is a critical section — dead-ends break the buyer journey.

### Zero buildings match filters
Show a friendly, not-decorative empty state:
- Heading: `text-h2` "По вашим фильтрам проектов не найдено"
- Subhead: `text-body` stone-700 "Попробуйте:"
- Four action buttons, stacked vertically on mobile:
  1. `AppButton ghost md` "Убрать фильтр: [specific filter]" — system suggests the filter with the smallest impact on result count per Blueprint §8.7 (e.g., the rarest district, the tightest price range). **UI Spec suggestion (not in Blueprint):** if multiple filters tie, the most recently added one is suggested for removal — can be revised during build if a different tiebreaker reads better.
  2. `AppButton ghost md` "Расширить бюджет до [X]" — suggests a 20% wider price range
  3. `AppButton ghost md` "Посмотреть похожие квартиры" — switches to Apartments browsing (Page 6) with filters relaxed
  4. `AppButton primary md` "Помочь выбрать" — opens guided finder (Page 2)

### 1-3 buildings match (low confidence)
Show the results normally. Below the last card, a small banner using `AppCard` with `stone-100` subtle background:
- "Всего [N] проектов. Хотите расширить поиск?"
- `AppButton ghost sm` "Расширить район" or "Убрать фильтр [X]" — system picks the most impactful relaxation

### No buildings in the whole database (platform launch day)
- Heading: `text-h2` "Мы только запускаемся"
- Body: `text-body` stone-700 "Первые проекты появятся на этой неделе — оставьте номер, чтобы узнать первым."
- Single phone input + Submit button

### Loading state (first paint)
- Top bar + page title render immediately
- Active filter chips render if any (from URL state)
- Result count shows skeleton ("... проектов найдено" with pulsing stone-200 skeleton)
- Building card area shows 3-5 skeleton cards using shadcn's Skeleton component (stone-200 fill, `radius-md`, sized like real cards)

### Network error
- Banner at top of the cards list: `text-meta` semantic-error color "Не удалось загрузить. Попробуйте ещё раз." + `AppButton ghost sm` "Повторить"
- Existing loaded data stays visible — we don't clear the list on error

## 3.11 What must NOT appear on this page

Per PRD §19 and the design system:

1. No interstitial ads between building cards
2. No "Sponsored" cards that look identical to organic cards (if sponsorship is ever introduced, it must be visually distinct AND labeled)
3. No "You might also like" recommendations that violate the buyer's active filters
4. No auto-playing video on any card
5. No hover-only information — every piece of info must be visible on mobile (no desktop-only tooltips that hide info)
6. No "Price dropped!" urgency banners that use red color or `!` marks — price changes use the `ChangeBadge` component from Layer 7.12 in saved items only, not inside search results
7. No fake result count. If the count is 7, show "7 проектов найдено" — never "7+ проектов"
8. No ads disguised as filters (e.g., "Featured developer" pre-selected)
9. No exit-intent popups
10. No page-shake / card-wiggle animations to draw attention

## 3.12 Acceptance criteria

The Projects browsing page is done when:

1. On 375px mobile, the top sticky bar (Block A) stays pinned to the top of the viewport as the list scrolls
2. Applying a filter updates the result count and the visible cards without a full page reload (SPA navigation pattern)
3. All active filters render as removable chips (Block B), and the **"Очистить все"** action appears when 2+ filters are active
4. Every building card renders all 6 rows per Blueprint §8.6 when data is available; Row 5 (Matching units preview) only renders when filters are active AND at least 1 unit matches
5. The Map toggle floating button (Block E) preserves all current filters when switching to Map view
6. Zero-results state offers 4 concrete actions (not a dead-end generic message)
7. Low-result state (1-3 buildings) shows the main results plus a gentle expansion banner
8. The filter sheet (mobile) or filter panel (desktop) presents 5 primary filters up front and hides extended filters behind "Больше фильтров"
9. Lighthouse mobile performance ≥ 90, accessibility = 100
10. Filters serialize into the URL — a buyer can copy the URL and share it, and the receiver sees the same filtered results
11. No pattern from §3.11 appears on the page

## 3.13 Layer 7 gap flagged for build

Blueprint §8.6 defines a **6-row BuildingCard** structure that is richer than the current Layer 7.8 spec. Before Codex builds this page, `BuildingCard` in Layer 7.8 must be updated to include:

- Row 3 key facts: price per m², delivery date, room types range, finishing chips (currently Layer 7.8 only lists starting price)
- Row 4 trust strip with verification badge, last-updated date, and construction-progress indicator
- Row 5 matching units preview (conditional on active filters)
- Row 6 two-action footer ("Смотреть проект" + "Все квартиры")

This is a **design system inconsistency I caught during UI Spec drafting, not a UI Spec deviation.** Recommended fix: update Layer 7.8 to the Blueprint-correct 6-row structure before build begins. This ensures the Design System Spec and Blueprint stay aligned as single sources of truth.

---

# Page 4 — Map view

## 4.1 What this page is for

Help location-sensitive buyers explore buildings spatially without losing filter context. This is the same result set as Projects browsing (Page 3) — just visualized geographically instead of as a list.

Follows Blueprint §9 exactly. MapLibre GL JS + OpenFreeMap locked in tech spec §7.

## 4.2 Route and entry points

**Route:** `/novostroyki?view=karta` (map is a view mode of the Projects browsing page, sharing the same filter state and URL serialization)

**Entry points:**
- "Карта" floating button on Projects browsing (Page 3, Block E)
- "Карта" icon button on the top sticky bar of any browsing page
- Map-mode link shared in a URL (filters + view state preserved)
- Map shortcut chip on homepage (if implemented)

**Critical:** switching to Map view **never drops filters**. The filter state is in the URL; the map reads the same state. This is a key user-flow guarantee from Flow B10.

## 4.3 Design principles driving this page

Three 2026 research-validated rules shape this page:

1. **Tap a pin → preview, not full page navigation.** Blueprint §9.7 explicitly prohibits "full-page open on every pin tap." The 2026 Zillow/Redfin/Rightmove pattern: pin tap opens a compact preview that lets the buyer decide whether to drill in. This keeps exploration fluid.
2. **No silent viewport-based result refresh.** Blueprint §9.5 is firm: moving the map shows a "Искать в этой области" button. The buyer decides when to refresh — we never quietly replace results under them.
3. **Clustering for dense areas.** MapLibre's built-in clustering (confirmed in Tech Spec §7.4) handles dense pin sets. Clusters show counts at high zoom, break apart as the buyer zooms in. Progressive disclosure for map density.

Additional principles specific to this product:

4. **Location permission is optional, never required.** Blueprint §9.6 — if the user denies geolocation, the map still works with Dushanbe as the default center. We never block the map behind a permission ask.
5. **Map loads the base tiles first, pins second.** On slow connections, the buyer at least sees the streets of Dushanbe while pins are fetching. This prevents the "blank map" anxiety pattern.

## 4.4 Mobile layout (375px viewport)

Per Blueprint §9.2 — **full-screen map with sticky filter summary at the top and sticky result count.**

### Map canvas
Fills the entire viewport minus the sticky overlays. Uses MapLibre GL JS with the OpenFreeMap vector tile style (tech spec §7.1). Default center: Dushanbe center coordinates (approximately 38.5598° N, 68.7870° E), zoom level ~12 (shows most of the city).

### Sticky top bar (overlaid on map)
Same top-bar pattern as Projects browsing (Page 3, Block A):
- **Back button** (left)
- **"Карта"** page title (center)
- **Filters / Sort / List toggle** icons (right) — the Map icon is replaced by a List icon that returns to Projects browsing

Background: white with `shadow-sm` so it lifts above the map. Same height as Block A in Page 3.

### Active filter chips (overlaid, below top bar)
Same horizontal scroll of `AppChip` removable chips as Page 3, Block B. Only renders when filters are active.

Background: white with subtle transparency (`bg-white/95` or solid white with `shadow-sm`) — the chips must be readable over the map.

### Sticky result count (overlaid, below filter chips)
One line: "X проектов в этой области · обновлено сегодня" in `text-meta` stone-700, `py-2 px-4`, white background.

**"X проектов в этой области"** is deliberately different from Page 3's "X проектов найдено" — on the map, the count reflects what's visible in the current map viewport (once the "Search this area" button has been tapped at least once), not the global filter count.

Initial state (before any viewport search): shows the same global count as Page 3 — "X проектов найдено".

### Floating "Search this area" button (map behavior)
Per Blueprint §9.5 — appears when the buyer pans or zooms the map far enough from the last search position.

- `AppButton primary sm` with `RefreshCw` Lucide icon + "Искать в этой области"
- Position: `fixed top-32` (below the result count), centered horizontally
- `shadow-md`
- Appears with a subtle fade-in animation (matching shadcn Radix defaults)
- Disappears once tapped OR when the map is panned back to the previous search area

**Threshold for showing:** viewport center moves more than ~30% of the visible area from the last search center, OR zoom level changes by more than 1 level. Exact threshold tunable during build — these numbers are UI Spec suggestions, not Blueprint rules.

### Floating "List" toggle button (bottom right)
Mirror of the Map button on Page 3 (Block E) — lets the buyer switch back to list view.

- `AppButton primary` with List icon + "Список"
- Position: `fixed bottom-6 right-4` (safe-area-aware)
- `radius-full`, `shadow-md`
- Preserves filters when switching back to Page 3

### Floating "My location" button (bottom left)
- `AppButton secondary` icon-only with `Navigation` Lucide icon
- Position: `fixed bottom-6 left-4` (safe-area-aware)
- `radius-full`, `shadow-md`
- On tap: requests geolocation permission (first time) or centers map on current location (subsequent taps)
- If permission denied: button is still present but shows a toast "Чтобы показать ваше местоположение, разрешите доступ в настройках браузера" on tap — does not block map otherwise

## 4.5 Pin rendering

Pins are **buildings**, not individual apartments. One pin = one building (with potentially many apartments inside it).

### Individual pin visual
Custom HTML marker (MapLibre supports HTML markers):
- Circle, ~28×28px
- Fill: `terracotta-600` by default
- For verified-developer buildings: fill changes to `badge-tier-developer` (muted gold) to signal premium trust at a glance
- White 2px border around the circle for contrast against any map background
- `shadow-sm` below
- Inside the circle: a small price label in `text-caption` white (e.g., "820k") — shows the starting price in compact form (thousands of TJS)

**Design rule:** the pin color only encodes one additional piece of information (developer verification). We don't overload pins with too many color signals — that makes the map loud (Principle 2). Other trust/source distinctions live in the preview card, not the pin.

### Cluster pin visual
MapLibre's built-in cluster functionality, styled to match brand:
- Circle, size scales with count: 36px for <10 buildings, 44px for 10-50, 52px for >50
- Fill: `terracotta-100` (subtle, lighter than individual pins so they feel secondary)
- Border: 2px `terracotta-600`
- Inside: the cluster count in `text-h3` semibold terracotta-800
- `shadow-sm`

### Cluster interaction
- Tap a cluster: map zooms in to the cluster's bounding box (MapLibre built-in)
- At max zoom (configurable, tech spec defaults to ~18), clusters unfold — per the `maplibre-gl-teritorio-cluster` plugin or a simpler approach using MapLibre's built-in `clusterMaxZoom`

## 4.6 Pin preview card (pin tap → bottom sheet)

Per Blueprint §9.4 — exact content defined.

When a pin is tapped, an `AppBottomSheet` slides up from the bottom of the viewport, using the `map-preview` variant of `ListingCard` / `BuildingCard` (Layer 7.7, 7.8).

### Bottom sheet contents (mobile)
- **Drag handle** at top (standard shadcn sheet handle)
- **Main image** (small, `aspect-video`, `radius-md`, max height 160px)
- **Building name** in `text-h3` semibold
- **Price from** in `text-h2` semibold tabular
- **Price per m²** in `text-meta` stone-700: "от 8 500 TJS/м²"
- **Delivery date** in `text-meta` stone-700: "Сдача: IV кв. 2027"
- **VerificationBadge** (Layer 7.3) — highest tier the building has
- **Matching unit count for current filters** in `text-meta` semibold: "[N] квартир подходят вашим фильтрам"
- **Action row**:
  - "Смотреть проект" `AppButton primary md` (full width on mobile)
  - "Все квартиры" `AppButton secondary md` (full width on mobile, below primary)

**Max height of sheet:** ~50vh. The map behind the sheet stays visible above the sheet — the buyer can see the pin they just tapped without closing the sheet.

### Desktop pin preview
Instead of a bottom sheet, a popover appears next to the pin on desktop. Same content, different container.

## 4.7 Desktop layout (≥1024px)

Per Blueprint §9.3 — split view.

- **Left column (60% width):** map canvas, full-height
- **Right column (40% width):** vertical list of `BuildingCard`s, scrollable

**Bidirectional highlight:**
- Hovering a card in the list: the corresponding pin on the map changes to a "highlighted" state — border thickens to 3px, pin scales up 10%, shadow grows to `shadow-md`
- Clicking a pin: scrolls the right-column list to the corresponding card and highlights it with a subtle terracotta-100 background

The top sticky bar on desktop shows the View toggle as a segmented control: "Список / Карта / Разделённый вид" — lets the buyer choose list-only, map-only, or split view.

## 4.8 Map behavior (moving and searching)

### Initial load
- Map loads centered on Dushanbe at zoom 12
- If URL filters specify districts, map auto-fits to the bounding box of those districts (so the buyer sees the relevant area)
- Pins for all currently-filtered buildings load as one batch

### Pan/zoom
- Panning the map does NOT refresh results silently (per Blueprint §9.5)
- Once the viewport has moved far enough, the "Искать в этой области" button appears
- Tapping it re-fetches results for the current viewport AND updates the URL to include a `bbox` parameter (so the URL state reflects what's shown)

### Zoom controls
- Pinch-to-zoom on mobile (MapLibre default)
- + / – buttons on desktop, positioned top-right of the map canvas
- Attribution (OpenStreetMap + OpenFreeMap credits) in the bottom-right corner per OSM license requirements — `text-caption` very small, subtle

## 4.9 Platform components used

| Block | Platform components |
|---|---|
| Top sticky bar | None (primitives) |
| Active filter chips | `AppChip` removable variant |
| Pin preview bottom sheet | `ListingCard` / `BuildingCard` `map-preview` variant (Layer 7.7, 7.8), `AppBottomSheet` |
| Desktop list column | `BuildingCard` (full variant, Layer 7.8) |

## 4.10 Primitive components used

`AppButton` (primary, secondary, icon buttons), `AppChip`, `AppBottomSheet`, `AppCard` (desktop pin popover). Plus MapLibre GL JS for the map itself — not a design-system primitive, but the tech layer.

## 4.11 Empty and edge states

Per Blueprint §9.6:

### Location permission denied
- Map still works, centered on Dushanbe default
- "My location" button remains visible but shows the permission toast on tap (see §4.4)
- No blocking modal, no repeated permission re-ask

### No pins in current viewport
- Small floating message card using `AppCard` with `stone-100` subtle background, positioned `fixed top-1/3 center`:
  - `text-body` stone-700: "В этой области нет проектов. Сдвиньте карту или попробуйте другой район."
- No CTA button — the buyer just pans the map
- Message dismisses automatically when the viewport has at least 1 pin again

### Map fails to load (tiles unreachable, WebGL unsupported, etc.)
- Fall back to the list view (Page 3) with a toast banner: "Карта временно недоступна. Показываем результаты списком."
- Don't show a broken map canvas — switching to list is less confusing
- Log the failure for analytics so we can track tile reliability

### Slow tile load (>3 seconds on initial paint)
- Show a subtle shimmer on the map canvas area while tiles load
- Pin data can start loading in parallel; once tiles are ready, pins render

### WebGL not supported on the device
- Fall back to list view (Page 3) with a toast: "Карта не поддерживается на вашем устройстве. Показываем результаты списком."

## 4.12 What must NOT appear on this page

Per Blueprint §9.7 and PRD principles:

1. **No full-page navigation on pin tap.** Pin taps always open the bottom sheet (mobile) or popover (desktop) first. Full navigation only happens when the buyer taps "Смотреть проект" or "Все квартиры" in the preview.
2. **No tiny tap targets.** All pins are at least 28×28px with 44×44 effective hit area (invisible padding via MapLibre's `markerSize` or a custom hit layer).
3. **No cluttered clusters.** Clusters that hide too many pins at once are forbidden — clusters must always show their count. Max cluster size before forced zoom-in can be tuned during build.
4. **No silent viewport refresh.** Results never change while the buyer is panning. The "Искать в этой области" button gates every viewport-based refresh.
5. **No third-party ads overlaid on the map.**
6. **No sponsored pins that look identical to organic pins.** If pin sponsorship is ever introduced, it must be visually distinct (e.g., different shape) AND labeled in the preview card.
7. **No animations that follow the buyer's pan** (e.g., pins jumping, floating). Pin movement should only happen from data changes, not decoration.
8. **No permission modal on page load.** Geolocation is requested only when the buyer taps the "My location" button.
9. **No watermark or branding overlays** that cover map content except the required OSM/OpenFreeMap attribution in a corner.

## 4.13 Acceptance criteria

The Map view is done when:

1. Switching between Projects browsing (Page 3) and Map view preserves every active filter and result set
2. Pin tap on mobile opens an `AppBottomSheet` with the preview card (not a full navigation) within 200ms
3. Clusters render for any viewport with more than 4 overlapping pins and auto-unfold as the buyer zooms in
4. Panning/zooming the map does not silently refresh results — the "Искать в этой области" button gates every viewport refresh (Blueprint §9.5)
5. All three edge cases from §4.11 (permission denied, no pins, map fails) show graceful fallbacks
6. Geolocation is never requested on page load — only when the "My location" button is tapped
7. Desktop split view shows bidirectional highlight between cards and pins
8. On slow connections, the base map renders within 3 seconds; pins load in parallel
9. OSM + OpenFreeMap attribution is visible in a corner per OSM license
10. No pattern from §4.12 appears
11. The URL always reflects the current view state (`?view=map`) and the current filters, so a copy-pasted URL reopens the same view with the same pins

## 4.14 Technical notes for Codex

These are practical implementation hooks, not product requirements:

- Use MapLibre GL JS's built-in `cluster: true` on the GeoJSON source for clustering (tech spec §7.4)
- `clusterMaxZoom` and `clusterRadius` are tunable — start with MapLibre defaults (14, 50) and adjust based on pin density
- Custom HTML markers for individual pins (via `maplibregl.Marker` with a custom DOM element) — gives us full styling control to match Layer 2 colors
- For the "Search this area" threshold, compare the current viewport center to the last-search center, using map.getCenter() and map.getBounds()
- Geolocation via the standard browser `navigator.geolocation` API — never a third-party library for this
- Server endpoint: `GET /api/buildings?bbox=<bounding-box>&<filters>` returns GeoJSON for map consumption (tech spec §7.3 for backend design direction)

## 4.15 Layer 7 gap flagged for build

In addition to the `BuildingCard` 6-row structure gap flagged in Page 3 (§3.13), this page requires:

- **BuildingCard `map-preview` variant.** Layer 7.7 defines a `map-preview` variant for `ListingCard`, but Layer 7.8 does not define the equivalent for `BuildingCard`. Blueprint §9.4 specifies the exact content of the pin preview bottom sheet. Before Codex builds this page, Layer 7.8 must add a `map-preview` variant to its variants list (alongside `full` and `compact`), with the content defined in §4.6 of this page.

This gap, like the §3.13 gap, is a Design System Spec inconsistency caught during UI Spec drafting — not a Blueprint deviation.

---

# Page 5 — Building detail page

## 5.1 What this page is for

Turn buyer interest in a building into confidence to contact or shortlist. This is **the most important page on the platform** (Blueprint §10 opening line) — every previous page leads here, and every decision-making signal the platform has is rendered here.

Follows Blueprint §10 exactly (13 blocks, A through M). Layer 7 signature components (VerificationBadge, ProgressPhotoCarousel, FairnessIndicator, InstallmentDisplay, StickyContactBar, SourceChip) all converge on this page.

## 5.2 Route and entry points

**Route:** `/zhk/[slug]` (slug is URL-safe building identifier, e.g., `/zhk/sitora-hills`)

**Entry points:**
- Tap on any `BuildingCard` across the product (Projects browsing, Homepage featured, Guided finder results, Saved, Compare, Map pin preview)
- Direct URL share (WhatsApp, Telegram, social media)
- Link from an `ListingCard` inside this building ("Смотреть проект" on an apartment detail)
- Returning-user strip on Homepage (Block C on Page 1) when something changed for this building

Building slugs are generated from the building name + district (tech spec decision). Redirect legacy IDs to slugs.

## 5.3 Design principles driving this page

Five principles shape this page — more than any other page, because this is the trust moat in action:

1. **Trust first, price second, action always visible.** The first scroll shows verification, not a sales pitch. Blueprint §10.2 locks this as the key information: "whether they can trust it" comes before "how much apartments cost".
2. **Signature wow features render in their dedicated Layer 7 components.** ProgressPhotoCarousel (Layer 7.6), VerificationBadge (Layer 7.3), InstallmentDisplay (Layer 7.5) — these are the product's moat and they must appear without dilution.
3. **Developer inventory and resale inventory are visually separated (Blueprint §10.3 Blocks H and I).** A buyer should never confuse "from the developer" with "from a resale owner" — our source-transparency wedge lives here most visibly.
4. **Contact is one thumb-reach away at all times.** Sticky bottom bar on mobile (Block M), sticky side card on desktop. This is non-negotiable — a buyer who wants to contact right now never scrolls to find how.
5. **Every empty state is an opportunity, not a dead end.** Blueprint §10.3 Block I (empty resale) turns into supply-side acquisition ("Are you an owner in this building? [Post listing →]"). This pattern runs through every conditional section.

## 5.4 Mobile block order (375px viewport)

13 blocks per Blueprint §10.3, A through M. Layer 7 components in bold.

### Block A — Hero gallery

- Swipeable image carousel, full width, `aspect-video` (16:9)
- Photo count indicator top-left: "1 / 12"
- `Save` heart icon top-right over a subtle white-translucent backdrop
- `Compare` icon next to Save icon
- `Back` button top-left (navigates to previous page in history, fallback to Projects browsing)
- If any image fails to load: neutral stone-200 placeholder, never a broken icon (Blueprint §10.3 Block A)
- Pinch-to-zoom disabled in the carousel (distracts from swipe); tap opens a fullscreen lightbox with zoom available

### Block B — Identity strip

- Building name in `text-h1` (24px) semibold stone-900
- District in `text-meta` stone-500 on a line below
- Developer name + **`VerificationBadge`** (tier-developer variant, Layer 7.3) if the developer is verified. Inline on one line: "Застройщик: SomonBuild ✓ Проверенный застройщик"
- **`VerificationBadge`** for the building itself, on the next line: "✓ Объект проверен" with date if Tier 3 ("Проверено 14 марта 2026")
- Last-updated date in `text-caption` stone-500: "Обновлено вчера"

### Block C — Key facts strip

This is Blueprint §10.3 Block C's explicit rule: **"This strip must fit on one screen and is the most important information block on the page."**

Six-row compact vertical list on mobile (or 2-column grid of 3 rows on wider mobile):

| Label | Value example |
|---|---|
| Цена от | 650 000 TJS |
| От | 8 100 TJS/м² |
| Сдача | Q3 2026 |
| Комнаты | 1, 2, 3, 4 |
| Отделка | без ремонта, предчистовая |
| Рассрочка | да (до 7 лет) |

All numeric values use `tabular-nums` from Layer 3.5. Label in `text-meta` stone-500, value in `text-body` stone-900 semibold.

If "Рассрочка" is available, this row is subtly emphasized (stone-50 background) — per PRD §17.5 installment-as-hero, this row is one of the three signature wow features visible here.

### Block D — Construction progress (signature wow feature)

Uses **`ProgressPhotoCarousel`** (Layer 7.6) — the platform's most-cited wow feature.

- Section title: `text-h2` "Ход строительства"
- Horizontal scrolling row of dated photos, each with month and year caption ("октябрь 2026")
- Below the photos: progress bar with percentage
  - 2px terracotta-600 bar against stone-200 track
  - Caption: "Сейчас: 62% готово · Сдача обещана Q3 2026" in `text-meta` stone-700
- Tap any photo → opens fullscreen `AppModal` lightbox with larger view + date
- Photos are ordered newest-first (most recent progress is the first thing the buyer sees when they scroll)

**Building-status-dependent variants** (Blueprint §10.3):
- If building is `delivered`: section replaces carousel with "Объект сдан в [date] — см. фотографии фасада и дворов." + gallery of finished photos
- If building has no progress photos yet (newly published): "Фото стройки появятся после первого визита нашей команды на объект (обычно в течение 2 недель после публикации)." with estimated date
- If photos are stale per product-defined threshold (see Layer 7.6 freshness rules): section degrades — warning below subtitle, or section hidden entirely

### Block E — Why this fits you (conditional)

Shown **only if** the buyer came from filtered search OR completed the guided finder (i.e., the session has match context). For organic visitors without context, this block is replaced by Block E' below.

- Section title: `text-h2` "Почему это вам подходит"
- 3-5 short reasons, each as a bullet with a small `Check` Lucide icon (stone-700) + `text-body` stone-900:
  - "В рамках вашего бюджета"
  - "Тип отделки соответствует фильтру"
  - "Сдача соответствует желаемому сроку"
  - "Доступна рассрочка"
  - "Локация в выбранном районе"
- Reasons are derived from the buyer's filter state or guided-finder answers vs. the building's attributes (tech detail — server-side match logic)

### Block E' — What makes this project special (for organic visitors)

- Section title: `text-h2` "Что делает этот проект особенным"
- 2-3 selling points chosen by the developer (stored as structured `project_highlights` field per Data Model), each in `text-body`
- Each highlight may have an optional thumbnail image (stored in the same field, aspect 16:9)

### Block F — Trust evidence

- Section title: `text-h2` "Проверка и надёжность"
- Content rendered as a stack of small `AppCard` blocks:
  - **Verification tier card** — `VerificationBadge` prominent + one-line explanation + date + tap to open explainer `AppModal` (Blueprint §10.3 explicitly specifies this tap behavior)
  - **Developer profile card** — developer logo, name, "Работает с [year]", "Сдано проектов: [N]", tap opens developer page (out of V1 scope; tapping opens a filter-view of all buildings by this developer on Projects browsing instead)
  - **Last inventory refresh** — `text-meta` stone-500: "Список квартир обновлён: 2 дня назад"
  - **Documents status** (optional in V1 — only shown if available per Blueprint §10.3 Block F)

### Block G — Payment clarity

Uses **`InstallmentDisplay`** (Layer 7.5) — signature wow feature #3.

- Section title: `text-h2` "Условия оплаты"
- Cash price row: `text-h3` "Наличными: от 650 000 TJS"
- Installment block (if applicable):
  - Concrete worked example in `text-body` stone-900: *"Цена 850 000 TJS — первый взнос 15% = 127 500 TJS — 7 лет — ежемесячно 8 601 TJS"*
  - All numeric values use `tabular-nums`
  - **Never an interest rate** — Blueprint §10.3 Block G is firm. PRD §19 halal-by-design enforces this.
  - Installment terms stored as structured fields on the building (developer's own installment terms), not calculated

If no installment offered: the entire installment block is absent. Only cash price shown.

### Block H — Available units (developer inventory)

- Section title: `text-h2` "Новые квартиры от застройщика · [N]"
- Filter chips row at top — `AppChipGroup`s inline:
  - Rooms: 1, 2, 3, 4+ (multi-select)
  - Finishing: без ремонта, предчистовая, с ремонтом (multi-select, uses Layer 2.6 finishing colors)
  - Price range: range slider
  - Floor range: range slider (behind "Больше фильтров")
- Unit rows below (each row is a **`ListingCard`** compact variant from Layer 7.7):
  - Rooms, size, floor on one line
  - Finishing chip (Layer 2.6 color)
  - Price + price per m² in `text-h3` semibold tabular
  - Availability status
  - "Смотреть" button → Listing detail page (Page 7)
- All listings here have `source = developer` per Data Model §3.2, so source chips are redundant and **hidden in this block** (the block title already says "от застройщика")

**If buyer arrived from filtered search, this section is pre-filtered accordingly** (Blueprint §10.3 Block H).

**Empty state:** if the developer has no units listed yet: "Квартиры от застройщика скоро появятся. Свяжитесь напрямую через WhatsApp, чтобы узнать о доступных вариантах." + inline WhatsApp AppButton pointing at the developer's contact.

### Block I — Resale inventory

**Visually distinct from Block H.** Per Blueprint §10.3 Block I: subtle background color difference (stone-100 section background), clear section header.

- Section title: `text-h2` "Перепродажа · [N]"
- Unit rows using **`ListingCard`** compact variant (Layer 7.7), plus:
  - **`SourceChip`** (Layer 7.2) — owner (green) or intermediary (gold)
  - **`VerificationBadge`** (Layer 7.3) for that specific listing — may differ from building-level
  - Finishing chip includes `owner_renovated` option per Data Model §3.4 (this finishing type is resale-only)

**Empty state (turns dead end into supply opportunity):**
- "Пока нет перепродаж в этом проекте."
- Secondary line: "Вы владелец или продавец в этом ЖК?"
- **`AppButton primary md`** "Разместить объявление →" — opens Post listing flow (Page 12) with this building pre-selected

### Block J — Location and nearby context

- Section title: `text-h2` "Расположение и инфраструктура"
- **Interactive map** centered on the building using the same MapLibre + OpenFreeMap stack as Page 4
  - `aspect-video` (16:9), `radius-md`
  - Single pin for this building
  - Tap on map → opens fullscreen map view centered here (reuses Page 4 pattern)
  - Lazy-loaded — map tiles only fetch when this block enters the viewport (per 2026 mobile research: "tap-to-open map area loads only when needed, cuts first data use on 4G")
- Below the map: grid of amenity distances (2 columns on mobile):
  - Мечеть: 420 м
  - Школа: 180 м
  - Базар: 850 м
  - Больница: 1.2 км
  - Остановка транспорта: 120 м
  - Парк: 650 м
- Each amenity row has a small Lucide icon (Home/School/Bus/Hospital/etc.)
- Distances come from the `buildings` table's structured amenity-distance fields (tech spec §7.1 decision: stored on building, not computed from OSM POIs)

### Block K — Project overview

- Section title: `text-h2` "О проекте"
- 3-6 sentences from the developer (stored as long-form text field)
- Architectural features, what makes this building special
- Expandable "Читать ещё" if the text is longer than 4 lines — uses `AppButton ghost sm`

### Block L — Similar buildings

- Section title: `text-h2` "Похожие проекты"
- Horizontal scrolling row of 3-5 `BuildingCard`s (full variant, Layer 7.8)
- "Similar" matching: same district, similar price range (±20%), similar delivery timing (±2 quarters)

**If too few similar buildings exist (<3)**, this entire block is **hidden** — not replaced with a weaker set. Blueprint §10.3 Block L explicitly prohibits showing weak matches here.

### Block M — Sticky bottom contact bar (mobile)

Uses **`StickyContactBar`** (Layer 7.9).

- Persistent bottom bar as the user scrolls
- Three actions, equal width:
  - **WhatsApp** `AppButton secondary md` with WhatsApp logo (Lucide-free custom SVG, green icon)
  - **Позвонить** `AppButton secondary md` with Phone icon
  - **Запросить визит** `AppButton primary md` with Calendar icon
- Tapping **Запросить визит** opens the Contact flow (Page 10) as an `AppModal` on desktop or full-screen overlay on mobile
- Response-time badge hidden per Blueprint §11.6 — only appears when seller has ≥3 completed contacts with response data (currently not rendered on building pages, only on individual listing pages per Blueprint)

## 5.5 Desktop layout (≥1024px)

Per Blueprint §10.4. Two-column layout below the hero:

- **Main content column (~68% width):** Blocks C through L stacked vertically
- **Sticky contact card column (~32% width):** contains the same contact actions as Block M, plus:
  - Developer name and logo
  - Phone number (hidden behind "Показать телефон" tap — spam protection from PRD §7.6 if it exists, or from the tech spec security baseline)
  - WhatsApp button
  - Запросить визит button
  - Response-time badge (only when seller has ≥3 completed contacts per Blueprint §10.4 and §11.6)

The sticky card stays pinned as the buyer scrolls through the main content.

Block A (hero) spans full 1200px container width.
Block M (mobile sticky bottom bar) is hidden on desktop (its functions are absorbed by the sticky side card).

## 5.6 Contact failure recovery (Blueprint §10.5)

- If buyer taps WhatsApp and the link fails (WhatsApp not installed, no internet):
  - Show fallback `AppModal`:
    - Title: "Не удалось открыть WhatsApp"
    - Option 1: `AppButton primary md` "Позвонить напрямую: [phone]"
    - Option 2: `AppButton secondary md` "Отправить запрос через форму" → opens Contact flow (Page 10)
- If seller hasn't responded to a visit request in 24 hours, a nudge appears on the buyer's Saved page (Page 9): "Застройщик ЖК [X] ещё не ответил на ваш запрос. Хотите попробовать WhatsApp?"

## 5.7 Platform components used

| Block | Platform components |
|---|---|
| A — Hero gallery | None (primitives) |
| B — Identity strip | **`VerificationBadge`** (Layer 7.3) — multiple instances |
| C — Key facts strip | None |
| D — Construction progress | **`ProgressPhotoCarousel`** (Layer 7.6) |
| E — Why this fits | None |
| F — Trust evidence | **`VerificationBadge`** (Layer 7.3) |
| G — Payment clarity | **`InstallmentDisplay`** (Layer 7.5) |
| H — Developer units | **`ListingCard`** compact variant (Layer 7.7) |
| I — Resale units | **`ListingCard`** compact variant, **`SourceChip`** (Layer 7.2), **`VerificationBadge`** per listing |
| J — Location + map | None (MapLibre tech layer) |
| K — Project overview | None |
| L — Similar buildings | **`BuildingCard`** (Layer 7.8) |
| M — Sticky contact bar | **`StickyContactBar`** (Layer 7.9) |

## 5.8 Primitive components used

`AppButton` (primary, secondary, ghost, icon buttons), `AppChip` + `AppChipGroup`, `AppCard`, `AppBottomSheet` (filter chips within Block H/I behave like this on mobile), `AppModal` (verification explainer, lightbox for photos, contact failure recovery), `AppInput` + `AppSelect` (filters within Block H/I)

## 5.9 Empty and edge states

Most empty states are inline per block (already covered above). Page-level states:

### Building not found (404-type)
- Page renders a friendly empty: `text-h1` "Не найдено такого ЖК" + suggestion "Посмотреть все проекты" `AppButton primary md` → Projects browsing
- Never a blank page, never a raw 404 error

### Building exists but is `hidden` or `sold_out` state (per Data Model building_status enum)
- Hero and Block C render with a subtle `AppCard` banner above: "Этот проект снят с продажи" or "Все квартиры проданы"
- Blocks H and I may be empty or show sold-only listings for reference
- Contact actions still available (for waiting-list requests)
- No fake "still available" signals

### Slow connection
- Hero image lazy-loads with a subtle shimmer on the hero area
- Blocks below the fold render progressively (Block B and C first, others after)
- Map in Block J only loads when the block enters viewport (Intersection Observer)
- Progress photos in Block D lazy-load as the buyer scrolls into the block

### Missing data
- If Block F Developer profile card has no developer data (new developer, partial onboarding): render a minimal variant with just the name and a small "Новый застройщик на платформе" `text-meta` stone-500 note — no fake years-active, no fabricated projects-completed count
- If Block K (project overview) text is empty: the block is **hidden entirely**, not shown with placeholder text
- If Block J amenity distances are missing: show only the distances that exist, in whatever order we have them. Never show "?" or "N/A"

## 5.10 What must NOT appear on this page

Per Blueprint §10 and PRD §19:

1. **No "% годовых" anywhere on the page.** Installment displays show monthly amount + total term + first payment, never APR.
2. **No fake urgency mechanics.** No "Осталось 3 квартиры!" counters. No "просматривают 12 человек сейчас".
3. **No countdown timers.**
4. **No forced registration to see unit prices.** Prices are always visible.
5. **No "Book now to lock in price!" banners.**
6. **No mortgage calculator.**
7. **No interest-rate comparisons or bank ads.**
8. **No sold-out buildings presented as still-available.** Status (sold, reserved, available) is always honestly shown.
9. **No stock photos of the building that aren't labeled as renderings.** Construction progress photos must be real. Renderings must be labeled "Визуализация" if shown.
10. **No testimonials or "5-star reviews" unless they are real, sourced, and dated.** V1 does not ship with testimonials (see Page 1 §1.9 rationale).
11. **No autoplay video in the hero.** Video may appear in the gallery but never autoplays with sound.
12. **No chatbot that auto-opens on this page.**
13. **No lightboxing of photos that prevents the user from closing on backdrop tap.**

## 5.11 Acceptance criteria

The Building detail page is done when:

1. On 375px mobile, **hero + identity strip + first 3 rows of key facts (Blocks A, B, C) all render above the fold** (Blueprint §10.2 first-screen requirement)
2. Sticky bottom contact bar (Block M) is visible and reachable with one thumb tap at all times while scrolling
3. Construction progress block (Block D) uses the `ProgressPhotoCarousel` component with dated photos, not a generic image carousel
4. Verification tier tap opens an explainer modal explaining what the tier means (Blueprint §10.3 Block F)
5. Developer units block (Block H) and resale block (Block I) are visually distinct — background color difference, separate section headers
6. If the buyer came from filtered search, Block H (and Block I) are pre-filtered to match; Block E renders match reasons
7. Block J map lazy-loads only when in viewport, does not slow initial page render
8. Every empty state in §5.9 renders a graceful fallback, never a blank block or broken element
9. Contact-failure recovery (§5.6) triggers on WhatsApp link failure
10. All three signature wow features (`ProgressPhotoCarousel`, `VerificationBadge`, `InstallmentDisplay`) render on every building that has the data for them
11. Response-time badge follows Blueprint §11.6 rule: appears only when seller has ≥3 completed contacts with response data
12. Page loads to first contentful paint under 3 seconds on a 4G connection (Hero + Block B + Block C content ready)
13. No pattern from §5.10 appears on the page
14. The URL contains the building slug, not just an ID; sharing the URL via WhatsApp/Telegram renders correctly with Open Graph metadata (title, description, hero image)

## 5.12 Technical notes for Codex

- Server endpoint: `GET /api/buildings/[slug]` returns the full building payload with nested listings, trust data, construction photos, amenity distances
- The `Why this fits` block (Block E) requires server-side match logic — the backend compares the buyer's session filter state or guided-finder answers against the building's attributes and returns match reasons as a list of pre-formatted strings
- Construction progress bar percentage is a computed field on the building (may be derived from status + photo count + manual override by admin)
- Similar buildings (Block L) may be cached for 1 hour at the server level — the "similar" logic doesn't need to be real-time
- Open Graph meta tags must be rendered server-side (SSR) so shared URL previews work in WhatsApp/Telegram

---

# Page 6 — Apartments browsing (Квартиры list)

## 6.1 What this page is for

Let buyers filter individual apartments (not buildings) and see relevant results **across all buildings**, with the source of each listing clearly labeled. This is the apartment-first counterpart to Projects browsing (Page 3).

The key difference from Page 3: here, one result = one specific apartment (with its price, floor, finishing, source, seller). Results are mixed-source — developer inventory, owners, and intermediaries appear in the same feed, visually distinguished by source chips.

Follows Blueprint §11 exactly. Leverages the same primitives and filter patterns as Page 3 but adds source filtering and installment-range filtering as first-class features.

## 6.2 Route and entry points

**Route:** `/kvartiry`
**Route with filters in URL:** `/kvartiry?rooms=2,3&price_to=900000&source=developer,owner&finishing=full_finish`

**Entry points:**
- "Квартиры · [N] проверенных объявлений" card on Homepage (Page 1, Block B)
- Global nav "Квартиры" link (desktop top bar / mobile hamburger)
- Guided finder results "Посмотреть все подходящие варианты" (Page 2)
- "Все квартиры" button on `BuildingCard` from Projects browsing (Page 3) — pre-filtered to one building
- Suggestion chip tap on Homepage quick search (e.g., "Квартиры до 800 000 TJS")
- Homepage returning-user strip (Page 1 Block C) item that references an apartment
- Direct URL share (filters serialize into URL)
- Compare page "View details" on a compare row
- Saved page tap on a saved apartment

## 6.3 Design principles driving this page

Three product-specific principles shape this page:

1. **Source transparency is the differentiator.** Our wedge vs Somon.tj is that buyers always know whether they're looking at developer inventory, an owner, or an intermediary. Every card shows its SourceChip. Source is also a first-class filter. Blueprint §11.7 locks this as the mixed-source ranking rule.
2. **Installment as a filter, not a footnote.** Blueprint §11.4: "Installment range is a first-class filter, not hidden. This matches how buyers actually think about affordability." Most buyers in this market think in monthly payments, not cash prices. We honor that.
3. **Mixed-source ranking is trust-weighted.** Blueprint §11.7: "on-site-verified listings rise regardless of source." A verified owner listing outranks an unverified developer listing. This is the fairness principle — trust wins, not pay-for-placement.

Additional 2026 research patterns confirmed from Page 3 research:
- Sticky filter bar always accessible
- Filter count + result count visible at all times
- Progressive disclosure on filters (5 primary visible, rest behind "Больше фильтров")
- URL-serializable filter state

## 6.4 Mobile layout (375px viewport, top to bottom)

Same structural pattern as Page 3 (Projects browsing). The differences are the filter set, result cards, and sort options — not the page chrome.

### Block A — Top sticky bar

Identical to Page 3 Block A:
- Back button (left) — 44×44 hit area
- Page title (center) — `text-h3` semibold: "Квартиры"
- Action icons (right): Filters / Sort / Map — 44×44 hit areas. Filters icon has terracotta-600 numeric badge when filters are active.

### Block B — Active filter chips

Identical pattern to Page 3 Block B, with one addition: **source chips are explicitly visible when active** per Blueprint §11.3.

Active filter chips render in this order when present:
1. Source chips first ("от застройщика", "собственник", "посредник") — most important for our wedge
2. Verification chips ("только проверенные")
3. Other filters (district, price, rooms, finishing, etc.)

Each chip is a removable `AppChip` variant. "Очистить все" appears when 2+ chips are active.

### Block C — Result count and freshness

Per Blueprint §11.3:
- "**X квартир найдено · обновлено сегодня**" in `text-meta` stone-500

Same honest-date behavior as Page 3 — never fake a fresher date than reality.

### Block D — Listing cards list

Stacked vertically, `gap-4`. Each card uses the `ListingCard` **full** variant from Layer 7.7, following the 6-row structure defined in Blueprint §11.6 (see §6.8 below).

Infinite-scroll with "Load more" fallback — same pattern as Page 3.

### Block E — Floating map-toggle button

Same pattern as Page 3 Block E. Tapping opens the Map view (Page 4) showing apartments as pins instead of buildings.

**Technical note for Codex:** the map view toggles between "building pins" and "apartment pins" based on which browsing page the user came from. For apartments, each apartment has its building's coordinates, but the pin represents the listing. Pins that share the same coordinates (multiple apartments in one building) cluster automatically via MapLibre's built-in clustering.

## 6.5 Desktop layout (≥1024px)

Identical to Page 3 §3.5 — three-column layout (filter panel 280px / results grid / optional map split). Only the content differs (listing cards instead of building cards, different filter set).

## 6.6 Filters (mobile sheet / desktop panel)

Per Blueprint §11.4. Exact filter set:

| Filter | Control | Multi/Single | Notes |
|---|---|---|---|
| Price range | Range slider (min, max) | Single range | TJS, tabular figures |
| **Monthly installment range** | Range slider (min, max) | Single range | **TJS/month, not interest rate. Blueprint §11.4 first-class filter.** |
| Rooms | `AppChipGroup` multi-select | Multi | "1, 2, 3, 4, 5+" |
| Size range | Range slider | Single range | m², tabular figures |
| Finishing type | `AppChipGroup` multi-select | Multi | 4 types: без ремонта, предчистовая, с ремонтом, отремонтировано владельцем. Uses Layer 2.6 finishing colors. |
| District | `AppChipGroup` multi-select | Multi | 10-12 most common Dushanbe + Vahdat districts |
| Building | `AppSelect` single-select | Single | Only visible when a specific building filter exists (e.g., came from Page 5 Block H). Shows building name + "Убрать" |
| **Source** | `AppChipGroup` multi-select | Multi | **от застройщика / собственник / посредник. Uses `SourceChip` colors from Layer 2.8.** |
| Verification level | `AppChipGroup` single-select | Single | "Все / Проверенный профиль / Проверено на месте" (Blueprint §11.4) |
| Floor range | Range slider | Single range | min, max floor number |

**Primary filters** (always visible): Price range, Rooms, District, Source, Finishing type, Installment range.

**Extended filters** (behind "Больше фильтров"): Size range, Verification level, Floor range, Building (if present).

**UI Spec decision (not in Blueprint):** Blueprint §11.4 lists all 10 filters without splitting primary/extended. The 6/4 split here follows the same 2026 progressive-disclosure pattern as Page 3 — nobody wants 30 filter options at once. The six primary filters match how buyers think about affordability and fit (price, rooms, district, source, finishing, installment). District is primary on both Page 3 and Page 6 (consistency). Source is primary because it's our platform wedge. Size/floor/verification/building are fine-tuning filters that come second. This split can be tuned during build based on filter-usage analytics.

### Filter sheet footer (mobile)
Same pattern as Page 3 — "Очистить" ghost button left, "Показать X квартир" primary button right, count updates live as filters change.

### Installment range control (special handling)

Unlike a generic price range, this slider needs contextual labels:
- Left label (min): "От 0 TJS/мес"
- Right label (max): "до 15 000 TJS/мес" (max value scales based on the highest installment in the filtered result set)
- Below the slider: `text-caption` stone-500: "Первый взнос 10–30% · срок 3–10 лет"

Setting a min/max on installment filters apartments whose monthly amount falls within the range **when any available installment option is offered by the seller**. If no installment is offered, the apartment is excluded from installment-range filtered results.

## 6.7 Sort options (Blueprint §11.5)

Sort sheet opens from the Sort icon in the top bar. Options:

- **Рекомендуемые** (default) — trust-weighted ranking; if the buyer completed guided finder, match score boosts rank per Blueprint §11.7
- **Сначала дешёвые** — price total ascending
- **Сначала новые** — newest listings first (by `created_at`)
- **Ближайшая сдача** — earliest handover date first (from building)
- **Лучшая цена за м²** — price-per-m² ascending, filtered by fairness

Single-select. Selection persists in URL (`?sort=price_asc` etc.).

## 6.8 Listing card structure (per Blueprint §11.6)

This is the 6-row `ListingCard` full variant from Layer 7.7. Cross-reference: Layer 7.7 matches Blueprint §11.6 row-for-row.

### Row 1 — Visual preview
- Main image or floor plan, `aspect-video`
- Small thumbnails row below (2-3 thumbs)
- Save heart icon top-right over the hero

### Row 2 — Identity
- Building name + district on one line in `text-body` stone-900 semibold
- **`SourceChip`** (Layer 7.2) prominently displayed — "🏗 От застройщика" / "👤 Собственник" / "🤝 Посредник"
- **`VerificationBadge`** (Layer 7.3) next to the source chip — reflects the listing's tier (may differ from the building's tier for resale listings)

### Row 3 — Key facts
- Rooms, size, floor on one line in `text-body` stone-900: "2 комн. · 64 м² · 5 этаж"
- **Price total** in `text-h2` semibold tabular
- **Price per m²** with **`FairnessIndicator`** (Layer 7.4) badge beside it: "8 500 TJS/м² — на 8% ниже среднего по району"
- **Finishing chip** — `AppChip` variant `finishing` in one of the 4 colors from Layer 2.6 — sized prominent, not a footnote
  - без ремонта → finishing-no-finish color
  - предчистовая → finishing-pre-finish color
  - с ремонтом → finishing-full-finish color
  - отремонтировано владельцем → finishing-owner-renovated color

### Row 4 — Installment hint (conditional)
Only renders if the listing has installment available.

- One line in `text-meta` stone-700 semibold with Layer 7.5 `InstallmentDisplay` compact pattern: "**Рассрочка: от 8 600 TJS/мес**"
- Tappable — opens the listing detail page (Page 7) scrolled to the Payment block
- **Never** shows interest rate or "% годовых"

### Row 5 — Seller and response
Per Blueprint §11.6 — a small line with seller name, and a conditional response-time badge.

- Left: seller name or "Офис продаж застройщика"
- Right: **response-time badge** — only renders when the seller has ≥3 completed contacts with response data (Blueprint §11.6 firm rule). Examples when shown: "Отвечает обычно за <1 часа" / "Отвечает обычно за 3-6 часов"
- **If <3 completed contacts**: response-time portion is hidden entirely. Never "нет данных". Never a guess.

### Row 6 — Actions
- **Смотреть** `AppButton primary sm` — opens Listing detail page (Page 7)
- **WhatsApp** `AppButton secondary sm` with WhatsApp icon — direct quick contact without opening the listing page
- Save and Compare icons (right-aligned, 44×44 hit areas)

The whole card (except the interactive elements in Row 6, Save icon, and any tappable sub-elements) is wrapped in a clickable link to the listing detail page, with `stopPropagation` on nested clickable elements.

## 6.9 Mixed-source results (Blueprint §11.7)

When the buyer has not filtered by source, results include all three types mixed together. This is deliberate — our platform is source-transparent, not source-segregated.

**Ranking is trust-weighted:**
- Tier 3 (on-site-verified) listings rise regardless of source
- Among Tier 3 listings, developer inventory and owner listings rank equally
- Tier 2 (profile-verified) listings come next
- Tier 1 (phone-only) listings come last

This means a verified owner listing can outrank an unverified developer listing. This is the **fairness principle** — the product doesn't privilege one source over another; trust wins.

**Never hidden:** source chips always appear on every card even in mixed mode. The buyer is never confused about where a listing comes from.

## 6.10 Empty and low-result states

Per Blueprint §11.8.

### Zero apartments match filters
Same helpful recovery pattern as Projects browsing (§3.10) — four concrete actions:
1. `AppButton ghost md` "Убрать фильтр: [specific filter]" — smallest-impact filter removal (system-derived)
2. `AppButton ghost md` "Расширить бюджет до [X]" — 20% wider price range
3. `AppButton ghost md` "Посмотреть проекты" — switches to Projects browsing (Page 3) to see buildings that might get matching units later
4. `AppButton primary md` "Помочь выбрать" — opens guided finder (Page 2)

### 1-3 apartments match (low confidence)
Show results plus a gentle suggestion banner below the last card: *"Мало результатов. Попробуйте расширить [filter]."*

### Buyer filtered to "only on-site verified" and zero match (Blueprint §11.8)
- Render a specific empty state: *"Пока нет квартир с проверкой на месте по вашим критериям."*
- `AppButton ghost md` "Показать все проверенные объявления" — relaxes the filter to include Tier 2 verified listings

### No apartments in the whole database (platform launch day)
Same pattern as Page 3 §3.10 — friendly message with phone-capture offer.

### Loading state
- Top bar + active filter chips render immediately
- Result count shows skeleton
- 3-5 skeleton `ListingCard`s (stone-200 fill, `radius-md`)

### Network error
Same pattern as Page 3 — banner at top with retry button, existing loaded data stays visible.

## 6.11 Platform components used

| Block | Platform components |
|---|---|
| A — Top bar | None (primitives) |
| B — Active filter chips | `AppChip` removable variant, **`SourceChip`** (Layer 7.2) when source is filtered |
| C — Result count | None |
| D — Listing cards | **`ListingCard`** full variant (Layer 7.7), embedded **`SourceChip`** (Layer 7.2), **`VerificationBadge`** (Layer 7.3), **`FairnessIndicator`** (Layer 7.4), **`InstallmentDisplay`** compact (Layer 7.5) |
| E — Map toggle | None |
| Filter sheet | **`FilterSheet`** (Layer 7.10) |

## 6.12 Primitive components used

`AppButton` (primary, secondary, ghost, icon buttons), `AppChip` + `AppChipGroup` (multi-select, removable), `AppInput`, `AppSelect`, `AppCheckbox`, range slider (shadcn Slider), `AppBottomSheet` (mobile filter sheet), `AppCard` (listing cards built on AppCard)

## 6.13 What must NOT appear on this page

Per PRD §19 and Blueprint constraints:

1. **No "% годовых" anywhere.** Installment filtering and display use direct monthly amounts only.
2. **No source chip missing from any card.** Source is always visible. No exceptions.
3. **No "Recommended" listings that violate the buyer's active filters.** Trust-weighting boosts rank within the filter set, not across it.
4. **No pay-for-placement.** Ranking is trust-weighted, not auction-based. If sponsorship is ever introduced later, it must be visually distinct AND labeled, per Page 3 §3.11.
5. **No fake result counts.** If the count is 7, show "7 квартир найдено" — never "7+ квартир".
6. **No interstitial ads between listing cards.**
7. **No auto-playing video on any card.**
8. **No red "Price drop!" urgency. Price changes only appear on Saved page using `ChangeBadge` (Layer 7.12).**
9. **No "Sponsored" cards that look identical to organic cards.**
10. **No hover-only information** — every piece of info must be visible on mobile without a hover state.
11. **No exit-intent popups** when the buyer tries to leave.
12. **No fake "просматривают X человек" counters.**

## 6.14 Acceptance criteria

The Apartments browsing page is done when:

1. On 375px mobile, the top sticky bar (Block A) stays pinned as the list scrolls
2. Every listing card renders **all 6 rows per Blueprint §11.6** when data is available; Row 4 (installment hint) only renders when `installment_available = true`
3. Every card shows its `SourceChip` prominently in Row 2 — never hidden, never absent
4. The filter sheet presents 5 primary filters (Price, Rooms, Source, Finishing, Installment range) up front and hides 5 extended filters behind "Больше фильтров"
5. Source filter and Installment range filter are both accessible without tapping "Больше фильтров"
6. Mixed-source mode shows all three source types with visible source chips; trust-weighted ranking rule is respected (Tier 3 > Tier 2 > Tier 1 regardless of source)
7. Applying a filter updates the result count and visible cards without a full page reload (SPA pattern)
8. All 5 sort options from Blueprint §11.5 are available; selection persists in URL
9. Zero-result state offers 4 concrete actions; "only verified on-site" zero-result has its own specific relaxation option
10. Response-time badge appears in Row 5 only when seller has ≥3 completed contacts with response data (Blueprint §11.6)
11. Fairness indicator (Layer 7.4) renders beside price per m² with appropriate calm color (not red) per Layer 2.7
12. Finishing chip renders prominent (not a footnote) with Layer 2.6 finishing color for the correct type
13. Filters serialize into URL — shareable filtered results
14. Lighthouse mobile performance ≥ 90, accessibility = 100
15. No pattern from §6.13 appears
16. On a used-Somon.tj test user, source transparency is immediately obvious — they can tell who is selling what without tapping into each listing

## 6.15 Technical notes for Codex

- Server endpoint: `GET /api/listings?<filters>&sort=<sort>&page=<n>` returns listing payloads with nested building summary, source, tier, and all Row 1-6 data
- Mixed-source ranking: backend should compute a rank score from `tier` + recency + match boost. Suggested formula: `tier_score * 100 + verified_recency_bonus + match_bonus` where Tier 3 = 3, Tier 2 = 2, Tier 1 = 1. Exact weights are a technical decision to lock during build — the Blueprint §11.7 rule ("trust-weighted, on-site-verified listings rise regardless of source") is the contract; the formula is the implementation.
- Monthly installment range filter: backend computes `installment_monthly_amount_dirams` per listing (already a structured field per Data Model §3.4 tech spec); filter applies as a standard range query
- Price-per-m² for fairness indicator: Data Model §5.14 defines a district-level average price/m² table; the backend joins this at query time to compute fairness color and percentage

## 6.16 Cross-page consistency notes

Pages 3 and 6 share the same sticky-bar + filter-chips + result-count + floating-map-button structure. The only differences:

| Aspect | Page 3 (Projects) | Page 6 (Apartments) |
|---|---|---|
| Result type | Building | Listing (apartment) |
| Primary card component | `BuildingCard` (Layer 7.8) | `ListingCard` (Layer 7.7) |
| Source chip | Not shown (buildings don't have source) | Shown on every card, always |
| Installment filter | Absent | First-class filter |
| Sort options | Building-level (price_from, delivery) | Listing-level (price_total, price_per_m², newest, delivery) |
| Matching units preview on card | Yes (Blueprint §8.6 Row 5) | Not applicable (card IS the unit) |

A buyer can toggle between Projects and Apartments from the global nav without losing general filter state (district, price range, rooms, finishing carry over where they make sense).

---

# Page 7 — Listing detail page

## 7.1 What this page is for

Make **one specific apartment** easy to evaluate and act on. This is the apartment-level counterpart to the Building detail page (Page 5). Where Page 5 tells the story of a whole building, Page 7 tells the story of a single unit inside it — who's selling it, how much, what finishing, whether the price is fair, how to contact.

Follows Blueprint §12 exactly (11 blocks, A through K). Source transparency is the defining feature: a developer listing, an owner listing, and an intermediary listing all use this page, but the content subtly adapts to the source.

## 7.2 Route and entry points

**Route:** `/kvartira/[slug]` (slug is a transliterated short title with the listing's short ID suffix, e.g., `/kvartira/2-komn-sino-12500000-a3b9`. Slug-with-ID balances SEO against high turnover — IDs survive title edits, slugs are still meaningful in shared links.)

**Entry points:**
- Tap any `ListingCard` across the product (Apartments browsing, Building detail Blocks H/I, Guided finder results, Saved, Compare, Map pin)
- "Смотреть" action button on any compact ListingCard
- Direct URL share (WhatsApp, Telegram)
- Homepage returning-user strip (Page 1 Block C) when a listing changed
- Building detail page (Page 5) Block H or I — tapping a specific unit row

## 7.3 Design principles driving this page

Five principles shape this page:

1. **Structured data first, free-text description last.** Blueprint §12 Block I is explicit: "Never the primary source of key facts — those live in structured blocks above." The seller's description supplements, never replaces, the structured data. This prevents the Somon.tj problem of critical info hidden inside paragraphs.
2. **Source-specific content, not source-aware hiding.** Every listing has a `SourceChip` in Block B and Block G. Developer listings don't pretend to be owner listings. Intermediary listings show the owner-permission status explicitly (Blueprint §12.3 Block G). No source is hidden or downplayed.
3. **Contact is one thumb-reach away at all times.** Sticky bottom bar on mobile (Block K), sticky side card on desktop. Same rule as Page 5 — the buyer ready to contact never scrolls to find how.
4. **Fairness indicator sets expectation, doesn't shame the seller.** Data Model §5.14 fairness colors are calm (green/stone/gold/muted rust, never red). This page shows the buyer whether a price is in range — it doesn't tell them to walk away.
5. **The floor plan is a first-class image in the gallery, not a footnote.** 2026 research: floor plans are expected on pro listings. They help buyers visualize space and trim questions. For developer listings with standardized floor plans, this is especially important.

## 7.4 Mobile block order (375px viewport)

11 blocks per Blueprint §12.3, A through K. Layer 7 components in bold.

### Block A — Photo gallery

- Swipeable carousel, full width, `aspect-video` (16:9)
- Photo count indicator top-left: "1 / 8"
- `Save` heart icon top-right + `Compare` icon beside it, over a subtle white-translucent backdrop
- `Back` button top-left (navigates to referrer, fallback to Apartments browsing)
- **Floor plan appears as a separate tab or dedicated first/last image** in the gallery (UI Spec decision informed by 2026 research — Blueprint §12.3 Block A doesn't call this out specifically). The floor plan image has its own label ("Планировка") inside a small pill overlay to distinguish it from photos. 2026 research confirms floor plans are expected on professional listings and help buyers visualize space.
- Image fallback: neutral stone-200 placeholder (Blueprint §12.3 Block A), never a broken-image icon
- Tap any image → fullscreen `AppModal` lightbox with pinch-zoom enabled

### Block B — Identity strip

Single row with the core identifying facts:
- **Building name (tappable link to Page 5)** in `text-h3` stone-900 semibold with subtle underline on tap
- District in `text-meta` stone-500 on a line below
- Rooms · Size · Floor on one line in `text-body` stone-900: "2 комн. · 64 м² · 5 этаж"
- **`SourceChip`** (Layer 7.2) — "🏗 От застройщика" / "👤 Собственник" / "🤝 Посредник" — prominently placed
- **`VerificationBadge`** (Layer 7.3) — the listing's verification tier, next to the source chip

### Block C — Price block

This is the most important block above the fold (after Block A hero).

- Total price in `text-display` (32px mobile / 40px desktop) semibold tabular-nums: "820 000 TJS"
- Price per m² in `text-body` stone-700 tabular: "12 813 TJS/м²"
- **`FairnessIndicator`** (Layer 7.4) beside the price-per-m² — with calm color (Layer 2.7): "На 8% ниже среднего по району"
- If installment available: **`InstallmentDisplay`** compact variant on the next line — **"Рассрочка: первый взнос от 123 000 TJS · ежемесячно от 8 600 TJS"**

Never shows "% годовых" anywhere.

### Block D — Finishing block

Per Blueprint §12.3 Block D, this is a **large visual chip** with a one-sentence explanation.

- Large `AppChip` variant `finishing` (prominently sized — not a small footnote chip) showing the finishing type with Layer 2.6 finishing color
- One-line explanation below in `text-body` stone-900:
  - **Без ремонта**: "Квартира без отделки — готова для вашего ремонта."
  - **Предчистовая**: "Базовая отделка — готова к завершающему ремонту."
  - **С ремонтом**: "Полная отделка от застройщика — готова к заселению."
  - **Отремонтировано владельцем**: "Квартира отремонтирована владельцем — осмотрите лично, чтобы оценить качество."
- Small `HelpCircle` Lucide icon next to the chip — tap opens an `AppModal` with a longer explanation of what that finishing type means in the Tajik market context

### Block E — Why this fits you (conditional)

Shown only if buyer came from filtered search or guided finder (has match context).

- Section title: `text-h2` "Почему это вам подходит"
- 2-4 short match reasons (shorter list than Page 5's Block E because a listing has fewer dimensions to match on):
  - "В рамках вашего бюджета"
  - "Тип отделки соответствует фильтру"
  - "В нужном районе"
  - "Рассрочка доступна"
- Each reason in `text-body` stone-900 with a small `Check` Lucide icon (stone-700)

Hidden for organic visitors.

### Block F — Unit details

Structured field table. Per Blueprint §12.3 Block F, each row is a label + value pair:

| Label | Value |
|---|---|
| Блок/секция | Б2 |
| Санузлы | 2 (раздельные) |
| Ориентация | Восток |
| Балкон | Есть |
| Высота потолков | 2.8 м |
| Сдача | Q3 2026 (если отличается от здания) |
| Вид из окон | На двор |

Rendered as a two-column grid on mobile (label left, value right). Labels in `text-meta` stone-500; values in `text-body` stone-900.

**Missing data handling (UI Spec decision aligned with PRD §7.4 honesty principle):** rows where the seller hasn't provided data are **omitted entirely** — not shown with "—" or "не указано". The block renders only the fields that exist. If the seller provided only 3 fields, the block shows 3 rows. Blueprint §12.3 Block F lists the fields but doesn't specify missing-data rendering; this is the UI Spec's interpretation.

### Block G — Seller information

Per Blueprint §12.3 Block G — the trust-disclosure block. Content is source-specific.

Common rendering (all sources):
- **`SourceChip`** (Layer 7.2) repeated here for emphasis
- Seller name (or "Офис продаж застройщика" for developer listings)
- **`VerificationBadge`** (Layer 7.3) with date if Tier 3 ("Проверено на месте: 14 марта 2026")
- Tap on verification badge → opens `AppModal` with a short explanation of what that tier means for this listing specifically (Blueprint §12.3 Block G)
- **Response-time badge** — only shown when seller has ≥3 completed contacts with response data. Example: "Отвечает обычно за <1 часа". Otherwise hidden (no "нет данных", no guess)

Source-specific additions:
- **For `source = developer`** (UI Spec decision — Blueprint §12.3 only specifies intermediary-specific content): show developer's year established and completed projects count if available. Link to developer's other buildings ("Ещё 3 проекта этого застройщика"). This helps the buyer contextualize who the developer is at the moment of evaluating a specific unit.
- **For `source = owner`** (UI Spec decision): "Владелец продаёт напрямую" label in `text-meta` stone-700. This reinforces the direct-from-owner honesty and sets expectations (no agent markup implied).
- **For `source = intermediary`** (per Blueprint §12.3 Block G): small extra line:
  - If Tier 3 earned for this listing: *"Продавец подтвердил разрешение от владельца."*
  - If Tier 3 not earned: *"Разрешение от владельца пока не подтверждено командой платформы."*

### Block H — Building context mini-card

A compact version of the `BuildingCard` with link to the full building page (Page 5).

- Small hero image (thumb-sized, ~60×60)
- Building name + district
- Construction progress one-liner: "Сейчас: 62% готово"
- Delivery date
- Building-level `VerificationBadge`
- **`AppButton secondary sm`** "Смотреть ЖК" → Page 5

### Block I — Description

Per Blueprint §12.3 Block I.

- Section title: `text-h2` "Описание"
- Seller's free-text description in `text-body` stone-900
- **Limited to 800 characters visible by default**, with **"Читать ещё"** expand button if longer (`AppButton ghost sm`)
- **Never the primary source of key facts** — those live in Blocks B, C, D, F

### Block J — Similar listings

- Section title: `text-h2` "Похожие квартиры"
- Horizontal scrolling row of 3-5 `ListingCard`s (compact variant, Layer 7.7)
- "Similar" matching: same building if possible, else same district + similar price range (±20%) + similar room count

**If fewer than 3 similar listings match, this block is hidden entirely** (same principle as Page 5 Block L — no weak matches).

### Block K — Sticky bottom contact bar (mobile)

Uses **`StickyContactBar`** (Layer 7.9).

- Persistent bottom bar as the user scrolls
- Three actions, equal width:
  - **WhatsApp** `AppButton secondary md` with WhatsApp icon (green SVG)
  - **Позвонить** `AppButton secondary md` with Phone icon
  - **Запросить визит** `AppButton primary md` with Calendar icon

Tapping "Запросить визит" opens Contact flow (Page 10) as an `AppModal` on desktop or full-screen overlay on mobile.

## 7.5 Desktop layout (≥1024px)

Per Blueprint §12.4 — two-column layout below the hero gallery:

- **Main content column (~68% width):** Blocks C through J stacked vertically
- **Sticky contact card column (~32% width):**
  - Price (total + per m² + fairness badge)
  - Key facts summary (rooms, size, floor, finishing chip)
  - WhatsApp button
  - Позвонить button (phone hidden behind "Показать телефон" tap — spam protection)
  - Запросить визит button
  - Seller name + verification badge
  - Response-time badge (only if ≥3 completed contacts)

The sticky card stays pinned as the buyer scrolls through Blocks C-J.

Block A (gallery) spans full 1200px container width.
Block K (mobile sticky bottom) hidden on desktop (absorbed by sticky side card).

## 7.6 Edge cases and empty states

Per Blueprint §12.5 and §5.9 principles from Page 5.

### Listing sold while buyer is viewing it (Blueprint §12.5)
- Inline banner replaces the price block (Block C): *"Эта квартира уже продана."*
- Below the banner: *"Посмотрите похожие варианты в этом же ЖК."* with 2-3 `ListingCard` compact cards of other units in the same building
- Contact bar (Block K) replaces "Запросить визит" with "Смотреть похожие квартиры" — the primary action shifts to staying on the platform, not contacting a sold unit

### Listing removed by seller (404-equivalent)
- Redirect to the building page (Page 5) with a small toast: *"Это объявление больше не активно. Вот другие квартиры в этом проекте."*
- No ghost-listing page, no "deleted listing" shell — a cleanly removed listing redirects

### Seller not responding to WhatsApp after 24 hours
- Small inline note appears on the listing for returning visitors: *"Продавец обычно отвечает в течение [time]. Если ответ задерживается — попробуйте позвонить напрямую."*
- Tech detail: derived from `contact_requests` — the note renders if the buyer has an outstanding `contact_request` with `status = 'new'` AND `created_at < now() - 24h` for this listing (per Data Model §5.8 `contact_requests` table and §3.8 `contact_request_status` enum). No separate `last_seller_response_at` field is needed — the request itself is the source of truth.

### Listing exists but building has no verification yet
- Block B still shows the listing's own verification badge (which may be Tier 1 phone-only)
- Block H still renders the building mini-card, but without a building-level verification badge
- Block G shows the listing's verification honestly

### Missing data
- Block F (Unit details): rows with no data are omitted entirely, not shown as "—" or "не указано"
- Block I (Description): if the seller wrote nothing, the entire block is hidden
- Block J (Similar listings): hidden if fewer than 3 matches (see above)

### Slow connection
- Hero gallery image lazy-loads; thumbnail version renders first, full-res loads in background
- Blocks below fold load progressively
- Map inside building mini-card (Block H) is just a static thumbnail (no interactive MapLibre instance on this page)

## 7.7 Platform components used

| Block | Platform components |
|---|---|
| A — Photo gallery | None (primitives + lightbox) |
| B — Identity strip | **`SourceChip`** (Layer 7.2), **`VerificationBadge`** (Layer 7.3) |
| C — Price block | **`FairnessIndicator`** (Layer 7.4), **`InstallmentDisplay`** compact (Layer 7.5) |
| D — Finishing block | `AppChip` variant `finishing` (large), `AppModal` for explainer |
| E — Why this fits | None (primitives only) |
| F — Unit details | None (primitives only) |
| G — Seller information | **`SourceChip`** (Layer 7.2), **`VerificationBadge`** (Layer 7.3), `AppModal` for verification explainer |
| H — Building context | Compact `BuildingCard` (Layer 7.8), **`VerificationBadge`** (Layer 7.3) |
| I — Description | None |
| J — Similar listings | **`ListingCard`** compact variant (Layer 7.7) |
| K — Sticky bottom bar | **`StickyContactBar`** (Layer 7.9) |

## 7.8 Primitive components used

`AppButton` (primary, secondary, ghost, icon buttons), `AppChip` (finishing variant), `AppCard`, `AppModal` (lightbox, verification explainer, finishing explainer)

## 7.9 What must NOT appear on this page

Per Blueprint §12 and PRD §19:

1. **No "% годовых" anywhere.** Installment shown as "первый взнос + ежемесячно" only.
2. **No fake urgency mechanics.** No "Last unit at this price!" No "Осталось 1 квартира!" counters that aren't real.
3. **No countdown timers.**
4. **No forced registration to see prices.** Prices always visible to all visitors.
5. **No source chip missing.** Every listing always shows its source.
6. **No verification badge misrepresentation.** A Tier 1 listing never shows a Tier 3 visual.
7. **No seller review/rating system in V1.** Blueprint §12 doesn't include reviews; we don't add them.
8. **No "Book now to lock in price!" banners.**
9. **No mortgage calculator.**
10. **No autoplay video in the gallery.** Video may appear as a separate gallery item but never autoplays with sound.
11. **No "просматривают X человек" fake counters.**
12. **No stock photos labeled as real photos.** If a listing shows the developer's renderings, they must be labeled "Визуализация".
13. **No description block taking over as the primary content source** — Block I is explicitly subordinate to structured blocks above (Blueprint §12.3 Block I).

## 7.10 Acceptance criteria

The Listing detail page is done when:

1. On 375px mobile, **hero (Block A) + identity strip (Block B) + price block (Block C) are all visible above the fold**
2. Sticky contact bar (Block K) is reachable with one thumb tap at all times while scrolling
3. Source chip appears in both Block B and Block G — always visible, never missing
4. Fairness indicator renders beside price-per-m² using Layer 2.7 calm colors (never red)
5. Verification badge tap opens an explainer modal specific to this listing's tier
6. Source-specific content renders correctly:
   - Developer listings show developer info and other-buildings link
   - Owner listings show "Владелец продаёт напрямую"
   - Intermediary listings show owner-permission status honestly
7. Finishing block renders a large visual chip + one-line explanation + tap-for-more explainer
8. Unit details block omits missing fields rather than showing "—"
9. Description block is limited to 800 characters visible, with expand option for longer text
10. Similar listings block is hidden if fewer than 3 matches (Blueprint §12.3 Block J)
11. Response-time badge in Block G appears only when seller has ≥3 completed contacts (Blueprint §12.3)
12. Sold-out state replaces price block with sold banner + similar-listings suggestion (Blueprint §12.5)
13. Removed listings redirect to the building page with toast, not a ghost page
14. Floor plan is accessible as a distinct, labeled item in the gallery (2026 best practice)
15. Page loads to first contentful paint under 3 seconds on 4G
16. Open Graph meta tags are server-rendered so shared URL previews work in WhatsApp/Telegram
17. No pattern from §7.9 appears on the page

## 7.11 Technical notes for Codex

- Server endpoint: `GET /api/listings/[id]` returns the full listing payload with building summary (for Block H), seller details with response-time data if ≥3 contacts, similar listings computation, and fairness computation (district average price per m²)
- Source-specific content branching happens at render time based on `source_type` from Data Model §3.2
- The "Why this fits" block (Block E) uses the same server-side match logic as Page 5 Block E — takes session filter state or guided-finder answers as input
- Sold/removed status transitions trigger server-side redirects (sold stays on the page with banner; removed 301-redirects to building page)
- Open Graph meta tags must include: title (building name + rooms + price), description (short key facts), image (hero photo)

## 7.12 Cross-page consistency with Page 5 (Building detail)

Pages 5 and 7 share a pattern but differ in scope:

| Aspect | Page 5 (Building) | Page 7 (Listing) |
|---|---|---|
| Scope | Whole building | One apartment |
| Hero gallery | Building + construction photos | Apartment photos + **floor plan** |
| Key facts scope | Range (1-4 rooms, multiple finishings) | Exact values (2 rooms, 1 finishing) |
| Trust evidence section | Full section (Block F) with developer profile | Compressed into seller info (Block G) |
| Construction progress block | Primary feature (Block D — signature) | Absent (not relevant to a single unit) |
| Available units block | Blocks H (dev) and I (resale) — inventory | Absent (this IS the unit) |
| Payment clarity block | Full dedicated section | Rolled into Block C price block |
| Description | Block K — project overview | Block I — seller description |
| Similar | Block L — buildings | Block J — listings |
| Sticky contact | Block M bar + side card desktop | Block K bar + side card desktop |

Both pages enforce: source transparency, fairness indicator calm colors, no "% годовых", contact one thumb away, structured data before free text.

---

# Page 8 — Compare page

## 8.1 What this page is for

Help buyers narrow their choice by putting 2-4 items side by side and turn the comparison into an actual decision. Compare on our platform is a **decision tool**, not a data display — the page ends with explicit "Что дальше?" actions that resolve comparison into contact.

Follows Blueprint §13 exactly. Compare state is URL-state only (Technical Spec decision — no server-side compare table for V1). This keeps the feature lightweight and shareable.

## 8.2 Route and entry points

**Route:** `/sravnenie`
**Route with items:** `/sravnenie?type=buildings&ids=abc,def,ghi` or `/sravnenie?type=listings&ids=xyz,uvw`

**Entry points:**
- Compare icon on any `BuildingCard` or `ListingCard` (Pages 3, 6)
- "Compare" action on Building detail or Listing detail pages (Pages 5, 7)
- CompareBar (Layer 7.11) "Сравнить (N)" button — visible at the bottom of the viewport as soon as 2+ items are in compare state
- Compare icon in global nav (desktop top bar / mobile hamburger)
- Shared URL (WhatsApp/Telegram — compare state serializes into URL, receiver sees same comparison without an account)
- Saved page "Сравнить выбранные" action (Page 9)

## 8.3 Design principles driving this page

Six principles shape this page:

1. **Never mix modes.** Blueprint §13.2: "Items of different types are never mixed in one table." A buyer either compares buildings OR listings, not both. The mode switch explicitly confirms before clearing data (Blueprint §13.9).
2. **Decision tool, not data display.** Blueprint §13.8: compare ends with "Что дальше?" section — four explicit actions (contact, share, add another, save). This is the conversion layer.
3. **Compare state is URL-state only (V1 decision).** No server-side compare table — the URL is the source of truth. This means: shareable without accounts, portable across devices, zero backend load. Trade-off: compare doesn't survive a URL cleanup. That's fine for V1.
4. **Sticky first column on mobile (2026 research-validated).** Row labels stay visible as the buyer scrolls horizontally through item columns. Without this, buyers lose context.
5. **Highlight labels direct attention to wins.** Blueprint §13.7: "Дешевле всех", "Ближайшая сдача", "Лучшая цена за м²", "Сильнее всех проверка" are attached to whichever item wins that metric. This is the "best of each column" pattern — proven to accelerate decisions.
6. **Calm UI, even in comparison.** No red X for "loser" fields, no green checkmarks for "winners". Highlight labels are small badges in Layer 2 fairness colors (calm green for best). Losers aren't marked — only winners are highlighted. This aligns with the fairness principle from Page 6.

## 8.4 Mobile layout (375px viewport, top to bottom)

Per Blueprint §13.3 — "Horizontal scrollable cards, two visible at a time. Sticky first column showing row labels. Compact formatting suited to a phone screen."

### Block A — Top sticky bar
- Back button (left, 44×44)
- Page title (center): "Сравнение"
- Clear-all button (right): "Очистить" as ghost button, `text-meta` stone-600

### Block B — Mode switch
- Segmented control: "Проекты · [N]" / "Квартиры · [N]"
- Only the mode that has items is active; switching modes triggers the confirmation modal (Blueprint §13.9)
- If only one mode has items, the other mode tab is visible but disabled (grayed) with a tooltip: "Пусто — добавьте варианты из списка"

### Block C — Highlight labels strip
Above the matrix, per Blueprint §13.7. Horizontal strip of small badges attached to the winning column for each metric:

- "Дешевле всех" → attached to the lowest-price column
- "Ближайшая сдача" → attached to the earliest-delivery column
- "Лучшая цена за м²" → attached to the lowest price-per-m² column
- "Сильнее всех проверка" → attached to the highest verification tier column

Each label is a small `AppBadge` in `fairness-great` calm green color, sized `sm`. Labels are stacked vertically under the column header (photo thumbnail) they belong to.

### Block D — Compare matrix

This is the core of the page. Two-part structure:

**Part 1 — Column headers (sticky at top as buyer scrolls vertically):**
- Each column header contains: photo thumbnail, name (building or listing title), **`SourceChip`** (listings only), **`VerificationBadge`**, and a small × close icon (removes that item from compare)
- Height: ~140px
- Width per column on mobile: ~45% of viewport (so ~2 columns visible at once, per Blueprint §13.3)

**Part 2 — Rows (vertical scroll):**
- First column (row labels) is **sticky to the left edge** as the buyer scrolls horizontally through item columns. This is the 2026 research-validated pattern.
- Row labels in `text-meta` stone-500: "Цена от", "Сдача", "Район", etc.
- Row values in `text-body` stone-900 tabular where numeric
- Row order per Blueprint §13.5 (projects) or §13.6 (listings) — see §8.6 below

**Horizontal scroll indicator:**
- Subtle fade gradient on the right edge of the matrix indicates more columns exist off-screen (2026 research-confirmed pattern)
- **UI Spec enhancement (not in Blueprint, revisable during build):** On first visit, a gentle 1-second horizontal sway animation on the matrix hints that columns scroll — then never again. This helps first-time buyers discover the horizontal pattern without a tooltip.

### Block E — "Что дальше?" decision section

Per Blueprint §13.8. Four action cards stacked vertically on mobile:

1. **"Связаться с понравившимся вариантом"** — opens an `AppModal` with radio-select of the compared items + WhatsApp/Call/Request Visit buttons per selection
2. **"Поделиться сравнением с семьёй"** — copies a shareable URL to clipboard, shows toast "Ссылка скопирована"; the URL preserves compare state (`?type=...&ids=...`)
3. **"Добавить ещё один вариант"** — links to the appropriate browsing page (Page 3 for buildings, Page 6 for listings) with a hint banner: "Выберите ещё один вариант для сравнения"
4. **"Сохранить объекты в избранное"** — saves all items in compare to the buyer's Saved page. Requires login — if not logged in, triggers the standard save auth flow (per Data Model §3.11 authentication)

### Block F — Footer (minimal)
Standard footer from Homepage (Page 1 Block I). Minimal — this page is for the task, not for exploration.

## 8.5 Desktop layout (≥1024px)

Per Blueprint §13.4 — "Matrix table with sticky first column. Up to 4 items side by side."

- Up to **4 columns visible at once** (vs. 2 on mobile)
- Column width auto-fits within the 1200px container
- First column (row labels) is still sticky to the left
- Column headers are taller on desktop (room for more info: photo, name, price, source chip, verification badge all inline)
- Highlight labels strip (Block C) renders as a horizontal row of labels above the matrix
- Block E ("Что дальше?") renders as a horizontal row of 4 action cards (1 row instead of stacked)

Otherwise identical to mobile.

## 8.6 Compare matrix rows

Per Blueprint §13.5 (buildings) and §13.6 (listings). Full row lists:

### Buildings mode (Blueprint §13.5, 14 rows)
1. Photo (column header, not a row)
2. Building name (column header)
3. Developer (with verification)
4. District
5. Delivery date
6. Price from
7. Price per m² (with fairness context)
8. Finishing types available
9. Installment terms
10. Construction progress %
11. Verification tier
12. Room types available
13. Size range
14. Matching units count

### Listings mode (Blueprint §13.6, 14 rows)
1. Photo (column header, not a row)
2. Source chip (column header)
3. Verification tier (column header)
4. Building
5. Rooms
6. Size
7. Floor
8. Finishing (with prominent label)
9. Price
10. Price per m² (with fairness context)
11. Monthly installment amount (if available)
12. Handover date
13. Availability status
14. Seller response time (only when ≥3 completed contacts per Blueprint §11.6)

**Row rendering rules:**
- Every row renders for every column (empty cells render as stone-300 "—" since this is explicitly a comparison table context; absence of data is meaningful for comparison, unlike listing detail where it'd be hidden)
- Finishing row values use `AppChip` variant `finishing` for compactness and color-coded instant recognition
- Fairness row values render the `FairnessIndicator` component (Layer 7.4) inline — same calm colors as elsewhere
- Response-time row shows text if ≥3 contacts, else "—" (this is the one context where "—" is acceptable, because the buyer explicitly wants to compare)

## 8.7 Item card width and scrolling on mobile

Per 2026 research-confirmed pattern (exact widths are UI Spec implementation decisions — Blueprint §13.3 only specifies "two visible at a time"):

- Each item column is ~45% of viewport (360px → ~162px column width)
- Gap between columns: `space-2` (8px)
- First column (row labels) is ~38% of viewport, sticky left
- Horizontal scroll is smooth, inertial, and snaps to column boundaries (optional — can be tuned during build)

This produces ~2 items visible at a time on mobile per Blueprint §13.3. To see items 3-4, buyer swipes left. The sticky left column ensures row context is never lost.

## 8.8 Platform components used

| Block | Platform components |
|---|---|
| A — Top bar | None (primitives) |
| B — Mode switch | None (custom segmented control built from `AppButton` group) |
| C — Highlight labels | `AppBadge` (Layer 6.9), placed above column headers |
| D — Compare matrix | **`VerificationBadge`** (Layer 7.3), **`SourceChip`** (Layer 7.2) in listing column headers, **`FairnessIndicator`** (Layer 7.4) in fairness rows, `AppChip` variant `finishing` in finishing rows |
| E — Что дальше? | `AppCard` for each action card; `AppModal` for the "contact one" dialog |
| F — Footer | None |
| Compare bar (floating, when items are being added) | **`CompareBar`** (Layer 7.11) — appears on other pages, not on this page itself |

## 8.9 Primitive components used

`AppButton` (primary, secondary, ghost, icon), `AppBadge`, `AppCard`, `AppModal` (confirmation modal for mode switch, contact dialog), `AppChip`

## 8.10 Empty and edge states

Per Blueprint §13.9.

### Fewer than 2 items in compare
- Empty state: `text-h2` "Добавьте 2 или более варианта, чтобы сравнить."
- Below in `text-body` stone-700: "Выберите проекты или квартиры — мы покажем их рядом, чтобы было легче решить."
- Two CTAs: `AppButton primary md` "Выбрать проекты" (→ Page 3) + `AppButton secondary md` "Выбрать квартиры" (→ Page 6)

### Mixing modes (user tries to add a building to a listing comparison or vice versa)
Per Blueprint §13.9 — confirmation modal before any data loss:
- Modal title: "Сменить режим сравнения?"
- Body: "У вас в сравнении [N] квартир. Чтобы сравнивать проекты, нужно очистить текущее сравнение. Продолжить?"
- Two buttons: **"Да, сравнить проекты"** (primary — clears current items, switches mode) and **"Нет, оставить квартиры"** (secondary — keeps current comparison, cancels add action)

**Data is never lost silently.** The modal is always rendered before any destructive state change.

### Item deleted or sold while in compare
Per Blueprint §13.9 — show the item **greyed out** with a badge overlay: *"Продано [date]"* or *"Объявление снято"*. Item stays in the comparison for transparency (buyer sees what happened) but is **excluded from highlight labels** (no "cheapest" badge on a sold item).

### 5th item added
- Show a toast: "В сравнении максимум 4 варианта. Уберите один, чтобы добавить новый."
- Do not silently drop an existing item to make room
- Provide a `AppButton ghost sm` in the toast: "Перейти в сравнение" → Page 8

### Comparing items across different building mode (all 4 from different buildings) or similar (multiple from same building)
- No special UI treatment — the matrix renders all of them with their actual values. If 3 items are in the same building, the "Building" row (listings mode) or "Developer" row (buildings mode) will have repeated values. That's fine and expected.

### Network error
- Existing compare state (from URL) stays visible — the matrix renders with what the URL encodes
- If individual item data fails to load, that column shows a skeleton or an error state: "Не удалось загрузить" with a retry icon

## 8.11 What must NOT appear on this page

Per PRD §19 and design principles:

1. **No "winner/loser" framing.** Only winners get highlight labels; losers aren't marked. No red-X columns.
2. **No more than 4 items in compare.** 5th addition triggers toast (see §8.10).
3. **No mixed-mode matrices.** Buildings and listings never appear in the same table.
4. **No silent data loss.** Mode switches confirm before clearing.
5. **No forced registration to view compare.** Compare state is URL-based; anyone with the URL can view.
6. **No "compare plan upsell".** No "Free users can compare 2 items, Premium users can compare 4" patterns. V1 has no paywalls here.
7. **No "% годовых" anywhere.** Installment rows show monthly amount only.
8. **No fake urgency.** No "Compare these before prices change!" banners.
9. **No AI-generated "summary" of which item to choose.** Blueprint §13.7 explicitly supports highlight labels only — we show facts, not opinions. The buyer decides.
10. **No interstitial ads between columns or rows.**

## 8.12 Acceptance criteria

The Compare page is done when:

1. On 375px mobile, ~2 item columns are visible at once; sticky first column (row labels) remains fixed while buyer scrolls horizontally
2. Compare state is stored entirely in URL — no server-side compare table is needed for V1
3. Compare URL is shareable — a receiver with the URL sees the same comparison without any account
4. Mode switch (buildings ↔ listings) is gated by a confirmation modal when data would be lost (Blueprint §13.9)
5. Highlight labels render above winning columns for 4 metrics: Дешевле всех / Ближайшая сдача / Лучшая цена за м² / Сильнее всех проверка (Blueprint §13.7)
6. "Что дальше?" section (Block E) presents all 4 Blueprint actions (contact / share / add / save)
7. Contacting a specific item from Block E opens an AppModal with radio-select of items + WhatsApp/Call/Request Visit buttons
8. Deleted/sold items stay visible but greyed out and are excluded from highlight labels (Blueprint §13.9)
9. Attempting to add a 5th item shows a toast — does not silently drop an existing item
10. Minimum 2 items enforced — fewer than 2 shows an empty state with CTAs to browsing
11. All 14 rows render per mode (buildings §8.6 buildings list, listings §8.6 listings list)
12. Empty cells in matrix render as "—" in stone-300 (comparison-specific exception to the no-placeholder rule)
13. No pattern from §8.11 appears on the page
14. Horizontal scroll indicator (edge gradient) hints at more columns off-screen when more exist
15. Lighthouse mobile performance ≥ 90, accessibility = 100

## 8.13 Technical notes for Codex

- Compare state lives in the URL: `?type=buildings&ids=id1,id2,id3,id4` or `?type=listings&ids=...`
- Use **nuqs** (tech spec client state choice) to serialize/deserialize URL state
- Server endpoints: `GET /api/buildings/batch?ids=...` and `GET /api/listings/batch?ids=...` return the comparison-ready data (parallel to single-item endpoints but batched)
- **Compare-specific behavior:** these batch endpoints MUST include sold/expired/deleted items so the compare view can render them greyed out (per §8.10 "Item deleted or sold while in compare"). The default search endpoints filter `status IN ('sold', 'expired', 'deleted')` out; the batch endpoints do not — they return all requested IDs regardless of status, and include the status enum + `sold_at` (or `deleted_at` / `expired_at`) in the payload so the UI can render the right badge ("Продано [date]" / "Объявление снято"). The Compare page is the single exception to the "active only" filter rule.
- Client-side caching: each batch response is cached via TanStack Query keyed by the ID set — rotating items quickly avoids re-fetches
- Highlight labels are computed client-side from the batch response — no separate endpoint
- Share URL: use the current URL verbatim, append `utm_source=compare_share` if analytics want it
- Add-to-saved bulk action: triggers individual save API calls (or a batch save endpoint if performance requires it later)
- Deleted/sold items: the batch endpoint returns all requested items even if their status is `sold`/`removed`, so the matrix renders them greyed-out with the banner. The client reads the status field and applies the greyed style.

## 8.14 Cross-page consistency notes

Compare page uses the same visual vocabulary as Pages 5, 6, 7:
- VerificationBadge, SourceChip, FairnessIndicator, finishing chip colors all render identically
- Calm colors, tabular numbers, no "% годовых"
- Row labels use the same field names as the source pages (Data Model §3.x enums consistent)

Compare page is the only V1 page that uses horizontal scrolling as a primary interaction. All other pages use vertical scrolling. This is a deliberate exception — the comparison task genuinely needs side-by-side, and the sticky first column + scroll indicator make the pattern manageable.

---

# Page 9 — Saved page

## 9.1 What this page is for

Support the multi-session nature of real estate decisions. Apartment buying takes weeks or months — buyers save items, close the app, come back, see what changed, save more, compare, contact. This page is **where the retention loop lives** (Blueprint §14.1 opening line).

The page's single most important feature: the **"Что изменилось"** summary strip that answers "what happened since I was here last?" in one glance. Without this, saved-items is just a static list. With it, saved-items becomes a reason to return.

Follows Blueprint §14 exactly. `ChangeBadge` (Layer 7.12) does the heavy lifting for visible change communication.

## 9.2 Route and entry points

**Route:** `/izbrannoe`
**Route with tab:** `/izbrannoe?tab=buildings` or `/izbrannoe?tab=listings`

**Entry points:**
- "Сохранённые" link in global nav (desktop top bar / mobile hamburger)
- Save icon tap confirmation toast (on any page) — "Сохранено · Посмотреть" ghost link
- Homepage returning-user strip (Page 1 Block C) — "Посмотреть все изменения" links here
- Compare page "Save to favorites" bulk action result — toast links here
- Push notification tap (if push is ever added in a later phase) — landing page for notifications
- Email/SMS notification link (same — later phase)
- Direct URL bookmark

**Access control:** saved page requires login. If not logged in, redirect to login with `?redirect=/izbrannoe` parameter so user returns here after auth.

## 9.3 Design principles driving this page

Five principles shape this page — most of them are about honesty:

1. **Changes are the hero, not the items.** The "Что изменилось" strip at the top is what brings returning buyers back. A static list of saved items without change signals is just a bookmark folder — not a retention feature. Blueprint §14.2 gates this strip: "only shown if there are changes since last visit."
2. **Honest change reporting.** ChangeBadge (Layer 7.12) shows real changes only. No fake "price dropped!" when it didn't. No ecommerce-style "hurry, price went up!" scarcity. Price drops celebrate in green; price rises inform in stone-700 (not red).
3. **Sold/removed items stay visible, not silently hidden.** 2026 research-confirmed pattern (and Blueprint §14.5 all-sold empty state hint): when a saved item becomes sold, the buyer needs to see that it's sold (closure + trust), not discover it vanished.
4. **Bulk actions turn saved-items into a workspace.** Blueprint §14.4: checkbox-select multiple items, then compare/share/delete. This turns the page from a collection into a decision-making tool.
5. **Share with family** — apartment decisions are multi-stakeholder in this market. Share list feature (Blueprint §14.4) is critical. Shareable URL (like Compare page) — no account required on receiver side.

## 9.4 Mobile layout (375px viewport, top to bottom)

### Block A — Top sticky bar
Standard pattern:
- Back button (left)
- Page title (center): "Сохранённые"
- Selection mode toggle (right): `CheckSquare` icon that toggles bulk-action mode (reveals checkboxes on each card)

### Block B — "Что изменилось" summary strip (conditional)

Per Blueprint §14.2 — **only shown if there are changes since last visit**. Absent entirely if nothing changed.

Structure:
- Section title: `text-h2` "Что изменилось"
- Below title: one-line summary text in `text-body` stone-900, per Blueprint §14.2 example:
  *"С вашего последнего визита: 2 снижения цены, 1 новая квартира в сохранённых ЖК, новые фото стройки в 3 проектах"*
- Each change phrase is **tappable** — tapping scrolls the page down to the affected saved item (which will have its `ChangeBadge` rendered)
- Below the summary: small ghost link `AppButton ghost sm` "Посмотреть все изменения" that expands a full change log (an `AppModal` listing all changes with timestamps)

Background: `stone-50` card-like container to distinguish the strip from the tabs below. No urgent colors, no animations.

### Block C — Tabs

Per Blueprint §14.2 — two tabs:
- **Сохранённые проекты · [N]**
- **Сохранённые квартиры · [N]**

Rendered as a segmented control (similar to Page 8 mode switch). Tab selection persists in URL (`?tab=buildings` or `?tab=listings`).

If one tab has zero items: the tab is still shown but marked as empty (e.g., "Сохранённые квартиры · 0"). Tapping an empty tab shows a small inline empty-tab state (see §9.8).

### Block D — Bulk actions bar

Per Blueprint §14.4. Only visible when bulk-action mode is toggled on (from Block A) and at least one item is selected.

Sticky under the tabs (position `sticky top-[topbar-height]`). Shows:
- **"Выбрано: N"** in `text-meta` stone-700
- Three actions:
  - `AppButton primary sm` "Сравнить выбранные" (disabled if <2 selected; navigates to Page 8 with selected IDs)
  - `AppButton secondary sm` "Поделиться списком" (generates shareable URL, copies to clipboard, shows toast)
  - `AppButton ghost sm` with `Trash` icon "Удалить" (removes selected items with a confirmation modal)
- `AppButton ghost sm` "Отмена" (exits bulk-action mode, clears selection)

### Block E — Saved items list

Per Blueprint §14.3.

Depending on active tab, shows either saved buildings or saved listings:
- **Saved buildings tab:** `BuildingCard` full variant (Layer 7.8) for each item
- **Saved listings tab:** `ListingCard` full variant (Layer 7.7) for each item

Each card is **extended with ChangeBadge and bulk-selection checkbox** per the rules below.

Items stacked vertically, `gap-4`. Sort order: most recently changed items first (items with a change badge rise above items without), then by most recently saved. UI Spec decision — Blueprint doesn't lock sort order, this pattern matches 2026 retention best practices.

### Card extensions on Saved page

Each saved-item card on this page is the same component as on browsing pages (`BuildingCard` or `ListingCard`) but with two additions:

**1. ChangeBadge (Layer 7.12) — conditional**

Rendered **above the card's identity row** when the item has a recent change event (per Data Model §3.9 `change_events` table). Only the most recent change shows as a badge (Layer 7.12 hard rule — history behind tap).

Example badges (5 enum values, 6 visual variants):
- `price_changed` → price drop → "↓ Цена снизилась" in fairness-great green
- `price_changed` → price rise → "↑ Цена повысилась" in stone-700 (informational, not alarming)
- `status_changed` → "Статус изменился" in semantic-warning amber
- `new_unit_added` → "Добавлены новые квартиры" in badge-tier-3 forest green (buildings tab only)
- `construction_photo_added` → "Обновлены фото стройки" in muted gold (buildings tab only)
- `seller_slow_response` → "Продавец отвечает медленно" in stone-500 (buildings or listings)

**Inconsistency flagged for reconciliation:** Blueprint §14.3 says "Статус изменился... red for sold"; Layer 7.12 (locked) specifies semantic-warning amber, aligned with PRD §19 halal-by-design (no alarm colors). This UI Spec follows Layer 7.12 (amber) because Layer 7.12 was locked more recently with explicit halal-by-design reasoning. If the founder prefers red for sold, both Blueprint §14.3 and Layer 7.12 should be updated consistently before build. Current recommendation: keep amber — red implies the buyer should panic, which is the opposite of the product's calm tone.

Tap on badge → opens `AppModal` with full change log for that item + timestamps ("Изменено 2 дня назад", etc.). Automatically clears after the buyer opens the full listing/building detail page again.

**2. Bulk-selection checkbox — conditional**

Rendered **only when bulk-action mode is active** (from Block A toggle). Positioned top-left of the card, 44×44 hit area, `AppCheckbox` primitive.

When bulk mode is off: checkbox is absent. Card behaves like a normal saved item — tap opens the item.

When bulk mode is on: tap on card toggles selection instead of opening. A small "Открыть" link appears on the card to navigate to the item explicitly.

## 9.5 Desktop layout (≥1024px)

Same block order. Differences:

- Block A top bar has inline "Выбрать" button (opens bulk-action mode) instead of an icon
- Block B "Что изменилось" strip renders same, now wider — can show richer summary
- Block C tabs render as horizontal tabs (not segmented control)
- Block E items in a grid — 2-up on desktop for buildings tab, 2-up for listings tab. No 3-up to keep cards readable.
- Bulk actions bar (Block D) becomes inline at the top of the list, not sticky

## 9.6 "Мои запросы" section (cross-referenced)

Blueprint §15.4 and §15.5 reference a "Мои запросы" section on the Saved page where visit requests are tracked. This is part of the Saved page but not explicitly in Blueprint §14.

**UI Spec decision (aligned with Blueprint §15.4–§15.5):** add a third implicit "tab" or accordion section below the main tabs, visible when the user has submitted at least one visit request. Title: "Мои запросы · [N]". Shows request cards with:
- Building/listing context
- Request date
- Status (new / contacted / visit scheduled / etc. per Data Model)
- **Slow-response nudge banner (Blueprint §10.5, §12.5, §15.5)**: if seller hasn't responded within 24h, show: *"Застройщик ЖК [X] ещё не ответил на ваш запрос. Хотите попробовать WhatsApp?"* with direct WhatsApp button.
- If no response in 72h: show: *"Похоже, продавец занят. Вот похожие варианты:"* with 2-3 similar `ListingCard`s / `BuildingCard`s

Hidden entirely if the user has made no visit requests yet.

**Alternative placement to flag:** this section could also live on the buyer's profile/account page. For V1, Saved is the natural home because the nudges reference saved items. Revisit during build if profile page becomes its own surface.

## 9.7 Platform components used

| Block | Platform components |
|---|---|
| A — Top bar | None (primitives) |
| B — "Что изменилось" summary | None (primitives), `AppModal` for full change log |
| C — Tabs | None (segmented control from `AppButton` group) |
| D — Bulk actions bar | None (primitives) |
| E — Saved buildings | **`BuildingCard`** (Layer 7.8) extended with **`ChangeBadge`** (Layer 7.12) and `AppCheckbox` |
| E — Saved listings | **`ListingCard`** (Layer 7.7) extended with **`ChangeBadge`** (Layer 7.12) and `AppCheckbox` |
| Мои запросы section | None (primitives), inline contact buttons from StickyContactBar pattern |

## 9.8 Primitive components used

`AppButton` (primary, secondary, ghost, icon), `AppCheckbox`, `AppCard`, `AppModal` (full change log, delete confirmation), `AppToast` (share-link-copied feedback)

## 9.9 Empty and edge states

Per Blueprint §14.5 and standard patterns:

### Absolute empty — no saved items ever
Per Blueprint §14.5:
- Full-page illustration-free empty state (no cute drawings — Principle 2 calm)
- `text-h1` "Здесь будут ваши избранные квартиры и проекты"
- `text-body` stone-700: "Начните сохранять понравившиеся варианты, чтобы легко к ним возвращаться"
- Two CTAs: `AppButton primary md` "Посмотреть проекты" (→ Page 3) + `AppButton secondary md` "Посмотреть квартиры" (→ Page 6)

### One tab empty, other has items
- The empty tab shows an inline empty-tab state (smaller than the absolute-empty state above)
- `text-body` stone-700: "Здесь пока нет сохранённых [квартир/проектов]." + small inline CTA link to the relevant browsing page

### All saved items sold/removed
Per Blueprint §14.5:
- `text-h2` "Ваши сохранённые варианты больше не активны"
- `text-body` stone-700: "Посмотрите похожие проекты в тех же районах"
- Below: 3-5 personalized suggestion cards (same buildings/listings in the same districts as the user's now-sold items)
- The sold items themselves are **still visible in the tabs** (greyed out with "Продано [date]" badge), but the suggestions are prominently shown first

### Some items sold, some active
- Active items render normally with ChangeBadge where applicable
- Sold items render greyed out with `status_changed → "Продано"` ChangeBadge
- No filter/hide toggle for sold items in V1 — the buyer sees everything they saved, with honest status

### "Что изменилось" strip logic
- Strip appears **only if** the user has ≥1 unacknowledged change event since the last acknowledgment
- Per Data Model §5.7 note: the "what changed" feature is computed by joining `saved_items` against `change_events` where `change_events.created_at > saved_items.change_badges_seen_at`
- **UI Spec decision (not in Blueprint):** once the strip is seen (viewport intersection observed), a small delay starts. After 30 seconds of continuous page view, the changes are marked as "acknowledged" by updating `change_badges_seen_at`. On next visit, the strip shows only changes that happened after this timestamp. Exact threshold (30s) is tunable during build — alternative approaches include explicit "Dismiss" button or instant acknowledgment on scroll. This is a retention-UX decision, not a Blueprint requirement.

### User logs out
- Saved state is server-side (Data Model §3.7 saved_items has `user_id NOT NULL`). Logging out simply makes the saved page require login again.
- No client-side saved state persists for logged-out users — Data Model is firm on this per PRD §13.

### Network error
- Cached data (from TanStack Query) renders if available
- Banner at top with retry: "Не удалось обновить. Попробуйте ещё раз."

## 9.10 What must NOT appear on this page

Per Blueprint §14 and PRD §19:

1. **No fake change notifications.** ChangeBadge shows only real events from `change_events` table.
2. **No manufactured urgency.** No "Цена может вырасти!" No "Спешите — осталось 2 дня!" No countdown timers.
3. **No red "price rose" badges.** Price rise uses stone-700 per Layer 7.12 — informational, not alarming.
4. **No "Save more to unlock premium features".** V1 has no saved-item paywalls.
5. **No ads disguised as saved items.**
6. **No "recommended for you" block that competes with the user's own saved items.** Personalized suggestions appear only in the all-sold empty state (Blueprint §14.5) — not alongside active saved items.
7. **No auto-deletion of sold items.** They stay visible (with honest status) until the user explicitly removes them.
8. **No "You haven't looked at this in X days — remove?" prompts.** We don't guilt the user into cleaning up.
9. **No animations or pulsing on ChangeBadge** (Layer 7.12 hard rule — Principle 2 calm).
10. **No emoji-heavy celebrations** for price drops. `fairness-great` green is the only visual cue.
11. **No forced registration on share link.** Share URL works for any receiver regardless of their account state.

## 9.11 Acceptance criteria

The Saved page is done when:

1. On 375px mobile, **"Что изменилось" strip (Block B) renders only when there are unacknowledged changes** — absent entirely otherwise
2. Two tabs render with item counts: "Сохранённые проекты · [N]" / "Сохранённые квартиры · [N]"
3. Tab selection persists in URL (`?tab=buildings` or `?tab=listings`)
4. Each saved item card renders as the standard `BuildingCard` or `ListingCard`, **extended** with `ChangeBadge` when a change event exists
5. ChangeBadge for `price_changed → rise` renders in stone-700, **not red** (Layer 7.12 hard rule)
6. Sold/removed items **stay visible** with greyed-out styling and a status badge — not auto-deleted
7. All-sold empty state (Blueprint §14.5) shows personalized suggestions in the same districts
8. Bulk-action mode (from top-bar toggle) reveals checkboxes on cards and a sticky bulk-action bar with compare/share/delete
9. "Сравнить выбранные" is disabled until at least 2 items are selected
10. Share-list action generates a shareable URL that works without the receiver having an account
11. "Мои запросы" section (if implemented on Saved page per §9.6) shows visit requests with slow-response nudges at 24h and 72h per Blueprint §15.5
12. Absolute-empty state offers clear CTAs to the two browsing pages
13. Login is required; unauthenticated users redirect to login with a redirect parameter that returns them here
14. "Что изменилось" changes are marked acknowledged after 30 seconds of continuous viewing — on next visit, only newer changes appear in the strip
15. No pattern from §9.10 appears

## 9.12 Technical notes for Codex

- Server endpoint: `GET /api/saved-items` returns all saved items for the current user with joined change events newer than `change_badges_seen_at` (per Data Model §5.7)
- Use TanStack Query with `staleTime: 30 seconds` — fresh enough for change-reporting, cache-friendly for navigation
- Acknowledgment tracking: PATCH `change_badges_seen_at` on each saved_item when the user has viewed the "Что изменилось" strip for 30 continuous seconds (Intersection Observer + timer)
- ChangeBadge rendering: the backend joins `saved_items` with the most recent `change_events` row per item
- Bulk actions: compare is a client-side navigation (Page 8 URL), share is a URL-copy operation, delete is a batch `DELETE /api/saved-items?ids=...` endpoint
- Share URL: `/izbrannoe/podelitsya/[token]` — a server-generated read-only snapshot of the user's current saved list (not a live sync — read-only point-in-time view). **Pending tech decision:** exact implementation of share-list URLs is not in the tech spec; needs design during build. Simplest V1: generate a token tied to the user's current saved list, store in `shared_lists` table, receiver views read-only.
- "Что изменилось" summary text is computed server-side from aggregating change events — "2 снижения цены, 1 новая квартира..." — to avoid N+1 queries on the client

## 9.13 Cross-page consistency notes

Saved page reuses the same card components as browsing pages (Pages 3, 6), plus ChangeBadge layer:
- BuildingCard and ListingCard render identically in terms of core content
- The only Saved-page-specific additions are ChangeBadge and bulk-selection checkbox
- VerificationBadge, SourceChip, FairnessIndicator, finishing chips all render consistently

Saved page is the primary retention surface. It should feel like returning to a workspace, not a static bookmark folder. The "Что изменилось" strip is what makes this difference visible.

---

# Page 10 — Contact flow

## 10.1 What this page is for

Make contact fast and low-friction while capturing enough intent to help the seller respond well — and ensure the buyer never hits a dead end if contact fails.

This isn't a standalone page in the traditional sense — it's a **modal/overlay flow that lives on top of Building detail (Page 5), Listing detail (Page 7), Saved page (Page 9), Compare page (Page 8), and Map pin preview (Page 4)**. Three contact actions are always visible on those surfaces: **WhatsApp**, **Позвонить**, **Запросить визит**. This spec covers all three paths, their failure recovery, and the success state.

Follows Blueprint §15 exactly. The product's wedge-preserving principle: **WhatsApp/Call are zero-friction (no registration needed)**, but Request Visit requires registration (per PRD §13 and User Flows — registration is the gating mechanism for lead quality and identity).

## 10.2 Routes and entry points

**Not a dedicated route.** The contact flow is invoked from any of these surfaces:

- Building detail page (Page 5) Block M sticky bar
- Listing detail page (Page 7) Block K sticky bar
- Compare page (Page 8) Block E "Связаться с понравившимся вариантом"
- Saved page (Page 9) card action or Мои запросы section
- Map pin preview card (Page 4) when the pin preview includes contact buttons
- Desktop sticky side cards on Pages 5 and 7

Each invocation carries the **context** (building_id, optionally listing_id) into the flow. This pre-fills the form and pre-composes the WhatsApp message.

## 10.3 Design principles driving this page

Six principles shape this flow:

1. **WhatsApp is the primary channel.** 2026 research confirms WhatsApp dominance for apartment buying in our market, and Tajikistan-specific data from the deep research report shows WhatsApp as the dominant messenger (primary) with IMO critical for diaspora. WhatsApp gets the primary button treatment (green, leftmost, or on its own row).
2. **Pre-filled context is mandatory.** WhatsApp opens with a pre-composed message: "Здравствуйте, интересуюсь [building name / unit X] на платформе." The seller immediately knows what the buyer is looking at. This is 2026 best practice and Blueprint §15.2 requirement.
3. **Request Visit form is short — 5 fields max.** Blueprint §15.3. Anything longer drops conversion. Phone pre-filled if logged in; listing context auto-attached; optional checkboxes only revealed when relevant.
4. **Three always-visible options, not three equal options.** WhatsApp is primary (most prominent, zero friction). Call is secondary (zero friction). Request Visit is tertiary (requires more commitment but captures better intent). Visual hierarchy matches behavioral expectation.
5. **Contact failure never dead-ends the buyer.** Blueprint §15.5 — WhatsApp link failure, phone copy failure, seller non-response all have specific fallback flows. Every failure path has a "try this instead" action.
6. **No email requirement.** Blueprint §15.6 is explicit. Phone (WhatsApp-compatible) is the only required contact field. Email is absent from V1 entirely. In Tajikistan, WhatsApp/phone is universal; email is niche.

## 10.4 Three always-visible options (on host pages)

Per Blueprint §15.2. These render via **`StickyContactBar`** (Layer 7.9) on mobile and in sticky side cards on desktop.

### WhatsApp button (primary, leftmost or emphasized)
- `AppButton` in WhatsApp green (#25D366 brand color — this is the one exception to the warm terracotta palette, industry-standard recognizability)
- Icon: WhatsApp SVG (custom, not Lucide — specific brand icon)
- Label: "WhatsApp" on mobile; "Связаться через WhatsApp" on desktop
- On tap: opens `https://wa.me/<seller_phone>?text=<pre_composed_message>` in a new tab

**Pre-composed message template:**
- For building inquiry: "Здравствуйте, интересуюсь проектом [building_name] на платформе [platform_name]. Можно узнать подробнее?"
- For listing inquiry: "Здравствуйте, интересуюсь квартирой в [building_name] (номер объявления [listing_id_short]). Можно узнать подробнее?"
- Message is in Russian by default; if the current UI locale is Tajik, message is in Tajik — the current language setting drives the message language.

### Позвонить button (secondary)
- `AppButton secondary` (warm stone, not green)
- Icon: `Phone` Lucide
- Label: "Позвонить"
- On mobile tap: opens `tel:<seller_phone>` — triggers native phone call confirmation
- On desktop tap: opens a modal showing the number with a "Скопировать" button (desktop rarely can dial directly)

**Spam-protection "Показать телефон" variant (mentioned in Pages 5 §5.5 and 7 §7.5 desktop sticky card):**
- On desktop sticky side card, phone number is hidden behind a "Показать телефон" button at first
- Tap reveals the number + copy action
- Protects developers/sellers from automated phone-number harvesting by bots

### Запросить визит button (tertiary but highest intent)
- `AppButton primary` (terracotta)
- Icon: `Calendar` Lucide
- Label: "Запросить визит"
- On tap: opens the Request Visit modal (§10.5)

## 10.5 Request Visit modal

Per Blueprint §15.3.

### Modal presentation
- On mobile: full-screen `AppBottomSheet` sliding up from bottom, max height 90vh
- On desktop: centered `AppModal` ~500px wide, 90vh max

### Header
- Modal title: `text-h2` "Запросить визит"
- Sub-line: `text-meta` stone-700 showing the context:
  - Building: "ЖК Ситора · Сино"
  - Listing: "ЖК Ситора · кв. 2 комн. · 64 м² · 5 этаж"
- Close icon top-right (44×44 hit area)

### Form fields (Blueprint §15.3)

**Required fields:**
1. **Имя** — `AppInput` text, 1 line
2. **Телефон** — `AppInput` with phone-formatting mask (Tajik +992 prefix default)
   - Pre-filled if user is logged in (from their account)
   - Validation: must be valid phone number, 10+ digits, passes server-side check

**Required choices:**
3. **Предпочитаемый способ связи** — `AppChipGroup` single-select:
   - "WhatsApp" (default)
   - "Звонок"
4. **Когда планируете купить?** — `AppChipGroup` single-select:
   - "Скоро"
   - "В течение 3 месяцев"
   - "В течение 6 месяцев"
   - "Изучаю рынок"

**Optional:**
5. **Комментарий (необязательно)** — `AppTextarea`, placeholder: "Дополнительные пожелания или вопросы"

**Optional checkboxes (revealed only when relevant):**
6. **"Предпочитаю, чтобы связалась женщина-агент"** — `AppCheckbox`
   - Shown only when the listing's seller or developer has at least one female agent on staff (marked in a developer-side field). If no female agent is available, the checkbox is hidden entirely — not disabled.
   - Blueprint §15.3 rationale: family-sensitive communication preferences matter in this market

7. **"Указать другой номер моего родственника для связи"** — `AppCheckbox`
   - On check: reveals a second phone field
   - For diaspora buyers in particular — buyer is abroad but family in Tajikistan coordinates the visit

### Pre-filled context (invisible to buyer, sent to server)
Automatically attached per Blueprint §15.3:
- `building_id`
- `listing_id` (if applicable)
- Current filter state (if buyer came from filtered search) — helps seller understand intent
- Locale (ru/tg)
- Source page ("listing_detail", "building_detail", "saved", "compare")

### Submit CTA
- `AppButton primary lg` full-width: "Отправить запрос"
- Disabled until required fields are valid
- On submit: loading state on button, then success state

## 10.6 Success state

Per Blueprint §15.4.

Replaces the form inside the modal (does not navigate away):

- Large `Check` icon in fairness-great green (~48×48)
- `text-h2` "Запрос отправлен"
- `text-body` stone-900:
  - If seller has response-time data (≥3 completed contacts): *"Продавец свяжется с вами в ближайшее время, обычно в течение [avg response time]."*
  - If seller has no response-time data: *"Продавец свяжется с вами в ближайшее время."* (no guess about how fast)
- Two actions:
  - `AppButton primary md` "Продолжить просмотр" → closes modal, stays on current page
  - `AppButton secondary md` "Сохранить квартиру/проект" (only if not already saved) → saves to Saved page
- Small inline note: *"Этот запрос теперь в ваших Запросах на странице 'Сохранённые'."* (per Blueprint §15.4 — auto-added to Мои запросы section on Saved page, Page 9 §9.6)

## 10.7 Login/registration gating

WhatsApp and Позвонить are **zero-friction** — no login required. Tap opens the external WhatsApp/phone action immediately.

Request Visit **requires login** — per PRD §13 registration is the gating mechanism for lead quality. Flow:

### Not logged in tap on Запросить визит
Per User Flow B9 (already specified in User Flows §3.9):
- Modal opens with a lightweight login prompt: *"Чтобы отправить запрос, подтвердите свой номер — это займёт 20 секунд."*
- Single field: phone number
- Submit → SMS OTP sent → 6-digit code field revealed (matches Technical Spec §4.5)
- On successful verification → modal transitions to the Request Visit form with phone pre-filled
- Listing/building context the buyer was viewing is preserved (per User Flows Flow B9)

### Already logged in tap on Запросить визит
- Form opens immediately with name and phone pre-filled from the user's account
- Buyer only chooses contact method, timeline, optional note, optional preferences

## 10.8 Contact failure recovery

Per Blueprint §15.5. Every failure path has a fallback.

### WhatsApp link fails (WhatsApp not installed, deep link blocked, no internet)
Fallback `AppModal`:
- Title: "WhatsApp не открывается"
- Body: "Попробуйте:"
- Option 1: `AppButton primary md` "Позвонить напрямую: [phone]"
- Option 2: `AppButton secondary md` "Отправить запрос через форму" → opens Request Visit flow (§10.5)

**Detection technique:** we can't directly know if WhatsApp deep link failed — browser fires `wa.me` as a normal URL. Workaround:
- Use a 2-second timer after the link click. If the page is still visible (document visibility still "visible") after 2 seconds, assume the link didn't open WhatsApp and show the fallback modal.
- This is a best-effort heuristic — not 100% accurate. Acceptable for V1. Tune threshold during build.

### Phone number copy fails (desktop clipboard API blocked)
Blueprint §15.5 specifies: auto-select the number and show *"Номер выделен — нажмите чтобы скопировать или позвонить."*
- On click of the phone number shown in the desktop contact card: select the text
- Show toast with the fallback message
- Alternative fallback: reveal a `tel:` link that some desktop browsers can handle with user-installed apps (Skype, FaceTime)

### Seller doesn't respond within 24 hours
Per Blueprint §15.5:
- Gentle reminder shown in "Мои запросы" section of the Saved page (Page 9 §9.6)
- Shown inline on the saved item card too — a small `AppBadge` note: "Продавец не ответил в течение 24 часов"
- Offer alternative action: *"Не дождались ответа? Попробуйте связаться напрямую через WhatsApp"* — inline WhatsApp button

### Seller doesn't respond within 72 hours
Per Blueprint §15.5:
- Backend flag: the listing is marked internally for response-time calculation (counts against the seller's response-time badge qualification per Blueprint §11.6)
- Buyer sees on their Saved page / Мои запросы: *"Похоже, продавец занят. Вот похожие варианты:"*
- Below that: 2-3 `ListingCard` / `BuildingCard` compact cards with similar alternatives
- The original request isn't deleted — the buyer can still retry contact if they want

### Request Visit network error on submit
- Retry once silently (per User Flows §3.8 — already specified)
- If second attempt fails: *"Не удалось отправить запрос. Проверьте соединение и попробуйте снова."*
- Retry button in the modal
- **Form data is preserved** — never cleared on error (per User Flows §3.8 explicit rule)

### OTP not delivered (login-gate variant)
- After 30 seconds: "Не получили код? Отправить ещё раз" button revealed
- After 3 failed resends: "Проверьте номер телефона" prompt with back-edit option
- Backend fallback: if Twilio fails, falls back to Vonage per Tech Spec (this is server-side, invisible to buyer)

## 10.9 Platform components used

| Element | Platform components |
|---|---|
| Host-page contact row | **`StickyContactBar`** (Layer 7.9) |
| Request Visit modal | `AppBottomSheet` (mobile), `AppModal` (desktop) |
| Form fields | `AppInput`, `AppChipGroup`, `AppTextarea`, `AppCheckbox` |
| Success state | None (primitives only) |
| Failure fallback modals | `AppModal` |
| Toast notifications | `AppToast` (via sonner, Layer 6.13) |

## 10.10 Primitive components used

`AppButton` (primary, secondary, ghost, icon buttons), `AppInput` (text, phone mask), `AppChip` + `AppChipGroup` (single-select), `AppTextarea`, `AppCheckbox`, `AppModal`, `AppBottomSheet`, `AppToast`

## 10.11 What must NOT appear on this flow

Per Blueprint §15.6 and PRD §19:

1. **No lengthy lead forms.** Max 5 visible fields, per Blueprint §15.3.
2. **No required fields beyond what's listed.** Adding "email", "address", "other preferences" is forbidden.
3. **No "create an account to continue" block** before WhatsApp or Call (these are zero-friction paths). Request Visit is the one exception that requires phone verification.
4. **No interest-rate calculators inside the contact flow.** PRD §19 halal-by-design.
5. **No fake urgency.** No "Последний день для заявки!" No "Этот визит может быть забронирован кем-то ещё!"
6. **No email requirement anywhere.** Blueprint §15.6 is firm. No email field in V1, period.
7. **No WhatsApp-business-AI-bot conversation in V1.** The WhatsApp link opens a direct chat with the seller — no automated bot in the middle. V1 is WhatsApp-direct, not automated-qualification.
8. **No multi-step form wizard.** Blueprint §15.3 lists a short flat form — not 4 steps.
9. **No captcha on the Request Visit form.** Phone OTP gating is the spam defense. Adding captcha on top is friction without meaningful benefit.
10. **No "Refer a friend for discount!" promos inside the contact flow.**
11. **No auto-subscribing the buyer to newsletters after contact.** Contacting about a listing ≠ consenting to marketing.
12. **No showing the seller's exact phone number until the user taps "Show"** (desktop) — protects against bot harvesting.

## 10.12 Acceptance criteria

The Contact flow is done when:

1. **WhatsApp, Call, and Request Visit are visible on every host page** (Pages 5, 7, 8, 9, 4 pin preview)
2. WhatsApp button uses WhatsApp brand green (#25D366) as the one color exception to the warm terracotta palette — matches universal user recognition
3. WhatsApp tap opens a pre-composed message with building/listing context pre-filled
4. Message language matches the current UI locale (Russian or Tajik)
5. Call tap on mobile uses `tel:` URI; on desktop shows number with copy action
6. Desktop phone number is hidden behind "Показать телефон" until tapped (spam protection)
7. Request Visit form has exactly 5 fields visible: name, phone, contact method (radio), timeline (radio), optional note — plus 2 conditional optional checkboxes
8. Phone is pre-filled if the user is logged in
9. Building/listing context pre-fills on form open and is sent with submission
10. Not-logged-in users who tap Request Visit see phone OTP verification first, then the form (User Flows B9)
11. Success state shows per Blueprint §15.4: confirmation + expected response time (only if seller has ≥3 contacts with response data) + Continue/Save actions
12. Request auto-added to "Мои запросы" on Saved page
13. WhatsApp link failure shows fallback modal (heuristic 2s detection)
14. 24h-no-response nudge shows on Saved page with WhatsApp fallback
15. 72h-no-response shows similar alternatives in Мои запросы
16. OTP delivery failure has resend button after 30 seconds, with error guidance after 3 failures
17. Network error on submit preserves form data for retry
18. Email field absent from the entire flow (V1)
19. No pattern from §10.11 appears

## 10.13 Technical notes for Codex

- Server endpoints:
  - `POST /api/leads` creates a lead record (buyer info + context)
  - `POST /api/auth/otp/request` sends OTP for login gating
  - `POST /api/auth/otp/verify` verifies code
- WhatsApp pre-composed message: URL-encode the template string; always include `+992` prefix on seller phone if stored without it
- WhatsApp link detection heuristic: `setTimeout(() => { if (document.visibilityState === 'visible') showFallback() }, 2000)` — call inside the click handler before opening the link
- Phone input mask: use a Tajik-specific library or manual regex. Default prefix `+992`. Validation on submit: server-side check that the phone is a valid TJ mobile number.
- Female-agent checkbox visibility: depends on a seller-side flag (stored on `users` or `developers` table: `has_female_agent` boolean). Backend returns this on building/listing fetch; frontend renders the checkbox conditionally.
- Desktop phone-number reveal: client-only state — no extra API call needed when "Показать телефон" is tapped. The number is always in the server response; client just hides it by default.
- Pending tech decision: the `has_female_agent` field isn't explicitly in Data Model §5. Needs to be added as part of seller profile during build, per Blueprint §15.3.

## 10.14 Cross-page consistency notes

Contact flow is consistent across all host pages:
- Same three buttons, same order, same visual treatment
- Same Request Visit modal regardless of entry point (with context-appropriate pre-fill)
- Same success state, same failure fallbacks

This consistency is a core UX principle — buyers should never wonder "how do I contact on this page?" because it's always the same answer in the same visual place.

The contact flow is the single most important conversion mechanism in the product. Every friction point here costs real buyer engagement. The flow is deliberately stripped to the minimum that captures enough intent for the seller while removing everything that could stop the buyer.

---

# Page 11 — Diaspora landing page

## 11.1 What this page is for

Convert Tajik migrants in Russia — the primary diaspora segment for our market — into confident remote buyers. This page acknowledges a specific, unusual buyer situation and gives them the tools to evaluate, contact, and coordinate from abroad.

This is a **dedicated conversion surface**, not just a styled version of the homepage. Diaspora buyers have different anxieties (trust from distance, fraud fears, family-coordination questions) and different channel needs (IMO critical, WhatsApp/Telegram restricted in Russia) than local buyers. The landing page addresses these directly.

Follows Blueprint §16 exactly.

## 11.2 Route and entry points

**Route:** `/diaspora`

**Entry points:**
- Homepage (Page 1) Block H "Diaspora entry strip" — subtle but visible
- Direct URL share (WhatsApp/Telegram groups for Tajik migrants in Russia)
- Targeted ads (Meta/VK/Instagram) specifically for Tajik audiences in Russian cities
- Search engines (Google/Yandex) for queries like "купить квартиру в Душанбе из Москвы"
- Referrals from Tajik cultural organizations or community groups in Russia

**No forced redirect.** A buyer whose IP suggests Russia is never auto-redirected from the homepage to `/diaspora` — that would be presumptuous and wrong about many users. The diaspora strip on the homepage surfaces the page, and the buyer self-selects.

## 11.3 Design principles driving this page

Six principles shape this page, most of them addressing diaspora-specific realities:

1. **Acknowledge the distance, don't hide it.** 2026 diaspora property research is unanimous: the buyer's #1 concern is trust across distance. The page opens by naming this situation — "Купите квартиру в Душанбе, находясь в России" — instead of pretending the buyer is local. Respecting the buyer's context is itself a trust signal.
2. **IMO is first-class, not an afterthought.** Russia has restricted WhatsApp and Telegram voice/video calls since August 2025 (from deep research report). IMO works reliably on Russian networks and is the dominant messenger for the 35-49 Tajik migrant demographic. It gets equal button treatment on this page.
3. **Family coordination is part of the product.** Blueprint §16.2: "the platform will help coordinate with family in Tajikistan." The diaspora buyer in Moscow typically has a relative in Dushanbe who will visit the apartment. This page explicitly offers to help coordinate — not as a bonus, but as a core offering.
4. **Trust tools are featured, not buried.** Construction photos (signature feature) and verified listings directly address the "I can't walk the site" concern. 2026 research: high-def photos + drone updates made "blind buying" workable. We lead with these capabilities.
5. **Language / currency / timezone awareness.** Russian UI default (highest-reach language for Tajik migrants in Russia), but Tajik toggle visible. Prices shown in TJS always (not converted), because the apartment exists in Tajik pricing context — but the page acknowledges the buyer will likely need to transfer funds internationally.
6. **No testimonials until real — Blueprint §16.3 Block E firm rule.** The page is hidden-block-until-we-have-real-quotes, not a block filled with stock fake testimonials. Fake testimonials are the single most common trust-destroying pattern in diaspora-targeted real-estate, and the deep research report explicitly flags this.

## 11.4 Mobile block order (375px viewport, top to bottom)

### Block A — Hero

Per Blueprint §16.3 Block A.

Above the fold:
- **Language toggle** at top-right in compact form (RU / TG) — persistent with the rest of the platform
- **Headline** — `text-h1` (24px) semibold stone-900, two lines acceptable:
  *"Купите квартиру в Душанбе, находясь в России"*
- **Supporting line** — `text-body` stone-700, one line:
  *"Проверенные проекты, фото стройки, связь через WhatsApp, Telegram или IMO"*
- **Two CTAs** stacked on mobile (Blueprint §16.3 Block A):
  - **`AppButton primary lg`** "Смотреть проекты" → opens Projects browsing (Page 3)
  - **`AppButton secondary lg`** with WhatsApp green icon "Связаться в WhatsApp" → opens pre-composed WhatsApp chat with the platform's diaspora-support number

**Pre-composed WhatsApp message for diaspora hero CTA** (2026 best practice, UI Spec decision aligned with Blueprint §16.2): "Здравствуйте, я нахожусь в России и рассматриваю покупку квартиры в Душанбе. Можно узнать подробнее?"

**What's NOT in the hero:**
- No giant marketing image or video background (slows load, distracts)
- No scrolling carousel
- No forced email capture
- No fake testimonial quote above the fold

### Block B — How it works for diaspora buyers

Per Blueprint §16.3 Block B. A clear 4-step explanation — this is the page's core reassurance mechanism.

Four cards stacked vertically on mobile:

1. **Выберите проект с проверкой и фото стройки**
   - One-line supporting text: "Новые фото со стройки каждый месяц — вы видите реальный прогресс"
   - Small thumbnail: an example construction-progress photo with a recent date caption
2. **Свяжитесь через WhatsApp, Telegram или IMO**
   - One-line supporting text: "IMO работает надёжно в России — Telegram и WhatsApp ограничены по звонкам"
   - Small three-icon row: WhatsApp, Telegram, IMO logos
3. **Мы поможем назначить визит для вашей семьи в Душанбе**
   - One-line supporting text: "Ваш родственник может посетить объект и подтвердить всё, что важно для вас"
   - No thumbnail — text only
4. **Помощь с документами и переводом средств**
   - One-line supporting text: "Команда платформы объяснит процесс и поможет с организацией"
   - No thumbnail

Each card is `AppCard` with `space-4` internal padding. Numbered markers (1-4) on the left in terracotta-600 circles.

### Block C — Featured projects for remote buyers

Per Blueprint §16.3 Block C.

- Section title: `text-h2` "Проекты, подходящие для удалённой покупки"
- Sub-line in `text-meta` stone-500: "Все проверены командой и имеют регулярные фото стройки"
- 3-5 `BuildingCard`s (Layer 7.8) horizontally scrollable on mobile
- Curated server-side to include: fully verified buildings, buildings with recent construction photos, buildings with clear installment terms

**Filter criteria (UI Spec interpretation of Blueprint §16.3 Block C — "fully verified, complete payment plans, clear construction progress"):** Featured for diaspora means buildings where all three of the following are true:
- `verification_tier >= tier_2` AND `developer_verified = true` (satisfies "fully verified")
- `last_construction_photo_date` within the last 60 days (satisfies "clear construction progress" — 60-day threshold is UI Spec decision, tunable during build)
- Building has published installment terms (satisfies "complete payment plans")

This ensures every featured project genuinely meets the "remote buyer deserves extra trust" bar. Specific thresholds (tier_2, 60 days) are UI Spec implementation decisions — Blueprint requires the outcome, not these specific values.

### Block D — Contact strip

Per Blueprint §16.3 Block D — the page's dedicated contact block.

A prominent section (not a sticky bar — this is a landing page, not a detail page):
- Section title: `text-h2` "Задайте вопрос на удобном вам мессенджере"
- Sub-line: `text-meta` stone-500: "Обычно отвечаем в течение часа"
- Three equal buttons in a row (stacked vertically on mobile):
  - **WhatsApp** `AppButton secondary lg` with WhatsApp green icon
  - **Telegram** `AppButton secondary lg` with Telegram blue icon
  - **IMO** `AppButton secondary lg` with IMO purple icon

Each button opens the respective messenger with a pre-composed message (same template as Block A WhatsApp CTA). WhatsApp and Telegram use their documented public URL schemes (`wa.me/...` and `t.me/...`). **IMO integration is a pending technical decision** (see §11.11 Technical notes) — V1 approach may be to show the platform's IMO number with a clear instruction ("Откройте IMO и найдите этот номер"), which is still a meaningful diaspora feature even without a one-tap deep link.

**IMO is not an afterthought here** — per Blueprint §16.3 Block D: "IMO is essential for diaspora users on older Android phones in Russia. It must be visible here even if it's less prominent elsewhere on the platform."

### Block E — Testimonials (conditional)

Per Blueprint §16.3 Block E — **only shown when we have real quotes from real diaspora buyers**. Until then, block is entirely absent. Blueprint is explicit: *"Short quotes from real diaspora buyers once the platform has them. Until then, this block is hidden rather than faked."*

When rendered: 3 short testimonial cards (quote + first name + city in Russia + date of purchase). No photos — this protects buyers' privacy without sacrificing credibility. Small verification note: "Подтверждённый покупатель" badge next to each.

### Block F — FAQ for diaspora buyers

UI Spec addition (not in Blueprint) — but strongly supported by 2026 research showing FAQ sections are conversion multipliers for diaspora landing pages. Listed as an **optional V1 enhancement to lock during build**.

Content if built:
- "Можно ли купить квартиру, не приезжая в Таджикистан?" (legal context + platform's role)
- "Как перевести деньги в Таджикистан из России?" (practical guidance, no specific financial recommendations)
- "Как подтвердить, что проект реально строится?" (refer to construction photos + verification tiers)
- "Кто поможет моей семье осмотреть квартиру?" (platform coordination offer)
- "Что если я не говорю по-таджикски?" (Russian-language support confirmed)

Each question as an `AppCard` with expand-on-tap. UI Spec decision — Blueprint doesn't include FAQ; this is a revisable addition based on 2026 diaspora landing-page patterns.

### Block G — Footer

Same minimal footer as the homepage (Page 1 Block I).

## 11.5 Desktop layout (≥1024px)

Per Blueprint §16.4 main actions; Blueprint §16.3 doesn't specify desktop layout, so this UI Spec follows the homepage (Page 1 §1.5) desktop pattern:

- Block A hero: headline scales to `text-display` (40px), two CTAs render as a row side-by-side
- Block B: 4 cards in a 2×2 grid instead of vertical stack
- Block C: grid of 3-5 buildings in a row (not horizontal scroll)
- Block D: three messenger buttons in a row, fully wide at 1200px container
- Block E (when present): 3 testimonial cards in a row
- Block F (if implemented): 2-column accordion layout

## 11.6 Platform components used

| Block | Platform components |
|---|---|
| A — Hero | None (primitives only) |
| B — How it works | None (primitives + AppCard) |
| C — Featured projects | **`BuildingCard`** (Layer 7.8) |
| D — Contact strip | None (custom contact button row, styled per Blueprint §16.3) |
| E — Testimonials | None (primitives only) |
| F — FAQ (optional) | `AppCard` with expand behavior |
| G — Footer | None |

## 11.7 Primitive components used

`AppButton` (primary, secondary, ghost), `AppCard`, `AppModal` (FAQ expand if inline), `AppChip` (language toggle)

## 11.8 Empty and edge states

### No buildings currently qualify for featured-diaspora criteria (platform-launch-period edge case)
- Block C (Featured projects) is **absent** rather than showing a "coming soon" placeholder
- Block B (How it works) still renders — explains the platform's offering even without featured inventory
- Block D (Contact strip) still renders — the buyer can ask questions even without featured projects

### IMO deep link fails to open
- Fall back to showing the platform's contact number with a small instruction: *"Откройте IMO и напишите на номер [phone] — обычно отвечаем в течение часа."*
- No error — just a clear alternative

### Slow connection in Russia
- Hero content renders first (HTML + critical CSS)
- Block C building cards lazy-load (images lazy-loaded, card structure renders immediately)
- Map-related features not on this page (no MapLibre instance) — so no map-slow-load anxiety

### User switches to Tajik (TG) language
- All Russian content on this page has a Tajik translation per the platform's i18n system (next-intl, per Tech Spec)
- Page layout doesn't break — Tajik words tend to be slightly longer than Russian in some contexts, layout flexes
- Currency still TJS — not converted to RUB

### User arrives via VK ad in Russia and the click source is flagged
- Analytics tagging: source=vk_ads, campaign=<id> attaches to the session
- No difference in rendering — the landing page looks identical regardless of ad source
- On subsequent contact, the source is attached to the lead record (useful for campaign attribution)

## 11.9 What must NOT appear on this page

Per Blueprint §16 and PRD §19, plus diaspora-specific anti-patterns from 2026 research:

1. **No fake testimonials.** Block E hidden entirely until real quotes exist. Blueprint §16.3 firm rule.
2. **No "limited-time offer!" urgency targeting diaspora buyers** — particularly pernicious because diaspora buyers are high-emotion, far-from-verification prospects.
3. **No "Invest now while the ruble is strong!"** or similar currency-timing manipulation.
4. **No stock photos of smiling families labeled as "real buyers".**
5. **No "Exclusive to diaspora!"** pricing or artificial segmentation that doesn't match actual platform behavior. The same listings on Page 3/6 render here; we don't fake a different inventory for diaspora.
6. **No automatic geo-redirect** from the main domain to `/diaspora` based on IP. This presumes the buyer's situation incorrectly many times.
7. **No fake "diaspora ambassador" agents** when no such role exists on our team.
8. **No email-required forms before showing content.** The page is freely browsable.
9. **No promises the platform can't keep** — "We guarantee safe transactions!" when V1 has no escrow or transaction-level guarantee. Blueprint §16 carefully promises coordination and verification, not guarantees.
10. **No "% годовых" or interest-rate advertising** for foreign-currency loans or diaspora mortgages. V1 does not deal in loan products.
11. **No FaceTime/Zoom video tour scheduling in V1.** While 2026 research highlights video tours as important, Blueprint §16 doesn't commit to this for V1 — it commits to photo-based evaluation + family coordination. Adding a video-tour commitment creates a feature we can't deliver yet.
12. **No autoplay video or loud hero animation** (same as homepage principles).

## 11.10 Acceptance criteria

The Diaspora landing page is done when:

1. On 375px mobile, hero (Block A) — headline + supporting line + both CTAs — is visible above the fold
2. Three messenger contact buttons (Block D) are equally prominent: WhatsApp, Telegram, IMO
3. IMO button is visible and functional (opens IMO deep link or falls back to contact number + instruction)
4. Featured buildings (Block C) are filtered by diaspora-appropriate criteria (verified + recent photos + installment terms)
5. Block E (Testimonials) is absent if no real testimonials exist — no placeholders, no fake quotes
6. Russian is the default language; Tajik toggle is visible and preserves state across the platform
7. WhatsApp CTA in Block A opens with a pre-composed message establishing remote-buyer context
8. Language switching doesn't break layout on either RU or TG
9. No forced geo-redirect from `/` to `/diaspora` based on IP
10. No email-capture or forced-registration before the user can explore the page
11. No pattern from §11.9 appears
12. The page works on slow connections typical of Russian networks (progressive loading, no hero video)
13. Desktop layout preserves the same block order, with 2×2 grid for Block B and row layout for Block C
14. Lighthouse mobile performance ≥ 90, accessibility = 100

## 11.11 Technical notes for Codex

- Server endpoint for featured projects: `GET /api/buildings?feature=diaspora&limit=5` — applies the filter criteria from §11.4 Block C server-side
- Messenger deep-link templates:
  - WhatsApp: `https://wa.me/<platform_phone>?text=<encoded_message>` (publicly documented by WhatsApp)
  - Telegram: `https://t.me/<platform_username>?text=<encoded_message>` (publicly documented by Telegram; requires a platform Telegram bot/channel username)
  - **IMO: no publicly documented URL scheme for opening a specific chat.** This is a real implementation concern. Options to investigate during build: (a) show the platform's IMO number with "Откройте IMO и найдите этот номер" instructions, (b) check if IMO's Android app registers an intent filter that responds to `tel:` or `sms:` URIs, (c) contact IMO directly for a business-deep-link option if one exists. **Pending technical decision: IMO integration approach is not in Tech Spec and needs investigation before launch.** If no reliable deep link exists, the IMO button simply shows the platform's contact number with a clear instruction — this is still a valuable diaspora feature (tells the user that IMO is a supported channel), just with one extra manual step.
- Pre-composed WhatsApp/Telegram/IMO message template: include source tag (e.g., `?src=diaspora_landing`) for analytics attribution
- Source tagging: every contact click from this page attaches `source=diaspora_landing` to the lead record server-side
- Language persistence: `next-intl` locale cookie carries language preference across the platform (Tech Spec locked)
- Featured buildings list: can be cached for 1 hour server-side (not real-time critical)

## 11.12 Cross-page consistency notes

Diaspora landing page uses the same components as the rest of the platform — no bespoke "diaspora-themed" variants:
- Same `BuildingCard`, `VerificationBadge`, `ProgressPhotoCarousel` (when relevant)
- Same color system, typography, spacing
- Same language toggle, same footer

What makes this page diaspora-specific is the **content and messaging**, not the visual language. The visual language stays consistent with the rest of the platform because the diaspora buyer, after clicking through to Page 3 or Page 5 from here, should feel they're on the same trustworthy platform — not a different micro-site.

This consistency is itself a trust signal: diaspora buyers have been burned by fly-by-night "exclusive diaspora portals" that feel like separate micro-products. Our platform shows the same real inventory, on the same real platform, with the same real trust tools. The diaspora page just makes the relevant capabilities easier to find.

---

# Page 12 — Post listing flow (seller)

## 12.1 What this flow is for

Let anyone post a legitimate listing in **under three minutes**, with **zero documents required**, and with the flow **resilient to interruption**. This is the supply-side entry point — where buyers become visible to sellers, and where the platform's three-source inventory (developer / owner / intermediary) gets built.

Follows Blueprint §17 exactly. The guiding principle is locked: **post first, verify later** (Blueprint §17.2). A verified phone number is the only barrier to posting. Verification badges are earned after the fact, not gated before.

## 12.2 Route and entry points

**Base route:** `/post`
**Step routes:** `/post/phone`, `/post/ownership`, `/post/building`, `/post/details`, `/post/photos`, `/post/review`, `/post/published`, `/post/verify` — each step is a distinct URL so refreshing doesn't break the flow

**Draft recovery route:** `/post/resume?draft_id=<id>` — returns to an existing draft

**Entry points:**
- "Разместить объявление" in global nav (desktop top bar / mobile hamburger)
- Homepage (Page 1) Block B — one of the "Продаёте?" links (if added later) or Homepage Block F footer
- Building detail page (Page 5) Block I empty resale state: "Разместите объявление →" (with building pre-selected)
- Seller dashboard (Page 13) "Опубликовать новое объявление" primary action
- Direct URL share (e.g., developer onboarding link)

## 12.3 Design principles driving this flow

Seven principles shape this flow:

1. **Post first, verify later — Blueprint §17.2.** This is the single most strategically important principle in this page. If the flow requires documents, ownership proof, or cadastral numbers upfront, supply dies. Platforms like Somon.tj win because posting is frictionless. We match that friction level for posting, and add verification *after* as an optional upsell.
2. **Three-source honest question — Blueprint §17.3 Step 2.** "Кому принадлежит эта квартира?" with three options (Мне / Другому человеку / Застройщик). The wording makes the honest answer obvious and destigmatizes each source. This is the platform's source-transparency wedge in action — at the moment it matters most.
3. **Mobile-first, mobile-first, mobile-first.** 2026 research: most sellers in our market will post from their phone. Camera capture must be one-tap. Photo upload must handle mobile photo sizes (10+ MB originals) via client-side compression. Phone verification must use SMS OTP (not email).
4. **Auto-save every step — Blueprint §17.4.** "Every step auto-saves to a draft." Mobile sessions get interrupted (calls, app switches, lost signal). A flow that loses progress on interruption kills supply. Draft is written on each step completion, not just on full submit.
5. **5-field Unit Details — Blueprint §17.3 Step 4.** Rooms / Size / Floor / Price / Finishing are required. Availability status required. Installment optional. Description optional. Beyond these is scope creep — the platform can collect more over time via the seller dashboard.
6. **Photos are mandatory but tolerant.** Blueprint §17.3 Step 5: 5-15 photos, direct camera capture, real photos only. Individual photo failure doesn't block the flow (Blueprint §17.4) — a retry icon appears on failed photos, others proceed.
7. **Verification upsell immediately after publish — Blueprint §17.3 Step 7.** The listing is already live. The upsell screen explains how to earn higher tier badges. Skipping is a first-class option, not an escape hatch.

## 12.4 Step-by-step flow (mobile layout primary)

Each step uses a **shared mobile template**:

- **Progress bar** at the top: thin 2px terracotta-600 fill on stone-200 track. Label to the right in `text-caption` stone-500: "Шаг 2 из 6"
- **Back + Save draft buttons** row under progress: Back chevron left, "Сохранить как черновик" ghost right
- **Step headline** in `text-h1` semibold, centered
- **Optional helper text** in `text-meta` stone-500, max 2 lines
- **Step content area** — varies per step
- **Primary CTA** at bottom: `AppButton primary lg` full-width. Label changes per step.

### Step 1 — Phone verification

**Route:** `/post/phone` (skipped if user is already logged in)

**Headline:** "Подтвердите номер телефона"
**Helper text:** "Мы отправим SMS с кодом — это единственное требование для публикации"

**Content:**
- Phone input with +992 prefix (Tajik-specific mask)
- "Отправить код" primary button
- After submission: reveals OTP input (4 or 6 digits, single input with auto-advance)
- "Не получили код?" ghost link appears after 30 seconds — enables resend

**On success:** auto-advance to Step 2. User is now logged in (session created).

**Failure recovery (Blueprint §17.4):**
- After 3 failed attempts on OTP: offer "Позвонить мне с кодом" fallback (voice call OTP — Tech Spec decision)
- After 5 failed attempts: show platform contact info for manual help (WhatsApp to platform support)

### Step 2 — Who does this apartment belong to? (Three-source honest question)

**Route:** `/post/ownership`

**Headline:** "Кому принадлежит эта квартира?"
**Helper text:** "Выберите честный вариант — для каждого из них у нас есть свой значок"

**Content:** Three large tappable `AppCard`s, stacked vertically, single-select:

1. **👤 Мне или моей семье** — labeled **Собственник** (green SourceChip preview inside the card)
   - Secondary line: `text-meta` stone-500 "Вы продаёте напрямую"
2. **🤝 Другому человеку — продаю от их имени** — labeled **Посредник** (gold SourceChip preview)
   - Secondary line: `text-meta` stone-500 "Вы помогаете владельцу продать"
3. **🏗 Я представляю застройщика** — labeled **От застройщика** (indigo SourceChip preview)
   - Secondary line: `text-meta` stone-500 "Вы официальный представитель ЖК"
   - **Flag note** under this option: `text-caption` stone-600: "Потребуется подтверждение застройщика перед первой публикацией"

**Source chip preview inside each card:** renders the actual `SourceChip` (Layer 7.2) that will appear on the listing, so the seller sees what they're choosing. This is honesty made visual.

**On select + Continue:**
- If owner or intermediary: advance to Step 3
- If developer: backend flags this account for one-time developer confirmation; advance continues, but the listing stays hidden until confirmation completes (Blueprint §17.3 Step 2). A banner in the dashboard informs the seller.

### Step 3 — Select the building

**Route:** `/post/building`

**Headline:** "В каком доме квартира?"
**Helper text:** "Начните вводить название ЖК или адрес"

**Content:**
- Autocomplete `AppInput` — searches existing buildings in the database by name, developer, or address
- Results render as tappable rows below the input: building name + district + small thumbnail
- "Не нашли ваш дом?" ghost link below the search: opens a modal for building-addition request

**Building-addition request modal (Blueprint §17.4):**
- Headline: "Добавить новый ЖК"
- Fields: building name, district, approximate address, developer name (optional), any photo or brochure (optional)
- Submit: creates a building-request record. The seller's listing stays in draft until the platform team verifies and adds the building (usually within 48 hours per Blueprint).
- Confirmation: "Мы добавим этот ЖК в течение 48 часов и уведомим вас. Ваш черновик сохранён."

### Step 4 — Unit details

**Route:** `/post/details`

**Headline:** "Расскажите о квартире"
**Helper text:** "Эти данные нужны для поиска покупателей"

**Content:** short form with these fields, mobile-friendly layout:

**Required fields:**
- **Комнаты** — `AppChipGroup` single-select: "1, 2, 3, 4, 5+"
- **Размер (м²)** — `AppInput` type="number", mask for digit-only input
- **Этаж** — `AppInput` type="number"
- **Цена (TJS)** — `AppInput` with TJS suffix, digit-only, thousands-separator formatting on blur
- **Тип отделки** — `AppChipGroup` single-select using four finishing chips from Layer 2.6: без ремонта / предчистовая / с ремонтом / отремонтировано владельцем
- **Статус** — `AppChipGroup` single-select: "Доступна / Забронирована / Продана"

**Optional fields (revealed via "Дополнительные данные" expandable section):**
- **Рассрочка доступна** — `AppCheckbox`. When checked, reveals sub-fields: down payment %, duration (months/years), monthly amount (auto-calculated from price + down-payment + duration). All numeric, tabular formatting.
- **Описание** — `AppTextarea`, max 800 characters with live character counter. Placeholder: "Дополнительные подробности о квартире (необязательно)"

**Validation:**
- Real-time: numeric fields validate format as user types
- On "Далее": required fields must be filled; missing ones highlighted with inline error
- **Price sanity check (UI Spec decision, not in Blueprint):** if price-per-m² is an order of magnitude outside the district average (threshold tunable — e.g., 5-10× higher or lower), show a gentle warning: "Цена необычно высокая/низкая для этого района. Уверены?" — user can proceed anyway (no block). This catches typo errors (e.g., extra zero) without blocking legitimate outliers.

### Step 5 — Photos

**Route:** `/post/photos`

**Headline:** "Добавьте фотографии"
**Helper text:** "Минимум 5, максимум 15. Только реальные фото — никаких рендеров (если вы не застройщик)"

**Content:**
- **Photo grid** — empty grid of 15 slots, each ~100×100px on mobile with rounded corners
- Each empty slot has a `+` icon and a hint "Добавить"
- Tap empty slot: opens native mobile file picker with **camera-capture option** prioritized (HTML `<input type="file" accept="image/*" capture="environment">`)
- Each filled slot shows the photo thumbnail with:
  - Small X icon top-right to remove
  - Drag handle for reordering (or long-press on mobile per 2026 pattern)
  - Upload progress bar at bottom while uploading
  - Small retry icon if upload failed (Blueprint §17.4)
- **First photo is marked as cover** with a small "Обложка" label — this is the image that appears as the main hero on Listing detail (Page 7)

**Upload behavior:**
- Photos upload **as user adds them**, not all at submit. Each photo starts uploading immediately in parallel.
- Mobile photos get client-side compression: resize to max 1920px longest side, JPEG quality 85. Originals can be 10+ MB; compressed sizes ~500KB-1MB. This makes upload feasible on slow Russian/Tajik mobile networks.
- HEIC photos (iPhone default) converted client-side to JPEG via `heic2any` library (Tech Spec locked)
- Individual photo failure: retry icon appears on that photo; other photos upload normally; user can proceed with Step 5 even if 1-2 photos failed (minimum 5 required)

**Cover photo guidance (UI Spec, 2026 research-aligned):**
- On first upload, show a one-time tooltip: "Лучше всего поставить обложкой фото экстерьера или гостиной — это увеличит интерес"
- This is a gentle nudge, not enforced

**Continue disabled until:**
- At least 5 photos successfully uploaded
- All in-progress uploads complete (no photos stuck mid-upload)

### Step 6 — Review and publish

**Route:** `/post/review`

**Headline:** "Проверьте и опубликуйте"
**Helper text:** "Так ваше объявление будет выглядеть для покупателей"

**Content:** A **live preview** of the `ListingCard` (full variant, Layer 7.7) as it will appear in search results. Uses all the data the seller entered.

Below the preview card:
- Compact summary of entered data in a key-value table
- Each row has a small "Изменить" link that jumps back to the relevant step (phone can't be changed here — separate account action)
- Checkbox: *"Я подтверждаю, что информация достоверна"* — required to enable Publish button
- **`AppButton primary lg`** "Опубликовать" (disabled until checkbox ticked)

### Step 7 — Verification upsell (post-publish)

**Route:** `/post/published`

Shows **immediately after publish succeeds**. The listing is already live — this screen is about earning higher-tier trust badges.

**Headline:** "Объявление опубликовано! 🎉"
(Small visual celebration — a single check icon in fairness-great green. No confetti, no full-screen animation per Principle 2 calm.)

**Sub-line:** "Оно уже видно покупателям. Хотите повысить доверие?"

**Content:** Two optional upgrade paths as tappable cards:

1. **Tier 2 — Blue badge** (`VerificationBadge` tier-2 preview inside the card)
   - "Загрузите селфи с документом — займёт 2 минуты"
   - One-line explanation: "Покупатели увидят, что вы проверенный пользователь"
   - `AppButton secondary md` "Начать" → goes to Verification flow (Page 14, Tier 2 path)
2. **Tier 3 — Green badge** (`VerificationBadge` tier-3 preview)
   - "Запросите визит команды платформы — бесплатно"
   - One-line explanation: "Самый высокий уровень доверия — мы посещаем объект лично"
   - `AppButton secondary md` "Запросить" → goes to Verification flow (Page 14, Tier 3 path)

**Bottom actions:**
- `AppButton ghost md` "Пропустить — перейти к объявлению" → links to the new listing's detail page (Page 7)
- `AppButton ghost md` "В мои объявления" → links to Seller dashboard (Page 13)

## 12.5 Desktop layout (≥1024px)

- Max container width 640px centered (similar to Guided finder Page 2 — this is a focused task, not a browsing page)
- Progress bar sticky at the top of the container, not viewport
- Each step's content renders wider but the structure is the same
- Photo grid expands to 5 columns × 3 rows on desktop (still 15 max)
- Review screen (Step 6) may use 2-column layout: preview card left, summary table right

No extra content added just because screen is wider — per Principle 1, no heaviness.

## 12.6 Draft recovery

Per Blueprint §17.4 — **every step auto-saves**. If the seller closes the browser, loses connection, or comes back later, they resume exactly where they left off.

**Mechanism:**
- Backend: each step's data is persisted to the `listings` table with `status = 'draft'` per Data Model §3.8 (draft is a `listing_status` enum value — drafts are stored in the same table as published listings, distinguished by status). Saved on step completion, not on every keystroke.
- Frontend: on flow resume, the URL `/post/resume?draft_id=<listing_id>` loads the draft and jumps to the last-completed step + 1.
- Dashboard banner: when returning to the platform, the Seller dashboard (Page 13) shows a banner: *"У вас есть незавершённое объявление. Продолжить?"* with `AppButton primary sm` "Продолжить" and `AppButton ghost sm` "Удалить черновик"

**Draft auto-expiry:**
- **UI Spec decision (not in Blueprint):** drafts older than 30 days are deleted on a nightly cron. This prevents database bloat from abandoned drafts. 30 days is tunable during build.

**Photo handling in drafts:**
- Uploaded photos persist (in Supabase Storage) tied to the draft
- If the draft is deleted or expires, orphaned photos are cleaned up

## 12.7 Platform components used

| Step | Platform components |
|---|---|
| 1 — Phone | None (primitives) |
| 2 — Ownership | **`SourceChip`** (Layer 7.2) as preview inside each ownership card |
| 3 — Building | None (primitives) |
| 4 — Unit details | `AppChipGroup` with `finishing` variant (Layer 2.6 colors) |
| 5 — Photos | None (primitives + custom photo-grid component) |
| 6 — Review | **`ListingCard`** full variant (Layer 7.7) as live preview |
| 7 — Verification upsell | **`VerificationBadge`** (Layer 7.3) tier-2 and tier-3 previews |

## 12.8 Primitive components used

`AppButton`, `AppInput` (text, number, phone mask), `AppChip` + `AppChipGroup` (single-select), `AppCheckbox`, `AppTextarea`, `AppCard` (ownership cards, verification upsell cards), `AppModal` (building-addition request)

## 12.9 Empty and edge states

### No buildings in the database (platform launch day)
- Step 3 autocomplete returns no results for any search
- The "Не нашли ваш дом?" link becomes the primary path — building-addition request is the only option
- This is acceptable during launch; the platform team handles building onboarding

### Seller tries to post a 16th photo
- Toast: "Максимум 15 фотографий. Удалите одну, чтобы добавить новую."
- No silent drop of existing photos

### Seller tries to proceed with fewer than 5 photos
- Continue button disabled
- Helper text below the photo grid: "Ещё [N] фото — минимум 5 для публикации"

### Photo upload fails (network, server error)
- Per Blueprint §17.4: individual photo failure doesn't block flow
- Failed photo shows with a red-tinted overlay (but using stone-700, not red, per our halal-by-design) and a retry icon
- Retry tap: re-uploads that photo
- If all photos fail, error banner at top with "Повторить все"

### Seller tries to submit with invalid price (e.g., 0 or negative)
- Inline validation error on Step 4: "Цена должна быть больше нуля"

### Developer seller tries to publish before one-time developer confirmation
- Listing is saved but stays in `hidden` status per Data Model
- Seller sees on their dashboard: "Ожидаем подтверждения от застройщика. Обычно занимает до 48 часов."
- Once confirmed by platform, listing becomes active and seller gets a notification (in-app or SMS — per Data Model notifications table)

### Network error during step submission
- Retry inline with banner
- Form data preserved (draft is auto-saved on step completion)

### User abandons mid-flow
- All data up to the last completed step persists as a draft
- Dashboard banner prompts resume on next visit

## 12.10 What must NOT appear in this flow

Per Blueprint §17.5 (what the seller does not have to provide) and platform principles:

1. **No document upload requirement at posting.** Blueprint §17.5 firm.
2. **No power of attorney field.**
3. **No cadastral number field.**
4. **No signed paper requirement.**
5. **No ID upload at Step 1.** (ID is optional for Tier 2, separate flow on Page 14.)
6. **No forced registration beyond phone OTP.** Phone is the only identity requirement.
7. **No email field anywhere in the flow.** Consistent with Contact flow (Page 10 §10.11). V1 is phone-first.
8. **No payment required to post.** Listings are free to publish in V1.
9. **No "% годовых" anywhere** — installment fields use monthly amount only.
10. **No photo watermarking service** — keep it simple. Sellers' photos are their photos.
11. **No "boost your listing for higher ranking" upsell.** Trust-weighted ranking (Blueprint §11.7) is the only ranking — no pay-for-placement in V1.
12. **No AI-generated description assistance at posting.** Keep the flow simple. Description is free text from the seller. Adding AI at Step 4 creates a feature to maintain for marginal benefit.
13. **No social-media auto-share prompts after publish.** Not in V1 scope, adds noise to the Step 7 screen.
14. **No coupon / referral code field.** Not in V1 scope.
15. **No "are you sure?" double-confirmation on Publish.** The checkbox on Step 6 is the single confirmation — adding another modal adds friction without benefit.

## 12.11 Acceptance criteria

The Post listing flow is done when:

1. A seller can go from "/post" to "listing live" in under 3 minutes given 5 pre-selected photos (Blueprint §17.1)
2. Phone verification via SMS OTP is the only identity requirement to publish (no documents, no ID)
3. Step 2 three-source question has exactly three options with honest labels (Мне/моей семье, Другому человеку, Застройщик) and shows the SourceChip preview for each
4. Step 4 required fields are enforced: rooms, size, floor, price, finishing, availability status — no more, no less
5. Step 5 mobile photo capture uses native camera (accept="image/*" capture="environment")
6. Photos upload in parallel with client-side HEIC→JPEG conversion and compression to ≤1920px longest side
7. Minimum 5 photos enforced; maximum 15 enforced with friendly toast
8. Individual photo failure doesn't block flow — retry icon per photo, others proceed
9. Every completed step auto-saves to a draft; closing browser mid-flow preserves progress
10. Dashboard (Page 13) shows a resume banner when an incomplete draft exists
11. Step 6 review screen shows a live `ListingCard` preview exactly as it will appear in search results
12. Step 7 verification upsell appears AFTER publish — listing is already live
13. Step 7 skip option is a first-class choice, not a hidden escape
14. Developer-source listings stay hidden until one-time developer confirmation completes
15. Drafts older than 30 days auto-expire
16. No pattern from §12.10 appears
17. OTP fallback paths (voice call after 3 failures, contact support after 5) both work

## 12.12 Technical notes for Codex

- Server endpoints:
  - `POST /api/auth/otp/request` — SMS OTP (reuses Contact flow endpoint)
  - `POST /api/auth/otp/verify`
  - `POST /api/listings` — create a new listing draft (returns listing_id with status='draft')
  - `PATCH /api/listings/[id]` — update draft per step
  - `POST /api/listings/[id]/publish` — publish (sets status to 'active' or 'hidden' for dev-source pending confirmation)
  - `POST /api/building-requests` — new building addition request
  - `POST /api/media/upload` — photo upload (returns URL, thumbnail, compressed version)
- Drafts live in the `listings` table with `status = 'draft'` per Data Model §3.8 — not a separate table
- Client-side photo processing:
  - Use `heic2any` for HEIC → JPEG conversion (Tech Spec locked)
  - Use browser-native Canvas API for resize + compression (no external library needed)
  - Parallel uploads via `Promise.allSettled` so one failure doesn't block others
- URL-based step routing: each step is a distinct route so refresh + deep link work; Next.js App Router segment per step
- Developer-source confirmation in V1 follows Data Model §5.5 notes: the founder manually onboards each developer; `source_type = 'developer'` listings are linked via `building_id → buildings.developer_id`, and the `seller_user_id` is a staff user (or designated representative) who posts on behalf of the developer. No additional `developer_seller_confirmed` boolean is needed in V1 — the manual onboarding *is* the confirmation mechanism. In Phase 2 when developer self-service is added, a `developer_users` join table will replace this pattern (per Data Model §5.5 forward-looking note).
- Pending technical decision: **voice-call OTP fallback service** — not in Tech Spec. Twilio supports voice OTP; Vonage does too. Lock provider during build. If neither is available in V1, fallback text becomes "Свяжитесь со службой поддержки" instead of "Позвонить мне с кодом".

## 12.13 Cross-page consistency notes

Post listing flow uses the same shared primitives as Guided finder (Page 2):
- Same shared step template (progress bar, back+skip row, headline, helper text, content, CTA)
- Same phone OTP flow as Contact flow (Page 10 §10.7) — reuses endpoints
- Live preview in Step 6 uses the same `ListingCard` that renders in Apartments browsing (Page 6) — seller sees exactly what buyers will see

This reuse is intentional: Codex should build shared step-template components once and apply them to both Guided finder and Post listing. This follows the design system's principle of composition over duplication (Design System Spec §7 "What Layer 7 does NOT decide" — full page layouts assembled from shared primitives).

Post listing is the platform's primary supply-acquisition flow. Every friction point here directly costs us inventory. The flow is deliberately stripped to the minimum required for legitimate listings while offering clear upgrade paths (verification tiers) after publish — converting the posting act into an ongoing trust-building relationship.

---

# Page 13 — Seller dashboard

## 13.1 What this page is for

Let sellers manage their listings and see basic performance without complexity. In V1, the platform is **not trying to be a CRM** for sellers — it's a simple list of their listings with the actions they need.

Follows Blueprint §18 exactly. Explicitly scoped: no advanced analytics, no lead pipeline, no team management, no CRM. Those belong to later phases.

## 13.2 Route and entry points

**Route:** `/kabinet` (per Tech Spec §3.3)

**Entry points:**
- Profile icon tap on top bar when logged in (desktop top nav / mobile hamburger)
- Global nav "Мои объявления" link for logged-in sellers
- Step 7 "В мои объявления" link from Post listing flow (Page 12)
- "Edit listing" action from any of the seller's own listings on public pages
- Direct URL bookmark

**Access control:** login required. If not logged in, redirect to login with `?redirect=/kabinet`.

## 13.3 Design principles driving this page

Four principles shape this page:

1. **Simple numbers, not vanity dashboards.** 2026 research explicitly warns against "dashboards that drown you in numbers without context." Blueprint §18.2 locks this as simple numeric counts (views, contacts). No charts, no trends, no percentage deltas in V1.
2. **Actions live on the listing row, not in a separate menu.** Each listing in the list exposes its own actions (edit, mark sold, hide, request verification, delete). The seller doesn't navigate away to manage a listing — the management is inline.
3. **Mobile-first — sellers manage from phones.** 2026 research is unanimous: real estate agents live on their phones. If a dashboard doesn't work seamlessly on mobile, it won't get used. Our sellers are even more mobile-first than agents (individual owners, not agencies).
4. **Notifications are a quiet side column, not the hero.** Blueprint §18.3 lists three notification types. They're helpful but shouldn't dominate the page. Listings are the hero.

## 13.4 Mobile layout (375px viewport, top to bottom)

### Block A — Top sticky bar
Standard pattern:
- Back button (left, 44×44)
- Page title (center): "Мои объявления"
- Menu icon (right) — opens bottom sheet with: Profile, Help, Sign out

### Block B — Summary stats strip

Per Blueprint §18.2. Above the list, a compact horizontal strip:

Three metric cards side-by-side on mobile (scrollable horizontally if needed, but sized to fit):

| Metric | Label | Format |
|---|---|---|
| Active listings count | "Активных" | large number in `text-h2`, tabular |
| Total views last 7 days | "Просмотров за 7 дней" | large number in `text-h2`, tabular |
| Total contacts last 7 days | "Запросов за 7 дней" | large number in `text-h2`, tabular |

Each card:
- `AppCard` with subtle `shadow-sm`
- Number on top, label below in `text-caption` stone-500
- No colored backgrounds, no trend arrows, no percentage deltas (Principle 1 — simple numbers)
- No "compared to last week" comparison (V1 scope — Blueprint is firm)

Empty-state variant: if seller has no listings ever, this strip is **absent** — replaced with a welcome CTA (see §13.8).

### Block C — Primary CTA: Post new listing

Per Blueprint §18.2.

- `AppButton primary lg` full-width on mobile: "**Опубликовать новое объявление**"
- Icon: `Plus` Lucide
- Tap → opens Post listing flow (Page 12)

This is the most prominent action on the page, per Blueprint §18.5.

### Block D — Draft resume banner (conditional)

Per Post listing flow §12.6 — shown when the seller has an unpublished draft.

Only renders if at least one listing with `status = 'draft'` exists for this user.

- `AppCard` with `stone-50` subtle background
- Title: "У вас есть незавершённое объявление"
- One-line preview of the draft (building name if selected, else "Черновик от [date]")
- Two buttons:
  - `AppButton primary sm` "Продолжить" → `/post/resume?draft_id=<id>`
  - `AppButton ghost sm` "Удалить черновик" (with confirmation modal)

If multiple drafts exist (rare but possible), show them stacked — max 3 visible with "Посмотреть все" link if >3.

### Block E — Seller notifications strip (conditional)

Per Blueprint §18.3. Only renders if there are unread notifications.

Compact horizontal scrolling row of notification cards, each `AppCard` with `stone-50` background:

- *"У вас новый запрос от покупателя по квартире [X]"* — tap opens that listing's request detail
- *"Ваше объявление [X] получило Tier 2 проверку"* — tap opens the listing
- *"Ваше объявление [X] не обновлялось 30 дней — оно ещё актуально?"* — tap expands a confirm/edit action inline

Each card shows the relative time ("2 часа назад") in `text-caption` stone-500.

**UI Spec decision (not in Blueprint):** notifications clear from this strip when the seller interacts with them (opens the linked item). After 7 days, unacknowledged notifications auto-expire. Full notification history (if ever needed later) would live on a separate page — not in V1 scope.

### Block F — Listings list

The main content of the page. Per Blueprint §18.2, each listing row shows:

- **Listing title and main photo** (thumb, ~80×80 on mobile)
- **Status badge** — renders one of seven states per Data Model §3.5 `listing_status` enum:
  - `active` (forest green), `reserved` (stone-600 "Забронирована"), `sold` (stone-600), `hidden` (stone-500), `expired` (stone-500 with specific recovery action), `suspended` (semantic-warning amber with platform-support info), `draft` (terracotta-100 background with terracotta-700 text — but drafts usually surface in the banner, not inline)
- **`VerificationBadge`** (Layer 7.3) for the listing's current tier
- **Metrics row**: "124 просмотра · 8 запросов" in `text-meta` stone-700, tabular
- **Actions row**: compact button group — see below

**Actions per listing (inline):**
- **Редактировать** (pencil icon) → opens Post listing flow (Page 12) pre-filled in edit mode
- **Отметить проданной** (check icon) → modal confirmation: "Отметить как проданную?" — on confirm, `listing_status → sold`, listing stays visible but displays as sold
- **Скрыть** / **Показать** (eye / eye-off icon) — toggles `listing_status` between `active` and `hidden`
- **Запросить проверку** (shield icon) — only shown if listing is not already at Tier 3. Opens Verification upgrade flow (Page 14)
- **Удалить** (trash icon, semantic-warning colored) → modal confirmation with stronger warning: "Удалить объявление? Это действие нельзя отменить."

On mobile: action buttons render as icon-only (labels in tooltips/aria-labels for accessibility). On desktop: icon + label.

**Listing ordering:** by default, most recently updated first (descending). UI Spec decision — Blueprint doesn't specify order, this matches 2026 dashboard conventions.

### Block G — Footer

Minimal footer same as other authenticated pages.

## 13.5 Desktop layout (≥1024px)

Per Blueprint §18 (no explicit desktop spec; UI Spec interprets):

- Main content column (max 1200px container)
- Block B (summary stats) renders as 3 cards in a row (same as mobile but with more breathing room)
- Block C (Post new listing CTA) prominent at top-right of the list section (not full-width)
- Block D and E (draft banner / notifications) stay as horizontal strips
- Block F (listings list) renders with more info per row — larger thumbs, action buttons with labels, more metrics visible inline
- Optional side column (~25% width) showing an extra notification panel if notifications exceed 3 — cleaner than horizontal scroll on desktop

## 13.6 Edit listing behavior

Tapping "Редактировать" on any listing opens the **Post listing flow (Page 12) in edit mode**. This is the same flow, just pre-filled with the existing listing's data.

**Differences in edit mode (UI Spec decisions — Blueprint doesn't specify edit-flow behavior):**
- Step 1 (Phone verification) is skipped (user already authenticated)
- Step 2 (Ownership) is skipped — source can't be changed post-publication, because changing source would confuse the buyer's trust signals. If a seller's role has genuinely changed, they delete and re-post. This preserves our source-transparency wedge.
- Step 3 (Building selection) is skipped — building can't be changed, that makes it a different listing entirely
- Steps 4-6 render with existing values pre-filled; seller edits what they want
- Step 7 (Verification upsell) is skipped in edit mode (they can request verification from the listing row action instead)

These constraints can be revised during build, but the source-lock rule should stay — changing source post-publish is a trust-integrity concern, not just a UX constraint.

**Save behavior in edit mode:**
- "Сохранить изменения" on the Review screen (Step 6) instead of "Опубликовать"
- Changes apply immediately on save — no re-review period
- If critical fields changed (price, status, availability), the listing triggers a `change_event` (per Data Model §3.9) so buyers with this listing saved see the change on their Saved page (Page 9)

## 13.7 Edge cases

Per Blueprint §18.4.

### Listing expires (no response from seller for 60 days)
Per Blueprint §18.4. Auto-set to `status = expired` (Data Model §3.5 distinct enum value) with a message in the seller's dashboard:
- Listing row shows `status = expired` with a specific reason subtitle: *"Это объявление скрыто из-за неактивности. Подтвердите актуальность, чтобы вернуть его в поиск."*
- Specific action button appears on this listing: `AppButton primary sm` "Подтвердить актуальность" — on tap, `listing_status → active` and a timestamp refreshes
- No destructive auto-deletion — the listing stays in the seller's dashboard, just hidden from public search

**Backend trigger:** a nightly cron checks `last_activity_at` on active listings (per Data Model §5.5). If 60+ days without any activity (no edit, no contact received), status flips to `expired`. Because `expired` is a distinct enum value from `hidden` (user-initiated) and `suspended` (platform-initiated), the dashboard renders the correct recovery UI for each state.

### Listing reported by users (3+ complaints)
Per Blueprint §18.4. Listing is set to `status = suspended` (Data Model §3.5) pending platform review:
- Listing row shows `status = suspended` with subtitle: *"Это объявление временно скрыто и проверяется командой."*
- Contact info for platform team visible: WhatsApp to platform support
- No edit action available while under review
- Once reviewed by platform team, either restored to `active` or permanently removed with explanation

**UI Spec decision (not in Blueprint):** the 3-complaint threshold is the trigger; the exact number and complaint categorization logic belongs to backend moderation (not this spec). Here we just render whatever state the backend returns.

### Developer-source listing pending one-time confirmation (per Post listing flow §12.4 Step 2)
- Listing row shows `status = hidden` with subtitle: *"Ожидаем подтверждения от застройщика. Обычно занимает до 48 часов."*
- No edit action until confirmation completes (changes could complicate the verification)
- Once confirmed, listing auto-activates and a notification appears in Block E

### Seller has zero listings (first-time visit)
Empty state (see §13.8).

### Network error
- Cached data (TanStack Query) renders if available
- Banner at top: "Не удалось обновить. Повторить?" with retry button

### Seller deleted their account or was banned
- Access blocked; redirect to login or a specific "Аккаунт деактивирован" page
- Out of scope for UI Spec — handled by account system

## 13.8 Empty state — no listings ever

When the seller has never posted a listing, Block B (summary stats) and Block F (listings list) are replaced with a welcome state:

- `text-h1` "Добро пожаловать!"
- `text-body` stone-700: "Разместите первое объявление — это займёт меньше 3 минут, без документов."
- `AppButton primary lg` "Опубликовать объявление" (same as Block C primary CTA but centered, full-width on mobile)
- Below the CTA, three small cards with bullet points:
  - "✓ Только номер телефона для подтверждения"
  - "✓ Бесплатно — без комиссий в V1"
  - "✓ Можно улучшить проверку позже"

No fake data, no "example listing" placeholders. The empty state is welcoming, not cluttered.

## 13.9 Platform components used

| Block | Platform components |
|---|---|
| A — Top bar | None (primitives) |
| B — Summary stats | None (primitives + AppCard) |
| C — Primary CTA | None (primitives) |
| D — Draft banner | None (AppCard) |
| E — Notifications | None (AppCard scrollable row) |
| F — Listings list | **`VerificationBadge`** (Layer 7.3) per listing row; **`ListingCard`** compact variant (Layer 7.7) if used for rendering the row — **flagged below in §13.11** |
| Empty state | None (primitives) |

## 13.10 Primitive components used

`AppButton` (primary, secondary, ghost, icon), `AppCard`, `AppModal` (delete confirmation, mark-sold confirmation), `AppToast` (status change feedback), `AppBottomSheet` (mobile menu)

## 13.11 What must NOT appear on this page

Per Blueprint §18 and the platform's simplicity principles:

1. **No charts, graphs, or trend lines in V1.** Blueprint §18.2 specifies simple numeric counts only.
2. **No percentage-change indicators ("+12% vs last week").** Out of V1 scope.
3. **No CRM features.** No lead pipeline, no stage tracking, no deal-flow visualization.
4. **No team management.** V1 is single-seller accounts; no agency-level aggregation.
5. **No "boost your listing for higher visibility" paid upsell.** Trust-weighted ranking is the only ranking (consistent with Post listing §12.10).
6. **No "buy more listing slots" paid feature.** V1 has no listing quota.
7. **No full notification history page.** Out of V1 scope — recent notifications only, auto-expire after 7 days.
8. **No bulk actions on listings** (select multiple → batch delete / batch mark sold). If a seller has many listings, this might matter later — not in V1.
9. **No listing duplication feature.** Creating a new listing uses the Post flow fresh. A seller wanting to duplicate can reference their own listing.
10. **No editable "Ownership source" (Step 2 in Post flow).** Source is locked at creation. A seller who needs to change source deletes and re-posts (§13.6 rule).
11. **No "Sponsored listings"** or any paid-visibility mechanism.
12. **No auto-renewal toggle** that makes the seller commit to recurring actions. Expired-due-to-inactivity is the only auto-state.
13. **No ad revenue share dashboard for sellers.** Not in V1 scope.
14. **No integration with external tools (Zapier, etc.)** in V1.

## 13.12 Acceptance criteria

The Seller dashboard is done when:

1. On 375px mobile, **top bar + summary stats + primary CTA + first listing row** are visible above or near the fold
2. Summary stats show three simple numeric counts (active listings, views 7d, contacts 7d) — no charts, no deltas
3. Primary CTA "Опубликовать новое объявление" is the most prominent action on the page
4. Each listing row shows: thumb, title, status badge, VerificationBadge, views + contacts counts, 5 inline actions
5. Inline actions work without leaving the page (except Edit, which opens Post flow in edit mode)
6. Edit mode pre-fills existing listing data and skips Steps 1-3 of Post flow (phone, ownership, building)
7. Changing price/status/availability in edit mode triggers a `change_event` so saved-page buyers see the change (Page 9)
8. Expired listings (60d inactivity) show the specific "Подтвердить актуальность" recovery action
9. Listings under moderation show their review-pending state without an edit action
10. Developer-source listings pending confirmation show the 48-hour message
11. Empty state (first visit) is welcoming with 3-bullet explainer + primary CTA — no placeholder data
12. Draft resume banner appears only when a draft exists; shows preview + continue/delete actions
13. Notifications strip appears only when unacknowledged notifications exist; items tap-to-open
14. All Blueprint §18.3 notification types are supported (new request, verification earned, 30-day inactivity reminder)
15. Desktop adds optional side notification panel when >3 notifications exist — no horizontal scroll
16. No pattern from §13.11 appears
17. Listings order by most-recently-updated by default
18. All inline actions have 44×44 hit areas on mobile

## 13.13 Technical notes for Codex

- Server endpoints:
  - `GET /api/seller/dashboard` — returns summary stats + listings + notifications in one payload (minimizes round trips)
  - `PATCH /api/listings/[id]/status` — toggles hidden/active, marks sold
  - `DELETE /api/listings/[id]` — soft-delete (sets `deleted_at`, not actually removed from DB)
  - `POST /api/listings/[id]/refresh` — extends `last_activity_at` when seller confirms actuality
  - `GET /api/notifications` — unacknowledged notifications for this user
  - `PATCH /api/notifications/[id]/acknowledge` — marks as read when user interacts
- Views and contact counts come from analytics events (PostHog per Tech Spec), joined at query time against the listings table. Cache for 5 minutes server-side to reduce PostHog load.
- Draft detection: query `listings` where `user_id = current_user AND status = 'draft'`
- Expired listings cron: nightly job flips `status → expired` (per Data Model §3.5 — expired is a distinct enum value from `hidden`) where `last_activity_at < now() - 60 days` AND `status = 'active'` (field name per Data Model §5.5)
- Notification acknowledgment: auto-acknowledge when user taps into the linked item; explicit "Dismiss" button not rendered in V1 (Principle 1 — simple)

**Listing status disambiguation (per Data Model §3.5):**
- `active` — visible, standard active listing
- `reserved` — seller marked as reserved (buyer committed but not yet sold) — renders with a stone-600 "Забронирована" badge; listing stays visible in search but with reduced prominence; contact actions still available for waitlist interest
- `hidden` — voluntarily hidden by seller (seller used "Скрыть" action)
- `expired` — auto-hidden after 60 days of no activity (renders "Подтвердить актуальность" recovery action)
- `suspended` — platform-hidden due to reports or fraud review (renders platform-support info, no edit)
- `sold` — seller marked as sold (renders visibly as sold, retains change-event history)
- `draft` — unpublished draft (renders in draft-resume banner, not in main listings list)

The seller dashboard reads `status` and renders the correct sub-state UI per the above. No additional `hide_reason` field is needed — Data Model already covers this cleanly.

## 13.14 Cross-page consistency notes

Seller dashboard uses the same visual vocabulary as the rest of the platform:
- `VerificationBadge`, action icons, status colors all consistent with Layer 2 and Layer 7
- `ListingCard` compact variant reused on desktop rows for consistency (UI Spec decision — flag to confirm in Layer 7.7 that compact variant supports dashboard context or whether a new variant is needed)

The dashboard is deliberately minimal. Sellers in this market are not used to complex SaaS products — a simple list with clear actions matches their expectations and doesn't create abandonment risk.

If the platform grows, future features (analytics, team roles, paid features) should be added as separate surfaces (a `/kabinet/insights` page, a `/kabinet/team` page) — not crammed into this page. V1 keeps this page ruthlessly simple.

---

# Page 14 — Verification upgrade flows

## 14.1 What these flows are for

Let sellers earn higher verification tier badges (Tier 2 blue / Tier 3 green) **after** their listing is live. This is the conversion mechanism for the platform's **trust moat** — the thing that makes listings on our platform more trustworthy than listings on Somon.tj.

Three distinct flows covered in this page:
- **Tier 2 — Profile Verified** (blue badge): selfie + ID document upload
- **Tier 3 — Property Verified** (green badge): platform team on-site visit, geo-tagged photos, 45-day validity
- **Developer Verification**: not self-service in V1 — platform team calls the developer's public office (handled operationally, minimal UI)

Follows Blueprint §19 exactly. V1 keeps these flows **manual review** — automated KYC SDKs (liveness detection, face matching) are out of V1 scope. Acceptable for launch; the volume doesn't justify vendor cost yet.

## 14.2 Routes and entry points

**Tier 2 route:** `/verifikatsiya/tier-2` (also accessed via `/verifikatsiya?tier=2` for parameter compatibility)
**Tier 3 route:** `/verifikatsiya/tier-3`
**Tier 3 visit scheduling:** `/verifikatsiya/tier-3/raspisanie`
**Verification status:** `/kabinet` (the seller dashboard lists verification status per listing — no separate status page in V1)

**Entry points:**
- Post listing flow Step 7 — "Verification upsell" cards (Page 12 §12.4 Step 7)
- Seller dashboard Block F — "Запросить проверку" action per listing row (Page 13 §13.4)
- Homepage Block E — "Трёхуровневая проверка" explainer link (if seller clicks through to learn more)
- Direct URL share (e.g., platform support sends link)

**Access control:** login required. Tier 2 can be initiated without a listing (verifying the user, not a listing). Tier 3 requires at least one active listing because it's property-specific.

## 14.3 Design principles driving these flows

Six principles shape these flows:

1. **Explain the benefit before asking for effort.** 2026 KYC research: "proper selfie verification solutions guide the user throughout" with clear value framing. Each flow's first screen explains exactly what the seller gets (higher ranking, more trust, more buyers) — not generic "verify your identity."
2. **Guidance during capture, not errors after.** Modern UX: show the user *how* to take the selfie correctly (look at camera, good lighting, hold ID beside face) *before* they click capture, not after the photo is rejected. Reduces retries and frustration.
3. **Manual review is transparent — state the timeline.** Blueprint §19.1: "Submitted for manual review. Platform confirms within 24–48 hours." The success state explicitly says this. No "we'll get back to you" vagueness.
4. **Rejection with specific reason, not generic failure.** Blueprint §19.1: "If rejected: specific reason is given (ID not clear, selfie doesn't match, etc.) with a chance to resubmit." This is critical — generic rejections cause abandonment.
5. **Scheduling is three taps.** 2026 research: best-in-class booking flows are three taps from intent to confirmation. For Tier 3 visit scheduling: Date → Time slot → Confirm.
6. **45-day Tier 3 validity with automatic renewal prompt.** Blueprint §19.2: "Badge valid for 45 days. Renewal flow prompts automatically before expiration: 'Ваша проверка истекает через 7 дней. Запланировать повторный визит?'" Trust isn't a one-time thing — it decays, and we're honest about that.

## 14.4 Flow A — Tier 2 Verification (Profile Verified)

Per Blueprint §19.1.

### Step 1 — Explainer screen

**Route:** `/verifikatsiya/tier-2` (entry)

**Headline:** `text-h1` "Получите значок «Профиль проверен»"
**Subheadline:** `text-body` stone-700: "Ваши объявления будут ранжироваться выше и вызывать больше доверия у покупателей."

**Visual:** VerificationBadge (Layer 7.3) tier-2 variant rendered large at top (`size-lg` if we add that variant, else default size).

**Content explanation** as `AppCard` blocks:
1. **Что нужно сделать** — "Загрузите фото паспорта и селфи с паспортом в руках — займёт 2 минуты"
2. **Что будет** — "Команда платформы проверит в течение 24–48 часов и выдаст значок"
3. **Что вы получите** — "Синий значок рядом со всеми вашими объявлениями, выше позиции в поиске, больше запросов от покупателей"

**Actions:**
- `AppButton primary lg` "Начать проверку" → advances to Step 2
- `AppButton ghost md` "Позже" → returns to dashboard (Page 13)

### Step 2 — Upload ID document

**Route:** `/verifikatsiya/tier-2/id`

**Headline:** "Фото документа"
**Helper text:** "Загрузите чёткое фото паспорта или ID-карты. Убедитесь, что все данные читаются."

**Content:**
- Upload area — tappable card with `Camera` Lucide icon
- Tap: opens native camera (mobile) with `<input type="file" accept="image/*" capture="environment">` — rear camera for document capture
- On desktop: opens file picker
- Guidance below the upload area — three short bullet points with small check icons:
  - "Документ на светлом фоне"
  - "Все четыре угла видны"
  - "Текст чёткий и не размыт"
- After capture: thumbnail preview with "Перефотографировать" ghost button and `AppButton primary md` "Далее"

**Validation (client-side UI hint, not replacing server validation):**
- If uploaded file is <200KB (suspiciously small) or >10MB (too large): toast "Файл слишком маленький/большой — попробуйте переснять"
- File type must be JPEG, PNG, or HEIC (converted client-side)

### Step 3 — Selfie with ID

**Route:** `/verifikatsiya/tier-2/selfie`

**Headline:** "Селфи с документом"
**Helper text:** "Держите документ рядом с лицом. Это нужно, чтобы подтвердить, что это действительно вы."

**Content:**
- Large visual example at top — illustrative silhouette showing the correct pose (face + ID held up beside)
- Upload area — tappable card with `Camera` Lucide icon
- Tap: opens native camera with `<input type="file" accept="image/*" capture="user">` — **front camera** for selfie
- Guidance bullets:
  - "Смотрите в камеру"
  - "Держите документ рядом с лицом, не закрывая его"
  - "Хорошее освещение — без контрового света"
- After capture: thumbnail preview with retry + submit options

### Step 4 — Review and submit

**Route:** `/verifikatsiya/tier-2/review`

**Headline:** "Проверьте и отправьте"

**Content:**
- Two preview thumbs side-by-side: ID photo, selfie photo
- Each thumb has a "Перезагрузить" ghost link below
- Short confirmation text: *"Мы проверим эти фото в течение 24–48 часов. Личные данные хранятся безопасно и удаляются после проверки."*
- `AppButton primary lg` full-width: "Отправить на проверку"

### Step 5 — Success state

**Route:** `/verifikatsiya/tier-2/submitted` (or modal if inline)

- Large `Clock` icon in terracotta-600 (not success green yet — verification is pending)
- `text-h2` "Отправлено на проверку"
- `text-body` stone-900: *"Команда проверит в течение 24–48 часов. Мы уведомим вас через SMS и на вашей странице объявлений."*
- Actions:
  - `AppButton primary md` "Вернуться к моим объявлениям" → Page 13
  - `AppButton ghost md` "Узнать о Tier 3 проверке" → navigates to `/verifikatsiya/tier-3` Step 1 (upsell path, UI Spec addition)

### Rejection handling (Blueprint §19.1 firm rule)

When the platform team rejects a Tier 2 submission, the seller sees:
- Banner on their dashboard (Page 13 Block E notification): "Ваша проверка Tier 2 требует повторной отправки: [specific reason]"
- Tapping opens a rejection-specific screen with:
  - Clear reason (one of the predefined reasons — see below)
  - Guidance on how to fix it
  - `AppButton primary md` "Загрузить новые фото" → starts Step 2 again

**Predefined rejection reasons (UI Spec standardization — Blueprint §19.1 says "specific reason" without enumerating):**
- "Фото документа размыто или нечётко"
- "Данные на документе не читаются"
- "Селфи не соответствует лицу на документе"
- "На селфи не видно документа или не видно лица"
- "Документ частично закрыт"
- "Освещение слишком тёмное или слишком яркое"

Each reason has a short fix-guidance line attached. If the platform team needs a custom reason, a free-text rejection is also supported — renders the platform's written reason in `text-body`.

## 14.5 Flow B — Tier 3 Verification (Property Verified)

Per Blueprint §19.2.

### Step 1 — Explainer screen

**Route:** `/verifikatsiya/tier-3`

**Headline:** `text-h1` "Получите значок «Объект проверен»"
**Subheadline:** `text-body` stone-700: "Представитель платформы посетит квартиру и сделает официальные фото."

**Visual:** VerificationBadge tier-3 variant (green) rendered large at top.

**Content explanation** as `AppCard` blocks:
1. **Что будет** — "Наш представитель приедет в удобное для вас время — осмотрит квартиру, сделает фото с геотегами"
2. **Что вы получите** — "Зелёный значок, верхнее ранжирование в поиске, максимальное доверие покупателей"
3. **Сроки** — "Визит обычно в течение 3–5 рабочих дней после записи. Значок выдаётся в день визита."
4. **Стоимость** — "Бесплатно в V1" (conditional — only if free status is the current policy; can change post-launch)

**For intermediary sellers — additional note per Blueprint §19.2:**
- Small `AppCard` with `stone-100` background: *"Для посредников: наш представитель также проведёт короткий телефонный звонок с владельцем, чтобы подтвердить разрешение на продажу. Без подписей — только разговор."*

**Actions:**
- `AppButton primary lg` "Запланировать визит" → advances to Step 2 (scheduling)
- `AppButton ghost md` "Позже" → returns to dashboard

### Step 2 — Select listing (if multiple active)

**Route:** `/verifikatsiya/tier-3/listing`

Only shown if the seller has >1 active listing without Tier 3. Otherwise auto-selects the one unverified listing and skips to Step 3.

**Headline:** "Какой объект проверить?"

**Content:** Compact list of the seller's active listings without Tier 3 verification:
- Each row: thumb + title + district + "Выбрать" button (or whole row tappable)

### Step 3 — Schedule visit

**Route:** `/verifikatsiya/tier-3/raspisanie`

Per 2026 best practice: three-tap flow. Date → Time slot → Confirm.

**Headline:** "Выберите удобное время"
**Helper text:** "Визит занимает около 30 минут. Укажите, когда вы можете встретить представителя."

**Content:**

**Part 1 — Date picker:**
- Compact calendar showing the next 14 days (mobile) or 21 days (desktop)
- Days available for visits: highlighted in terracotta-100 background
- Days unavailable: rendered in stone-300 (not tappable)
- Selected day: terracotta-600 background with white text
- Weekdays labels in text-caption stone-500: "Пн · Вт · Ср · Чт · Пт · Сб · Вс"
- Current day marked with a small dot

**Part 2 — Time slot selection:**
- Revealed after a date is selected
- **Time slots in 2-hour windows** (UI Spec decision — Blueprint doesn't specify slot duration, and 2-hour windows balance seller flexibility with team scheduling simplicity; tunable during build once team capacity is known):
  - "09:00 – 11:00"
  - "11:00 – 13:00"
  - "13:00 – 15:00"
  - "15:00 – 17:00"
  - "17:00 – 19:00"
- Each slot is an `AppChip` (single-select within the chip group)
- Unavailable slots rendered in stone-300 (not tappable) — e.g., already booked, outside platform operating hours

**Part 3 — Contact details for the visit:**
- **Name for visit** — `AppInput`, pre-filled with seller's account name
- **Phone** — pre-filled with seller's account phone
- **Address verification** — show the listing's building address; if this is a specific unit, seller can add: "Дополнительные инструкции для поиска (этаж, подъезд, код домофона)" — optional `AppTextarea`, max 200 chars

**Timezone handling (UI Spec decision, 2026 research-aligned):**
- Tajikistan: UTC+5, no DST — all times are local
- No timezone toggle needed in V1 (all sellers and the platform team are in Tajikistan)
- For diaspora sellers scheduling for their Dushanbe property: times shown in local Dushanbe time with a small note: *"Время по Душанбе (UTC+5)"* — reduces confusion for diaspora users viewing from abroad

**Primary CTA:** `AppButton primary lg` "Записаться на визит" — enabled only when date + time slot selected

### Step 4 — Confirmation

**Route:** `/verifikatsiya/tier-3/confirmed`

- Large `Calendar` icon in terracotta-600
- `text-h2` "Визит запланирован"
- Summary card in `AppCard`:
  - Date: "Вторник, 16 апреля 2026"
  - Time: "11:00 – 13:00"
  - Address: building address
  - Representative will contact: "Наш представитель позвонит за 30 минут до визита"
- Info bullets:
  - "Мы отправим SMS-напоминание за день до визита"
  - "Вы можете перенести визит — один раз бесплатно" (per Blueprint §19.4 edge case)
- Actions:
  - `AppButton primary md` "Вернуться к моим объявлениям" → Page 13
  - `AppButton ghost md` "Перенести визит" → reopens Step 3 to pick a new slot

### Visit day and badge issuance

Not a user-facing flow — handled operationally by platform team. When the platform representative completes the visit:
- Uploads geo-tagged photos (via internal admin interface, out of UI Spec scope)
- Marks verification complete
- `listing.verification_tier → 3` (per Data Model)
- Seller receives notification: "Ваш объект проверен — значок активирован" (Blueprint §18.3 notification)
- 45-day expiry timer starts (per Blueprint §19.2)

### Renewal flow (7 days before expiry)

Per Blueprint §19.2.

Notification appears on seller dashboard Block E: *"Ваша проверка объекта [X] истекает через 7 дней. Запланировать повторный визит?"*
- Tap: goes directly to Step 3 (Schedule visit) for that specific listing
- If seller doesn't act within 7 days, badge expires and listing's `verification_tier` reverts to the previously-earned tier (usually Tier 2 if it was also earned, else Tier 1)

## 14.6 Flow C — Developer Verification (not self-service in V1)

Per Blueprint §19.3 — **no seller-facing flow in V1**. This is a backend/operational flow handled by the platform team:

1. Developer-source seller registers (Post listing flow Page 12 Step 2 flags their account)
2. Platform team sees the flag in an admin interface (out of UI Spec scope)
3. Platform team calls the developer's public office phone to confirm the seller is an authorized representative
4. If confirmed: in V1, the platform team manually creates the seller's listings under `source_type = 'developer'` via the staff admin interface — per Data Model §5.5 notes, no separate confirmation flag is needed because the founder manually onboards each developer. Listings move from `draft` to `active` once published.
5. If not confirmed: account flagged for review, developer can appeal via platform contact

**Minimal UI surfaces for this flow in V1:**
- Seller dashboard (Page 13) shows pending-confirmation state with "Ожидаем подтверждения от застройщика" (per §13.7)
- Once confirmed, dashboard shows a notification (Block E)
- No self-service "verify my developer status" flow exists in V1 — adding it creates an automation surface we can't reliably police

## 14.7 Edge cases

Per Blueprint §19.4.

### Visit cancelled by seller
- First cancellation: free reschedule, seller picks new slot via Step 3
- Second cancellation (**UI Spec interpretation of Blueprint §19.4 "moves them to end of queue"** — exact wait period is tunable): the reschedule flow still shows available slots, but **all slots in the next 7 days are unavailable** (dimmed in the calendar with a tooltip on tap: "Из-за двух отмен — доступные слоты начинаются с [date]"). The 7-day period is a reasonable interpretation of "end of queue" for a small platform team; operationally this could be tuned based on actual team capacity.

Honest communication rather than silent delay.

### Visit cancelled by platform team
- Seller is notified via SMS and dashboard banner: "К сожалению, визит перенесён. Выберите другое время."
- Automatic reschedule flow — seller picks new slot, no penalty counted against them

### Seller no-show on scheduled visit
- Tracked internally (counts as one cancellation equivalent)
- Seller sees on dashboard: "Наш представитель был у вашего объекта, но никто не встретил. Запланируйте новый визит."
- Reschedule option available

### Verification reviewer is overloaded — Tier 2 taking >48h
- Dashboard banner: "Проверка занимает больше обычного — обычно 24-48 часов, но сейчас наша команда обрабатывает больше заявок. Мы уведомим, как только проверка завершится."
- No penalty to the seller

### Tier 3 expires (45 days, no renewal)
- 7 days before expiry: renewal prompt (§14.5)
- On day of expiry: badge drops to previous tier; listing re-ranks accordingly
- Seller sees a notification: "Проверка объекта [X] истекла. Обновите — 2 клика."

### Photos uploaded with suspicious content (Tier 2)
- Handled by reviewer via the rejection flow (§14.4)
- No automatic content-moderation blocking in V1 (that would require expensive third-party tooling)

### Network error during upload
- Retry inline
- Uploaded photos persist (stored in Supabase Storage) until submission — closing the browser mid-upload doesn't lose work

## 14.8 Platform components used

| Flow | Platform components |
|---|---|
| Tier 2 Step 1 | **`VerificationBadge`** (Layer 7.3) tier-2 variant as large visual |
| Tier 2 Steps 2-4 | None (primitives only) |
| Tier 3 Step 1 | **`VerificationBadge`** (Layer 7.3) tier-3 variant as large visual |
| Tier 3 Step 2 | `BuildingCard` or `ListingCard` compact variant (Layer 7.8 / 7.7) — for listing selection |
| Tier 3 Step 3 | None (custom calendar + slot picker built from primitives) |

## 14.9 Primitive components used

`AppButton`, `AppInput`, `AppTextarea`, `AppCard`, `AppChip` + `AppChipGroup` (time slots), `AppModal` (rejection detail), `AppToast` (upload feedback)

## 14.10 What must NOT appear in these flows

Per Blueprint §19 and platform principles:

1. **No paid-upgrade variants.** Tier 2 and Tier 3 are free in V1 (Blueprint §19.2 explicit). No "Pay $5 for expedited verification" upsell.
2. **No automated face-matching or liveness detection SDKs in V1.** Manual review only — simpler, honest, and the volume doesn't justify vendor cost yet.
3. **No third-party KYC vendors** (Onfido, Jumio, Veriff) in V1. They're great tools but V1's manual review works fine and avoids per-verification cost.
4. **No "Instant approval" promise.** Manual review takes 24-48h — we say that plainly and don't pretend otherwise.
5. **No rejection without a specific reason.** Blueprint §19.1 firm rule.
6. **No ownership document requirement at Tier 3.** Blueprint §19.2: the visit verifies — no deeds, no titles, no cadastral. "No signed documents — just a recorded verification call" for intermediary.
7. **No "verify to unlock contact" or "verify to post" gating.** Verification is optional. Posting is free (Page 12 §12.10 rule) and contacting happens without verification. Verification is an upsell, not a wall.
8. **No retention of personal data beyond verification.** Blueprint §19 is careful: *"Личные данные хранятся безопасно и удаляются после проверки."* Surface this to the seller explicitly.
9. **No developer-verification self-service.** Blueprint §19.3 firm rule for V1.
10. **No auto-renewal for Tier 3 without seller action.** Renewal requires seller to confirm; badges don't silently extend.
11. **No "Boost to top" paid feature** tied to verification. Trust-weighted ranking is the only ranking.
12. **No "verified seller" review/rating system.** Reviews are out of V1 scope; verification IS the trust signal.

## 14.11 Acceptance criteria

The Verification upgrade flows are done when:

1. Tier 2 Step 1 (explainer) shows clear benefit, required effort, and review timeline (24-48h)
2. Tier 2 Step 3 (selfie) uses front camera; Step 2 (ID) uses rear camera — correct `capture` HTML attribute per step
3. Tier 2 rejection shows a specific reason from the standardized set (or platform's custom text) and a direct "retry" action
4. Tier 3 Step 1 shows the intermediary-specific note about owner-permission phone call (Blueprint §19.2)
5. Tier 3 Step 3 (schedule) offers date + time slot in a three-tap flow
6. Tier 3 time slots are 2-hour windows during platform operating hours
7. Dushanbe local time (UTC+5) is default; diaspora sellers see a clarifying note
8. Tier 3 confirmation shows date, time, address, and "representative will call 30 min before"
9. 45-day validity timer starts on badge issuance; 7-day renewal prompt fires
10. First cancellation = free reschedule; second = 7-day wait per Blueprint §19.4
11. Developer-verification is NOT a self-service flow in V1 (Blueprint §19.3)
12. No pattern from §14.10 appears
13. All flows can be initiated from Seller dashboard (Page 13) row action or Post listing flow (Page 12) Step 7
14. Rejection returns the seller directly to the correct step to retry — not to the start
15. Network error during photo upload preserves the upload, allowing retry without re-capturing

## 14.12 Technical notes for Codex

- Server endpoints:
  - `POST /api/verification/tier-2` — submit Tier 2 with ID + selfie photo URLs
  - `POST /api/verification/tier-3` — request Tier 3 visit (returns available slots)
  - `GET /api/verification/tier-3/slots?date=<>` — returns available time slots for a given date
  - `POST /api/verification/tier-3/book` — book a specific slot
  - `PATCH /api/verification/tier-3/reschedule` — reschedule existing booking
  - `DELETE /api/verification/tier-3/cancel` — cancel existing booking
- Tier 2 manual review: admin interface (out of UI Spec scope) — on approval, `user.verification_tier → 2` and all of that user's listings reflect the tier
- Tier 3 scheduling: slot availability computed from platform team's calendar (stored in a dedicated `verification_slots` table — **pending Data Model addition**, flagged below)
- Photo storage: Supabase Storage with a dedicated `verification/` bucket, tighter access controls — RLS ensures only the submitting user and admin team can read
- Photo retention: **per Blueprint §19.1 implied policy**, personal verification photos deleted after approval/rejection decision. Pending tech decision: exact deletion mechanism (cron job vs explicit delete on status change).
- SMS notifications: Twilio primary, Vonage fallback (Tech Spec locked) for reminders, status changes
- **Data Model alignment confirmed (no additions needed):** During UI Spec drafting I initially flagged several Data Model additions for verification flows. On audit, the existing Data Model already covers them:
  - `verification_submissions` table → exists at §5.10 (Tier 2)
  - `verification_visits` table → exists at §5.11 (Tier 3 scheduling, cancellations, owner-phone confirmation)
  - `listing.listing_verified_expires_at` → exists at §5.5 (45-day Tier 3 expiry timer)
  - Cancellation count → derivable from `verification_visits` rows where `status = 'cancelled'`, no separate counter needed
  - Developer confirmation → handled via §5.5 manual founder onboarding pattern in V1; no flag needed
- The only operational decision still pending is **how the platform team manages visit slots** (Tier 3 scheduling). For V1, this can be a simple internal calendar (Google Calendar shared with the team), with available slots exposed to sellers through a `GET /api/verification/tier-3/slots` endpoint that the team populates manually. A dedicated `verification_slots` table is a Phase 2 enhancement when team capacity grows.
- Pending business decisions:
  - Exact platform team operating hours (affects available slots)
  - Holiday calendar (days blocked for visits)
  - Number of visits the team can handle per day (affects slot supply)

## 14.13 Cross-page consistency notes

Verification flows consistently use:
- Same VerificationBadge component (Layer 7.3) across Post flow Step 7, Seller dashboard rows, and here
- Same SMS OTP infrastructure as Contact flow (Page 10) and Post listing (Page 12)
- Same notification pattern (Blueprint §18.3) as the rest of the product

Post-verification, the tier badge appears across:
- Apartments browsing (Page 6) listing cards
- Projects browsing (Page 3) building cards (for developer-verified badges)
- Building detail (Page 5) and Listing detail (Page 7) pages
- Compare page (Page 8) row values
- Saved page (Page 9) cards
- Anywhere ListingCard or BuildingCard renders

Consistency of the verification tier UI across all these surfaces is a primary design system benefit. Tier badges look the same everywhere — buyers learn the vocabulary once.

The verification flows are the mechanism by which the platform's trust moat gets built. Every seller who completes Tier 2 or Tier 3 adds to the platform's defensible differentiation against Somon.tj. The flows are designed to be honest (manual review, 24-48h timeline, specific rejection reasons, 45-day expiry), low-friction (clear guidance, three-tap scheduling, network-resilient uploads), and optional (posting is free, verification is upside). This is how trust-first converts into inventory quality over time.

---

# Document complete

All 14 pages of the V1 UI Spec are now drafted and audited against Blueprint, PRD, Data Model, and Design System Spec. Combined with the locked Design System Spec (7 layers) and the rest of the product documentation, this gives Codex the complete vocabulary needed to build the V1 product consistently.

**Summary of what's been produced:**
- 14 page specs, each with purpose, route, mobile/desktop layout, platform components, primitives, edge states, exclusions, testable acceptance criteria
- Three Design System Spec updates **applied** during reconciliation pass: BuildingCard 6-row expansion (Layer 7.8), BuildingCard map-preview variant (Layer 7.8), ListingCard match variant (Layer 7.7), ChangeBadge red-vs-amber resolved in favor of amber with reconciliation note
- One inconsistency between Blueprint §14.3 (red for sold) and Layer 7.12 (amber) **resolved** in favor of amber, with explicit reconciliation note in Layer 7.12 documenting the rationale (PRD §19 halal-by-design)
- Data Model audit confirmed no additions are needed — the existing Data Model already covers verification flows (§5.10, §5.11), expiry timers (§5.5), cancellation tracking (derivable from `verification_visits.status`), and developer-source via §5.5 manual onboarding pattern

**Remaining honest pending technical decisions** (these are implementation choices, not spec gaps):
- IMO deep-link approach (Page 11) — no public URL scheme exists; V1 falls back to "find this number in IMO" instruction
- Voice-call OTP fallback service (Page 12) — Twilio or Vonage, lock during build
- Match-percentage algorithm for guided finder (Page 2) — simplest weighted score, exact weights tunable
- Share-list URL implementation (Page 9) — token-based read-only snapshot, exact mechanism flexible
- 30-second strip acknowledgment threshold (Page 9) — UX timing, tunable
- Tier 3 visit slot management (Page 14) — for V1, can use a shared team calendar with manual slot exposure; dedicated table is Phase 2

**What's next after this UI Spec locks:**
1. ✅ Reconciliation pass complete (Design System updates applied, Data Model audit confirmed no additions needed, ChangeBadge color resolved)
2. Update existing `ARCHITECTURE.md`, `AI_CONTRACT.md`, `AGENTS.md` reflecting the locked spec stack
3. Stop writing, start building with Codex/Claude Code
