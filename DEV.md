# ⚡ ANTCPU ADS

*antcpu-ads.vercel.app · github.com/ANTCPU/ads*

---

## What This Is

Automated marketing network. Brands compete in **The Arena** through real engagement. Points → rank → reach. Human-in-the-loop at every gate.

---

## Stack

Next.js 15 · Supabase · Vercel · Resend · Gemini 2.5 Flash · Discord webhooks

Auth: Custom PIN + HttpOnly cookie + localStorage (UI cache)  
Styling: Inline only — no globals.css, no Tailwind  
i18n: `/ar` `/es` `/fr` `/hi` `/it` `/pt` `/zh`

---

## Key Files

| What                  | File                                          |
|-----------------------|-----------------------------------------------|
| Arena feed            | `app/arena/ArenaUniversalClient.tsx`          |
| Brand arena           | `app/arena/[slug]/ArenaClient.tsx`            |
| Scoring engine        | `app/api/scout/score/route.ts`                |
| Ad approval           | `app/dashboard/antcpu/page.tsx`               |
| Agent pipeline        | `app/dashboard/agents/page.tsx`               |
| Module system         | `app/modules/index.ts`                        |
| Discord notifications | `app/lib/discord.ts`                          |
| Tracking              | `app/lib/tracking/`                           |
| Session auth          | `app/lib/session.ts`                          |
| Profile pages         | `app/profile/[slug]/page.tsx`                 |
| Short links           | `app/s/[id]/route.ts`                         |
| Feature flags         | `app/lib/flags.ts`                            |
| Agent registry        | `app/lib/agents.ts`                           |
| Ad review             | `app/lib/aria.ts`                             |
| Badge registry        | `app/lib/badges.ts`                           |
| Membership tiers      | `app/lib/membership.ts`                       |
| Weekly digest         | `app/api/send-weekly/route.ts`                |

---

## Database

| Table           | What it holds                              |
|-----------------|--------------------------------------------|
| `ads`           | Every ad — all statuses                    |
| `ad_signups`    | Every user — all roles                     |
| `ad_profiles`   | Brand bio + social links                   |
| `ad_clicks`     | Click events                               |
| `ad_shares`     | Share events                               |
| `ad_reactions`  | Reaction events                            |
| `brand_config`  | Brand image + color overrides              |
| `user_badges`   | Badge awards — 18 types                    |
| `notifications` | In-app notifications                       |
| `ledger`        | Antcoin transactions                       |
| `challengers`   | Internship participants                    |

`ads` status flow: `pending_review` → `active` → `archived`  
`pinned` is a Scout output — never set manually.  
`ad_signups` column is `brand_name` — not `brand`.

---

## Scoring — ADS_V05

Two-pass on every interaction (click / share / like / boost / reaction):

**Pass 1 — raw score:**
- `(clicks×3) + (shares×5) + (likes×2) + (boosts×5) + (reactions×1) + tier_pts`
- Tier pts: entry=0 · rising=+100 · featured=+300 · top_tier=+750
- System ads: `(clicks×1) + (shares×1)` — no bonuses, never top 10

**Pass 2 — rank bonus:**
- Rank 1 → +300 · Rank 2 → +200 · Rank 3 → +100 · Ranks 4–10 → +50

`points` + `rank_position` + `pinned` written to `ads` after every run.  
User totals synced to `ad_signups.points`.

---

## Agents

| Agent  | Icon | Role                                      |
|--------|------|-------------------------------------------|
| Aria   | 🦋   | Ad review · brand strategy · chat         |
| Scout  | 🔍   | Scoring · ranking · pinned output         |
| Herald | 🔔   | Drop-off nudges · weekly digest           |
| Ledger | 📊   | Analytics — v1testing                     |
| MAC    | 🗺️  | Map of Pi agent — v1testing               |
| Antbot | 🤖   | Champion challenger pods — v1testing      |

Herald cron: every Monday 9AM UTC → `GET /api/send-weekly`

---

## Ad Lifecycle

`submit` → `pending_review` → Aria review → `active` → Scout scores → `archived`

---

## Auth Roles

| Role    | Access                          |
|---------|---------------------------------|
| `super` | Everything                      |
| `admin` | Approval queue · user list      |
| `team`  | 90-day access · brand arena     |
| `trial` | 3-day access                    |

---

## Build Rule

Observe → Document → Discuss → Build.
