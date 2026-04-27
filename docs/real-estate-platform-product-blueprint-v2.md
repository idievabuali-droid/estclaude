# Real Estate Platform — Product Blueprint v2

## 1. Document purpose

This document translates the strategic PRD into a concrete product structure. It defines:

- the main pages of the platform
- the goal of each page and its primary action
- the block order within each page
- how uncertain, ready, and returning buyers each get a complete journey
- how the three-source inventory model is expressed visually
- how verification tiers are surfaced on every surface
- how every empty state, error state, and edge case leads somewhere
- how the bilingual Russian and Tajik experience works end to end
- how the diaspora entry point integrates with the main flow

This blueprint is the bridge between strategy and implementation. It is a complete map of what the buyer and seller see — with no dead ends, no ambiguous transitions, and no situation where a user is left stuck.

---

## 2. Core product rules

The platform follows five structural rules that every page respects.

### 2.1 Project-first, unit-aware, source-honest, mobile-first

**Project-first** means that in the main browsing mode, buildings are the primary objects buyers browse. Each building result clearly shows whether it contains units matching the buyer's current filters.

**Unit-aware** means buyers can also browse individual apartments directly in a dedicated apartments-first mode, and every building page exposes its inventory in clean, labeled sections.

**Source-honest** means every listing carries a visible source chip (developer, owner, intermediary) so the buyer always knows who they are dealing with.

**Mobile-first** means every page is designed for a phone screen first, with desktop layouts expanding naturally from that base.

### 2.2 The building is the canonical entity

Every unit on the platform attaches to a building record. The building is the shared anchor for developer inventory and resale inventory. Developers control project-level information. Resellers can only list inside buildings that already exist on the platform.

### 2.3 Trust is always visible

**Verification terminology used throughout this blueprint:**

The platform uses one word — "проверка" / "verification" — but it refers to four distinct concepts. Every page must be clear about which one applies.

- **Phone verified (Tier 1, gray badge)** — the seller confirmed their phone number via SMS OTP. Automatic on posting. Applies to the seller.
- **Profile verified (Tier 2, blue badge)** — the seller uploaded ID + selfie and was manually approved by the platform team. Applies to the seller and carries across all their listings.
- **Listing verified on-site (Tier 3, green badge)** — the platform team physically visited the specific apartment, took geo-tagged photos, and confirmed the listing matches reality. Applies to one specific apartment. Valid for 45 days.
- **Verified developer (gold badge 🏗 Проверенный застройщик)** — the developer's company was confirmed by the platform team via a one-time phone call to their public office. Applies to the developer as an entity. All listings from a verified developer automatically display this badge.

**How verification displays on each source type:**

- **🏗 От застройщика listings** — display the gold "Проверенный застройщик" badge if the developer is verified. This is treated as equivalent to Tier 3 trust for ranking purposes. A developer listing never shows Tier 1, 2, or 3 badges individually — the developer badge replaces them because verification happens at the developer level, not per listing.
- **👤 Собственник listings** — display whichever tier the seller has currently earned (gray, blue, or green).
- **🤝 Посредник listings** — display the seller's current tier. When Tier 3 is earned, an additional small note appears: *"Продавец подтвердил разрешение от владельца."*

**Ranking and display rules:**

Every listing surface — card, detail page, compare row — shows the appropriate badge visibly. Ranking in search results respects trust tier before freshness and relevance. Verified developer listings and Tier 3 listings rank equivalently at the top. Unverified listings (Tier 1 only) are not hidden — they rank lower and carry the gray badge with a gentle "не проверено" note.

### 2.4 Every page has one main action, no dead ends

Each page is designed around a single primary action the buyer is most likely to want next. Secondary actions exist but never compete for attention with the primary one. Every empty state, error state, and loading state suggests a next step the user can take.

### 2.5 The platform serves three buyer archetypes equally well

- **The ready buyer** who knows their budget, district, and room count — gets straight to filtered results
- **The uncertain buyer** who doesn't know what they want yet — gets a short guided path to the magic moment
- **The returning buyer** who came before and is continuing their decision — gets an explicit "what changed since you left" experience

If any archetype is not served, the journey is broken for that segment.

---

## 3. Strategy anchors

The blueprint is built to deliver these locked strategic decisions from the PRD:

- **Wedge:** the fastest way to confidently choose the right new-build apartment in Dushanbe and Vahdat, with trust no other platform provides
- **Early adopter:** serious 0–6 month buyer comparing multiple options, often involving family, including Tajik migrants in Russia buying for family
- **Magic moment:** within 1–2 minutes, the buyer sees 3–5 strong-fit options they understand
- **Retention loop:** save, compare, return with family, share, track changes across multiple sessions
- **Trust moat:** three-tier verification, dated construction photos, price-per-m² fairness context, honest source labels, bilingual access
- **Halal by design:** no interest rates, no fake urgency, no deceptive scarcity — installment-based affordability as the hero financial model

---

## 4. Page map

### 4.1 Buyer-facing pages

1. Homepage
2. Guided quick finder (short ~1-minute questionnaire, optional)
3. Projects browsing (Новостройки list)
4. Building detail page
5. Apartments browsing (Квартиры list)
6. Listing detail page
7. Compare page
8. Saved page
9. Diaspora landing page
10. Help center (what badges mean, finishing types explained, FAQ)

### 4.2 Seller-facing pages

11. Post listing flow
12. Seller dashboard
13. Verification upgrade flows

### 4.3 System pages

14. Login / registration (phone OTP)
15. Language toggle (global, not a page)

### 4.4 Pages intentionally not in this blueprint

The following are deferred to later phases: developer self-service dashboard, admin moderation UI, saved searches with automated alerts, automated valuation pages, crime/school overlays, mortgage tools, rental listings, resale of old housing, houses, commercial property, land.

---

## 5. Priority order for design

The design effort should concentrate on these pages in this order:

1. Building detail page (highest-impact, most unique to the platform)
2. Apartments browsing and listing detail (the apartment-first path)
3. Projects browsing (the building-first path)
4. Homepage (gateway to everything)
5. Guided quick finder (serves the uncertain buyer)
6. Compare and Saved (retention features)
7. Posting flow and verification (supply side)
8. Diaspora landing page
9. Help center and empty/error states
10. Everything else

This priority reflects real buyer value. The building detail page is where trust is earned and decisions are made. It must be the strongest page on the platform.

---

# 6. Homepage

## 6.1 Main goal

Explain the platform in 10 seconds and send every type of buyer into the right path — whether they know what they want, don't know yet, or came back to continue.

## 6.2 First screen must communicate

- this platform is for new-build apartments in Dushanbe and Vahdat
- every project is verified by the platform team
- the buyer can browse by building, by apartment, or get help choosing
- the platform is available in Russian and Tajik

## 6.3 Block order on mobile

### Block A — Header
Logo on the left, language toggle (RU / TJ) on the right, profile icon if logged in. Thin and unobtrusive. Language toggle preserves all current state when switched — filters, saved items, compare state.

### Block B — Hero with three entry paths
A single-line headline stating the platform's purpose. A one-line supporting message. Below that, three tappable paths:

- **Новостройки · [N] проверенных проектов** (for ready buyers who want to browse buildings)
- **Квартиры · [N] проверенных объявлений** (for ready buyers who want to browse apartments)
- **Помочь выбрать · около минуты** (for uncertain buyers, opens guided quick finder)

Above the fold on mobile: headline, supporting line, all three paths, a small verification trust strip.

### Block C — Returning user strip (shown only to returning users)
If the user has visited before and has saved items or past searches, a prominent strip appears just below the hero:

**"С возвращением! Что изменилось с вашего последнего визита:"**

Below: a list of real changes — price drops, new units in saved buildings, status changes, new construction photos. Each item links directly to the changed listing or building.

If there are no changes since the last visit, this block shows: *"С момента вашего последнего визита изменений в ваших сохранённых объектах нет. Посмотрите что нового на платформе:"* followed by a row of 3–5 newly-added buildings.

This block is **the heart of the retention loop** and solves the problem of returning users seeing a cold homepage.

### Block D — Quick search
A single search field that lets the buyer type a district, building name, or budget number and get to results fast. One action button: **Найти**.

Below the field, four tappable suggestion chips: **Квартиры до 800 000 TJS**, **С ремонтом**, **Сдача в 2026**, **В Исмоили Сомони**. These give the uncertain buyer an easy starting point without forcing them into the full guided finder.

### Block E — Why this platform is different
Three short reasons, each with a small illustration:

- Настоящие фото стройки, обновляются ежемесячно
- Цена за м² в сравнении со средней по району
- Каждое объявление проверено командой платформы

Each reason is tappable and leads to a help-center article explaining it in more depth.

### Block F — Featured buildings
Three to five hand-picked buildings with a current construction-progress cover photo, building name, district, price from, delivery date, and verification badge. For first-time visitors, these show the most trustworthy and popular projects. For returning visitors, these rotate to show new projects they haven't seen.

### Block G — How it works
A three-step explanation:

1. Выберите проект или квартиру
2. Сравните и сохраните
3. Свяжитесь напрямую через WhatsApp

Each step one sentence. Tappable for a short illustrated explanation.

### Block H — Diaspora entry strip
A small horizontal strip: *"Покупаете из России? Мы поможем выбрать и связаться с застройщиком."* with a link to the diaspora landing page. Visible but not dominant.

### Block I — Footer
Language toggle, About, How verification works, Help center, Contact, legal links. Minimal.

## 6.4 Desktop layout
The same blocks in the same order, adapted for wider screens. The hero expands horizontally. The three paths sit in a row. Featured buildings render in a row of four or five.

## 6.5 Main actions
- Primary (for ready buyers): tap one of the two browsing mode tiles
- Primary (for uncertain buyers): tap "Помочь выбрать"
- Primary (for returning buyers): tap a specific change in Block C
- Secondary: type into the search field, open a featured building

## 6.6 Empty and edge states
- **No featured buildings yet:** show three most recently added buildings instead
- **No active projects in database:** the homepage shows a friendly message "Мы скоро запускаемся — оставьте свой номер, и мы сообщим когда первые проекты появятся" with a single phone field
- **First-time visitor:** Block C (returning user strip) doesn't appear

## 6.7 What must not appear
- No modal popups on load
- No newsletter signup interruption
- No cookie dark patterns
- No autoplay video
- No mortgage calculator
- No long explanatory text
- No more than five featured buildings above the fold

---

# 7. Guided quick finder

## 7.1 Main goal

Take an uncertain buyer from "I don't know what I want" to "here are 3–5 apartments that fit me" in about a minute (typically 60–90 seconds depending on how many questions they answer vs. skip).

This is the feature that creates the magic moment for the segment that otherwise bounces.

## 7.2 Design principle

Maximum 5 questions, one per screen, each with visible skip. Never forces registration. Results feel earned, not random.

## 7.3 Question flow

### Screen 1 — Budget
**"Какой бюджет вы рассматриваете?"**

Four tappable ranges plus a custom input:
- До 500 000 TJS
- 500 000 – 800 000 TJS
- 800 000 – 1 200 000 TJS
- Более 1 200 000 TJS
- Указать точно: [number input]

Skip option: **"Пока не знаю"** — in which case budget doesn't filter.

### Screen 2 — Rooms
**"Сколько комнат вам нужно?"**

Tappable chips: 1, 2, 3, 4+ (multi-select). Skip option preserved.

### Screen 3 — Area
**"В каком районе?"**

A simple map of Dushanbe + Vahdat with districts tappable. Plus a list of top districts below the map. Multi-select. Skip option preserved.

### Screen 4 — Finishing
**"Какая отделка вам подходит?"**

Four large tappable cards with images showing each finishing type:
- Без ремонта (usually cheaper, you do the repair)
- Предчистовая (basic finishing done, you finish the details)
- С ремонтом (ready to move in)
- Отремонтировано владельцем (resale only — owner did the renovation)
- Не важно / покажите все варианты

Tappable explainer icon next to each card shows what that finishing means in more detail.

### Screen 5 — Timing and payment
**"Когда вам нужна квартира и как вы планируете платить?"**

Two quick questions on one screen:
- Timing: Сейчас / В течение 6 месяцев / В течение года / Не важно
- Payment: Наличными / В рассрочку / Оба варианта

### Results screen
Show 3–5 best-matching apartments, each with:
- Match percentage ("Совпадение 92%")
- Why it matches ("В вашем бюджете · Нужное количество комнат · Отделка соответствует")
- Full listing card

Two options at the bottom:
- **Посмотреть все подходящие · [N] вариантов** (goes to apartments browsing with filters pre-applied)
- **Изменить ответы** (goes back to modify the quiz)

The answers are saved in the buyer's session. If they sign up later, the answers persist in their profile.

## 7.4 Edge cases
- **Zero results:** "По вашим критериям пока нет подходящих квартир. Хотите посмотреть похожие варианты?" — show 3–5 near-matches with explanation of what didn't match
- **Too many results (>50):** "Мы нашли много подходящих вариантов. Давайте уточним выбор." — suggest one more filter
- **User skips every question:** show the most popular apartments platform-wide

---

# 8. Projects browsing (Новостройки list)

## 8.1 Main goal

Let buyers browse and filter new-build buildings and understand which ones are worth opening.

## 8.2 First screen must communicate

- how many buildings match the current filters
- what filters are active
- what each building offers at a glance

## 8.3 Mobile structure

### Top sticky bar
Back button, page title (Новостройки), filters button with active filter count badge, sort button, map toggle.

### Active filter chips
Immediately below the sticky bar: horizontal scrolling chips showing active filters. Each chip has an X to remove it. An **"Очистить все"** action appears when 2+ filters are active.

### Result count
A small line: **X проектов найдено · обновлено сегодня**

### Building cards
Stacked vertically. Each card renders as described in Section 8.6.

### Map toggle floating button
Bottom right. Switches to map mode without losing current filters.

## 8.4 Desktop layout

Left: filters panel (persistent, not a drawer). Middle: building cards in a vertical list. Right (optional): map view that can be expanded to full width.

## 8.5 Available filters

- District (multi-select)
- Price from (range slider)
- Price per m² (range slider)
- Rooms available (multi-select: 1, 2, 3, 4, 5+)
- Delivery date (quarters up to 2+ years)
- Building status (announced, under_construction, near_completion, delivered)
- Finishing options available (without_repair, pre_finish, full_repair)
- Installment available (yes/no)
- Verification level (all / verified developer only)
- Developer (multi-select, once enough developers exist)

All filters collapse behind a "Filters" button on mobile. Power filters ("Больше фильтров") hide additional options.

## 8.6 Building card structure

### Row 1 — Visual preview
One large hero image (cover photo or latest construction photo). Small row of 2–3 thumbnails below. Save icon in the top right.

### Row 2 — Identity
Building name in large type. District below. Developer name with verification checkmark if verified.

### Row 3 — Key facts
- Price from
- Price per m²
- Delivery date
- Room types available
- Finishing types available (as small labeled chips)

### Row 4 — Trust strip
Verification badge, last-updated date, small construction-progress indicator if available ("Сейчас: 62% готово").

### Row 5 — Matching units preview
If the buyer has applied filters, a small line showing **[N] квартир подходят вашим фильтрам**, with up to 2 preview lines below:
- 2 комнаты · 64 м² · с ремонтом · от 820 000 TJS
- 2 комнаты · 72 м² · без ремонта · от 690 000 TJS

### Row 6 — Actions
- **Смотреть проект** (primary)
- **Все квартиры** (secondary, shows unit list filtered to matching units)

## 8.7 Empty and low-result states

This is critical — the platform cannot have dead ends when results are low.

**Zero buildings match filters:**
Show a friendly, illustrated message:
- Heading: *"По вашим фильтрам проектов не найдено"*
- Body: *"Попробуйте:"*
- Action 1: *"Убрать фильтр: [specific filter]"* (the filter with the smallest impact — e.g., "Убрать фильтр: Сдача в 2026")
- Action 2: *"Расширить бюджет до [X]"* (automatically suggests a 20% wider range)
- Action 3: *"Посмотреть похожие квартиры"* (switches to apartments-first mode with relaxed filters)
- Action 4: *"Помочь выбрать"* (opens the guided quick finder so the buyer can reset their criteria with guidance)

**1–3 buildings match (low confidence):**
Show the results normally, plus a small banner below the last card: *"Всего [N] проектов. Хотите расширить поиск?"* with a suggestion.

**No buildings in the whole database (platform launch day):**
Show: *"Мы только запускаемся. Первые проекты появятся на этой неделе — оставьте номер, чтобы узнать первым."* with a single phone field.

## 8.8 Main actions
- Primary: tap a building card to open it
- Secondary: adjust filters, switch to apartments mode, toggle map, switch to guided finder

---

# 9. Map view

## 9.1 Main goal

Help location-sensitive buyers explore buildings spatially without losing filter context.

## 9.2 Mobile structure

Full-screen map with sticky filter summary at the top and sticky result count. Tap a pin to open a compact bottom-sheet preview card.

## 9.3 Desktop structure

Split view: map on the left, building list on the right. Hovering a card highlights the corresponding pin. Clicking a pin highlights the card.

## 9.4 Pin preview card content

- Main image (small)
- Building name
- Price from
- Price per m²
- Delivery date
- Verification badge
- Matching unit count for current filters
- Buttons: **Смотреть проект**, **Все квартиры**

## 9.5 Map behavior

Moving the map far enough reveals a **"Искать в этой области"** button. Tapping it refreshes results to the current viewport. No silent refresh.

## 9.6 Edge cases

- **Location services denied:** the map still works with manual panning and default center on Dushanbe
- **No pins in current viewport:** show a small floating message: *"В этой области нет проектов. Сдвиньте карту или попробуйте другой район."*
- **Map fails to load:** fall back to list view with a message: *"Карта временно недоступна. Показываем результаты списком."*

## 9.7 What to avoid

- No forcing a full-page open on every pin tap
- No tiny tap targets on mobile
- No cluttered clusters that hide information
- No silent viewport-based result refresh

---

# 10. Building detail page

This is the most important page on the platform.

## 10.1 Main goal

Turn buyer interest in a building into confidence to contact or shortlist.

## 10.2 First screen must communicate

- what this building is
- who built it
- whether they can trust it
- when it will be ready
- how much apartments cost
- whether matching units are available
- what the next action should be

## 10.3 Mobile block order

### Block A — Hero gallery
Swipeable image carousel. Large and high quality. Save icon top right. Compare icon next to it. Back button top left. If any image fails to load, show a neutral placeholder, never a broken icon.

### Block B — Identity strip
Building name, district, developer name (with developer verification checkmark if verified), verification badge, last-updated date.

### Block C — Key facts strip
Horizontal strip with compact labels:
- Цена от: 650 000 TJS
- От: 8 100 TJS/м²
- Сдача: Q3 2026
- Комнаты: 1, 2, 3, 4
- Отделка: без ремонта, предчистовая
- Рассрочка: да (до 7 лет)

This strip must fit on one screen and is the most important information block on the page.

### Block D — Construction progress
**This is the signature wow feature.**

Section title: **Ход строительства**

A horizontal scrolling row of dated photos. Each photo shows month and year ("октябрь 2026"). Below the photos, a progress bar with percentage complete: **Сейчас: 62% готово · Сдача обещана Q3 2026**.

Tapping any photo opens a lightbox with a larger view and photo date.

If the building is delivered, this section is replaced by: **Объект сдан в [date] — см. фотографии фасада и дворов.**

If no construction photos exist yet for a new building, this section shows: *"Фото стройки появятся после первого визита нашей команды на объект (обычно в течение 2 недель после публикации)."* with an estimated date.

### Block E — Why this fits you
Shown only if the buyer came from filtered search or completed the guided finder. Three to five short reasons derived from the match:

- В рамках вашего бюджета
- Тип отделки соответствует фильтру
- Сдача соответствует желаемому сроку
- Доступна рассрочка
- Локация в выбранном районе

For organic visitors without context, this block is replaced by a short **"Что делает этот проект особенным"** block with 2–3 selling points the developer chose.

### Block F — Trust evidence
Section title: **Проверка и надёжность**

- Verification tier with date
- Developer profile card (name, years active, completed projects count, verified status)
- Last inventory refresh date
- Documents status if available (not required for V1)

Tapping verification tier opens a short explainer: what "Объект проверен" means, when the check was done, who did it.

### Block G — Payment clarity
Section title: **Условия оплаты**

- Cash price
- Installment terms: first payment %, total term, monthly amount for a typical unit
- Example for a 2-room unit: *"Цена 850 000 TJS — первый взнос 15% = 127 500 TJS — 7 лет — ежемесячно 8 601 TJS"*

Never an interest rate. Never "% годовых". Just the direct installment structure.

### Block H — Available units (developer inventory)
Section title: **Новые квартиры от застройщика · [N]**

Filter chips at the top of this section: rooms (1, 2, 3, 4+), finishing (без ремонта, предчистовая, с ремонтом), price range, floor range.

Unit rows below, each row showing:
- Rooms, size, floor
- Finishing label
- Price and price per m²
- Availability status
- **Смотреть** button

If the buyer arrived from filtered search, this section is pre-filtered accordingly.

**Empty state for this section:** if the developer has no units listed yet, show: *"Квартиры от застройщика скоро появятся. Свяжитесь напрямую через WhatsApp, чтобы узнать о доступных вариантах."*

### Block I — Resale inventory
Section title: **Перепродажа · [N]**

Visually distinct from Block H — subtle background color difference, clear section header.

Unit rows as in Block H, but each row additionally shows:
- Source chip (👤 Собственник or 🤝 Посредник)
- Verification badge for that specific listing
- Sometimes renovated vs unrenovated label

**Empty state for this section:** if there are zero resales in this building, the section shows: *"Пока нет перепродаж в этом проекте. Вы владелец или продавец в этом ЖК? [Разместите объявление →]"* — turning a dead end into a supply opportunity.

### Block J — Location and nearby context
Section title: **Расположение и инфраструктура**

A map centered on the building. Below the map, a grid of amenity distances:
- Мечеть: 420 м
- Школа: 180 м
- Базар: 850 м
- Больница: 1.2 км
- Остановка транспорта: 120 м
- Парк: 650 м

### Block K — Project overview
Section title: **О проекте**

Short description from the developer, 3–6 sentences. Key architectural features. What makes this building special.

### Block L — Similar buildings
Section title: **Похожие проекты**

Three to five building cards showing similar projects (same district, similar price range, similar delivery timing).

If the database is too small for meaningful similar buildings, this section is hidden entirely rather than showing weak matches.

### Block M — Sticky bottom contact bar
Persistent on mobile as the user scrolls. Contains:
- **WhatsApp** (primary, green)
- **Позвонить** (secondary)
- **Запросить визит** (opens a short form modal)

## 10.4 Desktop layout

Two-column layout below the hero: main content on the left (Blocks C through L), sticky contact card on the right. The contact card contains the developer's name and logo, phone number, WhatsApp button, and **Запросить визит** button. A response-time badge (e.g., "Ответ обычно в течение 1 часа") appears only once the developer/seller has 3+ completed contacts with response data; before that threshold, the badge is hidden entirely rather than shown empty.

## 10.5 Contact failure recovery

If the buyer taps WhatsApp and the link fails (WhatsApp not installed, no internet), show a fallback modal:
- **Позвонить напрямую: [phone]**
- **Отправить запрос через форму**

If the seller has not responded to a visit request in 24 hours, the buyer sees a prompt on their Saved page: *"Застройщик ЖК [X] ещё не ответил на ваш запрос. Хотите попробовать WhatsApp?"*

## 10.6 Main actions
- Primary: open a specific unit (from Block H or I), or contact the developer
- Secondary: save the building, add to compare, request a visit

---

# 11. Apartments browsing (Квартиры list)

## 11.1 Main goal

Let buyers filter individual apartments and see relevant results across all buildings, clearly labeled by source.

## 11.2 First screen must communicate

- how many apartments match the filters
- which sources are included
- what each result offers

## 11.3 Mobile structure

Same sticky-bar pattern as Projects browsing, but now with **source filter** prominently available.

### Active filter chips
Include source chips explicitly when relevant: "от застройщика", "собственник", "посредник", "только проверенные".

### Result count
**X квартир найдено · обновлено сегодня**

### Listing cards
Stacked vertically as described in Section 11.6.

## 11.4 Available filters

- Price range
- **Monthly installment range** (not interest rate — direct monthly amount)
- Rooms
- Size range
- Finishing type
- District
- Building (if already selected)
- Source (all / от застройщика / собственник / посредник)
- Verification level (all / only profile-verified / only on-site-verified)
- Floor range

Installment range is a first-class filter, not hidden. This matches how buyers actually think about affordability.

## 11.5 Sort options

- Рекомендуемые (trust-weighted, matching guided-finder preferences if available)
- Сначала дешёвые
- Сначала новые
- Ближайшая сдача
- Лучшая цена за м²

## 11.6 Listing card structure

### Row 1 — Visual preview
Main image or floor plan. Small thumbnails row below. Save icon top right.

### Row 2 — Identity
Building name and district. Source chip prominently displayed (🏗 От застройщика, 👤 Собственник, or 🤝 Посредник). Verification badge next to the source chip.

### Row 3 — Key facts
- Rooms, size, floor
- Price total
- **Price per m²** with fairness badge ("На 8% ниже среднего по району" or "В пределах средней цены")
- Finishing label as prominent chip (без ремонта, предчистовая, с ремонтом, отремонтировано владельцем)

### Row 4 — Installment hint
If installments are available: **Рассрочка: от 8 600 TJS/мес**

### Row 5 — Seller and response
Small line: seller name or "Офис продаж застройщика". A response-time badge ("Отвечает обычно за <1 часа") appears **only when the seller has received at least 3 completed contacts with response data**. Before that threshold, the response-time portion is hidden entirely — the row shows the seller name alone. The badge is never shown empty, never shows "нет данных," and never guesses.

### Row 6 — Actions
- **Смотреть** (primary, opens listing page)
- **WhatsApp** (quick contact without opening)
- Save and Compare icons

## 11.7 Mixed-source results

When the buyer has not filtered by source, results include all three types mixed together. The source chip on each card makes the mix clear and never confusing. Ranking is trust-weighted, so on-site-verified listings rise regardless of source.

## 11.8 Empty and low-result states

**Zero apartments match filters:**
Same helpful recovery pattern as projects browsing:
- Suggest relaxing the most restrictive filter (e.g., "Убрать фильтр: [filter name]")
- Suggest widening the budget range by ~20%
- Offer to switch to projects-first mode to see buildings that might get matching units later
- Offer to clear all filters
- Offer **"Помочь выбрать"** to reset criteria via the guided quick finder

**1–3 apartments match (low confidence):**
Show results plus a suggestion banner: *"Мало результатов. Попробуйте расширить [filter]."*

**Apartments available but none verified at Tier 3:**
If the buyer filtered to "only on-site verified" and zero match: *"Пока нет квартир с проверкой на месте по вашим критериям. Показать все проверенные объявления?"* toggles back to broader verification level.

## 11.9 Main actions
- Primary: open a specific listing
- Secondary: adjust filters, switch to building mode, save, compare

---

# 12. Listing detail page

## 12.1 Main goal

Make one specific apartment easy to evaluate and act on.

## 12.2 First screen must communicate

- which apartment this is (building, rooms, floor, price)
- who is selling it (source chip, verification)
- whether the price is fair (fairness badge)
- what the finishing is
- how to contact the seller

## 12.3 Mobile block order

### Block A — Photo gallery
Swipeable carousel. Save and compare icons top right. Back button top left. Fallback for broken images: neutral placeholder.

### Block B — Identity strip
Building name (tappable, opens building page), district, rooms, size, floor. Source chip and verification badge prominently placed.

### Block C — Price block
- Total price in large type
- Price per m²
- Fairness badge
- If installment available: **Рассрочка: первый взнос от X · ежемесячно от Y**

### Block D — Finishing block
Large visual chip showing the finishing type. Below, a one-sentence explanation of what that finishing means:

- **Без ремонта**: "Квартира без отделки — готова для вашего ремонта."
- **Предчистовая**: "Базовая отделка — готова к завершающему ремонту."
- **С ремонтом**: "Полная отделка от застройщика — готова к заселению."
- **Отремонтировано владельцем**: "Квартира отремонтирована владельцем — осмотрите лично, чтобы оценить качество."

### Block E — Why this fits you
Shown only if buyer came from filtered search or guided finder. 2–4 short match reasons.

### Block F — Unit details
- Building block/section
- Bathroom count
- Orientation
- Balcony
- Ceiling height
- Handover date (if different from building-level handover)
- View notes if provided

### Block G — Seller information
Source chip repeated. Seller name (or developer office name). Verification badge with date (per the rules in section 2.3). Response-time badge appears only if the seller has 3+ completed contacts with response data — before that threshold, it is hidden entirely. A short line explaining what the verification badge means on a tap.

For 🤝 Посредник listings, a small extra line: *"Продавец подтвердил разрешение от владельца."* if Tier 3 has been earned, or *"Разрешение от владельца пока не подтверждено командой платформы."* if it hasn't.

### Block H — Building context mini-card
A compact version of the building card with a link to the full building page. Shows building name, construction progress, delivery date, verification.

### Block I — Description
Seller's free-text description. Limited to 800 characters with expand option. Never the primary source of key facts — those live in structured blocks above.

### Block J — Similar listings
Three to five similar apartment cards (same building if possible, same district otherwise). Hidden if too few matches exist.

### Block K — Sticky contact bar
Same as building page:
- **WhatsApp**
- **Позвонить**
- **Запросить визит**

## 12.4 Desktop layout

Two columns below the hero gallery: details on the left, sticky contact card on the right with price, key facts, and action buttons.

## 12.5 Edge cases

**Listing sold while buyer is viewing it:**
A gentle inline banner replaces the price block: *"Эта квартира уже продана. Посмотрите похожие варианты в этом же ЖК."* with links to other units in the same building.

**Listing removed by seller:**
Redirect to building page with a small message: *"Это объявление больше не активно. Вот другие квартиры в этом проекте."*

**Seller not responding to WhatsApp:**
A small note appears on the listing after 24 hours for returning visitors: *"Продавец обычно отвечает в течение [time]. Если ответ задерживается — попробуйте позвонить напрямую."*

## 12.6 Main actions
- Primary: WhatsApp or Request Visit
- Secondary: save, compare, view building

---

# 13. Compare page

## 13.1 Main goal

Help buyers narrow their choice by showing 2–4 saved items side by side and guide them to a decision.

## 13.2 Modes

Two modes, clearly separated:
- **Сравнить проекты** (compare buildings)
- **Сравнить квартиры** (compare units)

The buyer picks a mode when entering compare. Items of different types are never mixed in one table.

## 13.3 Mobile structure

Horizontal scrollable cards, two visible at a time. Sticky first column showing row labels. Compact formatting suited to a phone screen.

## 13.4 Desktop structure

Matrix table with sticky first column. Up to 4 items side by side.

## 13.5 Project compare rows

- Photo
- Name
- Developer (with verification)
- District
- Delivery date
- Price from
- Price per m² (with fairness context)
- Finishing types available
- Installment terms
- Construction progress %
- Verification tier
- Room types available
- Size range
- Matching units count

## 13.6 Unit compare rows

- Photo
- Source chip
- Verification tier
- Building
- Rooms
- Size
- Floor
- Finishing (with prominent label)
- Price
- Price per m² (with fairness context)
- Monthly installment amount (if available)
- Handover date
- Availability status
- Seller response time

## 13.7 Highlight labels

Above the matrix, simple labels like **Дешевле всех**, **Ближайшая сдача**, **Лучшая цена за м²**, **Сильнее всех проверка** are attached to whichever item in the comparison wins that metric.

## 13.8 Decision actions

At the bottom of the compare table, a **"Что дальше?"** section helps resolve comparison into a decision:

- **"Связаться с понравившимся вариантом"** — opens a modal where the buyer selects which item to contact and proceeds to WhatsApp/Call/Visit Request
- **"Поделиться сравнением с семьёй"** — generates a shareable link that preserves the comparison state in the URL (no account or server-side storage needed)
- **"Добавить ещё один вариант"** — opens browsing to add a 4th item
- **"Сохранить объекты в избранное"** — saves all items in the compare set to the buyer's Saved page (requires login, triggers standard save flow)

This is what turns comparison from a display into a decision tool.

## 13.9 Edge cases

**Less than 2 items in compare:** show empty state: *"Добавьте 2 или более варианта, чтобы сравнить."* with a link to browsing.

**Items of different types added (user tried to add a building to a unit comparison, or vice versa):** a confirmation modal appears before any data is lost: *"У вас в сравнении [N] квартир. Чтобы сравнивать проекты, нужно очистить текущее сравнение. Продолжить?"* with two buttons: **"Да, сравнить проекты"** (clears current items, switches to building mode) and **"Нет, оставить квартиры"** (keeps the current unit comparison, cancels the building-add action). Data is never lost silently.

**One of the compared items was deleted or sold:** show the item greyed out with a badge: *"Продано [date]"* — keep in comparison for transparency but exclude from "best" labels.

## 13.10 Main actions
- Primary: contact the preferred item
- Secondary: share comparison, save, remove, add another

---

# 14. Saved page

## 14.1 Main goal

Support multi-session decision making and return visits. This page is where the retention loop lives.

## 14.2 Structure

Two tabs:
- **Сохранённые проекты**
- **Сохранённые квартиры**

Above the tabs, a **"Что изменилось"** summary strip (only shown if there are changes since last visit):

*"С вашего последнего визита: 2 снижения цены, 1 новая квартира в сохранённых ЖК, новые фото стройки в [N] проектах"* — each item tappable to see details.

## 14.3 Saved item cards

Similar to the cards in the browsing views, plus a **change badge** if anything has changed since the buyer saved the item:

- **Цена изменилась** (with old and new price, green arrow for drop)
- **Статус изменился** (e.g., sold, reserved — amber for status changes per Design System §7.12; never red, halal-by-design)
- **Добавлены новые квартиры** (for saved buildings)
- **Обновлены фото стройки** (when new construction photos are uploaded)
- **Продавец ответил медленно** (if a visit request was not responded to within 24h)

Badges are honest and only appear when a real change occurred. Multiple badges can show on one card.

## 14.4 Bulk actions

At the top of each tab:
- **Сравнить выбранные** (select checkboxes on cards, then compare)
- **Поделиться списком** (generates a shareable link)
- **Удалить выбранные**

## 14.5 Empty states

**No saved items ever:** *"Здесь будут ваши избранные квартиры и проекты. Начните сохранять понравившиеся варианты, чтобы легко к ним возвращаться."* with a button to start browsing.

**Saved items all sold/removed:** *"Ваши сохранённые варианты больше не активны. Посмотрите похожие проекты в тех же районах."* with personalized suggestions.

## 14.6 Main actions
- Primary: open saved item
- Secondary: compare, contact, remove, share list

---

# 15. Contact flow

## 15.1 Main goal

Make contact fast and low-friction while capturing enough intent to help the seller respond well — and ensuring the buyer never hits a dead end if contact fails.

## 15.2 Three always-visible options

On every building page, listing page, and relevant compare card:
- **WhatsApp** (one tap, opens WhatsApp with a pre-filled message including the listing context)
- **Позвонить** (one tap, initiates phone call on mobile)
- **Запросить визит** (opens a short form modal)

## 15.3 Request Visit form

Short and simple. Fields:
- Name (required)
- Phone (required, pre-filled if user is logged in)
- Preferred contact method (WhatsApp / Call, radio)
- Purchase timeline (скоро / в течение 3 месяцев / в течение 6 месяцев / изучаю рынок)
- Optional note
- Optional checkbox: **"Предпочитаю, чтобы связалась женщина-агент"** (shown only where applicable)
- Optional checkbox: **"Указать другой номер моего родственника для связи"** that reveals a second phone field

Pre-filled with listing context automatically (building, unit if applicable).

## 15.4 Success state

Clear confirmation: *"Запрос отправлен. Продавец свяжется с вами в ближайшее время, обычно в течение [seller's avg response time]."* Buttons: **Продолжить просмотр**, **Сохранить квартиру**.

The request is automatically added to a "Мои запросы" section of the buyer's account.

## 15.5 Contact failure recovery

**WhatsApp link fails:**
Show fallback: *"WhatsApp не открывается. Попробуйте:"* with two options — call directly, send via form.

**Phone number copy fails:**
Auto-select the number and show: *"Номер выделен — нажмите чтобы скопировать или позвонить."*

**Seller doesn't respond within 24 hours:**
Send a gentle reminder in the buyer's "Мои запросы" section. Offer alternative: *"Не дождались ответа? Попробуйте связаться напрямую через WhatsApp или посмотрите похожие проекты."*

**Seller doesn't respond within 72 hours:**
Flag the listing internally for response-time calculation. Buyer sees: *"Похоже, продавец занят. Вот похожие варианты:"* with alternatives.

## 15.6 What must not appear

- No lengthy lead forms
- No required fields beyond what's listed above
- No "create an account to continue" blocks before contact
- No interest-rate calculators inside the contact flow
- No fake urgency
- No email requirement

---

# 16. Diaspora landing page

## 16.1 Main goal

Convert Tajik migrants in Russia into confident remote buyers.

## 16.2 First screen must communicate

- this platform understands the remote buyer situation
- apartments can be evaluated remotely with construction photos and verified listings
- contact is possible via WhatsApp, Telegram, or IMO
- the platform will help coordinate with family in Tajikistan

## 16.3 Block order

### Block A — Hero
Headline: **"Купите квартиру в Душанбе, находясь в России."** One-line supporting message. Primary CTA: **Смотреть проекты**. Secondary CTA: **Связаться в WhatsApp**.

### Block B — How it works for diaspora buyers
Four-step explanation:
1. Выберите проект с проверкой и фото стройки
2. Свяжитесь с нами через WhatsApp, Telegram или IMO
3. Мы поможем назначить визит для вашей семьи в Душанбе
4. Помощь с документами и переводом средств

### Block C — Featured projects for remote buyers
3–5 buildings well-suited to remote purchase: fully verified, complete payment plans, clear construction progress.

### Block D — Contact strip
Three buttons:
- **WhatsApp**
- **Telegram**
- **IMO**

IMO is essential for diaspora users on older Android phones in Russia. It must be visible here even if it's less prominent elsewhere on the platform.

### Block E — Testimonials (when available)
Short quotes from real diaspora buyers once the platform has them. Until then, this block is hidden rather than faked.

## 16.4 Main actions
- Primary: tap a featured project or contact via WhatsApp
- Secondary: switch language, ask a question via one of the three messengers

---

# 17. Post listing flow

## 17.1 Main goal

Let anyone post a legitimate listing in under three minutes, with zero documents required, and with the flow resilient to interruption.

## 17.2 Guiding principle

Post first, verify later. The flow must not ask for ownership documents. A verified phone number is the only barrier to posting.

## 17.3 Step sequence

### Step 1 — Phone verification
Enter phone number. Receive SMS OTP. Confirm. If already logged in, skip.

### Step 2 — Who does this apartment belong to?
A single honest question with three options:

- **Мне или моей семье** → labeled 👤 Собственник
- **Другому человеку — продаю от их имени** → labeled 🤝 Посредник
- **Я представляю застройщика** → labeled 🏗 От застройщика, triggers one-time developer confirmation before first listing goes live

The wording makes the honest answer obvious and destigmatizes each option. Sellers are not punished for truth.

### Step 3 — Select the building
Autocomplete search of buildings already on the platform. If the building does not exist, a **"Не нашли ваш дом?"** link opens a simple form requesting building addition (handled by the platform team; not a self-service addition).

### Step 4 — Unit details
- Rooms (required)
- Size in m² (required)
- Floor (required)
- Price in TJS (required)
- Finishing type (required, one of four options)
- Availability status (required)
- Installment available (optional)
- Description (optional, free text, max 800 characters)

### Step 5 — Photos
Upload 5–15 photos. Mobile-friendly uploader that accepts direct camera capture. Photo requirements explained clearly: real photos only, no marketing renders unless posting as developer.

### Step 6 — Review and publish
A preview showing exactly how the listing will appear. One confirmation button: **Опубликовать**.

### Step 7 — Verification upsell
Immediately after publishing, a friendly screen explains that the listing is live but can earn higher trust badges:
- Upload selfie with ID for the blue badge (2 minutes)
- Request on-site verification for the green badge (free)

The user can skip this — the listing is already live.

## 17.4 Resilience and draft recovery

**Every step auto-saves to a draft.** If the seller closes the browser or loses connection mid-flow, they can return later and resume exactly where they left off. A banner on the dashboard shows: *"У вас есть незавершённое объявление. Продолжить?"*

**Photo upload failure:** individual photo failures don't block the flow. A "retry" icon appears on any failed photo. The rest upload normally.

**SMS OTP fails:** after 3 failed attempts, offer "Позвонить мне с кодом" as a fallback. After 5 failed attempts, show platform contact info for manual help.

**Building not found:** the seller can request the building be added. Their listing stays in draft until the building is confirmed by the platform team (usually within 48 hours).

## 17.5 What the seller does not have to provide

- Ownership documents
- Power of attorney
- ID at the posting stage (only needed for Tier 2 upgrade, which is optional)
- Cadastral numbers
- Any signed papers

## 17.6 Main actions
- Primary: publish listing
- Secondary: save draft, request verification upgrades

---

# 18. Seller dashboard

## 18.1 Main goal

Let sellers manage their own listings without complexity and see how their listings are performing.

## 18.2 Structure

List of the seller's own listings with for each one:
- Listing title and main photo
- Status (active, sold, hidden)
- Verification tier badge
- View count and contact count (simple numbers)
- Actions: edit, mark sold, hide, request verification upgrade, delete

Above the list:
- **Опубликовать новое объявление** (primary action)
- Summary stats: active listings count, total views last 7 days, total contacts last 7 days

## 18.3 Seller notifications

Simple in-dashboard notifications:
- *"У вас новый запрос от покупателя по квартире [X]"*
- *"Ваше объявление [X] получило verification badge"*
- *"Ваше объявление [X] не обновлялось 30 дней — оно ещё актуально?"*

## 18.4 Edge cases

**Listing expires (no response from seller for 60 days):** auto-hidden with a message: *"Это объявление скрыто из-за неактивности. Подтвердите актуальность, чтобы вернуть его в поиск."*

**Listing reported by users (3+ complaints):** seller sees a message: *"Это объявление временно скрыто и проверяется командой."* with contact info for the platform team.

## 18.5 Main actions
- Primary: post new listing
- Secondary: edit existing, mark sold, request verification

---

# 19. Verification upgrade flows

## 19.1 Tier 2 flow — Профиль проверен

Screen explains the benefit clearly: *"Получите синий значок проверки — ваши объявления будут ранжироваться выше и вызывать больше доверия у покупателей."*

Required:
- Upload photo of national ID
- Upload selfie holding the ID

Submitted for manual review. Platform confirms within 24–48 hours. No property documents required.

**If rejected:** specific reason is given (ID not clear, selfie doesn't match, etc.) with a chance to resubmit.

## 19.2 Tier 3 flow — Объект проверен

Screen explains the benefit: *"Представитель платформы посетит квартиру и сделает официальные фото. Ваше объявление получит зелёный значок, верхнее ранжирование в поиске и максимальное доверие покупателей."*

For Собственник: seller selects a time slot. Platform team visits, takes geo-tagged photos, verifies that the apartment matches the listing. Free in V1.

For Посредник: same as above, plus a required phone call between the platform and the real owner confirming the intermediary's permission to sell. No signed documents — just a recorded verification call.

Badge valid for 45 days. Renewal flow prompts automatically before expiration: *"Ваша проверка истекает через 7 дней. Запланировать повторный визит?"*

## 19.3 Developer verification flow

Not self-service in V1. Platform team confirms new developer accounts by calling the developer's public office. Once confirmed, all listings from that developer inherit verified-developer status.

## 19.4 Edge cases

**Visit cancelled by seller:** can reschedule once free; second cancellation moves them to end of queue.

**Verification expires:** badge drops back to Tier 2 automatically. Seller gets one notification.

**Fraud detected during visit:** verification rejected with clear reason, listing suspended, seller account flagged for review.

---

# 20. Help center

## 20.1 Main goal

Answer first-time-visitor questions that would otherwise block their journey, without forcing them to read before browsing.

**V1 implementation:** static markdown-rendered FAQ at `/tsentr-pomoshchi`. No custom UI, no search, no rich layout — markdown files in `/content/help/{ru,tg}/*.md` rendered through a single `app/[locale]/tsentr-pomoshchi/[[...slug]]/page.tsx`. Articles below are the V1 starter set. Phase 2 will add a proper UI page (per UI Spec coverage), search, and analytics. The inline tooltips and first-visit tooltips in §20.3 / §20.4 ARE in V1 since they appear on already-built pages — only the standalone help center page is intentionally minimal.

## 20.2 Structure

A lightweight help center linked from footer and from specific tooltips throughout the platform. Articles cover:

- **Что означают значки проверки?** — explains the three tiers visually
- **Что такое "без ремонта", "предчистовая", "с ремонтом"?** — explains finishing types with photos
- **Что означает значок цены "на 12% ниже среднего"?** — explains price-per-m² fairness
- **От застройщика, собственник, посредник — в чём разница?** — explains the three-source model
- **Что такое рассрочка и как она работает?** — explains installment structure without interest
- **Как безопасно покупать новостройку?** — general buyer safety guidance
- **Как стать проверенным продавцом?** — explains the verification path
- **Покупаю из России — как это работает?** — links to diaspora flow

## 20.3 Inline help

Throughout the platform, small "?" icons next to unfamiliar terms open a short tooltip with a link to the full article. No buyer is left guessing.

## 20.4 First-visit tooltips

On first visit, a gentle tooltip can appear once near the first verification badge the buyer sees: *"Цвет значка показывает уровень проверки объявления. Узнать больше →"* — dismissible, never shown again after one dismiss.

## 20.5 Main actions
- Primary: browse back to the platform
- Secondary: contact platform team via WhatsApp for questions not covered

---

# 21. Mobile-first UX principles

## 21.1 Always show the primary action

Every page has one clear next action. On mobile, it's often in a sticky bottom bar. On desktop, it's in a sticky right-side card.

## 21.2 Keep above-the-fold simple

No more than three to four visual elements above the fold on mobile. Headline or key facts, primary action, trust signal. That's enough.

## 21.3 Use bottom sheets for structured input

Filters, quick contact, quick previews — all use bottom sheets that slide up from the bottom on mobile. Never modal overlays that feel heavy.

## 21.4 Keep filters progressive

Show the four most used filters as always-visible chips. Hide the rest behind a **More filters** button. Avoid 80-filter density.

## 21.5 Make finishing prominent

Finishing type is one of the top decision factors in this market. It should appear as a visual chip or badge on every card and every detail page, not buried in text.

## 21.6 Keep source and verification visible

Every listing card, everywhere, shows its source chip and verification badge. This is a non-negotiable visual rule.

## 21.7 Preserve fast contact

WhatsApp is the primary contact channel. It must be one tap away on every listing and every building page. No forms. No preambles.

## 21.8 Save and compare are light-touch

Both are icon buttons on cards and detail pages. Save confirms with a small toast. Compare confirms with a sticky compare bar showing current count. Never modal interruptions.

## 21.9 Language toggle is always accessible

RU / TJ toggle in the header, persistent across navigation. Switching language preserves all state — filters, saved items, compare set, form data.

## 21.10 Every empty state leads somewhere

No page, no filter combination, no error state is a dead end. Every zero-result screen offers at least one recovery action.

## 21.11 Every error is recoverable

Network failures, image failures, SMS failures, WhatsApp link failures — all show fallbacks, not broken states.

---

# 22. V1 must-have features summary

The following features are confirmed V1:

- Homepage with three entry paths (ready, uncertain, returning) and returning-user change strip
- Guided quick finder (~1-minute questionnaire)
- Projects browsing with filters and map
- Building detail page with construction-progress photos
- Apartments browsing with source chips and verification filter
- Listing detail page with source and verification clearly shown
- Compare (buildings or units, never mixed) with share-to-family and decision actions
- Save with change badges and bulk actions
- Contact flow (WhatsApp, Call, Request Visit) with failure recovery
- Diaspora landing page with IMO support
- Post listing with three-source honest labeling and draft recovery
- Seller dashboard with simple stats and in-dashboard notifications
- Verification upgrade flows (Tier 2 and Tier 3) with reject recovery
- Bilingual Russian and Tajik support throughout with state preservation
- Price-per-m² fairness badges
- Installment-based affordability filter and display
- Help center with inline tooltips and first-visit orientation

## What's not in V1

- Developer self-service dashboard
- Admin moderation UI (founder/team uses simple database tools in V1)
- Saved searches with automated alerts (change badges on saved items fills most of the gap)
- Automated property valuations
- Crime or school heat maps
- Draw-area map search
- Commute-time search
- AI recommendation engine beyond rule-based matching
- Rentals, resales of old housing, houses, commercial property, land

---

# 23. Pages at a glance

Every V1 page, its main goal, and its primary action:

| Page | Main goal | Primary action |
|---|---|---|
| Homepage | Route ready/uncertain/returning buyers to right path | Open Новостройки, Квартиры, or guided finder |
| Guided quick finder | Convert uncertain buyer to magic moment | See 3–5 matching apartments |
| Projects list | Browse and filter buildings | Open a building |
| Map view | Explore buildings spatially | Open a building preview |
| Building detail | Earn buyer confidence in a project | Open a unit or contact |
| Apartments list | Browse individual apartments | Open a listing |
| Listing detail | Make one apartment understandable | Contact via WhatsApp |
| Compare | Narrow between saved items into a decision | Contact preferred item or share |
| Saved | Support return visits with change visibility | Open saved item |
| Diaspora landing | Convert remote buyers | WhatsApp or open project |
| Post listing | Accept new inventory with minimal friction | Publish |
| Seller dashboard | Manage own listings and see performance | Edit or post new |
| Verification upgrade | Earn visible trust badges | Upload ID or request visit |
| Help center | Orient first-time visitors | Return to browsing |

---

# 24. Acceptance criteria for the blueprint

This blueprint is correct only if the product delivers these outcomes:

1. A buyer understands the platform's value within 10 seconds on the homepage.
2. A ready buyer reaches a relevant result within three taps from landing.
3. An uncertain buyer reaches the magic moment in about a minute (60–90 seconds) via the guided finder.
4. A returning buyer immediately sees what changed since their last visit on the homepage and on the saved page.
5. A buyer can understand a building's trust level at a glance on its detail page.
6. A buyer can see individual apartments with clear source labels without building-level confusion.
7. A buyer can save, compare, and return across sessions without losing state.
8. A buyer can contact a seller in one tap from anywhere that shows a listing.
9. A buyer whose WhatsApp link fails sees a clear recovery path.
10. A buyer whose contact goes unanswered for 24 hours sees a gentle next-step suggestion.
11. A seller can post a listing in under three minutes with nothing but a phone number.
12. A seller can resume a half-completed listing from any device after interruption.
13. A seller can see their verification upgrade path and complete it without friction.
14. A diaspora buyer can contact a seller via WhatsApp, Telegram, or IMO from the diaspora landing page.
15. Every user-facing word exists in both Russian and Tajik, and language switching preserves all state.
16. Every empty state and error state offers a recovery action — no page is ever a dead end.
17. First-time visitors can understand verification badges, source chips, and finishing types via inline tooltips without leaving the page they're on.

---

# 25. Final blueprint statement

The product should feel like **a fast, clear, trustworthy decision workspace for serious new-build apartment buyers in Dushanbe and Vahdat**, where ready buyers find their match in seconds, uncertain buyers are guided to the magic moment in under a minute, returning buyers see exactly what changed since they left, developers and owners and intermediaries all participate honestly, every listing carries visible trust, every price carries fair-value context, construction progress is proven with real photos, every page answers one clear question without clutter, and no situation — no empty result, no failed link, no half-completed action — leaves the user stuck.

It should not feel like another classifieds portal, another agent funnel, or another listing dump. It should feel like the one place buyers in Tajikistan can finally trust.

That is the blueprint the design and engineering work must deliver.
