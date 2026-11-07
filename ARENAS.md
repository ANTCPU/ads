# ⚡ ARENAS.md — Arena Architecture & Champion Cycle

*November 2026 · ANTCPU ADS*

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

### 3. Category Arenas 

A filtered view of the main arena by category. Photography brands compete
against photography brands. Pi Commerce against Pi Commerce.

**Current state:** Not built. Category data exists on every ad.
Filtering is trivial. The question is whether the audience is large enough
to make category arenas meaningful. Trigger: 5+ active brands per category.

### 4. Seasonal / Event Arenas — Fall Arena Live

A time-boxed arena for a specific event, campaign, or season.
Opens, runs thru seasons with each arena.


## What We Don't Do

- Champions are not bought — they are earned through engagement
- Brand arenas don't replace the main Arena — they extend it

*Last updated: November 2026*
*Built by Antony Ciccone · ANTCPU*
*Observe → Document → Discuss → Build*
