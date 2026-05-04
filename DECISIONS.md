# DECISIONS

Direction changes that override the original spec stack. Read at session start. Append (don't rewrite) when a new direction lands. Each entry: short title · date · what changed · why · what it affects.

Newest at top.

---

## 2026-05-04 · Analytics rebuild: decision-ready, not data-dump

**What changed:** First analytics dashboard (commits `47cc956` / `e72edee` / `0ba13e1`) shipped raw counts + JSON event blobs. Replaced with a decision-ready operator view (`bf32fc7`).

**Why:** Founder needs to glance at it for 30 seconds and know what to do — call this lead, fix this inventory gap, follow up on this stuck flow. Raw counts + JSON force the operator to reverse-engineer behaviour from events.

**What it affects:**
- `/kabinet/analytics` headlines a 4-stage funnel (visited → searched → viewed → converted) with absolute counts + drop-off %.
- "Горячие лиды" surfaces high-intent uncontacted visitors with direct WhatsApp/Telegram CTAs.
- "Чего не хватает в каталоге" ranks 0-result searches by **unique visitors** (not raw occurrences) and renders filter labels via `displayNameFromFilters()`.
- "Без команды" toggle, ON by default — staff/admin activity is excluded everywhere so the founder's own browsing doesn't pollute counts.
- Date range toggle: today / 7d / 30d.
- Per-visitor drill-down gains: lead temperature badge, "Что они ищут" derived buyer profile, "Что сохранили" with hydrated names, "Точки трения" friction signals, anonymous callbacks (via the new `anon_id` column on `contact_requests`), human-Russian event feed with collapsible raw JSON.
- New libs: `src/lib/analytics/profile.ts` (visitor bundle, buyer profile, frictions, hot leads, staff exclusion) and `src/lib/analytics/event-format.ts` (humanise an event row).
- Migration 0016 adds `contact_requests.anon_id`.

**Anti-pattern locked out:** "ship the raw events first, polish later." For analytics that operators read daily, the polish IS the feature.

---

## 2026-05-03 · Visitor analytics + saved searches with Telegram alerts

**What changed:** Built the events / saved-search / Telegram-alert pipeline (`47cc956` Phase A, `e72edee` Phase B, `0ba13e1` Phase C).

**Why:** Founder needs to know what anonymous visitors do, what they search for and don't find, and how to follow up — the input signal for inventory acquisition + product iteration.

**What it affects:**
- `events` table is the analytics source of truth. Free-form `properties jsonb`, no enum on `event_type`.
- `anon_id` cookie set in `proxy.ts` on every request (1y, HttpOnly). Stitched to `user_id` at login by `/api/auth/poll`.
- `saved_searches` table with two notification destinations: `notify_chat_id` (Telegram-direct) or `notify_phone` (founder gets a relay nudge, WhatsApps the buyer manually).
- `subscribe_sessions` table mirrors `auth_sessions` for the Telegram bot deep-link subscribe flow. Bot's `/start subscribe_<token>` handler binds chat_id.
- Match-on-publish runs INLINE in `/api/inventory/create` and `/api/listings/moderate`. No cron — Vercel Hobby is daily-only and inline beats it on UX anyway.
- Filter-against-listing matcher in `src/lib/saved-searches/match.ts`. Drift hazard noted: when `services/{listings,buildings}.ts` add a new filter, the matcher needs the same change.
- Migration 0015 created events, saved_searches, subscribe_sessions tables.

---

## 2026-05-03 · Founder-only publishing + ContactCard for everyone else

**What changed:** Removed the self-serve `/post` form for non-founders; replaced with a contact card pointing at WhatsApp / Telegram / phone (`241f916`).

**Why:** At V1 volume the founder reviews every listing anyway via the moderation queue. Skipping the moderation cycle and having the founder post directly is faster, gives more curation control, and removes a whole UX surface (the post form) for non-founders who'll never use it well.

**What it affects:**
- `/post` branches by role: founder sees `PostFlow`, everyone else sees `ContactCard` (no auth gate; even logged-out visitors see the contact card).
- `/kabinet` drops "Новое объявление" and "Разместить" CTAs for non-founders.
- Home page gains "Хотите разместить квартиру?" banner pointing to `/post`.
- Founder contacts live in `src/lib/founder-contacts.ts` (single source of truth, edit once).
- Migration 0014 transferred all existing test listings to founder ownership (test accounts were the user's own anyway).
- The moderation queue + re-moderation policy + building auto-publish-on-first-approval still exist as code paths but won't fire in V1 because non-founder posting is gated. Kept in case we re-enable later.

**Anti-pattern locked out:** "let users self-serve, gate via moderation queue" — too much surface to maintain at this stage.

---

## 2026-05-03 · Post form round 2: location, district context, developer modal, number-input bug

**What changed:** Major UX work on the founder's post form (`0ea7bab`).

**Why:** First round shipped a working form with several confusing/missing pieces — no location picking on a map, district names with no context, address as bare free-text, developer dropdown closed (couldn't add new), and a clearing-bug on number inputs.

**What it affects:**
- New `LocationPicker` (maplibre, drag pin) — founder picks the exact spot rather than every building stacking on the district centroid.
- New `NewDeveloperModal` triggered from a "+ Добавить нового застройщика" entry in the developer dropdown. Posts to `/api/developers/create` with `status='pending'`.
- New `NumberField` helper replaces every `type="number"` input with `type="text"` + `inputMode="numeric"`/`decimal` + digit filter. Fixes the "can't fully clear" bug.
- District dropdown labels now include hardcoded short hints in `/post/page.tsx` (Vahdat's 5 districts).
- New optional "Ориентир" field for landmarks ("напротив парка Дусти"); appended to building description until we add a column.
- API receives explicit lat/lng; the centroid fallback in `createBuilding` stays as a safety net but the picker should always win.

---

## 2026-05-02 · Photos end-to-end (storage, picker, upload, gallery)

**What changed:** Built the photos pipeline (`7bdc1ea`).

**Why:** Cards always showed `cover_color` placeholders. Real users would think the platform is empty/fake. Photos are the most concrete trust signal we have.

**What it affects:**
- `listing-photos` Supabase Storage bucket (migration 0012, public read + service-role write policies).
- `buildings.cover_photo_id` column added (migration 0013) with a NAMED FK constraint `buildings_cover_photo_fk` so PostgREST embeds disambiguate.
- `BUILDING_SELECT` / `LISTING_SELECT` constants in `services/buildings.ts` join photos via `cover_photo:photos!buildings_cover_photo_fk(storage_path)`. Use these constants everywhere instead of bare `select('*')` on buildings or listings.
- `PhotoPicker` client component (multi-file, max 15, jpg/png/webp ≤10MB, reads dimensions in browser, uploads on pick). Used in PostFlow + EditApartmentForm.
- `/api/storage/upload` endpoint (auth-gated, multipart). `services/photos.ts` (`attachPhotos`, `setCoverPhoto`, `attachAndSetCover`, `deletePhotos`).
- `/api/inventory/create` and `/api/listings/[id]/update` accept `pendingPhotos` + `removePhotoIds`.
- BuildingCard, ListingCard, /zhk hero, /kvartira hero render `cover_photo_url` when present (fallback to color block).
- /kvartira gains a photo gallery section beneath the hero.
- Auto-publish parent building when first listing in it gets approved (closes the orphan-listings-of-invisible-building hole for non-founder posts).

**Anti-pattern locked out:** "ship cards with placeholder colors and add photos in V2" — photos ARE V1.

---

## 2026-05-01 · Listing lifecycle, bathroom convention, edit form, /kabinet cleanup

**What changed:** Real backend for posting + lifecycle actions (Edit / Hide / Show / Mark Sold / Delete) + bathroom field + UI cleanup (`1a7a894` + earlier `1f61417`).

**Why:** First-pass was 60% UI / 0% data persistence. Real listing creation didn't write to DB. Bathroom field followed Western convention (count of bathrooms) when Tajik convention is type (раздельный / совмещённый) — most apartments have one bathroom, the type is what matters.

**What it affects:**
- `createListing`, `createBuilding`, `setListingStatus`, `softDeleteListing`, `updateListing`, `listingOwnedBy` in services.
- Re-moderation policy in `updateListing`: non-founder edits to active listings flip to `pending_review` on price drop ≥10% / rooms change / size change > 5m².
- `bathroom_separate` boolean column (migration 0011): NULL=unknown, TRUE=раздельный, FALSE=совмещённый. Old `bathroom_count` / `balcony` / `ceiling_height_cm` fields kept in schema but not collected in form.
- `/kabinet` dropped fake-zero stats grid + always-empty notifications inbox.
- `/post/edit/[id]` page wired to API.
- Compare hidden in V1 via `FEATURES.compare = false` (`5002cf4`).

---

## 2026-04-25 · V1 = Vahdat-only

**What changed:** Original PRD targets Dushanbe + Vahdat. V1 launches Vahdat-only.

**Why:** Smaller market = simpler problem to validate. Founder is in Vahdat, can do the manual operator work locally. Dushanbe re-introduction is a flip of `ACTIVE_CITY` once the playbook is proven.

**What it affects:**
- `services/buildings.ts` `ACTIVE_CITY = 'vahdat'` is the master filter; every public query enforces it. District filter UI hidden because Vahdat has 5 microdistricts and splitting 6 mock buildings across them makes filters land on 1-2 results (feels broken).
- All seed data is Vahdat-themed.
- Diaspora landing kept (Russia-based Tajiks looking at Vahdat are the high-intent diaspora segment).
