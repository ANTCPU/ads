# ⚡ DEV.md — ANTCPU ADS Developer Reference

> This document is the living source of truth for developers joining the build.
> It reflects the actual state of the codebase — not aspirations, not plans.
> Read this before touching anything.

*Last updated: July 2026 · Built by Antony Ciccone · ANTCPU*

---

## What This Is

ANTCPU ADS is an automated marketing network — **The Arena** — where brands
compete for reach through real engagement. Points drive rank. Rank drives
reach. The system is designed to evolve with human-in-the-loop oversight at
every critical gate.

Live: [antcpu-ads.vercel.app](https://antcpu-ads.vercel.app)
Repo: [github.com/ANTCPU/ads](https://github.com/ANTCPU/ads)

---

## The Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Framework     | Next.js 15 · App Router           |
| Hosting       | Vercel                            |
| Database      | Supabase (Postgres + RLS)         |
| Email         | Resend (`ads@antcpu.io`)          |
| AI            | Gemini 2.5 Flash (`/api/ads-agent`) |
| Notifications | Discord webhooks                  |
| Analytics     | Vercel Analytics                  |
| Auth          | Custom PIN + session cookie + localStorage |
| External      | Zapier (antbot automation bridge) |

---

## Repository Structure

/app /about → About page + founder story /antbots → Antbot pod page + Aria chat (/antbots/chat) /api → All API routes (see API Routes below) /arena → Public live ad feed /champions → Country Champions leaderboard 
/create-ad → Ad creation (wraps CreateAdDrawer component) /dashboard → Role-based dashboard router /admin → Super admin panel (role: super) /agents → Agent pipeline overview (antcpu@gmail.com only) /antcpu → ANTCPU brand dashboard + Aria approval queue /leaderboard → Points leaderboard 
/mapofpi → Map of Pi brand dashboard /new → New client onboarding (admin tool) /photography → Amanda Photography dashboard /user → Standard user dashboard (all members) /users → User list (role: admin) /guide → Arena Guide (3-path entry page) /login → Signup + login (multi-step, brand-skinned) 
/mapofpi → Map of Pi partner landing page /create-shop-ad → 6-step Country Champion wizard /icons/arena → Country Champions icon arena (19 active) /modules → Arena module system /privacy → Privacy policy (GDPR + CCPA) /tos → Terms of service /profile/[id] → Public brand profile pages /s/[id] → Short share links for ads

/ads-agent → Legacy standalone agent prototype (archived) /anthub → Archived onboarding tracker experiments /lib → Shared utilities /public → Static assets + OG images


---

## The Database (Supabase)

### Key Tables

| Table          | Purpose                                              |
|----------------|------------------------------------------------------|
| `ads`          | All ads — active, pending_review, rejected, archived |
| `ad_signups`   | All users — trial, team, active, champion            |
| `ad_profiles`  | Optional brand bio + contact details per user        |
| `ad_clicks`    | Click events per ad (used by Scout scoring)          |

### Key Fields on `ad_signups`

| Field                  | Notes                                              |
|------------------------|----------------------------------------------------|
| `status`               | `trial` · `team` · `active`                        |
| `role`                 | `user` · `admin` · `super`                         |
| `trial_days`           | 3 (standard) · 90 (Map of Pi champions)            |
| `trial_expiry`         | Date string set at signup                          |
| `promo_code`           | Drives brand-skinned login + campaign funnel       |
| `is_country_champion`  | Boolean — set for Map of Pi champion signups       |
| `welcome_email_sent_at`| Stamped when welcome email fires                   |
| `country` / `city`     | Captured via IP geolocation at signup              |

### Key Fields on `ads`

| Field                 | Notes                                               |
|-----------------------|-----------------------------------------------------|
| `status`              | `pending_review` · `active` · `rejected` · `archived` |
| `tier`                | `entry` · `rising` · `featured` · `toptier`         |
| `points`              | Cumulative score (clicks + shares + reactions)      |
| `is_country_champion` | Boolean — champion ads get special placement        |
| `is_system`           | Boolean — ANTCPU system ads (capped at 1pt/share)   |
| `pinned`              | Boolean — admin-pinned ads float to top (+50pts)    |
| `rank_position`       | Calculated by Scout scoring API                     |
| `image_url`           | Optional — image upload unlocks Deluxe tier         |

---

## The Agent System

### The 4 Arena Agents

| Agent    | Role                                                        |
|----------|-------------------------------------------------------------|
| 🦋 Aria  | Ad review + approval logic · Live chat at `/antbots/chat`  |
| 🔍 Scout | Scoring engine · `/api/scout/score` · called on every click/share |
| 📣 Herald| Weekly digest email · `/api/send-weekly` · needs cron trigger |
| 🔒 Vault | Session auth · PIN system · `VaultModal` component         |

### M.A.C. — Map of Pi AI Companion

M.A.C. (Marketing AI Companion) is **specific to Map of Pi** and lives at
[chatwithmac.com](https://chatwithmac.com) — a dedicated Zapier-powered
chatbot for Map of Pi users and Country Champions. It is not part of this
repo. It is a separate product that connects to the Arena via the
`/api/agent` Zapier bridge endpoint.

Do not conflate M.A.C. with Aria. They are different agents with different
audiences:
- **Aria** → Arena-wide intelligence, ad review, brand strategy
- **M.A.C.** → Map of Pi specific, lives at chatwithmac.com, Zapier-powered

---

## The Antbot Pod System

### How It Works

Every brand in the Arena gets a pod of 10 AI antbots. Each bot owns one
channel and generates ready-to-post content via Gemini 2.5 Flash.

The pod is **dynamically built per champion** using `buildPod(ctx)` in
`app/antbots/index.ts`. When a Country Champion signs up with their shop
name, country, language, and shop type — the entire 10-bot pod rewrites
itself for that specific seller.

```typescript
// Example: Nigerian beauty salon champion
buildPod({
  brand: 'Map of Pi',
  shopName: 'Endurance Beauty World',
  shopType: 'Beauty & Salon',
  shopEmoji: '💇',
  country: 'Nigeria',
  countryFlag: '🇳🇬',
  language: 'en',
  youtubeAnthemId: 'PNoY1ffzciI',
})
This produces 10 fully personalized prompts — tweets, Instagram captions, Reddit posts, YouTube scripts, email copy — all written for that specific shop, country, and audience.

The 10 Bots
Bot	Channel	Output
ANT-01	Brand Awareness	3 positioning statements
ANT-02	Google Ads	3 search ad sets (headline + description)
ANT-03	Meta / Instagram	2 captions + CTAs + hashtags
ANT-04	Twitter / X	5 tweets (stats, utility, community pride)
ANT-05	Reddit	r/PiNetwork post with question hook
ANT-06	YouTube	60-second Shorts script with on-screen cues
ANT-07	TikTok	Hook + 3-scene breakdown + CTA
ANT-08	SEO / Content	200-word blog intro with keywords
ANT-09	Discord	Community announcement (150 words)
ANT-10	Email	Welcome email for new seller
The Zapier Bridge
External antbot automation connects to the Arena via:

GET  /api/agent?token=AGENT_TOKEN   → Full Arena snapshot
POST /api/agent?token=AGENT_TOKEN   → Actions: share, status
This is how the "100 antbots" concept scales. Zapier workflows run on schedule, read the Arena state, and POST share/engagement actions back. 
The site evolves as more Zaps are added. You are the human in the loop — you review, approve, and direct. The bots execute.

The Email System
All email goes through Resend from ads@antcpu.io.

Route	Trigger	Audience
/api/send-welcome	Fires on every new signup	All new users
/api/send-module	Fires for champion onboarding	Country Champions
/api/send-weekly	Manual POST with WEEKLY_SECRET	All trial + team users
Weekly Email Status
/api/send-weekly is fully built and ready. It fetches all active subscribers, builds a personalized HTML digest with the live leaderboard, Map of Pi featured ad, and a rotating marketing quote. It just needs a scheduled trigger —a Vercel cron job calling:

POST /api/send-weekly
{ "secret": "WEEKLY_SECRET" }
Champion Email
/api/send-module with type: 'champion' sends a full onboarding email with the tier ladder, point-earning guide, share link, and champion board links. It fires from the Map of Pi shop wizard on completion.

The New User Journey
/login
  ├── Doorbell ping (visit tracked)
  ├── Promo code read from URL → getBrandConfig() skins the page
  ├── 3-step form: Name → Category → Message
  ├── Writes to ad_signups (status: 'trial', trial_days: 3)
  ├── fireWelcomeEmail() → /api/send-welcome
  ├── welcome_email_sent_at stamped
  └── persistSession() → cookie + localStorage → /dashboard/user

/dashboard/user
  ├── Onboarding checklist (3 steps)
  ├── My Ad card (empty until first ad created)
  ├── Referral code + copy link
  └── Arena feed (can share immediately to earn points)

/create-ad
  └── CreateAdDrawer → ad written to ads (status: pending_review)

/dashboard/antcpu (admin)
  └── Aria approval queue → Approve/Reject
      ├── Approve → status: active, Scout scores, Discord notified
      └── Reject → status: rejected, Discord notified with Aria verdict
The 1-Ad Rule + Ad Builder (Planned)
Current Rule
Each user is limited to 1 active ad. This is enforced at the data level — fetchData() in the user dashboard uses .limit(1) on active ads.

The Upgrade Path (Planned — not yet built)
A user earns the right to a second ad by making their first ad competitive. The criteria:

Ad has earned meaningful engagement (points threshold TBD)
User has shared at least once
Ad has been active for a minimum period
This reward mechanic keeps the Arena quality high — you earn more reach by proving you can use what you have.

Ad Builder Page — /ad-builder (Planned)
Document before build. Build after document.

The Ad Builder is a dedicated page (not a drawer, not a modal) that gives users a full creative workspace to:

Write and preview their ad before submitting
See Aria's live feedback as they type
Choose category, tier intent, and target audience
Submit directly to the approval queue
Why it matters now: With 50+ ads in the Arena, the quality bar is rising. A dedicated builder page signals to new users that this is a serious platform. 
It also gives Aria a surface to coach copy quality before submission — reducing the rejection rate and admin load.

Current state: /create-ad exists and wraps CreateAdDrawer. The drawer is functional but minimal. 
The Ad Builder page is the evolution of this — a full page with more guidance, Aria integration, and the second-ad unlock flow.

Nav fix needed: The current "Ad Builder" nav link points to /dashboard (which redirects to login). 
This must be resolved before the page is built — either remove the nav link or stub the route.

The Approval Queue Page — /dashboard/review (Planned)
Document before build. Build after document.

Current State
The Aria approval queue lives inside /dashboard/antcpu — a personal brand dashboard hardcoded. This works at low volume but does not scale.

Why It Needs Its Own Page
With 50+ ads and growing, the approval queue needs to be:

Accessible to any user with role: admin (not just the founder email)
A dedicated, focused interface — not buried inside a brand dashboard
Capable of showing queue depth, Aria verdict, and action history
The foundation for the Phase 3 moderator system
What the Page Should Do
Pull all status: pending_review ads from Supabase
Show Aria's verdict for each (already built in ariaVerdict())
Approve → status: active + Scout score + Discord notify
Request Edit → email brand with specific feedback
Reject → status: rejected + Discord notify with Aria reason
Show queue depth and average wait time
Admin-only route (role: admin or super)
Migration Path
The ariaVerdict() function and all approval logic already exists in app/dashboard/antcpu/page.tsx. The move is:

Extract ariaVerdict() to app/lib/aria.ts
Build /dashboard/review/page.tsx using that shared function
Add "Review Queue" to the admin nav
Keep /dashboard/antcpu for brand-specific post builder tools
Authentication
Super admin: PIN-protected via /api/user-auth · role: super
Admin: Role set in ad_signups.role · role: admin
Team: Promo code signup · trialStatus: 'team' · 90-day access
Trial: Standard signup · trialStatus: 'trial' · 3-day access
User: Default role after trial
Session is stored in:

HttpOnly cookie (server-set via /api/session/set) — survives mobile Safari
localStorage['arena_user'] — UI cache for instant name/brand display
Dashboard routing (/dashboard/page.tsx) reads localStorage and routes:

super → /dashboard/admin
admin → /dashboard/users
team / user → /dashboard/user
Visit Tracking
/api/doorbell is called on page load from:

/login
/dashboard/user
Payload: { page, ref, ts, ua }

This is the lightweight analytics layer before Vercel Analytics aggregates.

Known Gaps (As of July 2026)
These are confirmed gaps from live code audit — not opinions:

Gap	Location	Priority
Trial status not shown to user	/dashboard/user	🔴 High
No early adopter badge surface	Dashboard + Arena cards	🔴 High
Amanda stats hardcoded	/dashboard/agents	🟡 Medium
/ad-builder nav link is dead	Nav component	🟡 Medium
/edu returns 404, ads point there	Multiple live ads	🟡 Medium
send-weekly has no cron trigger	/api/send-weekly	🟡 Medium
/about uses homepage OG tags	/app/about	🟢 Low
/guide not in main nav	Nav component	🟢 Low
test dashboard still exists	/dashboard/test	🟢 Low
Planned Pages (Document → Design → Build Order)
Page	Route	Status	Notes
Ad Builder	/ad-builder	📋 Documented	Full creative workspace + Aria feedback
Approval Queue	/dashboard/review	📋 Documented	Dedicated admin review page
Early Adopter Badge	Dashboard + Arena	📋 Documented	Schema + UI surface needed
EDU Landing	/edu	📋 Documented	Stub needed — live ads point here
Agent Hub	/agents	🔜 Planned	Aria, Scout, Herald, Forge overview
Pricing Page	/pricing	🔜 Planned	Standalone route for pricing section
Build Philosophy
Document before build. Build after document.

Every new page or feature goes through this order:

Observe — audit the live site and code for what already exists
Document — write the spec in DEV.md or ROADMAP.md before any code
Discuss — human in the loop reviews the plan
Build — code follows the document, not the other way around
The antbots are pre-programmed. The agents are pre-programmed. The human (you) is the loop that approves, directs, and evolves the system. 
The site grows as the documents grow.

Contributing
This project is in active development. The door opens at antcpu.io.

If you're reading this as a developer interested in joining:

Read this file top to bottom
Understand the 1-ad rule, the approval queue, and the antbot pod
Built by Antony Ciccone · ANTCPU · Veteran-owned antcpu.com · antcpu-ads.vercel.app


---

## What This Document Does

- **Corrects M.A.C.** — clearly separated from Aria, identified as Map of Pi specific, lives at `chatwithmac.com`, Zapier-powered
- **Documents the 1-ad rule** — explains the current limit and the earn-a-second-ad upgrade path
- **Documents Ad Builder as a planned page** — full spec written before a single line of code
- **Documents Approval Queue as a planned page** — migration path from `/dashboard/antcpu` to `/dashboard/review` fully described
- **Shows the build as it evolves** — every known gap is listed with priority, every planned page has a status
- **Establishes the document-first philosophy** — "Document before build. Build after document." is the operating principle
