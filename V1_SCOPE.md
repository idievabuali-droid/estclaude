# V1_SCOPE.md

What's locked in scope, what's cut, what's intentionally manual. Read at session start. Update when V1 scope changes — and log the change in `DECISIONS.md` too.

## V1 scope reality (locked — do not re-expand)

The original specs target Dushanbe + Vahdat with 14 pages, full verification flow, multi-source listings, etc. **V1 is much narrower.**

- **One city: Vahdat.** `ACTIVE_CITY = 'vahdat'` in `services/buildings.ts` is the master switch. Every public query filters on it.
- **Seller self-serve with founder moderation.** Any phone-verified user (Telegram bot login captures the phone) can post via `/post` PostFlow. Non-founder submissions enter `status='pending_review'` + `is_published=false` and surface in the founder's moderation queue at `/kabinet` (ModerationList). Founder reviews each listing, calls/visits the seller using the captured phone, then approves via `/api/listings/moderate` — approval flips status to `'active'`, auto-publishes the parent building, and triggers saved-search match-on-publish. Founder posts (admin/staff in `user_roles`) go live immediately. Founder contacts in `src/lib/founder-contacts.ts` are still used for buyer-side WhatsApp/Telegram entry points (`/pomoshch-vybora`, etc).
- **Telegram bot auth, not SMS.** `@VafoTjBot` handles `/start <token>` for login + `/start subscribe_<token>` for saved-search subscribe. Twilio/Vonage references in specs are deferred.
- **No paid features. No verification UI flows. No Tier 2/3 self-service.** Founder manually verifies developers (when needed) by flipping `developers.verified_at` directly in Supabase Studio.
- **Compare hidden behind `FEATURES.compare = false`.** Code shipped, UI gated.
- **Source-type picker cut.** Server derives source from role: founder → `'developer'`, everyone else → `'owner'`. The `'intermediary'` enum value is unreachable in V1.
- **Building edit form wired (2026-05-22).** `/post/edit/building/[id]` covers every create-flow field + exterior/progress photo edits. Founder-only. Discoverable via a small "Редактировать ЖК" pill on `/zhk/[slug]` visible only to founders.
- **No cookie-consent banner.** TJ has no GDPR-equivalent. `anon_id` cookie is functional + first-party.
- **Cron is daily-only** (Vercel Hobby plan). Anything that needs faster runs inline (saved-search match-on-publish does this).

**Rule:** when the user asks for something, do not re-add cut features as "while we're here completeness." If you think a cut feature is now needed, raise it once, briefly, and defer to their call.

## What's intentionally manual in V1 (do not "fix" these without asking)

- **Migration application.** Each new migration file in `platform/supabase/migrations/` is applied by the user in the Supabase SQL editor. Don't try to run them via a script unless asked.
- **Developer verification.** No admin UI. Founder edits `developers.status` + `verified_at` directly.
- **Listing verification.** Founder calls (or visits, when needed) the seller using the phone captured at Telegram login before approving a `pending_review` listing. The moderation queue surfaces the phone next to each row. Automated verification is V2.
- **WhatsApp callback follow-up.** When a saved-search match arrives via the WhatsApp fallback, the founder gets a Telegram nudge with the buyer's phone and messages them manually.
- **Building cover photos for legacy buildings.** No backfill — only photos uploaded via the post/edit flow appear; older mock buildings stay on the colored placeholder.

These are deliberate trade-offs that buy speed at this stage. They become candidates to automate **only when manual cost > automation cost**, not before.
