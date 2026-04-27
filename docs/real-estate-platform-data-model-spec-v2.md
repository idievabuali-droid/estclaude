# Real Estate Platform — Data Model Spec v2

## 1. Document purpose

This document defines the exact data structure that underpins the platform. It is the technical foundation for every other spec.

It answers:
- what tables exist and what each represents
- what every field is, what type it is, whether it is required
- which fields are user-visible and which are internal
- which fields are editable and which are computed
- what enum values every status-like field can hold
- how tables relate to each other
- how bilingual content is stored
- how change events, response time, and verification are tracked
- what indexes must exist for performance
- what invariants the database must enforce

This spec is written so engineering (human or AI) can build the schema without making any independent decisions. Every field traces to a specific feature in the PRD, blueprint, or user flows — if a field appears here that does not serve a documented feature, it is wrong and must be removed.

---

## 2. Design principles

### 2.1 The building is the canonical entity
Every listing attaches to a building. Developers, units, photos, change events, and leads all anchor to buildings. This matches the PRD three-source model and prevents orphan listings.

### 2.2 Enums over free text
Every field that drives filtering, sorting, or trust UI is a typed enum with a fixed set of values. No free-text finishing type, no free-text verification status, no free-text lead state.

### 2.3 Money as integers
All prices, monthly installments, and down payments are stored as integers in Tajikistani dirams (1 TJS = 100 dirams). This avoids floating-point errors in price-per-m² calculations and makes comparisons exact.

### 2.4 Bilingual content via JSONB
Every user-visible text field that can be translated is stored as a JSONB column with keys `"ru"` and `"tg"`. The Russian value is required. The Tajik value is optional — missing Tajik values fall back to Russian silently at render time (per User Flows Flow B13).

### 2.5 Append-only event log for changes
Price changes, status changes, new photos, and other buyer-visible events are written to a dedicated event table, not inferred from shadow tables. This makes the Saved page "change badges" feature and the Homepage "returning user strip" simple to implement.

### 2.6 No server-side compare state in V1
Per the PRD, compare is a session-only feature (not stored server-side). This is enforced by the absence of a compare table. Saved items, contact requests, and favorites are server-side. Compare is client-side only.

### 2.7 No orphan records
Foreign keys are enforced with `ON DELETE RESTRICT` by default. A developer with active buildings cannot be deleted. A building with active listings cannot be deleted. When something should be removable, use soft-delete fields (`deleted_at`, `status = 'archived'`) rather than hard deletion.

### 2.8 Every table has `created_at` and `updated_at`
Timestamps are mandatory on every table. They are `TIMESTAMPTZ` (timezone-aware). `updated_at` is maintained by trigger.

### 2.9 Soft-delete by default
Destructive actions (listing removed, building archived) set status fields and timestamps. Data is not actually deleted. This preserves historical references in change events, saved items, and contact requests.

### 2.10 V1 is scoped deliberately
This schema supports the exact V1 features in the PRD. No speculative columns for Phase 2 features (saved searches, analytics dashboards, developer self-service beyond posting). Adding columns later is easy; removing them after they've leaked into application code is hard.

---

## 3. Enum catalog

Every enum in the schema is defined here. Each value is fixed, machine-safe, and maps to specific user-visible UI defined in the blueprint.

### 3.1 `user_role`
- `buyer` — can save, compare, contact, request visits
- `seller` — can post listings, manage their listings, request verification
- `staff` — platform team, reviews verifications, uploads construction photos, handles fraud reports
- `admin` — platform founder/superuser, all permissions

A single user can hold multiple roles (a seller can also be a buyer). Stored in a join table `user_roles`, not as a single column.

### 3.2 `source_type`
Per PRD section 11. Declared by seller at post time.
- `developer` — 🏗 От застройщика
- `owner` — 👤 Собственник
- `intermediary` — 🤝 Посредник

### 3.3 `verification_tier`
Per PRD section 12 and blueprint section 2.3.
- `phone_verified` — Tier 1, gray badge, automatic on signup
- `profile_verified` — Tier 2, blue badge, earned after ID + selfie check
- `listing_verified` — Tier 3, green badge, earned after on-site visit (valid 45 days)

Developer listings inherit a separate `verified_developer` flag from the developer entity (gold badge), which is treated as equivalent to `listing_verified` for ranking purposes. See section 5.3 for how this is resolved at query time.

### 3.4 `finishing_type`
Per PRD section 10 (updated) and blueprint sections 10.3 and 12.3.
- `no_finish` — без ремонта
- `pre_finish` — предчистовая
- `full_finish` — с ремонтом
- `owner_renovated` — отремонтировано владельцем (resale-only; see validation rule in section 5.4)

### 3.5 `listing_status`
- `draft` — in-progress posting, not visible to buyers (per User Flows Flow S2)
- `active` — live and visible
- `reserved` — marked by seller as reserved but not sold
- `sold` — marked as sold, hidden from active search, retained for saved-item change badges
- `hidden` — voluntarily hidden by seller
- `suspended` — hidden by platform (fraud, reports)
- `expired` — auto-hidden after 60 days of no seller activity (per User Flows Flow S7)

### 3.6 `building_status`
Per PRD construction progress feature.
- `announced` — announced but no construction started
- `under_construction` — construction ongoing
- `near_completion` — final stages
- `delivered` — handed over, construction complete

### 3.7 `developer_status`
- `pending` — awaiting one-time platform phone-call verification
- `active` — verified, listings from this developer carry the gold badge
- `suspended` — fraud or reporting, listings hidden
- `archived` — no longer operating

### 3.8 `contact_request_status`
Per User Flows Flow S6. These are the exact statuses a seller can set on a buyer request.
- `new` — submitted by buyer, not yet acted on
- `contacted` — Связался (seller reached the buyer; counts as completed contact)
- `visit_scheduled` — Назначили визит (visit arranged; counts as completed contact)
- `buyer_unresponsive` — Не отвечает (seller tried to reach buyer but buyer didn't respond; counts as completed contact — the seller did their part)
- `not_relevant` — Не актуально (seller marked as not relevant; counts as completed contact)
- `auto_no_response` — automatic flag set by system when the request is 72+ hours old with status still `new` (does NOT count as completed contact — this is a seller failure)

Note: `contacted`, `visit_scheduled`, `buyer_unresponsive`, and `not_relevant` all count as "completed contacts" for the 3+ threshold defined in the blueprint. `new` and `auto_no_response` do not count.

### 3.9 `change_event_type`
Per Blueprint sections 6.3 Block C (homepage returning-user strip) and 14.3 (saved-page change badges). These five types map 1:1 to the change badges in the blueprint.
- `price_changed` — Цена изменилась (listing price changed, up or down)
- `status_changed` — Статус изменился (e.g., listing moved to sold, reserved, or building moved to delivered)
- `new_unit_added` — Добавлены новые квартиры (new listing added in a saved building)
- `construction_photo_added` — Обновлены фото стройки (new dated construction photo uploaded for a saved building)
- `seller_slow_response` — Продавец ответил медленно (seller did not respond to a buyer's visit request within 24h)

### 3.10 `photo_kind`
- `listing_photo` — photo of a specific listing (floor plan, room, view)
- `listing_floor_plan` — floor plan specifically, shown separately in UI
- `construction_progress` — dated photo of building construction (platform-team-uploaded only)
- `building_gallery` — general photo of the building (official renders, entrance, amenities)

### 3.11 `contact_channel_preference`
Per Blueprint section 10.3 Block M and User Flows Flow B7.
- `whatsapp`
- `call`
(No `email` option in V1 — not requested by PRD.)

### 3.12 `purchase_timeline`
Per User Flows Flow B7 Step 3c.
- `soon` — скоро
- `within_3_months` — в течение 3 месяцев
- `within_6_months` — в течение 6 месяцев
- `just_researching` — изучаю рынок

### 3.13 `language_code`
- `ru` — Russian (default, always present on translatable fields)
- `tg` — Tajik (optional, falls back to `ru` when missing)

### 3.14 `district_type`
Districts in Dushanbe and Vahdat. Stored as a reference table (see section 5.10), not a hardcoded enum, because the list will grow.

### 3.15 `notification_type`
Strict enum for the in-product seller notifications table (§5.16). Add new types only via migration; never accept arbitrary strings. Russian/Tajik display copy lives in i18n files keyed by enum value.

- `contact_request_received` — buyer sent a contact request (payload: `{listing_id, contact_request_id}`)
- `visit_request_received` — buyer requested a visit, requires response (payload: `{listing_id, contact_request_id}`)
- `listing_expiring_soon` — listing inactive for 53 days, will hide at 60 (payload: `{listing_id}`)
- `listing_expired` — listing auto-hidden after 60 days inactivity (payload: `{listing_id}`)
- `verification_approved` — Tier 2 or Tier 3 approved (payload: `{tier, submission_id_or_visit_id}`)
- `verification_rejected` — submission rejected with reason code (payload: `{tier, submission_id, reason_code}`)
- `verification_visit_scheduled` — Tier 3 visit confirmed for date (payload: `{visit_id, scheduled_at}`)
- `verification_expiring_soon` — Tier 3 expires in 7 days, renewal prompt (payload: `{listing_id, expires_at}`)
- `developer_account_confirmed` — founder finished developer onboarding (payload: `{developer_id}`)
- `slow_response_warning` — buyer flagged seller as slow (mirrors `change_event_type.seller_slow_response`) (payload: `{listing_id, contact_request_id}`)

---

## 4. Table catalog

The schema has these tables. Each is defined in section 5.

**Primary entities:**
1. `users`
2. `user_roles`
3. `developers`
4. `buildings`
5. `listings`
6. `photos`

**Buyer-facing features:**
7. `saved_items`
8. `contact_requests`
9. `change_events`

**Verification and trust:**
10. `verification_submissions`
11. `verification_visits`
12. `fraud_reports`

**Reference data:**
13. `districts`
14. `district_price_benchmarks`

**System:**
15. `phone_verifications` (OTP)
16. `notifications` (in-product seller inbox per UI Spec Page 13 §13.4)
17. `verification_slots` (Tier 3 scheduler windows per UI Spec Page 14 §14.5)

Total: 17 tables. No more, no less for V1.

---

## 5. Table definitions

### 5.1 `users`

**Purpose:** A single person interacting with the platform. Can be a buyer, seller, or both.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | Primary key |
| `phone` | VARCHAR(20) | yes | — | E.164 format, unique, indexed |
| `name` | VARCHAR(200) | no | NULL | Full name, optional at signup |
| `preferred_language` | ENUM(`language_code`) | yes | `ru` | UI language |
| `is_diaspora` | BOOLEAN | yes | false | Set when user enters via diaspora landing page |
| `has_female_agent` | BOOLEAN | yes | false | Seller-side flag (intermediary/agent users). When true, listings posted by this user expose the "prefer female agent" checkbox in the contact form (UI Spec Page 10 §10.5). For owner-source listings this is irrelevant — checkbox is hidden. |
| `phone_verified_at` | TIMESTAMPTZ | no | NULL | NULL means phone unverified (shouldn't happen post-signup) |
| `profile_verified_at` | TIMESTAMPTZ | no | NULL | NULL means not yet Tier 2 |
| `profile_verified_by` | UUID | no | NULL | Foreign key to `users.id` (staff who approved) |
| `account_status` | ENUM(`active`, `suspended`, `deleted`) | yes | `active` | — |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Unique on `phone`
- Index on `phone_verified_at` (for finding unverified accounts)
- Index on `account_status`

**Notes:**
- No `email` field in V1 — contact is phone-only, matching the PRD.
- `profile_verified_at` is the Tier 2 marker. Tier 3 lives on individual listings, not on the user.
- `is_diaspora` lets the system preserve diaspora context across sessions (per User Flows Flow B12).

### 5.2 `user_roles`

**Purpose:** A user can hold multiple roles. Separate table prevents nullable role columns.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `user_id` | UUID | yes | — | FK to `users.id` |
| `role` | ENUM(`user_role`) | yes | — | One of `buyer`, `seller`, `staff`, `admin` |
| `granted_at` | TIMESTAMPTZ | yes | now() | — |
| `granted_by` | UUID | no | NULL | FK to `users.id` (admin who granted this, null for self-granted) |

**Primary key:** Composite `(user_id, role)`
**Indexes:**
- Index on `role` (for finding all staff users, etc.)

**Notes:**
- `buyer` role is auto-granted on signup.
- `seller` role is auto-granted on first listing post.
- `staff` and `admin` are granted manually by existing admin.

### 5.3 `developers`

**Purpose:** A company or party responsible for one or more buildings. Verified once as an entity.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | Primary key |
| `name` | VARCHAR(300) | yes | — | Company name, not translated |
| `display_name` | JSONB | yes | — | `{"ru": "...", "tg": "..."}` — name variant for UI |
| `primary_contact_phone` | VARCHAR(20) | yes | — | E.164 |
| `primary_contact_whatsapp` | VARCHAR(20) | no | NULL | E.164, if different from primary phone |
| `office_address` | JSONB | no | NULL | `{"ru": "...", "tg": "..."}` |
| `description` | JSONB | no | NULL | `{"ru": "...", "tg": "..."}` |
| `years_active` | INT | no | NULL | Optional developer-facing field |
| `projects_completed_count` | INT | no | NULL | Optional developer-facing field |
| `has_female_agent` | BOOLEAN | yes | false | Set true when the developer has at least one woman on their sales staff. Drives the "prefer female agent" checkbox visibility in contact form (UI Spec Page 10 §10.5). Founder-managed during developer onboarding. |
| `logo_photo_id` | UUID | no | NULL | FK to `photos.id` |
| `status` | ENUM(`developer_status`) | yes | `pending` | — |
| `verified_at` | TIMESTAMPTZ | no | NULL | Set when platform confirms developer via phone call |
| `verified_by` | UUID | no | NULL | FK to `users.id` (staff who verified) |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `status`
- Index on `verified_at`

**Notes:**
- A developer is verified once as an entity (per PRD 12.5). All listings from `developer` source with this developer_id inherit this verification automatically.
- `verified_developer` badge in UI = `developers.status = 'active' AND verified_at IS NOT NULL`.
- This is distinct from per-listing Tier 3 verification.

### 5.4 `buildings`

**Purpose:** The canonical entity for a new-build project. All listings attach to one building.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | Primary key |
| `slug` | VARCHAR(200) | yes | generated | URL-safe, unique |
| `developer_id` | UUID | yes | — | FK to `developers.id` |
| `name` | JSONB | yes | — | `{"ru": "ЖК Рудаки", "tg": "..."}` |
| `city` | ENUM(`dushanbe`, `vahdat`) | yes | — | V1 is locked to these two cities |
| `district_id` | UUID | yes | — | FK to `districts.id` |
| `full_address` | JSONB | yes | — | Full street address, bilingual |
| `latitude` | DECIMAL(9,6) | yes | — | — |
| `longitude` | DECIMAL(9,6) | yes | — | — |
| `status` | ENUM(`building_status`) | yes | — | Per section 3.6 |
| `handover_estimated_quarter` | VARCHAR(7) | no | NULL | Format `YYYY-Qn`, e.g. `2026-Q3`. NULL for delivered. |
| `handover_delivered_at` | DATE | no | NULL | Set when status = `delivered` |
| `building_count` | INT | no | NULL | How many buildings/sections in the complex |
| `units_total_count` | INT | no | NULL | Total units across the complex |
| `description_short` | JSONB | no | NULL | Bilingual, used on cards |
| `description_full` | JSONB | no | NULL | Bilingual, used on building page Block K |
| `special_points` | JSONB | no | NULL | 2–3 developer-chosen selling points, bilingual array |
| `installment_available` | BOOLEAN | yes | false | Whether developer offers installment |
| `installment_first_payment_percent` | INT | no | NULL | 0–100 |
| `installment_max_term_months` | INT | no | NULL | e.g., 84 for 7 years |
| `installment_summary` | JSONB | no | NULL | Bilingual plain-language summary for Block G |
| `cover_photo_id` | UUID | no | NULL | FK to `photos.id` |
| `is_published` | BOOLEAN | yes | false | Hidden from public browsing until published |
| `is_featured` | BOOLEAN | yes | false | Shown on Homepage Block F |
| `featured_rank` | INT | no | NULL | Lower = shown first |
| `amenity_distances` | JSONB | no | NULL | See structure below |
| `price_from_dirams` | BIGINT | no | NULL | Computed, cached: min `price_total_dirams` of active listings from developer source in this building |
| `price_per_m2_from_dirams` | BIGINT | no | NULL | Computed, cached: min price per m² across active developer listings |
| `last_inventory_refresh_at` | TIMESTAMPTZ | no | NULL | Last time developer updated listings |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**`amenity_distances` JSONB structure:**
```json
{
  "mosque_m": 420,
  "school_m": 180,
  "bazaar_m": 850,
  "hospital_m": 1200,
  "transport_m": 120,
  "park_m": 650
}
```
Keys are fixed. Values are integers in meters. Missing keys are not shown in UI.

**Indexes:**
- Unique on `slug`
- Index on `developer_id`
- Index on `district_id`
- Index on `status`
- Index on `is_published`
- Index on `is_featured, featured_rank` (for homepage)
- Composite index on `(city, district_id, status, is_published)` for primary search
- Spatial index on `(latitude, longitude)` for map view

**Notes:**
- `slug` is generated from `name.ru` at creation and never changes (preserves shared links).
- `price_from_dirams` is denormalized for search performance; refreshed via trigger whenever a listing in this building changes price or status.
- V1 does not require construction progress percent — photos with dates are the source of truth for Block D.

### 5.5 `listings`

**Purpose:** A specific unit for sale. Every listing has a source and a verification tier.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | Primary key |
| `slug` | VARCHAR(200) | yes | generated | URL-safe, unique |
| `building_id` | UUID | yes | — | FK to `buildings.id` |
| `seller_user_id` | UUID | yes | — | FK to `users.id` — the person who posted the listing |
| `source_type` | ENUM(`source_type`) | yes | — | Declared at post time, per PRD 11 |
| `status` | ENUM(`listing_status`) | yes | `draft` | — |
| `rooms_count` | INT | yes | — | 1, 2, 3, 4, 5+ (5+ stored as 5) |
| `size_m2` | DECIMAL(6,2) | yes | — | e.g., 64.50 |
| `floor_number` | INT | yes | — | — |
| `total_floors` | INT | no | NULL | Total floors in the building/section |
| `building_block` | VARCHAR(10) | no | NULL | e.g., "A", "B", "1" |
| `unit_number_internal` | VARCHAR(20) | no | NULL | Seller-provided unit number within the building (e.g., "47", "12A"). Used for the `(building_id, floor_number, unit_number_internal)` deduplication rule in fraud detection (Tech Spec §15.3). Not displayed publicly to buyers. |
| `price_total_dirams` | BIGINT | yes | — | Total price in dirams (1 TJS = 100 dirams) |
| `price_per_m2_dirams` | BIGINT | yes | generated | Generated column: `(price_total_dirams / size_m2)::BIGINT`. Stored (not virtual) so it can be indexed. Always consistent with `price_total_dirams` and `size_m2`. |
| `finishing_type` | ENUM(`finishing_type`) | yes | — | Per section 3.4 |
| `installment_available` | BOOLEAN | yes | false | — |
| `installment_first_payment_percent` | INT | no | NULL | 0–100 |
| `installment_monthly_amount_dirams` | BIGINT | no | NULL | Example monthly amount for this unit |
| `installment_term_months` | INT | no | NULL | e.g., 84 |
| `handover_estimated_quarter` | VARCHAR(7) | no | NULL | Inherited from building if NULL at render time |
| `unit_description` | JSONB | no | NULL | Bilingual, max 800 chars per language, for Block I of listing page |
| `bathroom_count` | INT | no | NULL | — |
| `balcony` | BOOLEAN | no | NULL | — |
| `ceiling_height_cm` | INT | no | NULL | e.g., 280 for 2.8m |
| `orientation` | VARCHAR(20) | no | NULL | e.g., "south", "north-west" |
| `view_notes` | JSONB | no | NULL | Bilingual, free text |
| `floor_plan_photo_id` | UUID | no | NULL | FK to `photos.id`, singled out for Block A of listing page |
| `cover_photo_id` | UUID | no | NULL | FK to `photos.id` |
| `verification_tier` | ENUM(`verification_tier`) | yes | `phone_verified` | Initial tier on publish |
| `listing_verified_at` | TIMESTAMPTZ | no | NULL | Set when Tier 3 is earned |
| `listing_verified_expires_at` | TIMESTAMPTZ | no | NULL | = verified_at + 45 days |
| `listing_verified_by` | UUID | no | NULL | FK to `users.id` (staff who verified) |
| `posted_on_behalf_owner_phone` | VARCHAR(20) | no | NULL | For intermediary listings; required for Tier 3 per PRD 12.4 |
| `posted_on_behalf_owner_confirmed_at` | TIMESTAMPTZ | no | NULL | Set when platform calls real owner and confirms |
| `special_offer_text` | JSONB | no | NULL | Bilingual, optional seller-chosen note |
| `published_at` | TIMESTAMPTZ | no | NULL | Set when status first becomes `active` |
| `last_activity_at` | TIMESTAMPTZ | yes | now() | Updated on any seller edit; used for 60-day expiration |
| `view_count` | INT | yes | 0 | Total views (simple counter, not unique) |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Invariants (enforced by check constraints or triggers):**
- `finishing_type = 'owner_renovated'` requires `source_type IN ('owner', 'intermediary')`. Developers cannot list as "owner-renovated." (per PRD 10.2 updated vocabulary)
- `source_type = 'developer'` requires the seller_user_id to belong to a user associated with the developer (enforced via separate `developer_users` table or a policy check in application layer — see note).
- `posted_on_behalf_owner_phone` is required when `source_type = 'intermediary'` AND the seller requests Tier 3 verification.
- `price_per_m2_dirams` is always computed from `price_total_dirams / size_m2`.
- `size_m2 > 0`, `price_total_dirams > 0`, `rooms_count >= 1`.

**Indexes:**
- Unique on `slug`
- Index on `building_id`
- Index on `seller_user_id`
- Index on `source_type`
- Index on `verification_tier`
- Index on `status`
- Composite index on `(status, verification_tier, published_at)` for search ranking
- Index on `price_total_dirams`
- Index on `price_per_m2_dirams`
- Index on `rooms_count`
- Index on `finishing_type`
- Index on `last_activity_at` (for finding listings inactive 60+ days)
- Index on `listing_verified_expires_at` (for the 7-day renewal reminder job and the daily tier-drop job)

**Notes on developer-sourced listings:**
The PRD does not require a full developer-seller join table in V1 because the founder manually onboards each developer. For V1, a listing with `source_type = 'developer'` is linked to a developer via `building_id → buildings.developer_id`. The seller_user_id in that case is the staff user who posted on behalf of the developer (or a designated developer representative user). In Phase 2 (developer self-service), a `developer_users` join table will be added.

### 5.6 `photos`

**Purpose:** Stores all image metadata. Actual files live in object storage (see section 7).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `kind` | ENUM(`photo_kind`) | yes | — | Per section 3.10 |
| `building_id` | UUID | no | NULL | FK to `buildings.id` (required if kind is `construction_progress` or `building_gallery`) |
| `listing_id` | UUID | no | NULL | FK to `listings.id` (required if kind is `listing_photo` or `listing_floor_plan`) |
| `uploaded_by_user_id` | UUID | yes | — | FK to `users.id` |
| `file_url` | VARCHAR(500) | yes | — | Full URL to original |
| `thumbnail_url` | VARCHAR(500) | yes | — | URL to thumbnail version |
| `width_px` | INT | no | NULL | — |
| `height_px` | INT | no | NULL | — |
| `size_bytes` | BIGINT | no | NULL | — |
| `alt_text` | JSONB | no | NULL | Bilingual for accessibility |
| `caption` | JSONB | no | NULL | Bilingual caption |
| `photo_date` | DATE | no | NULL | Required for `construction_progress`; represents the date the photo was taken on-site |
| `sort_order` | INT | yes | 0 | Display order within its kind |
| `perceptual_hash` | VARCHAR(64) | no | NULL | For fraud duplicate detection (per PRD 12.7) |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Invariants:**
- Exactly one of `building_id` or `listing_id` must be non-null (a photo belongs to either a building or a listing, not both).
- For `kind = 'construction_progress'`: `building_id` required, `photo_date` required, uploaded_by_user_id must have `staff` or `admin` role. (Per PRD 17.3: construction photos are platform-team-uploaded only.)

**Indexes:**
- Index on `(building_id, kind, sort_order)` for building gallery and construction timeline
- Index on `(listing_id, kind, sort_order)` for listing gallery
- Index on `perceptual_hash` for fraud duplicate lookup
- Index on `photo_date` for construction progress timeline

### 5.7 `saved_items`

**Purpose:** Buyer's saved buildings and listings. Used for Saved page and change badges.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `user_id` | UUID | yes | — | FK to `users.id` |
| `item_type` | ENUM(`building`, `listing`) | yes | — | — |
| `building_id` | UUID | no | NULL | FK to `buildings.id` |
| `listing_id` | UUID | no | NULL | FK to `listings.id` |
| `saved_at` | TIMESTAMPTZ | yes | now() | — |
| `last_viewed_at` | TIMESTAMPTZ | no | NULL | Set each time user visits the Saved page and sees this item |
| `change_badges_seen_at` | TIMESTAMPTZ | no | NULL | Set when user views the change events for this item; used to compute which events are "new" |

**Invariants:**
- Exactly one of `building_id` or `listing_id` must be non-null (matching `item_type`). Enforced via CHECK constraint.
- A user cannot save the same building twice or the same listing twice. Enforced via the two partial unique indexes below.

**Indexes:**
- Unique partial index: `(user_id, building_id)` where `item_type = 'building'`
- Unique partial index: `(user_id, listing_id)` where `item_type = 'listing'`
- Index on `user_id` for Saved page load
- Index on `(user_id, change_badges_seen_at)` for "what changed since last visit" query

**Notes:**
- Per PRD §13, registration is required to save. There is no anonymous saved_items row. This is enforced by `user_id` being `NOT NULL`.
- The "what changed" feature on Homepage (Block C) and Saved page is computed at read time by joining `saved_items` against `change_events` where `change_events.created_at > saved_items.change_badges_seen_at`.

### 5.8 `contact_requests`

**Purpose:** Every Request Visit submission. Also the source of response-time data.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `buyer_user_id` | UUID | yes | — | FK to `users.id`. Required per PRD (registration required for Request Visit). |
| `seller_user_id` | UUID | yes | — | FK to `users.id` — derived from listing at create time |
| `building_id` | UUID | yes | — | FK to `buildings.id` |
| `listing_id` | UUID | no | NULL | FK to `listings.id` (null means interest in building in general) |
| `buyer_name` | VARCHAR(200) | yes | — | From form (pre-filled from `users.name` if available) |
| `buyer_phone` | VARCHAR(20) | yes | — | E.164, from form or user profile |
| `alternate_phone` | VARCHAR(20) | no | NULL | The "Указать другой номер моего родственника" field |
| `preferred_contact_channel` | ENUM(`contact_channel_preference`) | yes | — | — |
| `purchase_timeline` | ENUM(`purchase_timeline`) | yes | — | — |
| `prefer_female_agent` | BOOLEAN | yes | false | From optional checkbox |
| `note` | TEXT | no | NULL | Optional buyer note, max 1000 chars, NOT translated |
| `source_page` | VARCHAR(100) | no | NULL | Which page the form was submitted from (listing, building, compare, saved) — for analytics |
| `status` | ENUM(`contact_request_status`) | yes | `new` | Per section 3.8 |
| `responded_at` | TIMESTAMPTZ | no | NULL | Set when seller transitions from `new` to any other status |
| `response_minutes` | INT | no | NULL | Computed: `responded_at - created_at` in minutes. Used for seller response-time stats. |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `buyer_user_id` for "Мои запросы" section
- Index on `seller_user_id` for Seller Dashboard inbox
- Index on `listing_id`
- Index on `building_id`
- Index on `status`
- Index on `(seller_user_id, status)` for seller dashboard filtered views
- Index on `(created_at, status)` for the 72-hour `no_response` auto-flag job

**Response-time threshold logic (per Blueprint section 2.3 fix):**
A seller's public response-time badge is computed only when the seller has ≥3 `contact_requests` with `status IN ('contacted', 'visit_scheduled', 'buyer_unresponsive', 'not_relevant')`. Below that threshold, `response_minutes` data exists but no public badge is rendered.

### 5.9 `change_events`

**Purpose:** Append-only event log for buyer-visible changes. Powers Homepage Block C and Saved page change badges.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `event_type` | ENUM(`change_event_type`) | yes | — | Per section 3.9 |
| `building_id` | UUID | no | NULL | FK — filled if event is about a building |
| `listing_id` | UUID | no | NULL | FK — filled if event is about a listing |
| `related_contact_request_id` | UUID | no | NULL | For `seller_slow_response` events |
| `old_value` | JSONB | no | NULL | e.g., `{"price_total_dirams": 85000000}` |
| `new_value` | JSONB | no | NULL | e.g., `{"price_total_dirams": 82000000}` |
| `summary_text` | JSONB | no | NULL | Bilingual short text used in UI (e.g. "Цена снижена на 30 000 TJS") |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Invariants:**
- At least one of `building_id` or `listing_id` must be non-null.
- Append-only: no updates, no deletes. Corrections are added as new events.

**Indexes:**
- Index on `building_id, created_at`
- Index on `listing_id, created_at`
- Index on `event_type, created_at`
- Composite index on `(building_id, listing_id, created_at)` for efficient "what changed since X" queries

**Notes:**
- Events are generated by the application layer when specific business operations occur (listing price updated, seller marks sold, construction photo uploaded). Not via database triggers — keeping the logic in application code means it's testable and predictable.
- `summary_text` is generated at event-creation time in both Russian and Tajik, so rendering the Saved page never requires recomputation.

### 5.10 `verification_submissions`

**Purpose:** Tracks Tier 2 verification attempts (selfie + ID).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `user_id` | UUID | yes | — | FK to `users.id` |
| `id_photo_file_url` | VARCHAR(500) | yes | — | URL to ID photo in secure storage |
| `selfie_photo_file_url` | VARCHAR(500) | yes | — | URL to selfie in secure storage |
| `status` | ENUM(`pending`, `approved`, `rejected`) | yes | `pending` | — |
| `reviewed_by` | UUID | no | NULL | FK to `users.id` (staff) |
| `reviewed_at` | TIMESTAMPTZ | no | NULL | — |
| `rejection_reason` | JSONB | no | NULL | Bilingual reason, shown to user per User Flows Flow S4 |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `user_id, created_at DESC` (most recent submission per user)
- Index on `status` for staff review queue

**Notes:**
- Photos are stored in a bucket with restricted access (not publicly viewable). Only staff and admin users can fetch them.
- On approval, `users.profile_verified_at` is set to this submission's `reviewed_at`.
- Users may submit multiple times after rejection; the latest approved submission wins.

### 5.11 `verification_visits`

**Purpose:** Tracks Tier 3 on-site verification visits (platform team visits to the apartment).

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `listing_id` | UUID | yes | — | FK to `listings.id` |
| `requested_by_user_id` | UUID | yes | — | FK to `users.id` (the seller) |
| `requested_at` | TIMESTAMPTZ | yes | now() | — |
| `scheduled_for` | TIMESTAMPTZ | no | NULL | Agreed visit time |
| `status` | ENUM(`requested`, `scheduled`, `completed`, `rejected`, `cancelled`, `no_show`) | yes | `requested` | — |
| `visited_by_user_id` | UUID | no | NULL | FK to `users.id` (staff who visited) |
| `visited_at` | TIMESTAMPTZ | no | NULL | — |
| `outcome_notes` | JSONB | no | NULL | Bilingual, shown to seller if rejected |
| `owner_phone_confirmed_at` | TIMESTAMPTZ | no | NULL | For intermediary listings per PRD 12.4 |
| `owner_phone_confirmed_by` | UUID | no | NULL | FK to `users.id` (staff who made the confirmation call) |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `listing_id, created_at DESC`
- Index on `status` for staff queue
- Index on `scheduled_for` for upcoming visits calendar

**Notes:**
- On `status = 'completed'`, the associated `listings` row gets `verification_tier = 'listing_verified'`, `listing_verified_at = visited_at`, and `listing_verified_expires_at = visited_at + 45 days`.
- On expiration (a scheduled job runs daily), `verification_tier` drops back to whatever the user's current tier is (`profile_verified` or `phone_verified`).
- `scheduled`, `completed`, `cancelled`, and `rejected` are the operational statuses; `no_show` is a separate terminal state for sellers who miss visits.

### 5.12 `fraud_reports`

**Purpose:** User-submitted reports of problematic listings.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `listing_id` | UUID | yes | — | FK to `listings.id` |
| `reported_by_user_id` | UUID | yes | — | FK to `users.id` (the buyer reporting) |
| `reason_category` | ENUM(`fake_photos`, `fake_listing`, `wrong_address`, `wrong_price`, `not_available`, `suspicious_seller`, `other`) | yes | — | — |
| `reason_details` | TEXT | no | NULL | Free text, max 1000 chars |
| `status` | ENUM(`open`, `dismissed`, `confirmed`) | yes | `open` | — |
| `reviewed_by_user_id` | UUID | no | NULL | FK to `users.id` (staff) |
| `reviewed_at` | TIMESTAMPTZ | no | NULL | — |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `listing_id`
- Index on `status` for staff queue
- Index on `(listing_id, status)` for the "3+ complaints" trigger per User Flows Flow S7

### 5.13 `districts`

**Purpose:** Reference table for districts in Dushanbe and Vahdat. Drives filtering and price benchmarks.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `city` | ENUM(`dushanbe`, `vahdat`) | yes | — | — |
| `name` | JSONB | yes | — | `{"ru": "Исмоили Сомони", "tg": "..."}` |
| `slug` | VARCHAR(100) | yes | generated | URL-safe, unique within city |
| `short_description` | JSONB | no | NULL | Bilingual, 1-line tooltip per User Flows Flow B2 Screen 3 |
| `center_latitude` | DECIMAL(9,6) | no | NULL | — |
| `center_longitude` | DECIMAL(9,6) | no | NULL | — |
| `display_order` | INT | yes | 100 | For ordering in filter chips, lower = earlier |
| `is_active` | BOOLEAN | yes | true | — |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Unique composite: `(city, slug)`
- Index on `is_active, display_order`

### 5.14 `district_price_benchmarks`

**Purpose:** Stores the rolling average price-per-m² for each district and room count. Drives the fairness badge on every listing card.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `district_id` | UUID | yes | — | FK to `districts.id` |
| `rooms_count` | INT | yes | — | 1, 2, 3, 4, 5+ |
| `finishing_type` | ENUM(`finishing_type`) | no | NULL | NULL means all finishings combined |
| `median_price_per_m2_dirams` | BIGINT | yes | — | Rolling median across active listings |
| `sample_size` | INT | yes | — | Number of listings in the sample |
| `computed_at` | TIMESTAMPTZ | yes | now() | Last recomputation |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Unique composite: `(district_id, rooms_count, finishing_type)`

**Notes:**
- This table is recomputed by a scheduled job (daily in V1) across active listings.
- **Why per-room and per-finishing, not just per-district:** the blueprint text says "ниже среднего по району" (below the district average). To make this comparison meaningful and fair, the benchmark must compare apples to apples — a small unfinished unit should be compared to other small unfinished units, not to the district average across all apartment types. Rendering logic uses the most specific available benchmark: if a benchmark exists for this district + rooms + finishing, use it; otherwise fall back to district + rooms (finishing = NULL); otherwise hide the badge.
- The fairness badge on a listing card is computed at render time: `(listing.price_per_m2_dirams - benchmark.median_price_per_m2_dirams) / benchmark.median_price_per_m2_dirams`.
- Fairness bands per blueprint section 11.6:
  - ≤ -10%: "На X% ниже среднего по району" (green)
  - -10% to +10%: "В пределах средней цены" (neutral)
  - ≥ +10%: "На X% выше среднего по району" (subtle orange, no judgment)
- If `sample_size < 5`, the fairness badge is hidden entirely (insufficient data).

### 5.15 `phone_verifications`

**Purpose:** Tracks SMS OTP codes for signup and login. Ephemeral records.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `phone` | VARCHAR(20) | yes | — | E.164 |
| `code_hash` | VARCHAR(100) | yes | — | Hashed OTP (never store plaintext) |
| `attempts_count` | INT | yes | 0 | Incremented on each failed entry |
| `verified_at` | TIMESTAMPTZ | no | NULL | Set on successful entry |
| `expires_at` | TIMESTAMPTZ | yes | — | 10 minutes after creation |
| `voice_call_requested_at` | TIMESTAMPTZ | no | NULL | Per User Flows Flow S1 fallback |
| `created_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Index on `phone, created_at DESC`
- Index on `expires_at` for cleanup job

**Notes:**
- Records older than 24h are deleted by a daily cleanup job.
- `attempts_count >= 3` triggers voice-call fallback availability (per User Flows Flow S1 Step 2).
- `attempts_count >= 5` blocks further OTP attempts for 1 hour from this phone.

### 5.16 `notifications`

**Purpose:** In-dashboard notifications for sellers. Backs the notification block on UI Spec Page 13 §13.4 Block E. Persisted (unlike SMS which is fire-and-forget) so sellers see history when they return to the dashboard. SMS continues for off-platform alerts; this table is the in-product inbox.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `user_id` | UUID | yes | — | FK → `users.id`, ON DELETE CASCADE. Recipient. |
| `type` | ENUM `notification_type` | yes | — | See §3.10 below |
| `payload` | JSONB | yes | `{}` | Type-specific context (e.g., `{listing_id, contact_id}`) — never user-typed text, only IDs and enums; rendered via i18n keys at read time |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `read_at` | TIMESTAMPTZ | no | NULL | Set when user marks as read or dismisses |
| `expires_at` | TIMESTAMPTZ | yes | created_at + 7 days | Auto-cleanup after 7 days per UI Spec Page 13 §13.4 |

**Indexes:**
- Composite index on `(user_id, created_at DESC)` for the dashboard list query
- Index on `expires_at` for the daily cleanup job
- Partial index on `user_id WHERE read_at IS NULL` for the unread badge count

**RLS:** Recipients can `SELECT`, `UPDATE` (only `read_at`) their own rows. No one can `INSERT` from the client — server-only via service role for system events.

**Notes:**
- Records past `expires_at` are deleted nightly (Tech Spec §14 cron `notifications-cleanup`).
- Payload schema by type lives in `types/notifications.ts` (generated alongside Supabase types). Keep payloads small — IDs and enums only. The Russian/Tajik display string is composed at read time from i18n keys, never stored.
- The `slow_response_warning` notification is created when `change_events.type = 'seller_slow_response'` is inserted for a listing this user owns — keep notification creation in the same service-layer transaction as the change event, so they cannot diverge.

**Notification types catalog:** §3.15 `notification_type`.

### 5.17 `verification_slots`

**Purpose:** Backs the Tier 3 visit scheduler (UI Spec Page 14 §14.5 Step 3). Platform team's available 2-hour visit windows. The 3-tap booking flow (Date → Time slot → Confirm) reads from this table; booking creates a `verification_visits` row and increments `booked_count`.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | UUID | yes | generated | — |
| `starts_at` | TIMESTAMPTZ | yes | — | Slot start (Dushanbe local time stored as UTC). 2-hour windows per UI Spec §14.5: 09–11, 11–13, 13–15, 15–17, 17–19. |
| `ends_at` | TIMESTAMPTZ | yes | — | Slot end. Trigger validates `ends_at = starts_at + 2 hours` for V1 consistency. |
| `capacity` | INT | yes | 1 | Max concurrent visits in this slot. Default 1 = one team per window. Tunable when team grows. |
| `booked_count` | INT | yes | 0 | Denormalized count of `verification_visits` rows referencing this slot with `status IN ('scheduled', 'completed')`. Updated via trigger on visit insert/update/delete. |
| `is_open` | BOOLEAN | yes | true | Admin can disable a slot without deleting it (e.g., team unavailable that day). |
| `notes` | TEXT | no | NULL | Internal staff note (e.g., "team in Vahdat half-day"). Never exposed to sellers. |
| `created_at` | TIMESTAMPTZ | yes | now() | — |
| `updated_at` | TIMESTAMPTZ | yes | now() | — |

**Indexes:**
- Composite index on `(starts_at, is_open)` for the slot-availability query
- Check constraint: `booked_count <= capacity`

**RLS:**
- All authenticated users can `SELECT` slots where `is_open = true AND starts_at > now() AND booked_count < capacity` (i.e., bookable slots).
- Only staff/admin can `INSERT`, `UPDATE`, `DELETE`.

**Notes:**
- `verification_visits.scheduled_for` should equal the booked slot's `starts_at`. Add a `verification_visits.slot_id` FK so the relationship is explicit (otherwise we'd have to look up by timestamp). Add this FK to §5.11 in implementation, optional to keep the spec minimal here.
- Slot generation is admin-driven: founder/staff bulk-creates the next 14 days of slots via a small admin script or Supabase SQL editor. No auto-generation in V1.
- Cancelled visits decrement `booked_count` immediately (transactional with the visit status update).
- The `GET /api/verification/tier-3/slots?from=YYYY-MM-DD&to=YYYY-MM-DD` endpoint reads this table (see Tech Spec §14.1 sibling notifications block; may live in same area).

---

## 6. Computed fields and denormalization

To keep search fast, certain fields are denormalized onto `buildings` and `listings`. The rules for keeping them in sync are:

### 6.1 `buildings.price_from_dirams`
Set by application trigger on insert/update of any `listings` row where `source_type = 'developer'` and `status = 'active'` and `building_id` matches. Equals the minimum `price_total_dirams` across such rows. Set to NULL if no such rows exist.

### 6.2 `buildings.price_per_m2_from_dirams`
Same trigger as above. Equals the minimum `price_per_m2_dirams` across active developer listings in this building.

### 6.3 `buildings.last_inventory_refresh_at`
Set to `now()` on any insert/update of a listing in this building where `source_type = 'developer'`.

### 6.4 `listings.price_per_m2_dirams`
Generated column: `price_total_dirams / size_m2`. Always computed, never manually set.

### 6.5 District benchmarks
Recomputed daily by scheduled job. Not triggered per-listing-change (would thrash).

---

## 7. File storage

Photos are not stored in the database. Only metadata is.

**Storage buckets (implementation agnostic):**
- `listings-photos/` — publicly accessible via signed URLs
- `construction-photos/` — publicly accessible
- `verification-submissions/` — NOT publicly accessible; staff-only access via authenticated endpoint

**Photo URL format:** Stored as full URLs in `photos.file_url` so the storage provider can be swapped without database changes.

---

## 8. Invariants enforced at the database level

These are enforced via constraints, not application logic, so they cannot be bypassed:

1. `users.phone` is unique, E.164 format.
2. `listings.source_type = 'developer'` requires `buildings.developer_id` to be non-null (every developer listing has a developer).
3. `listings.finishing_type = 'owner_renovated'` requires `listings.source_type IN ('owner', 'intermediary')`.
4. `photos` must have exactly one of `building_id` or `listing_id` set.
5. `saved_items` must have exactly one of `building_id` or `listing_id` set, matching `item_type`.
6. `saved_items` unique per (user, item).
7. `change_events` is append-only (no UPDATE trigger, no DELETE trigger allowed — enforced via database role permissions).
8. `contact_requests.buyer_user_id` is NOT NULL (registration required per PRD).
9. `listings.price_total_dirams > 0`, `listings.size_m2 > 0`, `listings.rooms_count >= 1`.
10. `phone_verifications.code_hash` is never plaintext (enforced by application layer, flagged for audit).

---

## 9. Indexes summary

The indexes defined per-table above support these V1 query patterns:

- Homepage Block F featured buildings: `(is_featured, featured_rank)`
- Projects browsing filter: composite on `(city, district_id, status, is_published)`
- Apartments browsing filter: `(status, verification_tier, published_at)` + per-filter indexes
- Map view: spatial index on `(latitude, longitude)`
- Building detail page: by building_id on listings, photos, change_events
- Listing detail page: by listing_id
- Saved page: by user_id on saved_items + join to change_events
- Seller dashboard: by seller_user_id on listings and contact_requests
- Staff review queues: by status on verification_submissions, verification_visits, fraud_reports
- Response-time aggregation: by seller_user_id + status on contact_requests

No speculative indexes for Phase 2 features.

---

## 10. What this schema does not include (and why)

To prevent scope creep — these are intentionally absent:

- **`saved_searches` table** — Phase 2 feature, per PRD V1 scope.
- **`compare_sets` table** — Compare is session-only per PRD, no server-side state.
- **`shared_lists` / `shared_compares` table** — Per User Flows Flow B14, shared links encode the set of item IDs in the URL itself (e.g., `/shared?buildings=id1,id2,id3`). No server-side persistence of shared sets is needed in V1. Recipients see the same content as the sender without requiring a login or an account.
- **`developer_users` join table** — V1 has founder-managed developer accounts, Phase 2 adds self-service.
- *(Removed — `notifications` table is now in §5.16 since UI Spec Page 13 §13.4 Block E requires persistent dismissible in-product notifications. SMS continues for off-platform alerts.)*
- **`analytics_events` table** — V1 uses a third-party analytics tool (e.g., PostHog, Plausible) rather than building an in-database analytics store.
- **`developer_performance` table** — V1 does not need aggregated developer analytics; the founder looks at raw data.
- **`mortgage_applications` table** — never in scope, halal-by-design.
- **`user_messages` table** — V1 contact goes via WhatsApp/Call/Form, not in-platform messaging.
- **`audit_log` table** — V1 uses `created_at`, `updated_at`, and `change_events` for the events that matter. Full audit trail is Phase 3+ infrastructure work.

---

## 11. Data model alignment checklist

The schema is correct only if every item below is true:

- [x] Every table trace to a specific PRD feature or specific blueprint block
- [x] No table covers a Phase 2+ feature
- [x] Three source types match PRD exactly (`developer`, `owner`, `intermediary`)
- [x] Four finishing types match blueprint exactly (`no_finish`, `pre_finish`, `full_finish`, `owner_renovated`)
- [x] Three verification tiers plus developer verification match PRD exactly
- [x] `owner_renovated` finishing restricted to non-developer listings
- [x] Compare has no table (session-only per PRD)
- [x] Saved items require registration (NOT NULL `user_id`)
- [x] Contact requests require registration (NOT NULL `buyer_user_id`)
- [x] WhatsApp/Call are zero-friction (no table — they're outbound deep links)
- [x] Bilingual content uses JSONB with `{ru, tg}` structure throughout
- [x] Money is integer dirams, not float
- [x] Response-time badge threshold (3+ completed contacts) is queryable
- [x] Change events table supports Homepage Block C and Saved page badges
- [x] Construction photos are staff-uploaded only (invariant on photos table)
- [x] Intermediary listings track owner phone confirmation (for Tier 3)
- [x] Tier 3 verification expires in 45 days (via `listing_verified_expires_at`)
- [x] Fraud prevention: perceptual hash, user reports, with indexes to support
- [x] District price benchmarks support fairness badges with sample_size threshold
- [x] No mortgage/interest table (halal by design)
- [x] No rentals/resale-of-old-housing/commercial tables (V1 scope)

---

## 12. Migration order

When building the schema, create tables in this order to respect foreign key dependencies:

1. `users`
2. `user_roles`
3. `districts`
4. `developers`
5. `buildings`
6. `listings`
7. `photos` (has FKs to `buildings` and `listings`)
8. `saved_items`
9. `contact_requests`
10. `change_events`
11. `verification_submissions`
12. `verification_visits`
13. `fraud_reports`
14. `district_price_benchmarks`
15. `phone_verifications`
16. `notifications`
17. `verification_slots`

After all tables exist, add the computed-field triggers for `buildings.price_from_dirams`, `buildings.price_per_m2_from_dirams`, and `buildings.last_inventory_refresh_at`.

---

## 13. Seed data required at launch

Before the platform can accept a first listing, the following data must exist:

- At least one user with `admin` role
- All districts in Dushanbe and Vahdat with names in both languages
- At least one verified developer (for developer-sourced listings)
- At least one building under that developer

Everything else is user-generated.

---

## 14. Final data model statement

This schema is the minimum set of tables and fields needed to support the PRD V1 features, the blueprint pages, and the user flows. Every entity maps to a user-visible feature. Every enum has a fixed value set. Every relationship is explicit.

Adding a table or field that doesn't trace to a documented feature is out of scope. Removing a table or field that supports a documented feature breaks the product.

When engineering starts, the schema is built from this document directly. No independent modeling decisions required.
