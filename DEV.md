# ⚡ DEV.md — ANTCPU ADS

*August 2026 · antcpu-ads.vercel.app · github.com/ANTCPU/ads*

---

## What This Is

Automated marketing network. Brands compete in **The Arena** through real
engagement. Points → rank → reach. Human-in-the-loop at every gate.

---

## Stack

Next.js 15 · Supabase · Vercel · Resend · Gemini 2.5 Flash · Discord webhooks · Vercel Analytics

Auth: Custom PIN + HttpOnly cookie + localStorage (UI cache)
Styling: All inline — no globals.css, no Tailwind
i18n: `/ar` `/es` `/fr` `/hi` `/it` `/pt` `/zh` — locale arena pages (May 2026)

---

## Key Files — Jump Points

| What you're touching        | File                                          |
|-----------------------------|-----------------------------------------------|
| Main Arena feed             | `app/arena/ArenaUniversalClient.tsx`          |
| Brand arena (slug)          | `app/arena/[slug]/ArenaClient.tsx`            |
| Scoring engine              | `app/api/scout/score/route.ts`                |
| Ad approval + management    | `app/dashboard/antcpu/page.tsx` ⚠️ gated     |
| Module system               | `app/modules/index.ts` + `app/modules/types.ts` |
| Discord notifications       | `app/lib/discord.ts`                          |
| Share logic                 | `app/lib/socialShare.ts`                      |
| Tracking (clicks/shares)    | `app/lib/tracking.ts`                         |
| Session auth                | `app/lib/session.ts` + `app/api/user-auth/`   |
| Profile pages               | `app/profile/[id]/ProfileClient.tsx`          |
| Short links                 | `app/s/[id]/`                                 |

---

## Database — Tables That Matter

| Table           | What it holds                                        |
|-----------------|------------------------------------------------------|
| `ads`           | Every ad — all statuses                              |
| `ad_signups`    | Every user — all roles                               |
| `ad_profiles`   | Brand bio + social links (optional per user)         |
| `ad_clicks`     | Click events                                         |
| `ad_shares`     | Share events                                         |
| `ad_reactions`  | Reaction events (hot / watching / interesting)       |
| `brand_config`  | Brand image + color overrides                        |
| `arena_modules` | Module slot config per user/slug — currently empty   |
| `ledger`        | antcoin + samplecoin transactions (genesis: Apr 2026)|
| `challengers`   | Internship challenge participants                    |

**`ads` status flow:** `pending_review` → `active` → `archived` (or `rejected`)

**`ad_signups` column is `brand_name`** — not `brand`. Common query mistake.

**`pinned` on `ads` is a Scout output** — never set manually. Scout sets
`pinned: true` for rank ≤ 10 after every score run.

---

## Scoring — ADS_V05

File: `app/api/scout/score/route.ts`

Two-pass on every interaction (click / share / like / boost / reaction):

**Pass 1 — raw score:**
- User ads: `(clicks×3) + (shares×5) + (likes×2) + (boosts×5) + (reactions×1) + tier_pts`
- System ads: `(clicks×1) + (shares×1)` — no bonuses, never enter top 10
- Tier pts: entry=0 · rising=+100 · featured=+300 · toptier=+750

**Pass 2 — rank bonus after sort:**
- Rank 1 → +300 · Rank 2 → +200 · Rank 3 → +100 · Ranks 4–10 → +50

After each run: `points` + `rank_position` + `pinned` written to `ads`.
User totals synced to `ad_signups.points`.

**Manual recalc available** in `/dashboard/antcpu` — fires Scout on demand
after archiving or restoring ads.

---

## Module System

Registry: `app/modules/index.ts`
Types: `app/modules/types.ts`
Each module receives `ModuleContext` — `slug`, `user`, `ads`, `supabase`, `isSuper`.

| Module         | Tier     | Notes                                        |
|----------------|----------|----------------------------------------------|
| `share`        | trial    | Platform grid + Discord notify — wired in main Arena |
| `archive`      | trial    | All archived ads, all brands, collapsed      |
| `leaderboard`  | trial    | Top performing ads                           |
| `create-ad`    | trial    | Ad creation form                             |
| `posts`        | standard | Brand posts — wired in `/dashboard/antcpu`   |
| `region-map`   | basic    | Live signup regions                          |
| `campaign-hub` | basic    | Active campaigns by tier                     |
| `schedule`     | standard | Ad activity by day                           |
| `chat`         | standard | Aria chat — unlocks at 10pts                 |
| `video-feed`   | premium  | Brand media ads                              |
| `youtube-live` | premium  | Live stream                                  |

`arena_modules` table exists but is empty — module slots are code-driven for now.

---

## Agents

| Agent    | File / Route                    | Role                              |
|----------|---------------------------------|-----------------------------------|
| 🦋 Aria  | `app/antbots/` · `/antbots/chat`| Ad review · brand strategy        |
| 🔍 Scout | `app/api/scout/score/`          | Scoring · ranking · pinned output |
| 📣 Herald| `app/api/send-weekly/`          | Weekly digest — needs cron ⚠️    |
| 🔒 Vault | `app/components/VaultModal.tsx` | PIN auth · session gate           |

**M.A.C.** is Map of Pi only — lives at chatwithmac.com — Zapier-powered — not in this repo.

---

## Ad Lifecycle
submit → pending_review → [Aria verdict + admin review in /dashboard/antcpu] → active → Scout scores → rank_position + pinned set → archived → removed from Arena · appears in ArchiveModule → restore available in /dashboard/antcpu


Archive sets `status: archived` + `pinned: false` in one update.
Scout excludes archived ads on next run. Ranks shift organically.

---

## Email

All via Resend · `ads@antcpu.io`

| Route               | Trigger                  | Notes                        |
|---------------------|--------------------------|------------------------------|
| `/api/send-welcome` | Every signup             | Fires automatically          |
| `/api/send-module`  | Champion onboarding      | type: 'champion'             |
| `/api/send-weekly`  | Manual or cron           | Built · needs Vercel cron ⚠️|

---

## Discord Events

File: `app/lib/discord.ts` · All events typed in `DiscordEvent`

| Event          | Channel              |
|----------------|----------------------|
| `ad_approved`  | DISCORD_WEBHOOK_ADS  |
| `ad_rejected`  | DISCORD_WEBHOOK_ADS  |
| `ad_archived`  | DISCORD_WEBHOOK_ADS  |
| `share`        | DISCORD_WEBHOOK_SHARES |
| `new_champion` | DISCORD_WEBHOOK_CHAMPIONS |
| `internship`   | DISCORD_INTERN       |
| `general`      | DISCORD_WEBHOOK_ADS  |

Webhook env vars are in Vercel — not in repo.

---

## Auth Roles

| Role    | How set                          | Access                        |
|---------|----------------------------------|-------------------------------|
| `super` | PIN via `/api/user-auth`         | Everything — all dashboards   |
| `admin` | `ad_signups.role = 'admin'`      | Approval queue · user list    |
| `team`  | Promo code signup                | 90-day access · brand arena   |
| `trial` | Standard signup                  | 3-day access                  |

`/dashboard/antcpu` is hardcoded to one email — not role-gated yet.
Migration to role-based approval queue is a planned next step.

---

## Known Gaps — August 2026

| Gap                                      | File                        | Priority  |
|------------------------------------------|-----------------------------|-----------|
| Profile page — no Edit/Archive for ads   | `ProfileClient.tsx`         | 🔴 High   |
| `/dashboard/antcpu` hardcoded to 1 email | `page.tsx`                  | 🔴 High   |
| `send-weekly` needs cron trigger         | `/api/send-weekly`          | 🟡 Medium |
| `/edu` returns 404 — live ads point here | Multiple ads                | 🟡 Medium |
| `arena_modules` table unused             | DB                          | 🟢 Low    |
| `cpu@antcpu.io` has null `brand_name`    | `ad_signups` system row     | 🟢 Low    |

---

## Next Session — Pickup Points

**Profile deep rebuild** — `ProfileClient.tsx`
- Owner view: Edit (title/desc/url) + Archive per ad
- Admin/super view: same controls on any profile
- Status badges per ad (active / archived / pending / rejected)
- `canManage = isOwn || role === 'super'` gate
- `verified_brand` guard — lock brand name if true

**Approval queue extraction** — `app/dashboard/review/`
- Extract `ariaVerdict()` → `app/lib/aria.ts`
- Build `/dashboard/review` — role-gated, not email-gated
- Remove hardcoded email from `/dashboard/antcpu`

**Site background split** — document the intentional theming:
- Admin/dashboard pages: `background: #fff` (workspace feel)
- Arena/public pages: `background: #0a0a0a` (live stage feel)
- Not a bug — a design decision. Do not flatten.

---

## Build Rule

Observe → Document → Discuss → Build.
Code follows the document. Never the other way around.
