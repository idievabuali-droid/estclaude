# Real Estate Platform — Design System Spec v1

This document is the visual foundation. Codex reads it before writing any UI code. Every color, spacing value, component shape, and interaction pattern in the product traces to a decision made here.

**The spec is built in layers.** Each layer depends only on the ones before it. This document starts with Layer 1 (Principles) and grows as we lock later layers. Nothing below Layer 1 is built until Layer 1 is locked, because every later decision has to pass Principles as a filter.

---

## Document status

| Layer | Status | Contents |
|---|---|---|
| 1. Design principles | Locked | 5 rules that every later decision must pass |
| 2. Color system | Locked | Trust-coded palette grounded in warm terracotta |
| 3. Typography | Locked | Inter, 7 sizes, 3 weights, line heights baked in |
| 4. Spacing and layout | Locked | 4px base, 9-step scale, 3 breakpoints, 1200px container |
| 5. Shape and depth | Locked | 3 radii, 3 shadows, 1 border style |
| 6. Component primitives | Locked | 12 primitives wrapping shadcn/ui |
| 7. Platform-specific components | Locked | 11 platform components composed from primitives |

**Design system complete.** Next: the UI Spec document uses these layers to specify each page.

---

## Layer 1 — Design principles

These five principles are the test every later decision must pass. If a color, component, or layout choice doesn't serve one of these principles, it doesn't go in.

They are listed in priority order. When two principles conflict, the earlier one wins.

### Principle 1 — Lead the eye. No heaviness in the head.

The user should never feel tired or confused when they look at a screen. Within one second, they should know:

- what kind of screen they are on
- what the next action is
- what can be safely ignored

We achieve this by having one clear primary action per screen, a strong primary-to-secondary hierarchy, and plenty of breathing room around dense content. We do not achieve this by adding more lines, more boxes, more shadows, or more colors.

**When in doubt, remove something.**

**How this settles debates:** If someone asks "should we add this extra badge / row / label?", the answer is no unless it directly helps the user make their next decision. Every additional element is a tax on clarity.

### Principle 2 — Warm, not corporate. Calm, not loud.

The platform should feel like a trustworthy friend helping you make a big decision — not like a bank, not like a classifieds site, not like a flashy sales pitch.

That means:

- **Friendly, typographic language.** Words carry the product, not icons. Icons support labels; they don't replace them. This matches Airbnb's observation that icon-only UIs fail across languages — critical for our bilingual Russian/Tajik audience.
- **Rounded, soft shapes.** Sharp corners and harsh borders feel corporate. Moderately rounded cards and buttons feel approachable.
- **Muted, human colors.** We avoid highly saturated "tech" blues and greens. We avoid bold red-everywhere alarm patterns. Our palette is restrained and feels like a home, not a dashboard.
- **Moderate visual weight.** Borders are visible but thin. Shadows are present but soft. The UI is grounded but not shouting.

**How this settles debates:** If a design looks at home in a banking app or a stock-trading terminal, it's too corporate for this product. If it looks at home on a deal-of-the-day site, it's too loud. Our reference for the warm-but-clear feeling is Airbnb — welcoming enough to feel human, disciplined enough not to get in the way.

### Principle 3 — Trust is a visual choice.

This platform's core wedge is trust. That means trust is not a badge we tack on at the end — it's designed in from the first pixel.

**How trust shows up visually:**

- **Verification badges always appear near the thing they verify.** A verified-seller badge appears on the seller row, not in a sidebar. A verified-listing badge appears on the listing card, not on a separate page.
- **Source chips are mandatory and unmissable.** Every listing shows 🏗 Developer / 👤 Owner / 🤝 Intermediary. This is the first piece of context buyers need.
- **Price fairness is shown as a calm indicator, not an alarm.** "In line with district average" is useful. "Price per m² is 12% below average ✓" is useful. "⚠️ OVERPRICED!!" is not — alarm patterns erode trust over time.
- **Freshness is visible.** "Last updated X" timestamps matter. Stale data kills trust faster than any design choice.
- **No dark patterns, ever.** No fake urgency, no fake scarcity, no countdown timers, no "3 people viewing now" messages (these would also violate the halal-by-design rules from PRD section 19).

**How this settles debates:** If a design choice makes the platform feel more honest, it's in. If it makes the platform feel more persuasive-at-any-cost, it's out. We persuade by being clear, not by pressuring.

### Principle 4 — Mobile-first, always.

Every screen is designed for a one-handed phone user in Dushanbe on a 3G connection, first. Desktop is a progressive enhancement, not the default.

**What this means concretely:**

- Every decision starts from a ~375px mobile viewport. If it doesn't work there, it doesn't ship.
- Touch targets are at least 44×44px (iOS guideline) so they work with thumbs and sleeves.
- The primary action is always reachable without scrolling past the fold on a listing, building, or compare page — either inline above the fold or in a sticky bottom bar.
- Image and data weight is minimized. Large hero images lazy-load below the fold. Maps don't render until the user asks for them.
- Text remains readable without zooming. Minimum body size is 16px.
- The layout respects the bottom thumb zone — primary actions live at the bottom on mobile, top or side on desktop.

**How this settles debates:** If a feature looks great on desktop but forces horizontal scrolling on mobile, the mobile version is wrong. Fix the mobile version; the desktop version will follow. Never the other way around.

### Principle 5 — Consistency is invisible. Inconsistency is loud.

When every Save button looks the same, users stop thinking about them. When every card has the same shape, users stop parsing them. When spacing is consistent, the eye rests.

**What this means concretely:**

- Colors come from the palette defined in Layer 2. No ad-hoc hex codes in any component.
- Font sizes come from the type scale defined in Layer 3. No one-off sizes.
- Spacing comes from the 4px grid defined in Layer 4. No 7px margins or 13px padding.
- Shadows and radii come from Layer 5. No custom shadows per component.
- Buttons, inputs, cards, and badges are the primitives from Layer 6. Pages compose these primitives; they do not reinvent them.
- Platform components (listing card, source chip, fairness indicator) are the specific instances from Layer 7. Every listing card in the product uses the same component, not six variants.

**How this settles debates:** If a developer or AI is about to write a style that isn't in the tokens, the answer is almost always "use the token that exists" — even if the token is slightly less specific than what they wanted. The cost of one slightly imperfect-but-consistent screen is far lower than the cost of a UI that looks stitched together.

---

## How these principles work together

The five principles compose like this:

- Principle 1 (clarity) tells us **what to remove.**
- Principle 2 (warm + calm) tells us **how to shape** what remains.
- Principle 3 (trust) tells us **what to emphasize.**
- Principle 4 (mobile-first) tells us **where to place it.**
- Principle 5 (consistency) tells us **how to build it once and reuse it.**

If a design choice fails Principle 1, no amount of warmth, trust, mobile-friendliness, or consistency saves it. The user must be led.

---

## What Layer 1 does NOT decide

Layer 1 is about direction, not tokens. The following are intentionally still open and will be decided in later layers:

- Exact colors (Layer 2)
- Exact typeface weights and sizes (Layer 3)
- Exact spacing values and grid (Layer 4)
- Exact border radius, shadow, and border styles (Layer 5)
- Exact button, input, card, badge, chip shapes (Layer 6)
- Exact listing card, source chip, fairness indicator, progress photo strip shapes (Layer 7)

Codex does not build visual components from Layer 1 alone. Layer 1 is the filter, not the blueprint.

---

## Layer 2 — Color system

The palette is small on purpose. A restricted palette is the fastest way to meet Principle 5 (consistency), and a calm palette is the fastest way to meet Principle 1 (no heaviness in the head) and Principle 2 (warm, not loud).

Every color in this system has a specific job. No color is decorative. If a new color is added later, it must either replace one in this list or bring a new product job that isn't covered.

### 2.1 Brand color: warm terracotta

The brand color is **warm terracotta** — a muted, grounded reddish-orange in the clay/brick family.

**Why terracotta, not blue:**
- Competitors (Somon.tj, Cian, local banks, most portals) use blue. Being visually different from Somon.tj is part of the brand job.
- Terracotta signals warmth and authenticity (confirmed by 2026 design research as a dominant trend for trust-focused brands).
- The color references the physical product — these apartments are being built from clay, brick, warm materials. The brand looks like the thing it sells.
- Earth tones carry cultural weight in Central Asian aesthetic tradition (textiles, pottery, traditional architecture).
- Terracotta doesn't compete with red error states or green success states — it sits in its own territory.

**Where terracotta appears in the UI:**
- Logo
- Primary button fill (Найти, Отправить запрос, Опубликовать)
- Active navigation state
- Focus ring on interactive elements
- Selected filter chip accent
- Link color (text)
- Progress indicators
- The visual anchor of the diaspora funnel landing page

**Where terracotta does NOT appear:**
- Verification badges (those have their own fixed PRD colors — gray/blue/green/gold)
- Error, warning, success states (those are dedicated semantic colors)
- Large background fills (cards, page backgrounds — those stay neutral)
- Source chips (those have their own category colors)

### 2.2 Terracotta shade scale

11 shades from 50 (lightest) to 950 (darkest), following Tailwind's convention. Values specified in OKLCH (the Tailwind v4 native format) with hex equivalents for reference. Hue held roughly constant around 40° (true terracotta, between pure red and pure orange).

| Token | OKLCH | Hex (approx) | Primary use |
|---|---|---|---|
| `terracotta-50` | `oklch(0.971 0.013 40)` | `#FDF4EE` | Subtle background tint (hover-lift on white cards) |
| `terracotta-100` | `oklch(0.936 0.032 40)` | `#FAE4D3` | Selected filter chip fill |
| `terracotta-200` | `oklch(0.885 0.062 40)` | `#F5CDB0` | Soft accent background |
| `terracotta-300` | `oklch(0.808 0.100 40)` | `#EBB086` | Disabled-state accent |
| `terracotta-400` | `oklch(0.704 0.140 40)` | `#D98654` | Decorative accent (rare) |
| `terracotta-500` | `oklch(0.630 0.150 40)` | `#C4693A` | Secondary brand accent |
| `terracotta-600` | `oklch(0.565 0.148 40)` | `#AE5628` | **Primary brand color** — buttons, logo, focus ring |
| `terracotta-700` | `oklch(0.495 0.130 40)` | `#914822` | Hover state on primary button |
| `terracotta-800` | `oklch(0.425 0.108 40)` | `#773A1C` | Active/pressed state on primary button |
| `terracotta-900` | `oklch(0.360 0.088 40)` | `#5E2F17` | Deep accent (rare) |
| `terracotta-950` | `oklch(0.260 0.068 40)` | `#3F1F0F` | Accent on dark surfaces (dark mode, later) |

**The primary brand color is `terracotta-600`.** This is the one Codex uses when a component spec says "primary color." All other shades are only used when a spec explicitly references them (e.g., "primary button hover uses `terracotta-700`").

**Contrast target:** `terracotta-600` on white is designed to meet WCAG AA (4.5:1 for normal text) based on its OKLCH lightness of 0.565 (a ~0.43 lightness difference vs white, which typically maps to ≥4.5:1 contrast). For primary button text on a terracotta-600 fill, we use white (`#FFFFFF`) which achieves strong contrast.

**Codex verifies actual contrast at build time** using a WCAG contrast checker (manual tool or the `@tailwindcss/contrast` approach). If any color pair falls below 4.5:1 in measured contrast, adjust the shade by one step (e.g., move from terracotta-600 to terracotta-700) and re-check. Do not ship unchecked contrast.

### 2.3 Neutral palette: warm stone, not cool gray

The neutrals (text, borders, backgrounds, surfaces) are warm, not cool. Cool grays (Tailwind's `gray`/`slate`/`zinc` families) feel technical and corporate. Warm stone-family neutrals feel grounded and human, which matches Principle 2.

This is Tailwind v4's `stone` family, used as-is (no customization needed).

| Token | OKLCH | Hex | Primary use |
|---|---|---|---|
| `stone-50` | `oklch(0.985 0.001 106.423)` | `#FAFAF9` | Default page background (the "new white") |
| `stone-100` | `oklch(0.970 0.001 106.424)` | `#F5F5F4` | Card alternate background, section divider fill |
| `stone-200` | `oklch(0.923 0.003 48.717)` | `#E7E5E4` | Subtle borders (cards, inputs at rest) |
| `stone-300` | `oklch(0.869 0.005 56.366)` | `#D6D3D1` | Emphasized borders (input focused) |
| `stone-400` | `oklch(0.709 0.010 56.259)` | `#A8A29E` | Placeholder text, disabled text |
| `stone-500` | `oklch(0.553 0.013 58.071)` | `#78716C` | Secondary text (meta, timestamps, helper text) |
| `stone-600` | `oklch(0.444 0.011 73.639)` | `#57534E` | Body text for less-emphasized content |
| `stone-700` | `oklch(0.374 0.010 67.558)` | `#44403C` | Body text (default reading color) |
| `stone-800` | `oklch(0.268 0.007 34.298)` | `#292524` | Headings, emphasized text |
| `stone-900` | `oklch(0.216 0.006 56.043)` | `#1C1917` | Primary text color, highest emphasis |
| `stone-950` | `oklch(0.147 0.004 49.250)` | `#0C0A09` | Near-black for maximum emphasis (rare) |

**Defaults Codex uses without asking:**
- **Page background:** `stone-50` (`#FAFAF9`)
- **Card background:** `white` (`#FFFFFF`)
- **Default body text:** `stone-900` (`#1C1917`) — passes WCAG AAA on both `stone-50` and white
- **Secondary text (timestamps, helper):** `stone-500` (`#78716C`) — passes WCAG AA
- **Default border:** `stone-200` (`#E7E5E4`) — thin, present but quiet (Principle 2: moderate visual weight)
- **Focused input border:** `terracotta-600` (the brand color)

### 2.4 Verification tier badges: fixed by PRD

The PRD (section 12) specifies the trust-tier visual system. These colors are **not up for negotiation** — they're the product's trust language.

Token names use tier numbers (`badge-tier-1`, `badge-tier-2`, `badge-tier-3`) rather than the Data Model enum values (`phone_verified`, `profile_verified`, `listing_verified`) because badges are primarily referenced by tier number in the UI ("Tier 2 badge," "upgrade to Tier 3"). Codex maps the enum to the token at the component level — see Layer 7 for the badge component.

| Tier | PRD label | Data Model enum | Token | OKLCH | Hex | Contrast target |
|---|---|---|---|---|---|---|
| Tier 1 | Phone confirmed | `phone_verified` | `badge-tier-1` | `oklch(0.553 0.013 58.071)` | `#78716C` (stone-500) | WCAG AA (≥4.5:1) |
| Tier 2 | Profile verified | `profile_verified` | `badge-tier-2` | `oklch(0.554 0.135 240)` | `#2563A8` (muted blue) | WCAG AA (≥4.5:1) |
| Tier 3 | Listing verified on-site | `listing_verified` | `badge-tier-3` | `oklch(0.525 0.145 145)` | `#1F7A3D` (forest green) | WCAG AA (≥4.5:1) |
| Developer | Verified developer | `verified_developer` flag (not an enum, see Data Model 3.3) | `badge-tier-developer` | `oklch(0.595 0.140 85)` | `#A87A1C` (muted gold) | WCAG AA (≥4.5:1) |

**Important design rules for badges:**
- Badge color is used as the icon fill and the text label color, on a light tinted background (shade `100` of the same hue for the background — calm, not loud, per Principle 2).
- Badges always include a checkmark icon AND a text label. Icon-only badges would violate Principle 2 (words carry the product, not icons).
- The blue and green here are **muted and earth-adjacent**, not tech-bright. This keeps them from fighting with the warm terracotta brand color.

### 2.5 Source chips: who is selling

Per PRD and Blueprint, every listing shows a source chip identifying the seller type. These are product DNA — buyers learn what each icon means and the colors must be distinguishable at a glance (including for color-blind users, so the icon + text label carries the meaning; the color is reinforcement, not the sole signal).

**Icons are Lucide, not emoji.** Emoji (🏗 / 👤 / 🤝) appears in PRD/Blueprint/User Flows prose only as quick visual shorthand for the chip — production UI uses Lucide for cross-platform consistency. See §7.16.

| Source | Display label | Token | OKLCH | Hex | Lucide icon |
|---|---|---|---|---|---|
| Developer | От застройщика | `source-developer` | `oklch(0.450 0.080 260)` | `#3F4E7A` (deep indigo) | `Building2` |
| Owner | Собственник | `source-owner` | `oklch(0.525 0.145 145)` | `#1F7A3D` (forest green, same as tier-3) | `User` |
| Intermediary | Посредник | `source-intermediary` | `oklch(0.595 0.140 85)` | `#A87A1C` (muted gold, same as developer badge) | `Handshake` |

**Design note:** Owner shares green with Tier 3 verified; intermediary shares gold with verified-developer badge. This is intentional — owners and verified listings reinforce each other visually, and intermediaries are tonally aligned with their upscale-ish position between owner and developer. These color overlaps are acceptable because the chips ALWAYS appear next to explicit text labels, so the meaning is never ambiguous.

### 2.6 Finishing-type chips

Per Data Model section 3.4 and PRD, every listing has one of four finishing types. These are decision-critical filters, so they need visible, distinct chip colors. But they must remain calm, not loud.

Token names follow Tailwind's hyphen convention. The Data Model enum values use underscores (e.g., `no_finish`). Codex maps between them at the component level (a small lookup object: `{ no_finish: 'finishing-no-finish', pre_finish: 'finishing-pre-finish', full_finish: 'finishing-full-finish', owner_renovated: 'finishing-owner-renovated' }`).

| Data Model enum | Russian label | Token | OKLCH | Hex | Meaning |
|---|---|---|---|---|---|
| `no_finish` | Без ремонта | `finishing-no-finish` | `oklch(0.553 0.013 58.071)` | `#78716C` (stone-500) | Bare shell, buyer finishes everything |
| `pre_finish` | Предчистовая | `finishing-pre-finish` | `oklch(0.595 0.140 85)` | `#A87A1C` (muted gold) | Partially finished (walls, floors) |
| `full_finish` | С ремонтом | `finishing-full-finish` | `oklch(0.525 0.145 145)` | `#1F7A3D` (forest green) | Move-in ready |
| `owner_renovated` | Отремонтировано владельцем | `finishing-owner-renovated` | `oklch(0.554 0.135 240)` | `#2563A8` (muted blue) | Resale only, renovated by current owner |

**Design note:** The chips reuse the same muted palette as verification tiers (gray → gold → green → blue). This is deliberate — it teaches the eye that "more color" means "more finished" without introducing new hues. Principle 5 (consistency) beats visual novelty.

### 2.7 Price-fairness indicator

Per PRD section 7.4 and the product wedge, the fairness indicator on listing cards shows whether the price-per-m² is fair vs. the district average. This is one of the three signature wow features.

**Calm indicator, not alarm.** Per Principle 3 — we don't use bold red "OVERPRICED!!" — we use calm, informative signals.

| Range vs. district avg | Token | OKLCH | Hex | Label example |
|---|---|---|---|---|
| 10%+ below | `fairness-great` | `oklch(0.525 0.145 145)` | `#1F7A3D` (green) | ✓ 12% ниже среднего |
| Within ±10% | `fairness-fair` | `oklch(0.553 0.013 58.071)` | `#78716C` (stone-500) | Цена в рынке |
| 10–25% above | `fairness-high` | `oklch(0.595 0.140 85)` | `#A87A1C` (muted gold) | 15% выше среднего |
| 25%+ above | `fairness-alert` | `oklch(0.570 0.165 35)` | `#C0613A` (muted rust) | 28% выше среднего |

**Design note:** The "alert" case uses a muted rust, not a bright red. Bright red is reserved for semantic error states (form failures, destructive actions). Fairness indicators are informational, not alarming — we respect the seller's right to set their price while still serving the buyer with honest data.

### 2.8 Semantic colors: error, warning, success, info

These are the "system feedback" colors for form validation, toasts, banners, and destructive actions. They're small, restrained, and only appear when the UI must tell the user something about the state of their interaction.

| Purpose | Token | OKLCH | Hex | Use |
|---|---|---|---|---|
| Error | `semantic-error` | `oklch(0.577 0.225 27)` | `#DC2626` (red-600) | Form validation errors, destructive action confirmations, system failures |
| Warning | `semantic-warning` | `oklch(0.645 0.170 55)` | `#D97706` (amber-600) | Non-blocking warnings ("Photos recommended"), approaching limits |
| Success | `semantic-success` | `oklch(0.525 0.145 145)` | `#1F7A3D` (forest green) | Successful save, successful publish, verification approval toast |
| Info | `semantic-info` | `oklch(0.554 0.135 240)` | `#2563A8` (muted blue) | Informational banners, neutral status messages |

**Important:** Each semantic color has a paired `-bg` shade (a much lighter version used for the background of the toast or banner). Codex generates these automatically by using the shade `50` or `100` from the same hue family.

**Rule:** Red is reserved for genuine errors. It does NOT appear on price indicators, urgency messaging, or "attention" decorations. This rule is cross-referenced from PRD section 19 (halal-by-design: no fake urgency, no countdown timers, no alarm patterns).

### 2.9 Surface layering (foreground vs. background)

To keep the UI calm and mobile-readable, the platform uses a simple 3-level surface system. No dark-on-dark-on-dark nesting.

| Layer | Token | Color | Use |
|---|---|---|---|
| Base page | `surface-page` | `stone-50` (`#FAFAF9`) | Body background of every page |
| Card / primary container | `surface-card` | `white` (`#FFFFFF`) | Listing cards, building cards, forms, modals |
| Subtle section | `surface-subtle` | `stone-100` (`#F5F5F4`) | Alternate sections inside a page (e.g., "Similar listings" strip) |
| Elevated (sticky bars) | `surface-elevated` | `white` with shadow (Layer 5) | Sticky bottom action bar, floating map pin card |

Dark mode colors will be defined in a future iteration if needed. V1 is light-mode only (a deliberate Principle 1 choice — one visual system is simpler than two).

### 2.10 The complete `@theme` block

Codex drops this directly into `/app/globals.css`. All names are stable tokens the rest of the spec references.

```css
@import "tailwindcss";

@theme {
  /* ─── Brand: warm terracotta ───────────────────────────────── */
  --color-terracotta-50:  oklch(0.971 0.013 40);
  --color-terracotta-100: oklch(0.936 0.032 40);
  --color-terracotta-200: oklch(0.885 0.062 40);
  --color-terracotta-300: oklch(0.808 0.100 40);
  --color-terracotta-400: oklch(0.704 0.140 40);
  --color-terracotta-500: oklch(0.630 0.150 40);
  --color-terracotta-600: oklch(0.565 0.148 40); /* PRIMARY */
  --color-terracotta-700: oklch(0.495 0.130 40);
  --color-terracotta-800: oklch(0.425 0.108 40);
  --color-terracotta-900: oklch(0.360 0.088 40);
  --color-terracotta-950: oklch(0.260 0.068 40);

  /* ─── Neutrals: warm stone (Tailwind stone family) ──────────── */
  /* Using Tailwind's default stone values — no override needed.
     Listed here for reference. */

  /* ─── Semantic aliases ──────────────────────────────────────── */
  --color-primary:           var(--color-terracotta-600);
  --color-primary-hover:     var(--color-terracotta-700);
  --color-primary-pressed:   var(--color-terracotta-800);
  --color-primary-subtle:    var(--color-terracotta-100);

  --color-text-primary:      var(--color-stone-900);
  --color-text-secondary:    var(--color-stone-500);
  --color-text-disabled:     var(--color-stone-400);

  --color-surface-page:      var(--color-stone-50);
  --color-surface-card:      #ffffff;
  --color-surface-subtle:    var(--color-stone-100);

  --color-border-default:    var(--color-stone-200);
  --color-border-strong:     var(--color-stone-300);
  --color-border-focus:      var(--color-terracotta-600);

  /* ─── Verification tiers (fixed by PRD section 12) ──────────── */
  --color-badge-tier-1:        oklch(0.553 0.013 58.071);  /* gray, stone-500 */
  --color-badge-tier-2:        oklch(0.554 0.135 240);     /* muted blue */
  --color-badge-tier-3:        oklch(0.525 0.145 145);     /* forest green */
  --color-badge-tier-developer:oklch(0.595 0.140 85);      /* muted gold */

  /* ─── Source chips ──────────────────────────────────────────── */
  --color-source-developer:    oklch(0.450 0.080 260);     /* deep indigo */
  --color-source-owner:        oklch(0.525 0.145 145);     /* forest green */
  --color-source-intermediary: oklch(0.595 0.140 85);      /* muted gold */

  /* ─── Finishing chips (Data Model 3.4 — enum uses underscores, */
  /*     CSS tokens use hyphens; map at the component level) ────── */
  --color-finishing-no-finish:        oklch(0.553 0.013 58.071);  /* stone-500 */
  --color-finishing-pre-finish:       oklch(0.595 0.140 85);      /* muted gold */
  --color-finishing-full-finish:      oklch(0.525 0.145 145);     /* forest green */
  --color-finishing-owner-renovated:  oklch(0.554 0.135 240);     /* muted blue */

  /* ─── Price fairness ────────────────────────────────────────── */
  --color-fairness-great:  oklch(0.525 0.145 145);         /* green */
  --color-fairness-fair:   oklch(0.553 0.013 58.071);      /* stone-500 */
  --color-fairness-high:   oklch(0.595 0.140 85);          /* muted gold */
  --color-fairness-alert:  oklch(0.570 0.165 35);          /* muted rust */

  /* ─── Semantic feedback ─────────────────────────────────────── */
  --color-semantic-error:   oklch(0.577 0.225 27);
  --color-semantic-warning: oklch(0.645 0.170 55);
  --color-semantic-success: oklch(0.525 0.145 145);
  --color-semantic-info:    oklch(0.554 0.135 240);
}
```

### 2.11 Rules that constrain how these colors are used

These rules exist to prevent Codex from inventing new color decisions screen-by-screen.

1. **Never use a raw hex or OKLCH value in a component.** Use the semantic tokens (`var(--color-primary)`, `bg-primary`, etc.). If a component needs a color that doesn't exist in this spec, pause and ask before adding one.
2. **Never use more than 2 colors from the trust/source/finishing families on a single card.** Crowded color is louder than any individual color choice (Principle 1).
3. **Never pair terracotta with bright red or bright blue.** Terracotta's neighbors are stone, muted blue, forest green, muted gold — never saturated cousins.
4. **Never use color alone to communicate meaning.** Every chip has a text label. Every badge has an icon and a text label. Every fairness indicator has a label. Color is reinforcement, not the signal (Principle 2 + accessibility).
5. **Dark mode is out of scope for V1.** Light mode only. Do not add `.dark` variants to tokens in V1.

---

## What Layer 2 does NOT decide

- Exact typefaces, font sizes, weights, line heights (Layer 3)
- Exact padding, margin, gap values (Layer 4)
- Exact border radius, shadow depth (Layer 5)
- Exact button / input / card visual shape (Layer 6)
- Exact listing card layout composition (Layer 7)

Codex doesn't build visual components from Layer 2 alone. Layer 2 provides the color vocabulary; Layers 3–7 compose with it.

---

## Layer 3 — Typography

Typography does most of the work of leading the eye (Principle 1). Color gets attention; type structures thought. The goal here is a **small, strict type system** that gives Codex exactly enough decisions to build every screen without inventing new ones.

Layer 3 is deliberately minimal. Seven sizes. Three weights. One font family. Line heights baked into the size tokens. That's it.

### 3.1 One typeface: Inter

**Inter is the single typeface for the entire product.** No display font for headings, no serif for marketing copy. One family, used at different sizes and weights, does everything.

**Why Inter:**
- Designed specifically for UI readability at small sizes on screens (confirmed by 2026 typography research as the default choice for modern web products).
- Cyrillic support across ~2000 glyphs covering 147 languages including Russian and other Cyrillic-script languages.
- Works from 12px (chip label) to 48px (hero headline) without breaking.
- Strong weight range (Inter has 9 weights) — we use only 3.
- Free, served from Google Fonts with `font-display: swap`, already locked in the technical spec.
- Neutral: doesn't fight the warm terracotta brand color or distract from content (Principle 2: calm, not loud).

**Honest caveat on Cyrillic:** Inter is Latin-first. Some Cyrillic reviewers have noted it lacks the same level of detail refinement as its Latin glyphs. For V1, Inter's Cyrillic is good enough — it's what Notion, Figma, and most Russian-speaking tech products use. If during real buyer testing the Cyrillic feels "off," the fallback plan is to switch to **Manrope** or **IBM Plex Sans** (both have strong Cyrillic coverage and similar neutral-sans character). This is a switch we can make at any point without rewriting components, because the CSS variable `--font-sans` is the only place the font is named.

**What we do NOT do:**
- No second typeface (no serif for headlines, no monospace for anything visible to buyers)
- No custom fonts, no handwritten-style fonts, no display faces
- System-font fallback (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) is only for the brief moment before Inter loads

### 3.2 Three weights only

| Weight | Numeric | Use |
|---|---|---|
| Regular | 400 | Body text, default paragraph content |
| Medium | 500 | Emphasized text, small labels, chip text, meta info |
| Semibold | 600 | Headings, primary buttons, navigation, prices, key decision data |

**We do not use:**
- Light (300) — too thin for mobile readability
- Bold (700) — semibold at 600 is enough emphasis; bold competes with headings
- Italic — never used in the product UI
- Extra weights (100, 200, 800, 900) — out of scope

**Three weights is a performance decision too.** Loading more weights slows the page. The 2026 typography research recommends a maximum of 3 weights per site, and that matches our restraint principle.

### 3.3 Seven sizes — the complete scale

The scale is mobile-first. These are the sizes on a phone (375px viewport). On desktop, a couple of sizes scale up slightly via CSS (see 3.6). No breakpoint-by-breakpoint size tables — those create inconsistency.

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `text-display` | 32px | Semibold (600) | 1.15 (tight) | Hero headline on homepage, page-level H1 on marketing pages |
| `text-h1` | 24px | Semibold (600) | 1.25 | Primary page headings (building name, listing title) |
| `text-h2` | 20px | Semibold (600) | 1.3 | Section headings inside a page ("Available apartments", "About the building") |
| `text-h3` | 16px | Semibold (600) | 1.4 | Card titles, modal headers, field group labels |
| `text-body` | 16px | Regular (400) | 1.5 | Default paragraph and reading text, form inputs |
| `text-meta` | 14px | Medium (500) | 1.4 | Secondary info: timestamps, counts, helper text, chip labels |
| `text-caption` | 12px | Medium (500) | 1.4 | Smallest text: badge labels, legal disclaimers, table footnotes |

**Rules this scale enforces:**
- **16px is the minimum for reading text.** Nothing below 16px is ever used for paragraphs or form inputs. 14px and 12px are for short labels only (≤5 words).
- **The size count is seven, not twelve.** If Codex thinks a screen needs "something between `text-h2` and `text-h1`," the answer is no — pick one of the seven.
- **Semibold 600 is the only heading weight.** No "regular headings." No "extra-bold headings." Hierarchy comes from size, not weight stacking.
- **Line heights are paired with sizes.** Codex does not reinvent line-height per component — if it's `text-body`, line-height is 1.5. Period.

### 3.4 Line-height logic: two rules

Only two rules govern line height, and they cover every case:

1. **Small tight text (12–14px) uses line-height 1.4.** Chip labels, badge labels, captions. Tight enough to not waste space, loose enough to read.
2. **Reading text (16px and up) uses line-height 1.5 for body, 1.15–1.4 for headings.** Bigger text needs less relative line-height; smaller reading text needs more.

That's it. Codex doesn't pick line-heights per component — they're baked into the tokens above.

### 3.5 Numbers deserve special care

Prices, square meters, floors, and unit counts are the most-scanned data on the platform. They need to line up visually so buyers can compare cards at a glance.

**Rule:** all numeric displays (prices, sizes, floors, counts) use Inter's **tabular figures** variant via CSS `font-variant-numeric: tabular-nums`. This makes every digit take equal horizontal space so "5,200" and "5,800" align column-to-column.

Tabular figures only apply in these specific contexts:
- Listing card price
- Listing card size (m²)
- Listing card floor (e.g., "5/12")
- Building card "from price"
- Compare table cells
- Fairness indicator numbers ("12% ниже")
- Any table of listings or buildings

Not applied to: body text, descriptions, street addresses, phone numbers. Default proportional figures read better there.

### 3.6 Desktop scaling: one small adjustment

The scale above is the mobile scale. On desktop (≥1024px), only two sizes change:
- `text-display`: 32px → 40px
- `text-h1`: 24px → 28px

Everything else stays the same. Bumping body text larger on desktop creates a different product, not a better one — 16px body is comfortable on both phone and desktop.

Codex implements this with a single media query in the CSS variable, not with breakpoint-conditional class names in every component.

### 3.7 Cyrillic and Latin must read the same

The product is primarily Russian (Cyrillic), with Tajik (also Cyrillic) as the second language and some English words that bleed in (developer names, "новостройки"). Inter's Cyrillic glyphs are designed to the same metrics as its Latin glyphs — same x-height, same weight progression, same vertical rhythm.

**Rule:** Never manually adjust letter-spacing or line-height based on whether the text is Cyrillic or Latin. Inter handles it. If text doesn't look right, the fix is a different size from the scale — not a custom letter-spacing override.

**What this prevents:** Codex running into mixed-language text ("ЖК Sitora Hills") and trying to "fix" the spacing with tracking overrides, which would create inconsistent visual rhythm across the product.

### 3.8 The complete `@theme` additions

Codex appends this to `/app/globals.css` after the color tokens from Layer 2.

```css
@theme {
  /* ─── Typography ────────────────────────────────────────────── */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
               Roboto, sans-serif;

  /* Sizes (mobile defaults) */
  --text-display:  2rem;      /* 32px */
  --text-h1:       1.5rem;    /* 24px */
  --text-h2:       1.25rem;   /* 20px */
  --text-h3:       1rem;      /* 16px */
  --text-body:     1rem;      /* 16px */
  --text-meta:     0.875rem;  /* 14px */
  --text-caption:  0.75rem;   /* 12px */

  /* Line heights (paired with sizes) */
  --leading-display: 1.15;
  --leading-h1:      1.25;
  --leading-h2:      1.3;
  --leading-h3:      1.4;
  --leading-body:    1.5;
  --leading-meta:    1.4;
  --leading-caption: 1.4;

  /* Weights */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
}

/* Desktop: two sizes scale up, nothing else changes */
@media (min-width: 1024px) {
  :root {
    --text-display: 2.5rem;   /* 40px */
    --text-h1:      1.75rem;  /* 28px */
  }
}

/* Tabular figures utility — applied to numeric display contexts */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

### 3.9 Rules that constrain Codex

These are the rules that prevent typography drift across screens. They exist for the same reason the color rules exist — so the product reads as one system, not twelve similar ones.

1. **Never invent a size outside the scale.** If a design seems to need a size between two tokens, one of the two is the answer.
2. **Never use weights outside 400, 500, 600.** No `font-bold`, no `font-light`, no `font-extrabold` anywhere in the codebase.
3. **Never use italic.** The product is already Russian-first and italic on Cyrillic looks awkward. Emphasis comes from weight, not slant.
4. **Never change line-height per component.** It's baked into the size token.
5. **Always apply tabular figures to numeric display contexts.** Prices, sizes, floors, counts — tabular. Body text, addresses — not tabular.
6. **Never mix Inter with another font.** Not even for accent words. Not even for "branding reasons."

---

## What Layer 3 does NOT decide

- Exact padding and margin values (Layer 4)
- Grid and breakpoint values (Layer 4)
- Border radius and shadows (Layer 5)
- Button/input/card shapes and states (Layer 6)
- Listing card composition (Layer 7)

Codex doesn't build visual components from Layer 3 alone. Layer 3 provides the type vocabulary; Layers 4–7 compose with it.

---

## Layer 4 — Spacing and layout

Spacing does Principle 1's work silently. Bad spacing is the number-one source of "heaviness in the head" on real-estate sites — cards crowded together, buttons glued to edges, text crammed against borders. Good spacing is invisible; it just lets the eye move.

Layer 4 is strict: **one spacing scale, three breakpoints, one container width**. If Codex needs a value outside the scale, the answer is to pick one from the scale, not invent a new one.

### 4.1 The spacing scale — 4px base, restricted to 9 values

The base unit is **4px (0.25rem)**, matching Tailwind v4 convention. But we don't use Tailwind's full scale of dozens of values — we **restrict the scale to 9 values** that cover every real use case.

| Token | Value | Pixels | Named use |
|---|---|---|---|
| `space-1` | `0.25rem` | 4px | Tight gap inside a chip (icon ↔ text) |
| `space-2` | `0.5rem` | 8px | Badge padding, small icon-to-text gap |
| `space-3` | `0.75rem` | 12px | Input internal padding, chip padding |
| `space-4` | `1rem` | 16px | Card padding, default gap between related items |
| `space-5` | `1.5rem` | 24px | Gap between sections inside a card, large card padding |
| `space-6` | `2rem` | 32px | Gap between major page sections |
| `space-7` | `3rem` | 48px | Top/bottom padding on page sections |
| `space-8` | `4rem` | 64px | Hero-section vertical padding, large page breathing room |
| `space-9` | `6rem` | 96px | Reserved for homepage hero and rare big-breathing-room cases |

**Nine values. No more.**

This restriction is deliberate. Every "I need 20px here" or "I need 28px there" request is answered by picking `space-4` (16px) or `space-5` (24px) instead. The eye cannot tell the difference between 20px and 24px on a phone — but it can absolutely tell the difference between a consistent system and a chaotic one.

**The three buckets these values fall into** (following the industry pattern of micro / UI / layout):

- **Micro** (4–8px): inside chips, badges, tight icon-text pairs
- **UI** (12–24px): inside cards, between form fields, between related items
- **Layout** (32–96px): between sections, around heroes, page breathing room

Codex picks by thinking about the bucket first, then picking the value inside it.

### 4.2 Three breakpoints, not five

Tailwind v4 ships with five breakpoints (sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536). **We use three.** The others are not forbidden, but they're rarely needed and create more conditional styling than they save.

| Breakpoint | Width | What changes here |
|---|---|---|
| Mobile (default, no prefix) | 0–767px | Single column, full-width cards, bottom sheet filters, sticky bottom action bar |
| Tablet (`md:`) | 768px+ | Two-column card grid, wider page padding, sidebar-optional layouts |
| Desktop (`lg:`) | 1024px+ | Three-column card grid, sticky sidebar on detail pages, map + list split view, top nav instead of bottom bar |

**We do not use:** `sm:` (640), `xl:` (1280), `2xl:` (1536).

**Why three, not five:**
- Principle 4 (mobile-first) means mobile is the design baseline. Desktop adaptations should be few and purposeful, not a cascade of five resizings.
- Every extra breakpoint Codex has to think about is an extra chance to introduce inconsistency.
- Between tablet (768) and desktop (1024), nothing about the product needs to change. Between 1024 and 1280, nothing needs to change either. The design works at 1024+ — wider screens just get more whitespace around the same layout.

### 4.3 One container width

The main content container has one maximum width: **1200px** on desktop. Inside that container, content breathes with consistent horizontal padding.

| Viewport | Content width | Horizontal padding |
|---|---|---|
| Mobile (0–767px) | 100% | `space-4` (16px) each side |
| Tablet (768–1023px) | 100% | `space-5` (24px) each side |
| Desktop (1024px+) | Max 1200px, centered | `space-6` (32px) each side |

**What 1200px means:** comfortable reading width for listings/buildings. Wider would spread content too thin for scanning — the eye gets tired tracking across a 1600px-wide card row. Narrower would waste the screen. 1200px is the working standard for real-estate platforms (checked against major refs).

**Exception:** The map-plus-list search results page uses the full viewport width (no 1200px cap). Maps need space; the list beside them stays at a fixed 480px panel on desktop. This is the one layout that breaks the 1200px rule, and it's documented explicitly here so Codex doesn't generalize it.

### 4.4 Touch targets: 44×44px minimum, always

Per Principle 4 (mobile-first) and accessibility standards (WCAG 2.5.5 Target Size), every interactive element — button, link, chip, checkbox, radio, toggle, icon button, tab — has a **minimum hit area of 44×44px**. This is non-negotiable.

If a visual element is smaller than 44×44px (e.g., a 16×16 close icon), it still needs a 44×44 invisible hit area around it, achieved by padding.

Codex applies this rule at the component level (Layer 6), not at each usage. Once a `Button` primitive is built with the right hit area, every button gets it for free.

### 4.5 Default padding patterns

These are the defaults Codex uses without asking. They match the buckets from 4.1.

| Element | Padding | Token |
|---|---|---|
| Chip (filter, source, finishing, badge) | 4px vertical, 12px horizontal | `py-1 px-3` → `space-1 / space-3` |
| Input field | 12px vertical, 16px horizontal | `py-3 px-4` → `space-3 / space-4` |
| Button (primary, secondary) | 12px vertical, 24px horizontal | `py-3 px-5` → `space-3 / space-5` |
| Card (listing, building) | 16px on mobile, 24px on desktop | `p-4 md:p-5` → `space-4 / space-5` |
| Modal / bottom sheet | 24px all sides | `p-5` → `space-5` |
| Page section (vertical padding) | 32px on mobile, 48px on desktop | `py-6 md:py-7` → `space-6 / space-7` |

**Rule:** these defaults apply unless a component spec (Layer 6 or 7) says otherwise. Codex does not pick padding per usage — the element type determines it.

### 4.6 Default gaps (space between items)

Gaps follow the same restraint. When laying out items with flex or grid:

| Context | Gap | Token |
|---|---|---|
| Icon ↔ text inside a chip or button | 4px | `gap-1` → `space-1` |
| Items in a horizontal list of chips | 8px | `gap-2` → `space-2` |
| Form fields stacked vertically | 16px | `gap-4` → `space-4` |
| Cards in a grid (mobile) | 16px | `gap-4` → `space-4` |
| Cards in a grid (tablet+) | 24px | `gap-5` → `space-5` |
| Major page sections | 32px mobile, 48px desktop | `gap-6 md:gap-7` |

### 4.7 Safe-area insets for mobile bottom bars

The mobile sticky bottom action bar (WhatsApp / Call / Request visit on listing pages) must respect device safe areas — the home indicator strip on newer iPhones, the gesture bar on Android.

**Rule:** sticky bottom bars use `padding-bottom: max(space-3, env(safe-area-inset-bottom))`. This is built into the sticky bar primitive once and reused everywhere. Codex does not apply it per page.

### 4.8 The complete `@theme` additions

Appends to `/app/globals.css` after Layer 3's tokens. This explicitly **replaces** Tailwind's default infinite spacing scale with the restricted 9-value scale.

```css
@theme {
  /* ─── Spacing scale (replaces Tailwind's dynamic default) ────── */
  --spacing: initial;
  --spacing-1: 0.25rem;  /* 4px  — micro */
  --spacing-2: 0.5rem;   /* 8px  — micro */
  --spacing-3: 0.75rem;  /* 12px — UI */
  --spacing-4: 1rem;     /* 16px — UI default */
  --spacing-5: 1.5rem;   /* 24px — UI large */
  --spacing-6: 2rem;     /* 32px — layout */
  --spacing-7: 3rem;     /* 48px — layout */
  --spacing-8: 4rem;     /* 64px — layout hero */
  --spacing-9: 6rem;     /* 96px — reserved */

  /* ─── Breakpoints (restricted to 3) ──────────────────────────── */
  --breakpoint-sm: initial;
  --breakpoint-xl: initial;
  --breakpoint-2xl: initial;
  /* Keep Tailwind defaults for md and lg:
     --breakpoint-md: 48rem   (768px)
     --breakpoint-lg: 64rem   (1024px)  */

  /* ─── Container ──────────────────────────────────────────────── */
  --container-max: 75rem;   /* 1200px */
}
```

**Note on `--spacing: initial;`**: per Tailwind v4 docs, setting this kills the dynamic spacing behavior and forces Codex to use only the values explicitly listed. This is intentional — it's the whole point of restricting the scale. If Codex needs a value that isn't in the list, it cannot hack around it with an arbitrary number — it must pick from the 9 approved values.

### 4.9 Rules that constrain Codex

1. **Never invent a spacing value outside the 9-step scale.** If the design seems to need 20px, pick between `space-4` (16px) and `space-5` (24px) — usually `space-4`. If it seems to need 40px, pick between `space-6` (32px) and `space-7` (48px).
2. **Never use `sm:`, `xl:`, or `2xl:` breakpoints.** Only `md:` and `lg:`. Mobile is the baseline.
3. **Every interactive element has a 44×44 minimum hit area.** Baked into component primitives.
4. **Content never exceeds 1200px** except for the map+list search page.
5. **Use the default padding patterns from 4.5** unless a component spec overrides them.
6. **Sticky bottom bars use `env(safe-area-inset-bottom)`** via the primitive, not per-page.

---

## What Layer 4 does NOT decide

- Border radius and shadow values (Layer 5)
- Individual component shapes and states (Layer 6)
- Listing card composition (Layer 7)

Layer 4 gives Codex a strict skeleton: spacing values, breakpoints, container, and touch-target minimum. Layers 5–7 hang visual decisions on this skeleton.

---

## Layer 5 — Shape and depth

This is the smallest layer on purpose. Shape and depth are where design systems get bloated — too many radius options, too many shadows, too many border variants, and suddenly no two cards look the same.

**Three radius values. Three shadow values. One border style.** That's the whole layer.

### 5.1 Border radius — three values

The product's overall shape language is **rounded but not playful**. Rounded corners reinforce warmth and approachability (Principle 2). Sharp corners feel corporate and legal. Very large round corners feel like a consumer lifestyle app. We sit in the middle — rounded enough to feel warm, not so rounded that it feels like a kids' app.

| Token | Value | Use |
|---|---|---|
| `radius-sm` | `6px` | Chips, badges, small form inputs, tags |
| `radius-md` | `12px` | Cards, modals, bottom sheets, buttons, larger inputs |
| `radius-full` | `9999px` | Avatars, circular icon buttons, dot indicators |

**No `radius-lg`, no `radius-xl`, no `radius-none`.** If a sharp corner is needed somewhere, the answer is usually "don't" — the product has one shape language.

**Images get `radius-md`** (12px) to match the card they sit inside. When an image fills the top of a card edge-to-edge, it takes the card's radius on the top two corners only (`rounded-t-md`). Image corners are never sharp.

### 5.2 Shadows — three elevations

Shadows communicate elevation. In a calm product, elevation is used sparingly — only when something is genuinely floating (like a sticky bar) or temporarily lifted (like a hovered card).

| Token | Shadow | Use |
|---|---|---|
| `shadow-none` | `none` | Default for cards at rest. Cards lean on border, not shadow. |
| `shadow-sm` | `0 1px 2px rgba(28, 25, 23, 0.06)` | Hover state on cards, dropdown menus, popovers |
| `shadow-md` | `0 4px 12px rgba(28, 25, 23, 0.10)` | Sticky bottom action bar, floating map pin card, modals |

**Shadows use warm stone-black (`rgba(28, 25, 23, ...)`, which is `stone-900` with alpha), not pure black.** Pure black shadows look harsh and cool; stone-tinted shadows stay in the warm family (Principle 2).

**Rule:** cards use `border + shadow-none` as the default, not `shadow-sm`. Shadow is for floating/hovering/elevated states only. A page full of drop-shadowed cards feels cluttered — that's exactly what we avoid.

**No `shadow-lg`, no `shadow-xl`, no inset shadows, no glow effects, no colored shadows.** Three shadows handle every real case.

### 5.3 Borders — one style

**Every visible border in the product is `1px solid`.** No dashed borders. No 2px borders. No double borders.

Border **color** varies (from Layer 2):
- `border-default` (`stone-200`) — cards, inputs at rest, table rows
- `border-strong` (`stone-300`) — emphasized dividers, input hover state
- `border-focus` (`terracotta-600`) — focused inputs, keyboard-focused interactive elements

**Rule:** borders are thin and calm. They say "here is an edge" without announcing themselves. A 1px border in `stone-200` on a white card is enough to separate it from the page background (`stone-50`) and it doesn't need a shadow to feel present.

### 5.4 Focus rings — the one exception

Keyboard-focus indicators are the only exception to the "thin border" rule. For accessibility, focus rings need to be **clearly visible**.

**Rule:** focused interactive elements (button, input, link, chip) show a **2px `terracotta-600` outline offset by 2px from the element**. This is wider than normal borders on purpose — it needs to be seen by keyboard users.

Implementation: CSS `outline: 2px solid var(--color-terracotta-600); outline-offset: 2px;` applied via the `:focus-visible` pseudo-class. This is built into component primitives at Layer 6.

### 5.5 The complete `@theme` additions

Appends to `/app/globals.css` after Layer 4's tokens.

```css
@theme {
  /* ─── Radius ────────────────────────────────────────────────── */
  --radius-sm: 0.375rem;   /* 6px  — chips, badges, small inputs */
  --radius-md: 0.75rem;    /* 12px — cards, modals, buttons */
  --radius-full: 9999px;   /* avatars, dot indicators */

  /* ─── Shadows ───────────────────────────────────────────────── */
  --shadow-none: none;
  --shadow-sm: 0 1px 2px rgba(28, 25, 23, 0.06);
  --shadow-md: 0 4px 12px rgba(28, 25, 23, 0.10);
}
```

### 5.6 Rules that constrain Codex

1. **Never use a radius value outside the three defined tokens.** No 4px, 8px, 16px, 20px custom radii.
2. **Cards default to `shadow-none` with a `border-default` border.** Shadow is for float/hover/elevated states only.
3. **Every border is 1px solid.** No dashed, no 2px, no doubles.
4. **Focus rings use `:focus-visible` with 2px terracotta-600 outline and 2px offset.** Built into primitives; never applied per-component.
5. **No neumorphism, no glassmorphism, no inner shadows, no colored shadows, no glow effects.** The product is calm and warm, not decorative.

---

## What Layer 5 does NOT decide

- Specific button, input, card, badge, chip shapes and states (Layer 6)
- Platform components like listing cards and fairness indicators (Layer 7)

Layer 5 is a small visual vocabulary: three radii, three shadows, one border style. Layer 6 puts them to work on actual components.

---

## Layer 6 — Component primitives

This is the largest layer because it's where every previous decision becomes a working thing a user can touch. But it stays high-level: each primitive has one specification, a minimal API, and the variants it genuinely needs — nothing more.

### 6.1 Source of primitives: shadcn/ui

The tech spec locks **shadcn/ui** as the component foundation. Codex does **not** invent primitives from scratch. It uses the shadcn CLI to copy source into `components/ui/` and then composes on top.

**File structure (matches 2026 shadcn best practice):**

```
/src/components/
├── ui/          # Raw shadcn primitives — Codex does not modify these directly
├── primitives/  # Product-branded wrappers (our styling, our API) — what the app uses
└── blocks/      # Page-level compositions (listing card, fairness indicator — Layer 7)
```

**Import rule:** the app imports from `components/primitives/`, not from `components/ui/`. This keeps shadcn upgradable and keeps branded tokens consistent.

Example pattern:
```tsx
// components/ui/button.tsx         ← shadcn source (do not modify casually)
// components/primitives/AppButton.tsx ← wraps shadcn Button with our variants/styling
// app/some-page/page.tsx           ← imports AppButton, never raw Button
```

### 6.2 Primitives V1 needs

Twelve primitives cover every screen in the V1 product. No more.

| Primitive | shadcn source | Product wrapper | Why we need it |
|---|---|---|---|
| Button | `button` | `AppButton` | Every action. Most-used primitive. |
| Input | `input` | `AppInput` | Text fields, search, phone number, OTP |
| Select | `select` | `AppSelect` | District, room count, timeline dropdowns |
| Checkbox | `checkbox` | `AppCheckbox` | Filter options, consent checkboxes |
| Radio group | `radio-group` | `AppRadio` | Finishing type, source type selectors |
| Textarea | `textarea` | `AppTextarea` | Listing description, contact notes |
| Card | `card` | `AppCard` | Listing card, building card, form containers |
| Badge | `badge` | `AppBadge` | Verification tier badges, status badges |
| Chip | Custom (from `badge`) | `AppChip` | Filter chips, source chips, finishing chips |
| Modal / Dialog | `dialog` | `AppModal` | Confirmations, detail overlays on desktop |
| Bottom sheet | `sheet` | `AppBottomSheet` | Filters on mobile, map pin preview |
| Toast | `sonner` | `AppToast` | Save confirmation, error messages |

**Not in V1 (deferred — available in shadcn but not installed for V1):** Tooltip, Popover, Accordion, Tabs, Combobox, DatePicker, Slider, Switch. If a screen feels like it needs one, the design brief is usually wrong. If a real need surfaces during build, we add the primitive with its own spec entry here — we do not silently introduce it.

### 6.3 Button primitive (AppButton)

The most-used primitive. Four variants, three sizes. That's it.

**Variants:**
| Variant | Use | Visual |
|---|---|---|
| `primary` | The main action on a screen (Find, Submit, Publish) | Filled terracotta-600, white text |
| `secondary` | Important non-primary action (Cancel, Back) | White fill, stone-300 border, stone-900 text |
| `ghost` | Tertiary action, toolbar buttons | No fill, no border, stone-700 text, hover = stone-100 fill |
| `destructive` | Remove, delete, unpublish | White fill, semantic-error border and text |

**Sizes:**
| Size | Target height | Padding | Use |
|---|---|---|---|
| `md` (default) | ≥44px | `py-3 px-5` | Default everywhere. Meets 44×44 touch target. |
| `lg` | ≥48px | `py-4 px-5` | Hero CTAs, primary form submit on mobile |
| `sm` | ≥36px | `py-2 px-4` | Inside compact areas only (e.g., card footer on desktop). 44×44 hit area enforced via invisible padding — handled by the primitive. |

**Shape:** `radius-md` (12px). **Weight:** semibold 600 (from Layer 3). **Disabled state:** 40% opacity, `cursor: not-allowed`. **Loading state:** spinner replaces left icon, text stays, button width doesn't shift. **Focus:** 2px terracotta outline via `:focus-visible` (from Layer 5).

**What AppButton does NOT support:** gradient fills, icon-only variants at sm size, rounded-full buttons, buttons smaller than `sm`.

**One rule above all:** only one primary button per screen. If two actions both seem primary, one of them isn't.

### 6.4 Input primitive (AppInput)

All single-line text entry — search, phone, email, number, OTP.

**Structure:** label above, input field, helper or error text below.

**Visual:**
- Height: 44px minimum
- Padding: `py-3 px-4`
- Border: 1px `stone-200` at rest
- Border on focus: 1px `terracotta-600` + the 2px focus outline (combined = strong visual focus)
- Border on error: 1px `semantic-error`
- Radius: `radius-md` (12px)
- Text: `text-body` (16px) — important, because 16px prevents iOS Safari from zooming on focus
- Placeholder: `stone-400`

**States:** default, focus, filled, disabled, error. No "success" green state — we do not confirm fields with color.

**Helper text position:** always below the input, in `text-meta` (14px), color `stone-500` for help / `semantic-error` for error. Helper and error never show at the same time.

**Special variants handled inside AppInput:**
- `type="phone"` — prefixed with `+992` flag/chip, accepts 9 digits after
- `type="search"` — left magnifying glass icon, optional right clear button
- `type="number"` — tabular figures applied automatically (price, m²)

### 6.5 Select primitive (AppSelect)

Dropdown for known-option lists: district, room count, timeline, sort.

**Visual:** identical to AppInput at rest (same height, padding, radius, border) with a chevron-down icon on the right. On open, a dropdown menu appears with the same radius and a `shadow-md` elevation.

**Behavior:**
- On mobile (<768px), opening a Select opens a **bottom sheet** with the options list (native mobile pattern, easier thumb reach, matches the rest of the platform's mobile behavior).
- On desktop, a standard dropdown menu appears.

This mobile-vs-desktop split is built into `AppSelect` once. Codex never writes conditional `<Select>` vs `<Sheet>` logic per usage.

**Implementation note:** shadcn's default Select uses a Radix dropdown on all screen sizes. `AppSelect` layers a mobile media-query check (or `useMediaQuery` hook) to switch to `AppBottomSheet` on mobile. This is extra code, but it's written once in the primitive and reused everywhere. Codex should not reinvent this pattern on each Select usage.

### 6.6 Checkbox and Radio primitives (AppCheckbox, AppRadio)

Standard shapes:
- Checkbox: 20×20 square, `radius-sm` (6px), terracotta-600 fill when checked
- Radio: 20×20 circle, terracotta-600 inner dot when selected
- 44×44 hit area via invisible padding around the visible control

Label text uses `text-body` (16px) regular weight. Checkbox/radio and label are clickable as one unit.

**Multi-select filter chips** (Rooms: 1, 2, 3, 4+) are built as a **chip group**, not as checkboxes. See 6.10.

### 6.7 Textarea primitive (AppTextarea)

Minimum 4 rows tall. Otherwise identical to AppInput (padding, border, radius, focus, error). Counter showing "X / 500" appears below at `text-caption` (12px), stone-500, when a max length is set.

### 6.8 Card primitive (AppCard)

The foundational container. Used for listing cards, building cards, form containers, modal bodies.

**Visual:**
- Background: `white`
- Border: 1px `stone-200`
- Radius: `radius-md` (12px)
- Shadow: `shadow-none` at rest (from Layer 5 — cards lean on border, not shadow)
- Padding: `p-4 md:p-5` (from Layer 4 defaults)
- Hover state (for clickable cards): `shadow-sm` + subtle border color shift to `stone-300`. No translate, no scale, no lift — those feel like consumer apps, not decision tools.

**Slots (shadcn convention):** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Use the slots. Don't invent new structure.

**Clickable cards:** wrapped in a `<Link>` or `<button>` — whole card is the hit area, not just the title. Interactive children (bookmark icon, chip) get `stopPropagation` so nested clicks don't trigger the card click.

### 6.9 Badge primitive (AppBadge)

Used for verification tiers, status labels, and short static attributes.

**Visual:**
- Padding: `py-1 px-2` (tighter than chips)
- Radius: `radius-sm` (6px)
- Height: ~24px (no 44×44 required — badges are not interactive)
- Text: `text-caption` (12px) medium weight
- Always includes an icon + text — never icon-only

**Variants** (all from Layer 2 trust palette):
- `tier-1` — phone verified (gray, stone-500)
- `tier-2` — profile verified (muted blue)
- `tier-3` — listing verified on-site (forest green)
- `tier-developer` — verified developer (muted gold)
- `neutral` — generic status (uses stone-500)

**Background:** always a tinted version of the badge color — Codex uses the shade-100 (e.g., for `tier-3`, background is forest green at 10% opacity or the equivalent stone-100-like tint of green). This keeps badges calm, not loud (Principle 2).

### 6.10 Chip primitive (AppChip)

Chips are **interactive** — filters, source selectors, finishing selectors, selected-option displays. Badges are static — chips are tappable.

**Visual:**
- Padding: `py-1 px-3` (from Layer 4)
- Radius: `radius-sm` (6px) — yes, smaller than cards; chips are visual tokens, not containers
- Height: 32px (with 44×44 hit area via invisible padding)
- Text: `text-meta` (14px) medium weight
- Border: 1px `stone-200` at rest
- Selected state: background `terracotta-100`, border `terracotta-600`, text `terracotta-800`

**Variants:**
- `filter` — toggleable, multi-select (e.g., "2 rooms", "3 rooms")
- `source` — declarative source identity (developer / owner / intermediary) — uses source palette from Layer 2
- `finishing` — declarative finishing type — uses finishing palette from Layer 2
- `removable` — shows an "×" icon on the right for removing an active filter

**AppChipGroup** wraps multiple chips with proper spacing (`gap-2`) and optional single-select / multi-select behavior. Used for room count, finishing filter, and source filter throughout the product.

### 6.11 Modal primitive (AppModal)

Desktop-first. On mobile, modals should generally be replaced by bottom sheets (6.12) — but some cases (confirmation dialogs: "Remove saved listing?") work as modals on mobile too.

**Visual:**
- Overlay: `rgba(28, 25, 23, 0.40)` — warm stone-black at 40% opacity
- Modal body: white card, `radius-md`, `shadow-md`, `p-5`
- Max width: 480px on desktop
- On mobile: 90% viewport width, centered vertically

**Header:** title (`text-h2`, semibold), optional close × in the top-right (44×44 hit area). **Footer:** right-aligned action buttons (primary on the right, secondary on the left).

**Behavior:** closes on Escape, closes on overlay click, focus-trap inside the modal (Radix handles this via shadcn). Body scroll locked while open.

### 6.12 Bottom sheet primitive (AppBottomSheet)

The mobile pattern for filters, map pin preview, and long Select dropdowns. On desktop, becomes a right-side drawer or a regular modal depending on context.

**Visual:**
- Slides up from the bottom of the viewport
- Rounded top corners only (`radius-md`, only top-left and top-right)
- White background, `shadow-md` elevation
- Drag-handle indicator at top (48×4px stone-300 pill)
- Max height: 85vh — user can always see page content behind the sheet
- Padding: `p-5` (24px all sides)
- Respects safe-area-inset-bottom (from Layer 4)

**Header:** optional title row with title left, close × right. **Footer:** sticky action row if the sheet has Submit / Apply actions.

**Behavior:** closes on Escape, closes on backdrop tap, closes on swipe-down of the handle. Focus-trap while open.

### 6.13 Toast primitive (AppToast)

Short, transient feedback — "Saved", "Listing published", "Couldn't save — try again".

**Visual:**
- Position: bottom-center on mobile, bottom-right on desktop
- Width: `max-w-sm` (384px max, stretches to viewport on small mobile)
- Background: white, `radius-md`, `shadow-md`, `p-4`
- Icon on the left (success, info, warning, error), text next to it
- Duration: 4 seconds default, 6 seconds for errors
- Dismissible by tap

**Variants:** `success` (forest green icon), `info` (muted blue icon), `warning` (amber icon), `error` (red icon). Background stays white — color goes on the icon only. This keeps toasts calm (Principle 2).

**Rule:** only one toast shown at a time. Toasts queue — they don't stack vertically. `sonner` handles this natively.

### 6.14 Accessibility baseline

Every primitive inherits accessibility from Radix UI (shadcn's underlying layer):
- Keyboard navigation works everywhere (Tab, Shift+Tab, Enter, Space, Esc, Arrow keys)
- ARIA roles and attributes are correct out of the box
- Focus trapping in modals and bottom sheets
- Screen reader announcements for toasts
- `:focus-visible` rings from Layer 5 apply automatically

**What Codex still has to do:**
- Provide meaningful `aria-label` when text labels are absent (icon-only buttons)
- Provide `alt` text on every image
- Ensure form fields have associated `<label>` elements
- Ensure error messages are wired to fields via `aria-describedby`

### 6.15 Rules that constrain Codex

1. **Never import directly from `components/ui/`.** Always go through `components/primitives/` wrappers.
2. **Never invent a new primitive.** If a screen seems to need something outside the 12 primitives in 6.2, check if a combination covers it; if not, pause and ask.
3. **Use the documented variants only.** No custom `variant="fancy"` on AppButton. No inline `className` overrides that change color, radius, or padding.
4. **One primary button per screen.** Always.
5. **Mobile: prefer bottom sheet over modal** for anything with more than a simple confirmation.
6. **Chips are interactive, badges are static.** Don't use Badge where a Chip belongs, or vice versa.
7. **Forms: every field has a label, every error has `aria-describedby`.** No floating labels, no placeholder-as-label.

---

## What Layer 6 does NOT decide

- Specific platform components composed from primitives — listing card layout, source chip iconography, fairness indicator rendering, progress photo carousel — those are Layer 7.
- Specific page layouts — those belong to a separate UI spec document that comes after the design system is locked.

Layer 6 gives Codex the complete primitive toolbox. Layer 7 assembles those primitives into the product's signature moments.

---

## Layer 7 — Platform-specific components

These are the compositions that make this platform look like *this* platform, not any other real-estate site. Each one is built from Layer 6 primitives but carries product-specific meaning and rules.

File location: `components/blocks/` — separate from primitives, because they embed product knowledge (which finishing types exist, what a fairness indicator says, which trust tiers apply).

### 7.1 The eleven platform components

| Component | Purpose | Built from |
|---|---|---|
| `SourceChip` | Label who is selling (developer / owner / intermediary) | AppChip |
| `VerificationBadge` | Show trust tier earned | AppBadge |
| `FairnessIndicator` | Price-per-m² vs district context | Custom + typography |
| `InstallmentDisplay` | Monthly payment amount — halal, no interest | Custom + typography |
| `ProgressPhotoCarousel` | Dated construction photos (platform-taken) | AppCard + native scroll |
| `ListingCard` | The primary decision unit in search results | AppCard + everything above |
| `BuildingCard` | Aggregates listings at one building | AppCard + composition |
| `StickyContactBar` | Mobile bottom bar — WhatsApp / Call / Visit | AppButton × 3 + safe-area |
| `FilterSheet` | Mobile filters via bottom sheet | AppBottomSheet + chips + selects |
| `CompareBar` | Floating bar showing items in active comparison | Custom + AppButton |
| `ChangeBadge` | "Price dropped" / "Status changed" on saved items | AppBadge variant |

### 7.2 SourceChip

**Purpose:** Every listing, every card, every detail page shows this. It's the platform's honesty signal — you always know who is selling before you tap anything.

**Visual:**
- Icon on the left, Russian label on the right
- Colors from Layer 2's source palette: indigo (developer), forest green (owner), muted gold (intermediary)
- Background: shade-50 of the source color (very subtle tint)
- Border: none (tint is enough separation from card background)
- Height: 24px, `radius-sm`
- Text: `text-caption` (12px) medium weight

**Icon choice (LOCKED — Lucide):** Production UI uses Lucide icons:
- Developer → `Building2`
- Owner → `User`
- Intermediary → `Handshake`

Emoji (🏗 / 👤 / 🤝) appears throughout PRD, Blueprint, User Flows, and UI Spec prose as visual shorthand for the chip. **This shorthand is not the actual UI** — emoji renders differently across iOS/Android/Windows and degrades the premium feel on Windows in particular (where source chips would appear in a buyer's diaspora-segment dashboard). Lucide gives full brand-color control, accessibility-friendly aria-labels, and matches the Lucide-only icon system locked elsewhere. The warmth comes from color, tint, label wording, and the rest of the design system — not from the icon alone.

**Sizes:** Only one size — chips don't scale. If a screen needs a smaller source identifier, it needs the full chip or nothing. We don't want to teach buyers multiple "source" visual languages.

**Rule:** SourceChip is **mandatory** on every listing representation, everywhere in the product. Search results, saved items, compare table, map pin preview, detail page hero. No exceptions. This is the single most important enforcement rule in Layer 7.

### 7.3 VerificationBadge

**Purpose:** Show which trust tier a listing has earned. This is the moat.

**Visual:**
- Checkmark icon + short Russian label:
  - Tier 1: "Телефон подтверждён" (gray, stone-500)
  - Tier 2: "Проверенный профиль" (muted blue)
  - Tier 3: "Проверено на месте" (forest green)
  - Developer: "Проверенный застройщик" (muted gold)
- Background: shade-100 tint of the tier color
- Border: none
- Height: 24px (same as SourceChip for visual rhythm)
- Text: `text-caption` (12px) medium weight

**Placement rules:**
- On a listing card: badge appears next to the source chip, always (visual pair: "who + how trusted")
- On a listing detail page hero: badge appears prominently under the title
- Developer badge, when present, **replaces** the Tier 1/2/3 badge on developer listings — never show both
- On Tier 3 listings (on-site verified), the badge includes the verification date in `text-caption` below it ("Проверено 14 марта") — this is the freshness honesty signal from PRD §12.4

**Hover/tap behavior (desktop and mobile):** tapping or hovering the badge opens a small popover explaining what that tier means. This is the one place where a Popover primitive becomes justified — but in V1 we use a simple AppModal on tap instead, because Popover is deferred (see Layer 6.2). A "?" icon next to the badge triggers the modal explaining all four tiers.

### 7.4 FairnessIndicator

**Purpose:** Show whether a listing's price-per-m² is fair vs. the district average. This is one of the three signature wow features (PRD §17.4).

**Visual (calm, not alarm — from Layer 2.7):**
- A small inline display, not a full card
- Structure: `[Fairness icon] [short label]` on one line
- Colors from `fairness-*` tokens in Layer 2
- Text: `text-meta` (14px) medium weight, color matches the fairness state
- Optional supporting line below in `text-caption` (12px) stone-500: "Средняя цена в Сино: 8 500 с/м²"

**States (from Layer 2.7):**
| State | Icon | Label Russian | Color |
|---|---|---|---|
| Great (≥10% below avg) | ✓ | "12% ниже среднего" | `fairness-great` (green) |
| Fair (±10%) | — | "Цена в рынке" | `fairness-fair` (stone-500) |
| High (10-25% above) | — | "15% выше среднего" | `fairness-high` (muted gold) |
| Alert (>25% above) | — | "28% выше среднего" | `fairness-alert` (muted rust) |

**Hard rules:**
- Never use red, never use alarm icons, never add exclamation marks — this is informational, not judgmental (Principle 3, PRD §19 halal-by-design).
- Only show when a district benchmark exists. Per Data Model §5.14 (`district_price_benchmarks`), the indicator uses the most specific benchmark available (district + rooms + finishing → district + rooms → hidden). If no benchmark exists at any level, the indicator is absent — no "?", no "unknown" state. Don't fake confidence we don't have.
- Never accompany it with buttons, countdowns, or urgency copy. It is a quiet data point.

**Tap behavior:** opens a small modal showing the district average and the comparable listings behind the computation — full transparency (PRD §7.4 "honesty is a moat").

### 7.5 InstallmentDisplay

**Purpose:** Show the monthly installment amount as the primary affordability signal. This is the third signature wow feature — installment-as-hero, halal-by-design (no interest, no APR, no hidden fees).

**Visual:**
- Primary display: "от 4 200 с/мес." in `text-h3` (16px) semibold, tabular figures, color stone-900
- Supporting line: "на 24 месяца • 30% первый взнос" in `text-caption` (12px) stone-500
- Icon-free — no bank icons, no credit card icons, no "%" symbol anywhere in the display
- Color: always neutral stone — no green "good deal!" framing, no red "expensive!" framing. This is a fact, not a sales pitch.

**Placement:**
- Listing card: below the price, above the fairness indicator
- Listing detail page: in the "Payment" section with full terms
- Search filter: the installment slider is labeled in monthly somoni, not percentage

**Hard rules (PRD §19 halal-by-design):**
- Never use the word "процент" or "%" anywhere near an installment display
- Never show "Save X somoni!" or comparative language that implies urgency
- Never hide the down-payment requirement — always show it in the supporting line
- Never show installment terms when the listing explicitly declares "no installment" — the display is simply absent, not greyed out

**When no installment offered:** the component renders **nothing**. Not an empty row, not a "Installment: N/A" row. Absent. The UI says "there is no installment here" by saying nothing at all.

### 7.6 ProgressPhotoCarousel

**Purpose:** Dated construction photos, taken by the platform team, proving a building is real and showing progress over time. This is the first and most-cited signature wow feature.

**Visual structure:**
- Horizontal scroll on mobile (swipe to advance), grid on desktop (3 columns)
- Each photo: `aspect-video` (16:9), `radius-md`, object-cover
- Date caption below each photo in `text-caption` (12px) stone-500: "14 марта 2026"
- Chronological order: newest first (most recent progress at the top of the buyer's attention)
- "Taken by platform team" badge once at the top of the section, not on every photo

**Section header:**
- Title: `text-h2` "Ход строительства" (Construction progress)
- Subtitle: "X фото • последнее: 14 марта 2026" in `text-meta` stone-500

**Interaction:**
- Tap a photo → opens fullscreen lightbox (AppModal variant on mobile becomes full-screen)
- Lightbox shows photo with caption date and "Фото X из Y" counter
- Swipe left/right in lightbox to navigate
- No download button, no share button in V1 — just viewing

**Empty state:** if a building has zero progress photos (not yet visited), the entire section is **absent** from the building page. Do not show "no photos yet" — that's a negative trust signal. The section simply doesn't exist until photos exist. Buildings without photos still appear in search, they just don't advertise that particular absence.

**Freshness rules:** PRD §17.3 establishes that progress photos must be dated and recent to function as a trust signal — stale photos undermine trust. The exact freshness thresholds (when does a "stale" banner appear, when is the whole section hidden) are operational decisions to be locked during build, not design decisions. For V1, the component supports showing a freshness warning below the section subtitle — Codex leaves the threshold as a constant that product can tune.

### 7.7 ListingCard

**Purpose:** The single most-used composition in the product. Every search result, every saved item, every compare row, every map pin preview is a ListingCard variation.

**Structure** follows Blueprint §11.6 exactly — Layer 7 specifies the visual execution of each row, not the row order:

1. **Visual preview row** — primary image (`aspect-video`, `radius-md` on top corners), small thumbnails strip below it (up to 3), swipeable on mobile. Save heart icon top-right over the photo.

2. **Identity row** — building name + district on one line in `text-h3` semibold. Below it, SourceChip (7.2) and VerificationBadge (7.3) side by side (`gap-2`), in that order.

3. **Key facts row** — `text-meta` stone-700: "2-комн. • 65 м² • 4/9 этаж". Tabular figures. Below on its own line: price in `text-h2` (20px) semibold tabular, and next to it the FairnessIndicator (7.4) when available. Below that: finishing chip (AppChip variant `finishing`, colored per Layer 2.6).

4. **Installment row** — InstallmentDisplay (7.5) if applicable ("Рассрочка: от 8 600 TJS/мес"). Absent if not.

5. **Seller and response row** — `text-caption` stone-500: seller name or "Офис продаж застройщика". Response-time badge ("Отвечает обычно за <1 часа") appears on the same line **only** when the seller has ≥3 completed contacts with response data (per Blueprint §11.6). Before that threshold, only the name shows. Badge is never shown empty, never shows "нет данных," never guesses.

6. **Action row** —
   - Desktop: "Смотреть" AppButton `primary` size `sm` + "WhatsApp" AppButton `secondary` size `sm` + save/compare icon buttons
   - Mobile: "WhatsApp" AppButton `secondary` size `sm` + "Позвонить" AppButton `secondary` size `sm`; the card itself is tappable to open the listing (so "Смотреть" as a separate button is redundant on mobile)

**Card-level rules:**
- Entire card (except the action row buttons, bookmark icon, and compare icon) is a clickable link to the listing detail page — via `<Link>` wrapping
- Action row buttons and icons use `stopPropagation` so tapping them doesn't navigate to the detail page
- Card padding: `p-4 md:p-5` (from Layer 4)
- Card default state: `border stone-200`, `shadow-none`. Hover: `shadow-sm`, `border stone-300` (Layer 5)

**Variants:**
- `full` (default) — everything above, used on search results
- `compact` — hides the thumbnail strip, hides the action row; used in saved-items list on desktop where space is tight
- `map-preview` — shown in bottom sheet when map pin is tapped; shows photo + identity row + price + source chip + verification badge + one "Открыть листинг" button; installment, finishing chip, seller row hidden for brevity
- `match` — used on Guided finder results (Page 2) and any other match-context surface. Adds **two rows above the Identity row**: (a) match confidence row `text-meta` semibold in `fairness-great` color ("Совпадение 92%"), (b) why-this-fits row `text-caption` stone-700 with 2-3 short bullet phrases separated by `·` ("В вашем бюджете · Нужное количество комнат · Отделка соответствует"). Rest of the card renders identically to `full`. Added to support the UI Spec Page 2 Guided finder magic-moment results.

**What the card never has:**
- Urgency stickers ("Горячее предложение!", "Осталось 2!")
- Countdown timers
- Pre-sale discount banners
- Seller phone number visible (phone is behind the Call button for spam protection)

### 7.8 BuildingCard

**Purpose:** When a search result is a whole building rather than a single apartment, we render a BuildingCard. It's structurally similar to ListingCard but scoped to a building — ranges instead of exact values, trust signals aggregated at building level, and a matching-units preview when the buyer has filters active.

**Structure follows Blueprint §8.6 exactly — six rows:**

1. **Visual preview row** — one large hero image (cover photo, or latest construction photo when available), `aspect-video`, `radius-md` on top corners. Small row of 2-3 thumbnails below. Save heart icon top-right over the hero photo.

2. **Identity row** — building name in `text-h3` semibold, district in `text-meta` stone-500 on the line below. Developer name + VerificationBadge (7.3) `tier-developer` variant if developer is verified, inline.

3. **Key facts row** — "Price from" in `text-h2` (20px) semibold tabular, "Price per m² from" in `text-meta` stone-700 tabular ("от 8 500 TJS/м²"), delivery date in `text-meta` stone-700 ("Сдача: IV кв. 2027"), room types range in `text-meta` stone-700 ("1–4 комнаты"), finishing chips (AppChip variant `finishing`, one per available finishing type, Layer 2.6 colors).

4. **Trust strip row** — VerificationBadge (7.3) for the building's own tier (highest tier the building has earned), last-updated date in `text-caption` stone-500 ("Обновлено 14 марта"), construction-progress indicator when available (one line: "Сейчас: 62% готово" with a 2px terracotta-600 progress bar below the text).

5. **Matching units preview row (conditional)** — only renders when the buyer has at least one filter applied AND at least one unit in the building matches. Shows "[N] квартир подходят вашим фильтрам" in `text-meta` semibold stone-900, followed by up to 2 preview lines in `text-meta` stone-700 ("2 комн. · 64 м² · с ремонтом · от 820 000 TJS"). Preview lines are tappable to open the unit directly, with `stopPropagation` so they don't trigger the building card tap.

6. **Action row** — "Смотреть проект" AppButton `primary` size `sm` (opens Page 5 Building detail) + "Все квартиры" AppButton `secondary` size `sm` (opens Page 6 Apartments browsing pre-filtered to this building's matching units).

**Card-level rules:**
- Entire card (except the action row buttons, save icon, and unit preview lines in Row 5) is a clickable link to the Building detail page — via `<Link>` wrapping
- Action row buttons, save icon, and preview lines use `stopPropagation`
- Card padding: `p-4 md:p-5` (Layer 4)
- Card default state: `border stone-200`, `shadow-none`. Hover: `shadow-sm`, `border stone-300` (Layer 5)

**Variants:**
- `full` (default) — everything above, used on Projects browsing (Page 3), Building detail similar-buildings block (Page 5), Diaspora featured projects (Page 11), Homepage featured (Page 1)
- `compact` — tighter padding, hides Row 5 matching-units preview, hides thumbnail strip; used in saved-items list on desktop where space is tight (Page 9)
- `map-preview` — shown in bottom sheet when a map pin is tapped (Page 4). Shows hero image + Identity row + Price from + Price per m² + Delivery date + VerificationBadge + matching units count + two action buttons ("Смотреть проект" / "Все квартиры"). Hides Row 4 trust strip detail, Row 5 unit preview lines, and thumbnail strip — compact for the bottom-sheet format.

**Key distinctions from ListingCard:**
- No installment display on the BuildingCard (installments vary per listing, shown inside the building)
- No single-fairness indicator (varies per listing)
- No source chip (buildings don't have source — listings inside them do)
- Adds matching-units preview (Row 5) which ListingCard has no equivalent for
- Action row has two project-scoped buttons instead of listing-scoped actions

**What the card never has:**
- Urgency stickers ("Горячее предложение!", "Осталось 2 квартиры!")
- Countdown timers
- Pre-sale discount banners
- Developer phone number visible (behind Call button for spam protection)

### 7.9 StickyContactBar

**Purpose:** On mobile listing and building detail pages, always keep contact actions reachable. This is the Principle 1 "next action always obvious" guarantee.

**Visual:**
- Position: `fixed bottom-0`, full viewport width
- Background: `white`, `shadow-md` (floating above content — Layer 5)
- Padding: `p-3` horizontal and top, `pb-safe` for bottom (using `env(safe-area-inset-bottom)` from Layer 4.7)
- Border-top: 1px stone-200

**Contents (3 buttons, equal width via flex):**
1. **WhatsApp** — AppButton `secondary` size `md`, green WhatsApp logo + "WhatsApp"
2. **Позвонить** — AppButton `secondary` size `md`, phone icon + "Позвонить"
3. **Запросить визит** — AppButton `primary` size `md`, "Визит"

**Behavior:**
- Only shows on listing detail and building detail pages
- Always visible by default (no scroll-hide). If vertical space feels constrained during photo browsing, scroll-hide behavior (hide on scroll-down, reappear on scroll-up) is an acceptable refinement — decision locked during build, not in this spec.
- On desktop (≥1024px), the sticky bottom bar is replaced by a sticky side card (see Blueprint §10.4 for buildings, §12.4 for listings). Layer 7 doesn't spec the side card separately — it's a wider layout variant of the same contents.

### 7.10 FilterSheet

**Purpose:** On mobile, filters open as a full bottom sheet (Layer 6.12). On desktop, filters live in a left-side panel. Layer 7 specs the shared content structure.

**Structure:**
- Header: "Фильтры" title (`text-h2`), active filter count badge, close × button
- Body: scrollable, sections separated by `border-t stone-200`:
  1. **Price range** — dual slider, tabular figures, monthly installment range also shown
  2. **Rooms** — AppChipGroup with "1, 2, 3, 4+" options
  3. **Size (m²)** — dual slider
  4. **Finishing** — AppChipGroup with the four finishing types as finishing-colored chips
  5. **Source** — AppChipGroup with the three source chips
  6. **Verification** — AppChipGroup "любой / ✓ профиль / ✓ на месте / ✓ застройщик"
  7. **Handover date** — AppSelect
- Footer (sticky inside sheet): "Очистить" AppButton `ghost` + "Показать X квартир" AppButton `primary` with live-updating count

**Interaction:** every filter change updates the count in the footer button immediately (client-side estimate, refined on server). No "Apply" required for individual filter changes on desktop — the list updates live. On mobile, the footer button commits the filter set and closes the sheet.

### 7.11 CompareBar

**Purpose:** When a buyer adds listings to compare, a bar appears showing selected items and a button to open the compare view.

**Visual:**
- Position: `fixed bottom-4 left-1/2 -translate-x-1/2` (centered above the sticky contact bar, if any)
- Background: stone-900 (dark — this is one of the few places where the product uses a dark surface intentionally for contrast and presence)
- Text: white
- Padding: `p-3` horizontal, `py-2`
- Radius: `radius-md`
- Shadow: `shadow-md`

**Contents:**
- Left: text "3 для сравнения" in `text-meta` white
- Right: "Сравнить" AppButton `primary` size `sm` (terracotta stays terracotta even on dark backdrop — WCAG-checked)
- × icon to clear the comparison (44×44 hit area)

**Behavior:**
- Appears when ≥1 listing is added to compare (some UIs require ≥2, but we show even with 1 so users get immediate feedback that the action worked)
- Compare view requires ≥2 — "Сравнить" button is disabled with 1 item
- Max 4 items — adding a 5th shows a toast "Максимум 4 квартиры для сравнения"
- URL-state only (per tech spec — compare is not persisted server-side)

### 7.12 ChangeBadge

**Purpose:** On saved items and in the "what changed since you left" returning-buyer strip, show what changed. The state set maps to Data Model §3.9 `change_event_type` (5 event types). For `price_changed`, the badge renders differently depending on direction (up vs down) — the underlying enum is one value, but the component looks at the price delta to pick the visual.

**Visual:**
- Small inline label next to a saved item
- Text: `text-caption` (12px) medium weight
- Padding: `py-1 px-2`, `radius-sm`
- Color: context-dependent per state below
- Background: tinted version (shade-100 or rgba) of the state color

**States** (enum from Data Model §3.9, visual variants per state):

| Enum value | Variant | Label Russian | Color |
|---|---|---|---|
| `price_changed` | price decreased | "↓ Цена снизилась" | `fairness-great` (forest green) |
| `price_changed` | price increased | "↑ Цена повысилась" | stone-700 (neutral — informational, not alarming) |
| `status_changed` | — | "Статус изменился" | `semantic-warning` (amber) |
| `new_unit_added` | — | "Добавлены новые квартиры" | `badge-tier-3` (forest green) |
| `construction_photo_added` | — | "Обновлены фото стройки" | `badge-tier-developer` (muted gold) |
| `seller_slow_response` | — | "Продавец отвечает медленно" | stone-500 (neutral honesty signal) |

**Hard rules:**
- Only the **most recent** change event per saved item shows as a badge. History is accessible via tap → modal showing all recent events.
- No animations, no pulsing, no "NEW!" stickers (Principle 2 calm).
- Timestamp appears on tap: "Изменено 2 дня назад".
- Automatically clears after the buyer views the listing again.
- **Price increase uses stone-700, not red.** We inform without alarming (PRD §19 halal-by-design — no manufactured urgency even around price changes). A price drop in green is honest celebration; a price rise in stone-700 is honest information.
- **Status changes (sold/reserved) use semantic-warning amber, not red.** Blueprint §14.3 originally specified "red for sold"; this spec locks amber because (a) red conflicts with PRD §19 halal-by-design principle of no alarm colors, (b) red implies the buyer should panic, which is the opposite of the product's calm tone, (c) sold status is information, not danger. This is a deliberate reconciliation between Blueprint §14.3 and the design system's halal-by-design discipline.

### 7.13 Rules that constrain Codex at Layer 7

1. **SourceChip is mandatory on every listing representation.** No exceptions, anywhere in the product.
2. **VerificationBadge and SourceChip are paired on listing cards** — they appear together in the Identity row (per Blueprint §11.6), in that order (SourceChip first, then VerificationBadge), with `gap-2`.
3. **FairnessIndicator is conditional** — only renders when we have enough district data for a trustworthy average (threshold locked during build). Otherwise absent, not empty.
4. **InstallmentDisplay is conditional** — only renders when the listing declares an installment. Otherwise absent, not empty.
5. **ProgressPhotoCarousel respects photo freshness** — when photos age beyond the product-defined threshold, the section degrades (warning → hidden). PRD §17.3 requires this; exact day thresholds locked during build.
6. **Never show seller phone numbers directly on cards** — always behind the Call button (spam protection).
7. **No urgency, no countdowns, no "Hot!" anywhere in Layer 7 components.** (Cross-ref PRD §19 halal-by-design.)
8. **ListingCard action buttons use `stopPropagation`** so nested clicks don't trigger the card link navigation.
9. **All platform components live in `components/blocks/`** — separate from primitives — because they embed product knowledge.

---

## What Layer 7 does NOT decide

- **Full page layouts** — the homepage hero arrangement, the search results page grid, the building detail page section order, etc. Those belong to a separate **UI Spec document** that comes after this design system is locked.
- **Exact copy and microcopy** — the Russian labels shown in this spec are illustrative. Final copy gets a dedicated review pass.
- **Illustrations, icon set specifics, or logo design** — we use Lucide icons (locked in tech spec) but haven't specified which icon for every component slot. That's a per-screen decision.
- **Motion and transition specifics** — page transitions, drawer animations, microinteractions. These are a Layer 8 candidate if needed, but V1 defaults to shadcn's built-in Radix animations (subtle fade/slide) for everything.

---

## Design system complete

All seven layers are now drafted. Together they form the complete vocabulary Codex needs to build consistent, branded, accessible UI across the entire V1 product.

**What's next after this spec locks:**
1. **UI Spec document** — exact page layouts (homepage, search, building page, listing page, compare, saved, match flow, post-a-listing flow). Assembles Layer 7 components into full screens.
2. **Updates to ARCHITECTURE.md, AI_CONTRACT.md, AGENTS.md** — small additions reflecting the design system is now locked and Codex must use these tokens and components.
3. **Start building with Codex** — no more specification. Execute.
