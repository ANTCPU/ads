# ⚡ ARENAS.md — Arena Architecture & Champion Cycle

*September 2026 · ANTCPU ADS*

---

## What This Document Is

The Arena started as one thing: a single competitive ad feed where brands
earn rank through real engagement. That's still the core. But reactions,
rising signals, 90-day cycles, and the Cloud plan all connect here.

This document defines how arenas work, how champions are crowned, and
how the arena model scales into a platform.

---

## The Signal Layer — Why Reactions Matter Internally

Reactions (🔥 Hot · 👀 Watching · 💡 Interesting) are not just UI.
They are the earliest signal of a rising ad — before clicks, before shares.

A reaction costs nothing. That's the point. It's a low-friction intent
signal that tells Scout: this ad is being noticed.

**Scoring weight:** `reactions × 1` — intentionally low.
Reactions alone don't win. But a cluster of reactions on a new ad is
the first indicator that it's about to climb.

**What Scout can do with this:**
- Detect reaction velocity (many reactions in a short window = rising)
- Flag ads with high reaction-to-click ratio as "watch list" candidates
- Surface these to the champion selection algorithm at cycle end

**Current state:** reaction_count is scored. Reaction velocity is not
yet tracked. This is the next layer to build.

---

## The 90-Day Champion Cycle

### Concept

Every 90 days, the Arena crowns a Champion — the brand that earned the
most points across the full cycle. This is not a snapshot. It's a
sustained performance measure.

The cycle creates urgency, narrative, and a reason to keep engaging.
It also creates a natural reset — new brands can compete in the next cycle.

### How It Works
Day 1 — Cycle opens. All active ads compete. Day 1–89 — Points accumulate via clicks, shares, likes, boosts, reactions. Day 90 — Cycle closes. Scout calculates final standings. Day 91 — Champion crowned. Runners-up recognised. New cycle opens.


### Champion Criteria (proposed)

| Rank | Title | Criteria |
|---|---|---|
| 1st | Arena Champion | Highest cumulative points in cycle |
| 2nd–3rd | Arena Runner-Up | 2nd and 3rd highest |
| Top 10 | Arena Finalist | Ranked 4–10 at cycle close |

### What the Champion Gets

- `country-champion` badge (already exists in badge registry)
- Featured placement for the next cycle's opening week
- Antbot activation — 10 human-in-the-loop challengers drive their next ad launch
- Entry into the Cloud Champion tier (see below)
- Discord announcement via Herald

### What Runners-Up Get

- `top-brand` badge (already exists)
- Featured placement for 7 days
- Eligibility for Cloud Runner-Up tier

---

## Arena Types

The Arena is not one thing. It's a model. Multiple arenas can run
simultaneously, each with its own slug, module set, and audience.

### 1. The Main Arena — `/arena`

The open competitive feed. All brands. All categories. One leaderboard.
This is the default and the proving ground.

**Current state:** Live. Fully operational.

### 2. Brand Arenas — `/arena/[slug]`

A dedicated arena for a single brand or partner. The brand controls
the module set. Their ads, their community, their leaderboard.

**Example:** Map of Pi has `/mapofpi` — a brand-specific experience
with country champions, Pi commerce category, and MAC as the AI companion.

**Current state:** Infrastructure exists (`ArenaClient.tsx`, `arena_modules` table).
Module slots are code-driven. DB-driven module config is the next step.

**Who gets a brand arena:**
- Country Champion program partners
- Cloud Premium subscribers (see below)
- ANTCPU team-assigned partners

### 3. Category Arenas — future

A filtered view of the main arena by category. Photography brands compete
against photography brands. Pi Commerce against Pi Commerce.

**Current state:** Not built. Category data exists on every ad.
Filtering is trivial. The question is whether the audience is large enough
to make category arenas meaningful. Trigger: 5+ active brands per category.

### 4. Seasonal / Event Arenas — future

A time-boxed arena for a specific event, campaign, or season.
Opens, runs for 30–90 days, closes. Champion crowned. Arena archived.

**Current state:** Not built. The 90-day cycle model above is the
foundation for this.

---

## Cloud Premium — Arena as a Product

The champion cycle and brand arenas are the foundation of the Cloud plan.

### What Cloud Premium Is

A brand that wins or performs well in the Arena earns access to
Cloud Premium — a dedicated arena environment with full control,
advanced analytics, and antbot activation.

This is not pay-to-win. You earn your way in through Arena performance.
Payment sustains the infrastructure once you're in.

### Cloud Premium Tiers (proposed)

| Tier | How You Get It | What You Get |
|---|---|---|
| **Cloud Champion** | Win a 90-day cycle | Dedicated brand arena · antbot activation · featured placement · champion badge |
| **Cloud Runner-Up** | Top 3 in a cycle | Brand arena · 7-day featured · runner-up badge |
| **Cloud Subscriber** | $9.99/mo (paid) | Brand arena · video feed · YouTube live · full module access |
| **Cloud Partner** | ANTCPU team invite | Custom onboarding · MAC-style AI companion · co-branded arena |

### What a Brand Arena Includes (Cloud)

- `/arena/[brand-slug]` — dedicated URL
- Custom module set (video feed, YouTube live, posts, schedule, chat)
- Brand image + color theming (already in `brand_config`)
- Antbot pod activation on ad launch
- Ledger analytics panel
- Herald weekly digest for their audience
- MAC-style AI companion (Phase 4+)

---

## Reactions as a Rising Signal — The Algorithm

This is the connection between the reaction system and champion selection.

### Current scoring (ADS_V05)
reactions × 1 pt


### Proposed: Reaction Velocity Score (RVS)

Track reactions per hour in the first 24h of an ad going live.
A spike in reactions = early momentum signal.

RVS = reactions_in_first_24h / 24


If RVS > threshold (e.g. 2 reactions/hour), flag the ad as "rising"
and surface it in a "Rising Now" section at the top of the Arena feed.

**This is not built yet.** It requires:
1. `created_at` on `ad_reactions` (already exists)
2. A Scout sub-routine that calculates RVS on demand
3. A `rising_score` field on `ads` (new column)
4. A "Rising Now" section in `ArenaUniversalClient.tsx`

### Why This Matters for Champions

An ad that rises fast in week 1 of a cycle is a strong champion candidate.
The RVS gives Scout early data to surface these brands — and gives
those brands a reason to push hard at launch.

---

## Data We Need to Build This

### Already exists
- `reaction_count` on `ads` ✅
- `ad_reactions` table with `created_at` ✅
- `email` field on `ad_reactions` (added Sep 2026) ✅
- `country-champion` and `top-brand` badges in registry ✅
- `arena_modules` table for per-slug module config ✅
- `brand_config` for brand theming ✅

### Needs to be added
- `cycle_start` / `cycle_end` on `ads` or a new `arena_cycles` table
- `rising_score` on `ads` (RVS output)
- `cycle_points` on `ads` (points earned within current cycle only)
- `champion_history` table (who won, when, what cycle)
- Cron job to close cycles and crown champions (Vercel cron)

---

## Build Order (when ready)

Reaction velocity tracking — Scout sub-routine + rising_score column
"Rising Now" section in Arena feed — surface RVS > threshold ads
arena_cycles table — define cycle boundaries
cycle_points tracking — separate from all-time points
Champion crowning cron — fires on cycle close
Cloud Champion tier — brand arena activation on win
Cloud Subscriber tier — paid plan via Stripe

---

## What We Don't Do

- Champions are not bought — they are earned through engagement
- Reaction velocity is a signal, not a vote — humans still decide edge cases
- Brand arenas don't replace the main Arena — they extend it
- Cloud Premium is a reward for performance, not a paywall for visibility

---

## Connection to flags.ts

These features map to existing and planned flags:

| Flag | Status | Notes |
|---|---|---|
| `antbot-assignment` | v1testing / OFF | Activates on champion win |
| `module-video-feed` | v2 / OFF | Cloud subscriber tier |
| `module-youtube-live` | v2 / OFF | Cloud subscriber tier |
| `paid-subscriptions` | v2 / OFF | Stripe — Cloud Subscriber |
| `ledger-agent` | v1testing / OFF | Analytics for brand arenas |

---

*Last updated: September 2026*
*Built by Antony Ciccone · ANTCPU*
*Observe → Document → Discuss → Build*
