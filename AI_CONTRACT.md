# AI_CONTRACT

## Purpose
Non-negotiable build rules for AI coding agents (Codex, Claude Code) on this project. This file is read at the start of every task.

## Core objective
Build a trust-first, mobile-first, decision-focused new-build apartment platform for Dushanbe and Vahdat. Three-source inventory: developer, owner, intermediary. Three verification tiers: phone, profile, on-site.

The product must feel: clear, calm, structured, trustworthy, decision-focused.

The product must not feel: cluttered, generic, urgent, manipulative, source-confused.

## Source of truth — read these first

The locked spec stack lives at `docs/`:

1. **PRD v3** — `docs/real-estate-platform-strong-prd-v3.md` — strategy, wedge, principles
2. **Product Blueprint v2** — `docs/real-estate-platform-product-blueprint-v2.md` — page map, block order
3. **User Flows v2** — `docs/real-estate-platform-user-flows-v2.md` — step-by-step buyer and seller journeys
4. **Data Model v2** — `docs/real-estate-platform-data-model-spec-v2.md` — tables, enums, relationships
5. **Technical Spec v2** — `docs/real-estate-platform-technical-spec-v2.md` — stack, APIs, infra
6. **Design System Spec v1** — `docs/real-estate-platform-design-system-spec-v1.md` — 7 layers, tokens, primitives, platform components
7. **UI Spec v1** — `docs/real-estate-platform-ui-spec-v1.md` — 14 pages, block-by-block

If a build task conflicts with these specs, surface the conflict — do not improvise silently.

## Non-negotiable product rules

1. **Project-first, unit-aware, mobile-first.** Building results show projects with matching-unit previews; map and list views share the same filter state.
2. **Three-source transparency.** Every listing always shows its `SourceChip` (developer / owner / intermediary). Never hidden, never absent.
3. **Three-tier verification.** `VerificationBadge` renders the listing's tier honestly. Tier badges must use the exact colors from Design System Layer 2.4.
4. **Halal by design.** No "% годовых" anywhere. No interest-rate calculators. No fake urgency, no countdown timers, no "X people viewing now," no red alarm colors for non-emergency states. Installments display monthly amount + first payment + duration only.
5. **Trust UI uses calm colors.** Fairness indicators in green/stone/gold (never red). Status changes in amber (never red). Price rises in stone-700 (never red).
6. **Post first, verify later.** Posting requires only phone OTP. No documents, no email, no payment. Verification is upsell, not gating.
7. **Contact stays low-friction.** WhatsApp, Call zero-friction. Request Visit requires phone OTP login. Pre-composed messages with context.
8. **Construction progress photos with dates.** First-class trust signal — `ProgressPhotoCarousel` (Layer 7.6) is one of three signature wow features.
9. **Diaspora is first-class.** IMO is supported alongside WhatsApp/Telegram. Russian default, Tajik available. No fake testimonials.
10. **No paid features in V1.** No boost, no premium tier, no sponsored placement. Trust-weighted ranking is the only ranking.

## Non-negotiable UI rules

1. **Mobile-first always.** All UI designed for 375px viewport first.
2. **Use design tokens, never ad-hoc styles.** Design System Layer 2 (colors), Layer 3 (typography), Layer 4 (spacing), Layer 5 (shape/depth) are the only sources of visual values.
3. **Use platform components from Layer 7.** SourceChip, VerificationBadge, FairnessIndicator, InstallmentDisplay, ProgressPhotoCarousel, ListingCard, BuildingCard, StickyContactBar, FilterSheet, CompareBar, ChangeBadge. Do not invent parallel components.
4. **Use primitives from Layer 6 (shadcn/ui-based).** AppButton, AppInput, AppSelect, AppCheckbox, AppCard, AppChip, AppModal, AppBottomSheet, AppToast, AppBadge, AppTextarea, AppRadio. Wrap shadcn primitives — never use raw shadcn directly in pages.
5. **44×44 touch targets** baked into primitives. Don't override smaller.
6. **One toast at a time** (sonner). No stacked notifications.
7. **Tabular figures** for all numeric contexts (prices, m², counts).
8. **No emojis as functional UI elements.** Lucide icons are the icon system, including for source chips (Developer → `Building2`, Owner → `User`, Intermediary → `Handshake`). Emoji appears in PRD/Blueprint prose as shorthand only — never in production UI.
9. **Russian and Tajik both supported.** Layout flexes for longer words. Currency always TJS.
10. **Calm tone.** No exclamation marks, no celebration animations, no decorative slogans.

## Non-negotiable engineering rules

1. **Strict TypeScript.** No `any` unless justified inline. No `@ts-ignore` without comment.
2. **Clean entity separation per Data Model v2.** Don't collapse entities. Don't add fields not in spec without surfacing the change.
3. **Resource-oriented API routes.** Match the patterns in Technical Spec §6.
4. **Server state via TanStack Query, client state via Zustand or nuqs.** No Redux. No mixing patterns.
5. **No ORM.** Supabase SDK with CLI-generated types per Technical Spec.
6. **Strict enums.** Finishing types, source types, statuses, tiers — all from Data Model §3 enums. No custom strings.
7. **URL-serializable filter state** on every browsing page (use nuqs).
8. **No browser storage APIs in artifacts.** localStorage/sessionStorage forbidden in Claude artifacts (use React state).
9. **Server-rendered Open Graph meta** on Building detail (Page 5) and Listing detail (Page 7) — for WhatsApp/Telegram link sharing.
10. **Every important change is testable.** Vitest for unit, Playwright for E2E.

## AI task workflow

For every serious task:

1. Read this file (`AI_CONTRACT.md`)
2. Read `ARCHITECTURE.md`
3. Read `AGENTS.md`
4. Read the relevant page spec from UI Spec v1 (the 14 pages)
5. Read the relevant Layer 7 component spec from Design System Spec
6. Plan first if multi-step or ambiguous
7. Implement in small slices
8. Run lint, typecheck, tests before marking complete

## Prompt discipline

Each serious build task should be framed with:
- **Goal** — one sentence
- **Context** — which spec sections apply
- **Constraints** — non-negotiables specific to this task
- **Done when** — testable criteria

## What AI must not do

- Do not redesign the product without instruction
- Do not invent flows or fields not in spec
- Do not add dependencies beyond what Technical Spec locks
- Do not produce placeholder UI and call it done
- Do not silently resolve spec conflicts — surface them
- Do not use `any` types to dodge spec gaps — surface them
- Do not skip the UI Spec page when building a page

## Quality bar

A change is not done unless:
- It follows the spec stack
- It uses tokens and platform components only
- It looks production-grade, not draft
- It works on 375px mobile first
- It's typed strictly
- It does not introduce visual or data inconsistency
- The buyer/seller journey it touches still flows cleanly
