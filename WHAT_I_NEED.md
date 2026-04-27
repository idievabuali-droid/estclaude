# What I need from you to make this real

Everything that can be built without external accounts is built. To make the platform actually usable by real users, you need to do these things — most are 5-15 minutes each, all on free tiers.

---

## Critical (blocks everything else)

### 1. Supabase project — ~10 min
**Why:** without a real database, every "save" / "post" / "contact" click is a mock toast. Nothing persists.

**What to do:**
1. Go to [supabase.com](https://supabase.com) → Sign up (free, no credit card)
2. Create a new project — name it `estclaude` or similar, pick region close to Tajikistan (e.g., Frankfurt)
3. Copy these 3 values from Settings → API:
   - `Project URL` → paste into `platform/.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

**Then tell me "Supabase is ready"** — I'll apply the 7 migration files in `platform/supabase/migrations/` to create all 17 tables + RLS policies, then generate the TypeScript types and wire the services layer to use real queries.

---

### 2. Telegram Bot for OTP — ~5 min
**Why:** so users can actually log in. Twilio SMS to Tajikistan costs ~$0.05 per message; Telegram is free and most Tajiks have it.

**What to do:**
1. In Telegram, message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` → pick a name (e.g., "ZHK.tj Login") → pick a username ending in `bot` (e.g., `zhktj_login_bot`)
3. BotFather sends back a token like `7826543210:AAH...` — copy it
4. Paste into `platform/.env.local`:
   - `TELEGRAM_BOT_TOKEN=<the token>`
   - `TELEGRAM_BOT_USERNAME=<the @username without the @>`

**Then tell me "Telegram bot is ready"** — I'll wire up the bot handler that listens for `/start`, sends OTP codes, and verifies them.

---

### 3. A real phone number for the platform — ~0 min if you have one
**Why:** when buyers tap "WhatsApp" or "Call" on a listing, they need to reach someone. For V1 this is your number; later it becomes the seller's number from the listing.

**What to give me:** Your WhatsApp-enabled phone number in `+992XXXXXXXXX` format. I'll plug it into the placeholder mock listings + the diaspora landing page contact buttons.

---

## Important (needed before showing real users)

### 4. Domain name — ~5 min and ~$10/year
**Why:** users need a real URL, not `localhost:3000`.

**What to do:** Register a domain at [Porkbun](https://porkbun.com) (~$10/year for a `.com`) or buy `.tj` from a Tajik registrar. Suggested: `zhk.tj`, `kvartiry.tj`, or similar.

**Then tell me the domain** — I'll configure it in the deployment step.

---

### 5. Cloudflare account — ~5 min
**Why:** free hosting + cron jobs + commercial use allowed. Vercel free tier prohibits commercial use which is risky for a real product.

**What to do:**
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free)
2. Add the domain from step 4
3. Tell me "Cloudflare is ready"

I'll handle the deployment config (`wrangler.toml` etc.) and connect the GitHub repo when you push it.

---

### 6. Real building photos — ~15-30 min
**Why:** right now every card shows a colored placeholder. Real users would think the platform is empty/fake.

**What to do, simplest path:**
- For each of the 4 mock buildings (or replace them), find 2-3 royalty-free photos of similar new-build apartments. Sources:
  - [Unsplash](https://unsplash.com) — search "new apartment building", "modern residential"
  - Or your own photos if you've toured any of these
- Drop them into `platform/public/buildings/<slug>/01.jpg`, `02.jpg` etc.
- Tell me which slugs map to which folder

**Or:** give me 1-2 hours of work and I'll wire the heic2any → resize → Supabase Storage upload pipeline so anyone can upload photos through the seller post flow. Then real photos come from real sellers.

---

## Nice to have (Phase 2)

### 7. First developer partner
**Why:** the wedge is "verified developer" listings. You need at least 1 developer who agrees to list with us as the founder-onboarded developer.

**What to do:** identify and contact 1-2 developer in Dushanbe — even a small one. Get them to agree to put 5-10 of their unsold units on the platform. I can prepare a 1-page "what your project page will look like" PDF for the pitch if useful.

### 8. Cloudflare Turnstile site key — ~3 min
**Why:** stop bots from spamming the contact form / posting flow.
**What to do:** in Cloudflare dashboard → Turnstile → add a new site → free → copy the site key + secret into `.env.local`. Skip until spam becomes a real problem.

### 9. PostHog account — ~3 min
**Why:** know what real users do (free tier handles 1M events/month).
**What to do:** sign up at [posthog.com](https://posthog.com), create project, copy the project key into `NEXT_PUBLIC_POSTHOG_KEY`.

---

## Summary table

| # | What | Time | Cost | Blocks |
|---|---|---|---|---|
| 1 | Supabase project | ~10 min | $0 | Database, auth, storage |
| 2 | Telegram bot | ~5 min | $0 | Login |
| 3 | Your phone number | 0 min | $0 | Contact buttons |
| 4 | Domain | ~5 min | ~$10/yr | Public URL |
| 5 | Cloudflare account | ~5 min | $0 | Deployment |
| 6 | Real photos | ~15-30 min | $0 | Visual quality |
| 7 | First developer | hrs/days | $0 | Real inventory |
| 8 | Turnstile | ~3 min | $0 | Bot protection (later) |
| 9 | PostHog | ~3 min | $0 | Analytics (later) |

**Total to first working version:** items 1-5, ~30 minutes of your time + ~$10 for the domain.
**Total to "show to real users":** add items 6 and 7 (~1-2 hours photos, days/weeks for first developer).

---

## What I'll do once you give me each piece

- After **Supabase**: apply all 7 migrations, generate types, swap services from mock → real, wire saved-items, wire compare batch endpoint
- After **Telegram bot**: implement OTP send/verify, hook up auth flow, wire login redirects
- After **your phone**: replace `+992 90 0000000` placeholder in mock data with your number
- After **domain + Cloudflare**: deploy, configure DNS, set up Workers Cron for the 9 scheduled jobs in Tech Spec §14
- After **real photos**: replace the colored placeholders with real images, set up the Image component for srcset/AVIF
- After **first developer**: onboard them properly (founder-managed per Data Model §5.5), seed their projects, replace mock buildings

When you're ready, just tell me which step you've done and I'll do my side.
