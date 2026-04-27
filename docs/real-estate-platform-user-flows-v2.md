# Real Estate Platform — User Flows v2

## 1. Document purpose

This document defines exactly what happens, step by step, when real users try to accomplish real goals on the platform. It is the bridge between the blueprint (which defines what pages exist) and the screen-by-screen UI spec (which defines exactly how each screen looks).

For every flow, this document specifies:
- the entry points
- each step the user takes
- each screen they see
- each decision they make
- what happens when things go right
- what happens when things go wrong
- what happens when they hesitate, change their mind, or come back later
- where the flow ends

The goal is that no engineer, designer, or AI coding agent ever has to guess what should happen in any moment of the user's journey.

---

## 2. Core flow principles

### 2.1 Every flow serves a real goal
Flows are organized around user goals ("find an apartment that fits me," "post my apartment for sale," "return tomorrow and see what changed"), not around pages or features.

### 2.2 Every flow has defined entry points
A flow doesn't start at "the homepage." It starts at every real place the user can trigger it — direct link, search result, saved item, notification, returning session, WhatsApp share, etc.

### 2.3 Every flow handles hesitation
Users pause. They change their mind. They close the browser mid-action. They come back 3 days later. The flow must survive all of these.

### 2.4 Every flow handles errors
Network fails, SMS doesn't arrive, WhatsApp isn't installed, photo upload times out, seller doesn't respond. Each is specified.

### 2.5 Every flow has a clear end
The user either completes the goal (success) or exits to another flow. No flow leaves the user suspended.

### 2.6 No silent transitions
Every state change is visible to the user. Toasts confirm saves. Banners explain changes. Badges mark what's new.

---

## 3. The three buyer archetypes

All buyer flows are designed to serve these three archetypes as defined in the PRD and blueprint:

- **Ready buyer (R)** — knows their budget, district, and rough apartment type. Wants to browse and act fast.
- **Uncertain buyer (U)** — doesn't know their budget, district, or type yet. Needs guidance to reach the magic moment.
- **Returning buyer (B)** — has been on the platform before. Has saved items or a search history. Wants to continue where they left off.

Every flow notes which archetype it primarily serves. Flows that serve multiple archetypes note how the experience differs for each.

---

## 4. Notation legend

Flows are written in structured natural language. Key conventions:

- **Step 1, Step 2, Step 3** — sequential user actions
- **If [condition] → [path]** — decision branch
- **On error:** — what happens when the step fails
- **Recovery:** — how the user gets back on track
- **Exit:** — where the flow ends (with the next flow that may follow)
- **Cross-link:** — transition to another flow
- Page names match the blueprint exactly (e.g., "Homepage", "Building detail page", "Listing detail page")
- Block names within pages match the blueprint (e.g., "Block C — Key facts strip")

---

# 5. Buyer flows

## Flow B1 — First-time ready buyer completes a search and contacts a seller
**Primary archetype:** Ready buyer (R)
**Goal:** Find an apartment that matches known criteria and contact the seller.
**Entry points:** direct URL, search engine, WhatsApp share from friend, ad click.

### Steps

**Step 1.** Buyer lands on Homepage.
They see hero with three paths (Новостройки, Квартиры, Помочь выбрать), Block D quick search, and Block F featured buildings.
Block C (returning user strip) does NOT appear because this is a first-time visit.

**Step 2.** Buyer taps **Квартиры** tile (they already know they want a specific apartment, not a whole building).
Destination: Apartments browsing page with no filters yet.

**Step 3.** Buyer opens filter panel and sets:
- Budget max: 800 000 TJS
- Rooms: 2
- District: Исмоили Сомони
- Finishing: any

Applies filters. Result count updates to "X квартир найдено".

**Decision point — did results appear?**
- If **≥4 results:** continue to Step 4
- If **1–3 results:** Step 3a — low-confidence banner appears suggesting "Мало результатов. Попробуйте расширить [filter]." Buyer either accepts or continues with few results.
- If **0 results:** Step 3b — zero-result empty state shows with specific recovery actions (remove tightest filter, widen budget 20%, switch to projects mode, clear all filters). Buyer picks one and returns to Step 3.

**Step 4.** Buyer scrolls listings. Each card shows source chip (🏗 / 👤 / 🤝), verification badge, fairness badge, finishing chip, installment hint.

**Decision point — did buyer understand the source chips?**
If this is the first listing they see, a dismissible first-visit tooltip appears near the first source chip: *"Этот значок показывает, кто продаёт квартиру. Узнать больше →"*. Buyer either reads or dismisses.

**Step 5.** Buyer taps a specific listing card.
Destination: Listing detail page.

**Step 6.** On Listing detail page, buyer sees Block A gallery, Block B identity with source+verification, Block C price with fairness badge, Block D finishing block with explanation, Block F unit details, Block G seller info, Block H building context mini-card, Block K sticky contact bar.

Block E (Why this fits you) appears because buyer came from filtered search.

**Step 7.** Buyer taps **WhatsApp** in Block K.

**Decision point — did WhatsApp open successfully?**
- If **yes:** WhatsApp opens with pre-filled message including listing context (building, unit, link). Flow exits to WhatsApp.
  → Cross-link: Flow B10 (Contact follow-up after 24h) begins in background.
- If **WhatsApp link fails (not installed, no internet):** fallback modal appears with "Позвонить напрямую: [phone]" and "Отправить запрос через форму". Buyer picks one. Recovery continues.
- If **buyer changes mind mid-modal:** dismisses modal, returns to Listing detail page. No state lost.

### Exit conditions
- Success: buyer reached WhatsApp, phone call, or submitted visit request form
- Partial success: buyer saved the listing for later (Flow B5)
- Abandon: buyer left the site — next return triggers Flow B3 (Returning buyer)

---

## Flow B2 — First-time uncertain buyer uses guided quick finder
**Primary archetype:** Uncertain buyer (U)
**Goal:** Reach the magic moment (3–5 matching apartments) without knowing what they want at entry.
**Entry points:** Homepage hero "Помочь выбрать · около минуты" tile (Block B), direct URL, "Помочь выбрать" suggestion inside zero-result empty states in Projects browsing and Apartments browsing.

### Steps

**Step 1.** Buyer lands on Homepage and taps **Помочь выбрать · около минуты**.
Destination: Guided quick finder Screen 1 (Budget).

**Step 2.** Screen 1 — Budget. Buyer picks a range, enters a custom number, or taps **"Пока не знаю"**.
Whatever they choose, the answer is saved in session. Progress indicator shows 1/5.

**Step 3.** Screen 2 — Rooms. Buyer taps room-count chips (multi-select) or skips. Progress 2/5.

**Step 4.** Screen 3 — Area. Buyer taps districts on map or in list, or skips. Progress 3/5.

**Decision point — buyer does not recognize district names?**
A small "?" icon next to unfamiliar district names opens a tooltip with one-line description (e.g., *"Исмоили Сомони — центральный район, близко к Рудаки"*). Buyer either reads or skips.

**Step 5.** Screen 4 — Finishing. Buyer taps a finishing type card. Tappable explainer next to each type shows what it means.

**Decision point — buyer confused about finishing types?**
Each card has an inline explanation ("Без ремонта: вы делаете ремонт сами"). Plus a "?" icon linking to the full help-center article.

**Step 6.** Screen 5 — Timing and payment. Buyer picks timing and payment preference or skips. Progress 5/5.

**Step 7.** Results screen appears showing 3–5 matching apartments.

Each result card shows:
- Match percentage ("Совпадение 92%")
- Why it matches ("В вашем бюджете · Нужное количество комнат · Отделка соответствует")
- Full listing card content (source, verification, price, fairness badge, finishing)

**Decision point — match quality?**
- **If ≥3 strong matches (>70% match):** show the matches. This is the magic moment. Continue to Step 8.
- **If 1–2 matches only:** show them plus 2–3 near-matches with explanation: *"Нашли [N] точных совпадений. Вот похожие варианты, которые могут подойти:"*.
- **If 0 matches:** show 3–5 nearest matches with explanation: *"По точным критериям нет совпадений. Вот похожие варианты:"* with a badge on each explaining what didn't match.

**Step 8.** Buyer does one of:
- Taps a matching apartment → goes to Listing detail page (continues Flow B1 from Step 6)
- Taps **"Посмотреть все подходящие · [N] вариантов"** → goes to Apartments browsing with filters pre-applied (continues Flow B1 from Step 4)
- Taps **"Изменить ответы"** → returns to Step 2
- Saves a result → Flow B5

### Exit conditions
- Success: buyer opened a specific listing from the results
- Partial success: buyer saved a result, or modified their answers
- Abandon: buyer closed the flow — their answers persist in session for 7 days. If they return to Homepage within that window, Block C shows *"Продолжить с ответов в помощнике выбора"*

---

## Flow B3 — Returning buyer sees what changed
**Primary archetype:** Returning buyer (B)
**Goal:** Quickly see what has changed in their saved items since last visit and continue decision-making.
**Entry points:** Homepage (direct visit), saved-item notification link, bookmark.

### Steps

**Step 1.** Buyer lands on Homepage.
Session check: has this device/account visited before? Does it have saved items or a last-visit timestamp?

**Decision point — first-time or returning?**
- **First-time:** Block C hidden. Flow continues as Flow B1 or B2.
- **Returning with saved items and at least one change:** Block C (Returning user strip) appears prominently just below the hero.
- **Returning with saved items and no changes:** Block C shows *"С момента вашего последнего визита изменений в ваших сохранённых объектах нет. Посмотрите что нового на платформе:"* with 3–5 newly-added buildings.
- **Returning without saved items:** Block C hidden, but a subtle welcome message may appear in header area.

**Step 2.** Buyer scans Block C. Each item in the list is tappable:
- *"Цена квартиры в ЖК [X] снижена на 30 000 TJS"* → opens Listing detail page, change badge shown prominently
- *"Новые фото стройки в ЖК [Y]"* → opens Building detail page at Block D (Construction progress), scrolled to latest photo
- *"2 новые квартиры в ЖК [Z]"* → opens Building detail page at Block H (Available units), filtered to newest
- *"Квартира [X] больше не доступна"* → opens a gentle explanation: "Эта квартира продана. Вот похожие варианты в этом же ЖК:"

**Step 3.** Buyer taps one of the changes and continues evaluation.

**Step 4.** After viewing one change, buyer can:
- Return to Homepage (Block C persists until dismissed or all changes viewed)
- Go to Saved page to see full change list
- Continue browsing (continues other flows)

### Exit conditions
- Success: buyer viewed at least one change
- Partial success: buyer navigated to saved page
- Abandon: buyer left without viewing changes — the changes remain flagged for next return

---

## Flow B4 — Buyer switches between projects mode and apartments mode mid-search
**Primary archetype:** Ready buyer (R) or Uncertain buyer (U)
**Goal:** Explore both browsing modes without losing filter state.

### Steps

**Step 1.** Buyer is in Apartments browsing with filters set (budget, rooms, district).

**Step 2.** Buyer taps a mode-switch link: **"Показать как проекты"** (visible in Apartments browsing header).

**Step 3.** System translates apartment-level filters to their project-level equivalents:
- Budget range → min/max price_from
- Rooms → rooms_available in the building
- District → district (same)
- Finishing → finishing_types_available
- Source → (cannot translate cleanly, defaulted to "all")

**Step 4.** Buyer lands on Projects browsing with translated filters already applied. A small toast: *"Фильтры сохранены. Теперь смотрите проекты."*

**Step 5.** Buyer can switch back with **"Показать как квартиры"** at any time. System translates back, preserving the subset of filters that exists in both modes.

### Exit conditions
- Buyer continues browsing in either mode
- Filters are preserved across the switch in both directions

### Edge cases
- **Translation loses a filter (e.g., exact floor range has no project equivalent):** the lost filter is listed in the toast: *"Фильтр 'Этаж' не применяется к проектам — он вернётся, если вы переключитесь обратно."*
- **Buyer reaches zero results after mode switch:** standard zero-result recovery kicks in (Flow B1 Step 3b pattern)

---

## Flow B5 — Buyer saves a listing or building
**Primary archetype:** All
**Goal:** Save an item for later consideration.
**Entry points:** Save icon on card (browsing), Save icon on detail page, Save from compare page, Save prompt after contact.

### Steps

**Step 1.** Buyer taps the save icon (heart or bookmark).

**Decision point — is the buyer logged in?**
- **Logged in:** item is saved immediately. Small toast: *"Сохранено"*. Icon fills in. No interruption.
- **Not logged in:** a short modal appears: *"Войдите, чтобы сохранить этот объект и вернуться к нему позже."* with a single field — phone number. SMS OTP flow runs inline (modal expands to show OTP input, user stays on the same page). After successful verification, the save completes automatically and the modal closes. The item the user was trying to save is remembered through the login flow — they don't have to tap save again.

Per the PRD rule, save always requires registration. There is no anonymous session-only save in V1.

**Step 2.** After save, buyer continues whatever they were doing. The save does not navigate away.

**Step 3.** A persistent Saved counter in the global navigation updates to reflect the new count.

### Exit conditions
- Item saved successfully, buyer continues current flow
- Save fails (network error): item is queued locally and retries automatically; a banner notifies the user if retry ultimately fails

### Edge cases
- **Buyer taps save then immediately taps again to unsave:** unsave confirmed with same toast pattern
- **Buyer saves an item that gets sold while in their saved list:** when they return to Saved page, the item shows a "Продано" badge with link to similar alternatives (Flow B8)

---

## Flow B6 — Buyer adds items to compare and reaches a decision
**Primary archetype:** Ready buyer (R) or Returning buyer (B)
**Goal:** Compare 2–4 saved items side by side and pick one to act on.
**Entry points:** Compare icon on card, Compare icon on detail page, Saved page bulk "Сравнить выбранные" action.

### Steps

**Step 1.** Buyer taps compare icon on a listing card.

**Step 2.** Compare bar appears at the bottom of the screen showing **"В сравнении: 1"**. It remains sticky across browsing.

**Decision point — type conflict?**
- Each compare session is either "projects" or "units" exclusively.
- If the buyer has items in compare (say, 3 units) and then taps Compare on an item of the other type (a building), a confirmation modal appears before any data is lost: *"У вас в сравнении 3 квартиры. Чтобы сравнивать проекты, нужно очистить текущее сравнение. Продолжить?"* with two buttons:
  - **"Да, сравнить проекты"** — clears the current compare set, switches to building mode, adds the new item
  - **"Нет, оставить квартиры"** — cancels the add action, keeps the existing unit comparison intact
- If the buyer is adding the first item (compare set is empty), no confirmation is needed — the compare set simply starts in the type of the first item.

**Step 3.** Buyer adds 1–3 more items by tapping compare icons elsewhere.

**Step 4.** When 2+ items are in compare, the sticky bar shows **"Сравнить сейчас →"** button.

**Step 5.** Buyer taps **"Сравнить сейчас →"**.
Destination: Compare page, showing 2–4 items side by side with full matrix.

**Step 6.** Buyer scans the matrix. Highlight labels (Дешевле всех, Лучшая цена за м², Ближайшая сдача, Сильнее всех проверка) appear on winning items per metric.

**Step 7.** Buyer reaches the "Что дальше?" decision section at the bottom. They pick one:
- **"Связаться с понравившимся вариантом"** → modal to pick which item → proceeds to contact flow (Flow B7)
- **"Поделиться сравнением с семьёй"** → generates a shareable link that preserves the compare state in the URL → share sheet opens (Flow B14)
- **"Добавить ещё один вариант"** → returns to browsing with compare still active
- **"Сохранить объекты в избранное"** → saves all items in the compare set to the buyer's Saved page (requires login if not already logged in, then triggers standard save flow per Flow B5 for each item)

**Step 8.** Buyer either contacts, shares, saves to favorites, continues browsing, or exits.

### Exit conditions
- Success: buyer contacted a seller, shared the comparison, or saved items to favorites
- Partial: buyer removed items from comparison and continued browsing
- Abandon: buyer closed the tab — compare set persists only in session (localStorage for the duration of the browser session); not stored server-side

### Edge cases
- **Compare item deleted or sold while in compare:** item shows greyed-out with "Продано [date]" badge, excluded from highlight labels
- **Buyer tries to compare more than 4 items:** the 5th tap shows *"Для ясного сравнения — максимум 4 варианта. Удалите один, чтобы добавить другой."*

---

## Flow B7 — Buyer contacts a seller (WhatsApp, Call, or Request Visit)
**Primary archetype:** All
**Goal:** Reach the seller to continue the conversation outside the platform.
**Entry points:** Contact buttons on Listing detail page, Building detail page, Saved page, Compare page, Map preview card.

### Steps

**Step 1.** Buyer taps one of three contact options:
- **WhatsApp** — opens WhatsApp with pre-filled message containing listing context (building, unit details, listing link)
- **Позвонить** — initiates phone call on mobile, copies number to clipboard on desktop with toast *"Номер скопирован"*
- **Запросить визит** — opens short form modal

### Sub-flow 7a — WhatsApp

**Step 2a.** WhatsApp app opens with pre-filled message. Buyer reviews and sends.

**On error (WhatsApp not installed):**
Fallback modal: *"WhatsApp не открывается. Попробуйте:"*
- Позвонить напрямую: [phone]
- Отправить запрос через форму
- Скопировать номер

Buyer picks one. Recovery continues.

**On error (no internet):**
A banner appears: *"Нет интернета. Номер продавца: [phone]. Вы можете позвонить напрямую."*

### Sub-flow 7b — Call

**Step 2b.** On mobile, the dialer opens pre-filled with the seller's number.
On desktop, the number is copied and shown in a modal: *"Номер скопирован: [number]. Позвоните с телефона."*

**On error (phone copy fails on desktop):** number is selected on-screen for manual copy with instruction *"Выделите и скопируйте вручную."*

### Sub-flow 7c — Request Visit

Per the PRD rule, Request Visit captures structured lead data, so registration is required before the form can be submitted. WhatsApp and Call remain zero-friction (they are outbound deep links, not lead captures).

**Step 2c.** Buyer taps Request Visit.

**Decision point — is the buyer logged in?**
- **Logged in:** the short form modal opens immediately (Step 3c).
- **Not logged in:** a lightweight login prompt appears first: *"Чтобы отправить запрос, подтвердите свой номер — это займёт 20 секунд."* with phone field and SMS OTP. After verification, the Request Visit form opens automatically with phone pre-filled. The listing context the buyer was viewing is preserved.

**Step 3c.** Short form modal opens with fields:
- Name (required)
- Phone (required, pre-filled from login)
- Preferred contact method: WhatsApp / Call (radio)
- Purchase timeline: скоро / в течение 3 месяцев / в течение 6 месяцев / изучаю рынок
- Optional note
- Optional checkbox: "Предпочитаю, чтобы связалась женщина-агент" (shown only where applicable)
- Optional checkbox: "Указать другой номер моего родственника для связи" (reveals second phone field)
- Listing context is auto-filled (building, unit).

**Step 4c.** Buyer submits.

**On success:**
Confirmation state: *"Запрос отправлен. Продавец свяжется с вами в ближайшее время [response time line only if seller has 3+ completed contacts]."*
Buttons: Продолжить просмотр, Сохранить квартиру.
The request is saved to buyer's "Мои запросы" section.

**On form validation error:**
Inline error messages next to invalid fields ("Введите номер телефона", "Неверный формат номера").

**On network error during submit:**
Retry once silently. If second attempt fails: *"Не удалось отправить запрос. Проверьте соединение и попробуйте снова."* with retry button. Form data is preserved.

### Exit conditions
- Success: buyer reached WhatsApp, made a call, or submitted a visit request
- Recovery: buyer used a fallback after primary method failed
- Partial: buyer closed the contact modal — no state lost, can try again

---

## Flow B8 — Buyer checks on a request after seller doesn't respond
**Primary archetype:** Ready buyer (R), Returning buyer (B)
**Goal:** Follow up when a request has gone unanswered.
**Entry points:** Saved page, notification in "Мои запросы" section.

### Steps

**Step 1.** Buyer submitted a Request Visit 24+ hours ago with no response.

**Step 2.** On next visit to the platform, buyer sees a gentle prompt either:
- In Saved page *"Что изменилось"* strip: *"Застройщик ЖК [X] ещё не ответил на ваш запрос"*
- In "Мои запросы" section: the request is flagged with status *"Ожидает ответа · 26 часов"*

**Step 3.** Buyer taps the flagged request.

**Step 4.** A prompt modal suggests:
- Попробовать WhatsApp (alternative contact)
- Позвонить напрямую: [phone]
- Посмотреть похожие варианты

**Decision point — 72+ hours since request and still no response?**
- Status escalates to "Вероятно, продавец занят. Вот похожие варианты:" with 3–5 alternative listings shown directly in the flagged item.
- Platform internally flags this seller's response-time data for ranking calculations.

### Exit conditions
- Success: buyer tried alternative contact method
- Partial: buyer viewed alternatives
- Passive: buyer dismisses — nothing breaks, status remains visible

---

## Flow B9 — Buyer explores a building page deeply
**Primary archetype:** Ready buyer (R) who has found a promising building
**Goal:** Earn confidence in a specific building and reach a unit decision.
**Entry points:** Projects browsing card, Apartments browsing listing (via building link), Map pin preview, Saved page, Compare page, Direct link.

### Steps

**Step 1.** Buyer lands on Building detail page.

**Step 2.** Block A Hero gallery autoplays first few images. Buyer swipes through.

**Step 3.** Buyer scans Block B (Identity) and Block C (Key facts strip) to understand who, where, how much, when.

**Step 4.** Buyer scrolls to Block D (Construction progress).

**Decision point — does Block D have photos?**
- **Yes:** horizontal scrolling dated photos + progress bar + delivery promise. Buyer can tap any photo for lightbox.
- **No photos yet (new building):** placeholder message *"Фото стройки появятся после первого визита нашей команды на объект (обычно в течение 2 недель после публикации)."* with estimated first-visit date.
- **Building is delivered:** replaced by *"Объект сдан в [date] — см. фотографии фасада и дворов."*

**Step 5.** Buyer scrolls through Block E (Why this fits you — only if came from filtered search), Block F (Trust evidence), Block G (Payment clarity).

**Decision point — buyer taps verification tier badge?**
Explainer modal opens showing: what "Объект проверен" means at this tier, when the check was done, who did it. Closes with buyer continuing.

**Step 6.** Buyer reaches Block H (Available units — от застройщика).

**Step 7.** Buyer filters units by rooms using tab chips within Block H. Unit list refreshes.

**Decision point — zero matching units in Block H?**
Empty state in section: *"Нет подходящих квартир от застройщика по вашим критериям. Посмотрите все квартиры или перепродажу в этом ЖК."* Buyer either clears the section filter or continues to Block I.

**Step 8.** Buyer scrolls to Block I (Resale inventory).

**Decision point — zero resales in this building?**
Empty state: *"Пока нет перепродаж в этом проекте. Вы владелец или продавец в этом ЖК? [Разместите объявление →]"* — turning dead end into supply opportunity.

**Step 9.** Buyer taps a specific unit row in Block H or Block I.
Destination: Listing detail page (continues Flow B1 from Step 6).

### Exit conditions
- Success: buyer opened a specific unit for deeper evaluation
- Alternate success: buyer used Block M sticky contact bar to WhatsApp the developer directly
- Partial: buyer saved the building for later (Flow B5) or added to compare (Flow B6)
- Abandon: buyer left — returning triggers Flow B3

---

## Flow B10 — Buyer uses the map to explore by location
**Primary archetype:** Ready buyer (R) with location sensitivity
**Goal:** Find buildings in a specific area they know.
**Entry points:** Map toggle on Projects browsing, Map toggle on Apartments browsing, direct map URL.

### Steps

**Step 1.** Buyer toggles into Map mode from Projects browsing (filters preserved).

**Step 2.** Map loads with pins for current filtered results. Sticky result count visible at top.

**Decision point — map fails to load?**
Fallback: list view returns automatically with a message: *"Карта временно недоступна. Показываем результаты списком."*

**Decision point — location services denied?**
Map still works with manual panning. Default center is Dushanbe. No error, no block.

**Step 3.** Buyer pans and zooms the map.

**Step 4.** When map is moved far enough, a button appears: **"Искать в этой области"**. Buyer taps it. Results refresh to the new viewport.

**Decision point — no pins in current viewport?**
Floating message: *"В этой области нет проектов. Сдвиньте карту или попробуйте другой район."*

**Step 5.** Buyer taps a pin.
Compact bottom-sheet preview card opens with:
- Main image
- Building name
- Price from
- Price per m²
- Delivery date
- Verification badge
- Matching unit count for current filters
- Buttons: Смотреть проект, Все квартиры

**Step 6.** Buyer either:
- Taps **Смотреть проект** → goes to Building detail page (continues Flow B9)
- Taps **Все квартиры** → goes to Apartments browsing filtered to that building (continues Flow B1)
- Taps save or compare → continues Flow B5 or B6
- Dismisses preview → returns to map

### Exit conditions
- Success: buyer opened a building or unit from map
- Partial: buyer explored the map and saved/compared from preview cards
- Abandon: buyer left — returning remembers last map viewport for the session

---

## Flow B11 — Buyer uses saved page and manages their shortlist
**Primary archetype:** Returning buyer (B)
**Goal:** Manage the accumulated shortlist and decide what to act on.
**Entry points:** Saved icon in global nav, Homepage Block C change item, direct URL.

### Steps

**Step 1.** Buyer opens Saved page.

**Step 2.** Page shows two tabs (Сохранённые проекты, Сохранённые квартиры) with counts.

**Step 3.** If there are changes since last visit, the "Что изменилось" strip appears above tabs with summary.

**Step 4.** Buyer picks a tab. Cards render with any change badges (Цена изменилась, Статус изменился, Добавлены новые квартиры, Обновлены фото стройки, Продавец ответил медленно).

**Step 5.** Buyer does one of:
- Taps a card → opens detail page (continues Flow B1 or B9)
- Selects checkboxes on 2+ cards → bulk "Сравнить выбранные" button appears → continues Flow B6 from Step 5
- Taps **"Поделиться списком"** → generates shareable link
- Removes an item → confirmation toast *"Удалено"* with undo option visible for 5 seconds
- Taps **"Мои запросы"** sub-section → sees all Request Visit submissions with their response status

**Decision point — zero saved items ever?**
Empty state: *"Здесь будут ваши избранные квартиры и проекты. Начните сохранять понравившиеся варианты, чтобы легко к ним возвращаться."* with button to start browsing.

**Decision point — all saved items sold/removed?**
Empty state: *"Ваши сохранённые варианты больше не активны. Посмотрите похожие проекты в тех же районах."* with personalized suggestions based on the lost items' districts and price ranges.

### Exit conditions
- Buyer opened one of the saved items
- Buyer moved items into comparison
- Buyer shared the list
- Buyer left — state persists

---

## Flow B12 — Diaspora buyer purchases remotely from Russia
**Primary archetype:** Tajik migrant in Russia buying for family in Tajikistan
**Goal:** Evaluate a project remotely and connect with the seller or platform team.
**Entry points:** Homepage Block H diaspora strip, direct link shared by family, dedicated diaspora landing URL.

### Steps

**Step 1.** Buyer lands on Diaspora landing page.

**Step 2.** Hero explains the value: *"Купите квартиру в Душанбе, находясь в России."* Primary CTA: Смотреть проекты. Secondary CTA: Связаться в WhatsApp.

**Step 3.** Buyer scrolls through Block B (How it works for diaspora), Block C (Featured projects for remote buyers), and reaches Block D (Contact strip with three buttons).

**Step 4.** Buyer picks one:
- **WhatsApp** → opens WhatsApp with pre-filled diaspora context
- **Telegram** → opens Telegram deep link
- **IMO** → opens IMO link (critical — IMO is the dominant messenger for Tajik diaspora in Russia due to Russia's WhatsApp/Telegram call restrictions)

**Decision point — IMO link fails (desktop or iOS where IMO is weaker)?**
Fallback suggests: *"IMO не открывается. Попробуйте WhatsApp или Telegram. Или напишите нам на [platform contact]."*

**Step 5.** Alternatively, buyer opens a specific featured project → continues Flow B9.

**Step 6.** Buyer contacts the seller. Request Visit form has a note: *"Укажите номер родственника в Таджикистане для визита"* to support the split-location scenario.

### Exit conditions
- Success: buyer reached the seller or platform team via one of the three messengers
- Partial: buyer opened a featured project to evaluate remotely
- Abandon: buyer left — next return may be via direct link from family in Tajikistan

---

## Flow B13 — Buyer switches language mid-journey
**Primary archetype:** All
**Goal:** Switch interface from Russian to Tajik (or vice versa) without losing progress.
**Entry points:** Language toggle in header (available on every page).

### Steps

**Step 1.** Buyer is in any flow — browsing, comparing, in the guided finder, filling a form, etc.

**Step 2.** Buyer taps the RU / TJ toggle in the header.

**Step 3.** System preserves all current state:
- Active filters
- Saved items list (the items themselves don't change, just labels)
- Compare set
- Guided finder answers (if mid-quiz)
- Form data (Request Visit, posting flow)
- Map viewport
- Current scroll position on the page

**Step 4.** Interface copy updates to the new language.

**Decision point — any untranslated strings?**
Any strings missing in Tajik fall back silently to their Russian equivalent so no blank text ever appears. The fallback is invisible to the user — there is no visual marker on fallback strings in V1. Internally, missing translations are logged to a developer-only log so the team can complete the Tajik translation in later phases.

**Step 5.** Buyer continues their flow exactly where they were.

### Exit conditions
- Language switched successfully
- State preserved completely

### Edge cases
- **Mid-OTP verification:** language switch during OTP entry does not invalidate the code
- **Mid-photo-upload:** language switch does not cancel in-progress uploads

---

## Flow B14 — Buyer shares a listing or comparison with family
**Primary archetype:** All, but especially Returning buyer (B) with family consultation need
**Goal:** Send an apartment or comparison to a family member for input.
**Entry points:** Share icon on Listing detail page, Share button on Compare page, Share button on Saved page.

### Steps

**Step 1.** Buyer taps Share.

**Step 2.** A share sheet appears with options:
- Скопировать ссылку
- WhatsApp
- Telegram
- IMO
- Другое (native share sheet)

**Step 3.** Buyer picks one. The link includes:
- The full URL of the listing/building/comparison
- If a comparison, the full compare set state is preserved in the URL

**Step 4.** Recipient opens the link.

**Decision point — recipient is logged in?**
- **Yes:** they see the same content the sender saw, in their preferred language
- **No:** they see the same content in the language of the URL (sender's current language)

**Step 5.** Recipient can save the item to their own account, contact directly, or continue browsing.

### Exit conditions
- Link generated and shared successfully
- Recipient can access the shared content without friction

---

# 6. Seller flows

## Flow S1 — New seller posts their first listing
**Primary archetype:** First-time seller (owner, intermediary, or developer rep)
**Goal:** Publish an apartment listing in about 3 minutes.
**Entry points:** "Разместить объявление" link in global nav, Homepage footer link, Seller dashboard "Опубликовать новое", empty-state in a building page ("Вы владелец или продавец в этом ЖК? Разместите объявление"), external link.

### Steps

**Step 1.** Seller lands on Post listing entry page.

**Step 2.** Step 1 of post flow — Phone verification.

Seller enters phone number. Taps "Отправить код".

**Decision point — SMS received?**
- **Yes:** seller enters code, verification succeeds. Proceeds to Step 3.
- **No SMS after 60 seconds:** "Отправить снова" button enables. Seller can retry.
- **3 failed code entries:** fallback option appears: **"Позвонить мне с кодом"**. System places automated voice call.
- **5 failed attempts total:** fallback shows platform contact: *"Не получается войти? Напишите нам: [WhatsApp link]"*.

**Step 3.** Step 2 — Source selection.

Seller sees three options:
- Мне или моей семье → 👤 Собственник
- Другому человеку — продаю от их имени → 🤝 Посредник
- Я представляю застройщика → 🏗 От застройщика

Seller picks. No judgment, no punishment for any answer.

**Decision point — seller picks "Я представляю застройщика" for the first time?**
An additional step inserts: seller provides developer company name and office phone. The listing is saved as draft but marked "Pending developer confirmation". Platform team calls the office to confirm within 48h. Once confirmed, the listing goes live automatically.

**Step 4.** Step 3 — Select the building.

Autocomplete search. Seller types building name or picks from popular buildings nearby.

**Decision point — building not in database?**
A **"Не нашли ваш дом?"** link opens a form. Seller provides: building name, address, developer name, expected delivery (if known). Listing stays in draft until platform team adds the building (usually within 48h). Seller is notified via SMS when building is ready.

**Step 5.** Step 4 — Unit details form.

Required: rooms, size m², floor, price TJS, finishing type (dropdown), availability.
Optional: installment available, description (max 800 chars).

Form is saved to draft on every field change.

**On form validation error:**
Inline error messages per field. Submit button disabled until valid.

**Step 6.** Step 5 — Photo upload.

Seller uploads 5–15 photos. Mobile camera capture supported directly.

**On photo upload failure:**
Each failed photo shows a retry icon. Other photos continue uploading normally.

**Decision point — seller uploads fewer than 5?**
Gentle warning: *"Рекомендуется добавить минимум 5 фото для лучшего отклика."* with option to continue anyway.

**Step 7.** Step 6 — Review and publish.

Preview shows exactly how the listing will appear to buyers. Seller confirms.

**Step 8.** On publish: confirmation screen.

*"Объявление опубликовано! Оно получило значок 'Телефон подтверждён'."* Buttons: Посмотреть моё объявление, Мои объявления.

**Step 9.** Verification upsell screen appears below the confirmation:

*"Повысьте доверие покупателей:"*
- Upload selfie + ID for синий значок (2 минуты) → Flow S4
- Request on-site visit for зелёный значок (бесплатно) → Flow S5

Seller can skip — listing is live regardless.

### Exit conditions
- Success: listing published, live, with phone-verified tier
- Partial: listing in draft awaiting building confirmation or developer confirmation
- Abandon: draft preserved, can be resumed from Seller dashboard

---

## Flow S2 — Seller resumes a draft listing after interruption
**Primary archetype:** Any seller who closed the browser mid-post
**Goal:** Finish a half-completed listing without losing work.
**Entry points:** Seller dashboard banner "У вас есть незавершённое объявление", direct link returning, SMS reminder.

### Steps

**Step 1.** Seller returns to the platform, potentially on a different device.

**Step 2.** If logged in, dashboard shows banner: *"У вас есть незавершённое объявление в [building name]. Продолжить?"* with buttons "Продолжить", "Удалить черновик".

**Step 3.** Seller taps "Продолжить".

**Step 4.** System resumes at the exact step the seller left off. Previously entered data is pre-filled.

**Decision point — did the building the seller selected get added/confirmed since the draft was started?**
- **Yes:** draft auto-advances past the building selection step.
- **No and still pending:** a small banner: *"Ваш дом всё ещё проверяется. Обычно это занимает до 48 часов."*
- **No and was rejected (non-existent building or unclear):** draft shows message: *"Ваш дом не был добавлен. Попробуйте другой вариант или свяжитесь с нами."*

**Step 5.** Seller completes remaining steps and publishes.

### Exit conditions
- Success: draft resumed and published
- Partial: further interruption — draft re-saved
- Abandon: after 30 days, unpublished drafts are deleted with one SMS warning

---

## Flow S3 — Seller edits an existing listing
**Primary archetype:** Any active seller
**Goal:** Change something about a published listing (price, availability, photos, description).
**Entry points:** Seller dashboard listing row "Редактировать" action.

### Steps

**Step 1.** Seller opens Seller dashboard.

**Step 2.** Seller taps "Редактировать" on a specific listing.

**Step 3.** Edit form opens, pre-filled with current values.

**Step 4.** Seller changes fields (most commonly price, status, or photos).

**Decision point — price changed?**
- System logs the price change event → this triggers a change badge on all buyer-side saved instances of this listing.
- Buyers who saved this listing will see *"Цена изменилась"* badge next time they visit Saved page.

**Decision point — status changed to "sold" or "reserved"?**
- Listing is immediately hidden from search results.
- Saved instances show *"Статус изменился"* badge.
- If the listing is in any buyer's compare set, it's greyed out with "Продано [date]".

**Step 5.** Seller saves changes.

**On save error:**
Form data is preserved. Retry once silently, then show retry button.

**Step 6.** Confirmation toast: *"Изменения сохранены."*

### Exit conditions
- Success: listing updated
- Downstream: change badges appear for all saved buyers, compare state updates

---

## Flow S4 — Seller upgrades to Tier 2 (Profile verified / Blue badge)
**Primary archetype:** Active seller seeking more visibility
**Goal:** Get the blue "Профиль проверен" badge.
**Entry points:** Verification upsell after posting (Flow S1 Step 9), Seller dashboard "Повысить проверку" link, listing page banner.

### Steps

**Step 1.** Seller taps "Upload ID for синий значок".

**Step 2.** Explanation screen: *"Получите синий значок проверки — ваши объявления будут ранжироваться выше и вызывать больше доверия у покупателей."*

**Step 3.** Seller uploads:
- Photo of national ID (front)
- Selfie holding the ID

**On photo upload failure:** retry per photo.

**Step 4.** Seller submits. Confirmation: *"Документы отправлены на проверку. Обычно ответ в течение 24–48 часов."*

**Step 5.** Platform team reviews.

**Decision point — review outcome?**
- **Approved:** seller receives SMS notification. Blue badge appears on all their listings. Badge applies across their seller profile, not per listing.
- **Rejected:** SMS with specific reason (ID not clear, selfie doesn't match, image quality, etc.). Seller can resubmit.

**Step 6.** If approved, seller can now pursue Tier 3 (Flow S5) at any time.

### Exit conditions
- Success: blue badge active, all listings updated
- Retry: rejected — resubmission available

---

## Flow S5 — Seller upgrades to Tier 3 (On-site verified / Green badge)
**Primary archetype:** Active seller wanting top trust level
**Goal:** Get the green "Объект проверен" badge via platform on-site visit.
**Entry points:** Verification upsell, Seller dashboard, Tier 2 success screen.

### Steps

**Step 1.** Seller taps "Request on-site visit".

**Step 2.** Explanation: *"Представитель платформы посетит квартиру и сделает официальные фото. Ваше объявление получит зелёный значок, верхнее ранжирование в поиске и максимальное доверие покупателей."*

**Step 3.** Seller picks a time slot.

**Decision point — seller is Собственник or Посредник?**
- **Собственник:** standard visit scheduled.
- **Посредник:** additional note: *"Нам также потребуется подтвердить разрешение от владельца. Мы позвоним владельцу перед визитом — пожалуйста, предоставьте его номер."* Seller provides owner's phone.

**Step 4.** Platform team calls the owner (Посредник case) or confirms the visit time.

**Step 5.** Visit happens. Platform team takes geo-tagged photos and verifies listing matches reality.

**Decision point — visit outcome?**
- **Confirmed:** green badge activated for 45 days. Seller receives SMS.
- **Rejected with reason:** e.g., unit doesn't match listing, photos don't match, or (Посредник) owner denies permission. Listing is suspended or reset to Tier 2. Seller sees specific reason.

**Step 6.** Before 45-day expiration, seller receives renewal prompt: *"Ваша проверка истекает через 7 дней. Запланировать повторный визит?"*

### Exit conditions
- Success: green badge active for 45 days, boosted ranking
- Renewal: reschedule before expiration
- Rejection: seller returns to lower tier, can retry after addressing reason
- Expiration without renewal: badge automatically drops to Tier 2

### Edge cases
- **Seller cancels scheduled visit:** first cancellation is free; second moves them to end of queue
- **Visit window passes with no-show:** one reschedule allowed, after which the request expires

---

## Flow S6 — Seller receives and responds to a buyer request
**Primary archetype:** Active seller with published listings
**Goal:** See and respond to a buyer's Request Visit submission.
**Entry points:** SMS notification, Seller dashboard "Новые запросы" section.

### Steps

**Step 1.** Buyer submits Request Visit (Flow B7 sub-flow 7c).

**Step 2.** Seller receives SMS: *"Новый запрос по вашей квартире [building, rooms]. Откройте [platform link]."*

**Step 3.** Seller opens dashboard, sees new request with:
- Buyer name and phone
- Preferred contact method
- Purchase timeline
- Optional note
- Listing context
- Timestamp

**Step 4.** Seller contacts the buyer via preferred method (WhatsApp, Call).

**Step 5.** After contact, seller marks the request status in dashboard:
- Связался
- Назначили визит
- Не отвечает
- Не актуально

**Decision point — seller doesn't respond within 24 hours?**
- Buyer sees a prompt on their side (Flow B8).
- Seller receives a reminder SMS at 24h, 48h, 72h.
- After 72h, this response time is counted toward the seller's response-time stats (once they have 3+ completed contacts, response-time badge appears on their listings).

### Exit conditions
- Success: seller contacted buyer, marked status
- Downstream: response time contributes to seller's public response-time badge threshold

---

## Flow S7 — Seller manages their dashboard over time
**Primary archetype:** Returning seller
**Goal:** Keep listings fresh, respond to prompts, track performance.
**Entry points:** Seller dashboard direct URL, SMS reminder.

### Steps

**Step 1.** Seller opens dashboard.

**Step 2.** Dashboard shows:
- List of listings with status, verification, view count, contact count
- New requests section (if any)
- Notifications section:
  - *"Ваше объявление не обновлялось 30 дней — оно ещё актуально?"*
  - *"Ваша проверка истекает через 7 дней"*
  - *"Платформа рассмотрит ваши документы в течение 24–48 часов"*

**Step 3.** Seller acts on notifications:
- Confirms listing is still active (one tap)
- Reschedules verification visit
- Edits a listing (Flow S3)
- Marks a listing as sold

**Decision point — listing has been inactive 60 days with no seller action?**
Listing is auto-hidden with message: *"Это объявление скрыто из-за неактивности. Подтвердите актуальность, чтобы вернуть его в поиск."* One-tap recovery available.

**Decision point — listing reported by 3+ users?**
Listing temporarily suspended with message: *"Это объявление временно скрыто и проверяется командой."* Seller contact info provided.

### Exit conditions
- Dashboard reflects current state
- Seller can return anytime

---

# 7. System flows

## Flow Y1 — Platform launch day (zero inventory state)
**Trigger:** First week of platform going live
**Goal:** Avoid a broken-looking empty product while initial developers are onboarded.

### Behavior

- Homepage Blocks F (Featured buildings) and the three-path tiles show counts that reflect actual numbers ("0 проектов"). The three-path tiles still work — they just show empty browsing pages.
- Projects browsing: instead of an empty list, show the launch-day message: *"Мы только запускаемся. Первые проекты появятся на этой неделе — оставьте номер, чтобы узнать первым."* with single phone field.
- Apartments browsing: same pattern.
- Map view: centered on Dushanbe with no pins, showing the same launch-day message.
- Guided quick finder: still functional, but results screen shows: *"Мы только запускаемся. Ваши предпочтения сохранены — мы свяжемся, как только появятся подходящие варианты."* with phone field.
- Diaspora landing: same treatment.

### Recovery
Once the first building is published, all these empty states disappear automatically and normal flows resume.

---

## Flow Y2 — Building added to database after buyer requested it
**Trigger:** A seller requested a new building be added (Flow S1 Step 4 decision)
**Goal:** Activate dependent drafts and notify the requester.

### Behavior

- Platform team adds the building record.
- All sellers who requested this building and have pending drafts receive SMS: *"Ваш дом [name] добавлен! Завершите ваше объявление: [link]."*
- Their drafts auto-resume from the building-selection step with the building pre-filled.

---

## Flow Y3 — Major platform error (site down, database unreachable)
**Trigger:** Infrastructure failure
**Goal:** Don't leave users staring at a broken page.

### Behavior

- Service worker caches the homepage shell, showing a friendly offline message: *"Платформа временно недоступна. Попробуйте через несколько минут."* with retry button.
- Ongoing form data (Post listing flow, Request Visit form) is preserved in localStorage and retried automatically on reconnect.
- If user was mid-WhatsApp click: WhatsApp still works because it doesn't depend on the platform being up.

---

## Flow Y4 — Buyer lands on a direct link that no longer exists
**Trigger:** User clicks a shared link for a listing that has been deleted, a building that was removed, or a compare URL with items that no longer exist
**Goal:** Redirect with context, never show a 404 cliff.

### Behavior

- **Listing no longer exists:** redirect to the building page with banner *"Это объявление больше не активно. Вот другие квартиры в этом проекте."*
- **Building no longer exists (rare):** redirect to Projects browsing filtered to the same district with banner *"Этот проект больше не доступен. Вот похожие в том же районе."*
- **Compare URL contains deleted items:** compare page opens showing existing items plus greyed-out placeholders for deleted ones with *"Продано / удалено"*.
- **Completely invalid URL:** redirect to Homepage with a toast: *"Страница не найдена. Вот главная."*

---

# 8. Cross-flow transitions

This section maps how flows connect to each other — the most common real-world paths.

## The classic ready-buyer path
Flow B1 → (if contact fails) recovery within Flow B1 → (if contact succeeds but no response in 24h) Flow B8 → (user returns) Flow B3 → (acts on alternatives) Flow B1 again.

## The classic uncertain-buyer path
Flow B2 (guided finder) → magic moment → Flow B1 from Step 6 (opens a specific listing) → Flow B5 (saves) → (returns later) Flow B3 → Flow B6 (compares) → Flow B7 (contacts).

## The classic returning-buyer path
Flow B3 → taps a change badge → Flow B1 from Step 6 or Flow B9 → Flow B7 (contacts).

## The diaspora path
Flow B12 → Flow B9 (building exploration) → Flow B7 (contact via WhatsApp/Telegram/IMO) → Flow B5 (save for family member) → Flow B14 (share with family).

## The seller onboarding path
Flow S1 → Flow S4 (Tier 2 upgrade) → Flow S5 (Tier 3 upgrade) → (ongoing) Flow S7 (dashboard management) + Flow S6 (response to requests).

## The seller who got interrupted path
Flow S1 interrupted → Flow S2 (resume) → Flow S1 completes → Flow S4 → Flow S5.

---

# 9. Drop-off risk by flow

The flows most at risk of buyer abandonment, ranked:

1. **Flow B2 Step 4 (district selection)** — uncertain buyers may not know district names. Mitigation: tooltips with district descriptions.
2. **Flow B1 Step 7 (WhatsApp contact)** — a failed WhatsApp link is a common failure. Mitigation: fallback modal always available.
3. **Flow B8 (24+ hour non-response)** — buyer loses trust and may not return. Mitigation: gentle prompt with alternatives.
4. **Flow B11 all saved items sold** — discouraging empty state. Mitigation: personalized suggestions in the empty state.
5. **Flow S1 Step 2 (SMS OTP)** — SMS delivery in Tajikistan can be unreliable. Mitigation: voice-call code fallback + manual contact path.
6. **Flow S1 Step 3 (source selection)** — if wording feels judgmental, sellers lie. Mitigation: wording is honest and destigmatized.
7. **Flow S1 Step 4 (building not found)** — blocks the flow. Mitigation: draft preserved, seller notified when building added.

The flows most at risk of buyer confusion (not abandonment):

1. **Flow B4 (mode switch)** — filter translation losses need to be visible.
2. **Flow B6 type conflict** — clear explanation required.
3. **Flow B13 (language switch mid-form)** — state preservation must be flawless.
4. **Flow S5 (Tier 3 for Посредник)** — owner phone call step needs clear explanation.

---

# 10. Flow-level acceptance criteria

The flows are correct only if:

1. A first-time ready buyer (Flow B1) can reach a seller's WhatsApp in under 2 minutes from landing.
2. A first-time uncertain buyer (Flow B2) can reach the magic moment in about a minute (60–90 seconds).
3. A returning buyer (Flow B3) can see what changed within 5 seconds of landing on the Homepage.
4. A buyer (Flow B7) whose primary contact method fails always has a working fallback.
5. A buyer (Flow B8) whose request is unanswered for 24+ hours sees a gentle next-step suggestion.
6. A buyer (Flow B13) can switch language mid-form without losing any field data.
7. A buyer (Flow B6) comparing items gets a clear decision-resolution path, not just a static matrix.
8. A buyer (Flow B12) can contact the platform via WhatsApp, Telegram, or IMO — all three work.
9. A seller (Flow S1) can publish a listing in under 3 minutes with only a phone number.
10. A seller (Flow S2) can resume a draft from a different device without losing data.
11. A seller (Flow S4, S5) can see exactly what each verification tier requires and why.
12. A seller (Flow S6) can respond to buyer requests and mark status in under 30 seconds per request.
13. A seller (Flow S7) is never surprised by their listing being hidden — clear warnings precede any hide action.
14. Every error state in every flow offers a recovery path.
15. Every abandonment point in every flow is recoverable on return.

---

# 11. What these flows do not cover

Consistent with the blueprint's V1 scope, these flows intentionally exclude:

- Automated saved-search alert delivery (Phase 2)
- Developer self-service flows beyond posting (Phase 2)
- Admin moderation flows (handled via direct database tools in V1)
- Multi-account linking for family shared wishlists (Phase 2+)
- Financial integration flows (not in V1 or later phases per halal design)
- Mortgage application flows (not in V1)
- Rental, resale of old housing, houses, commercial, land flows (outside wedge)

---

# 12. Final flow statement

These flows define what the product must do when real users — ready, uncertain, returning, diaspora, sellers, intermediaries, developer representatives — actually try to use it. Each flow has a clear start, a clear end, and a defined recovery for every step where things can go wrong.

If any flow described here produces dead ends, confusion, or lost state during testing, the flow is broken and must be fixed before launch.

The flows must make the platform feel like a product that **anticipates what the user needs next** rather than one that forces the user to figure out what to do. That is the behavior this document is designed to produce.
