# ANTCPU ADS — BUILD LOG
> Last updated: 2026-05-10
> Maintained by: Antony Ciccone · antcpu@gmail.com

---

## 🏟️ THE ARENA — Vision

A self-referential ad network where the platform itself is the first advertiser.
Each user gets a profile, an ad, and a tier. The arena fills as the network grows.
Engagement earns points. Points earn tier upgrades. Top tier = antcpu.com/cloud.

---

## 👥 Organizations

| Org | Person | Code | Tier | Status |
|-----|--------|------|------|--------|
| ANTCPU | Antony Ciccone | MAPOFPI (admin) | Top Tier | ✅ Active |
| Map of Pi | Mohammed + Andri | MAPOFPI | Team 90-day | 🔜 Signing up |
| Photography API | Amanda | TBD | Tier 2 sponsor | 🔜 To setup |
| Video / AI Phase | TBD | TBD | Tier 3 | 🔮 Future |

---

## 🏆 Tier Roadmap

| Tier | Name | Ad Format | How to get it |
|------|------|-----------|---------------|
| 1 | Entry | Text ad · standard rotation | Sign up free / $9.99/mo |
| 2 | Rising | Custom image · powered by Photography API | Buy a slot |
| 3 | Featured | Video ad · powered by ANTCPU AI | Win weekly competition |
| 4 | Top Tier | Full cloud campaign | antcpu.com/cloud · invite only |

Weekly competition — engagement points determine who climbs.
Winners get upgraded ad slots as rewards. Scarcity drives value.

---

## ✅ COMPLETED

### Session 2026-05-09
- [x] Local repo found at ~/antcpu-launcher/staging/ads/
- [x] Next.js app running at localhost:3001
- [x] Supabase tables created: ad_profiles, ads (with RLS + anon policies)
- [x] ANTCPU seed ad inserted: "ANTCPU Ad Network is coming in hot 🔥"
- [x] Step 1 — Signup flow (page.tsx) — name, email, brand, category, promo code
- [x] Step 2 — Profile page (profile/page.tsx) — bio, website, contact → saves to ad_profiles
- [x] Step 3 — Create Ad (create-ad/page.tsx) — seeded ANTCPU ad, live preview, tier roadmap
- [x] Dashboard (dashboard/page.tsx) — agent clients + all ads feed from Supabase
- [x] Debug alerts on profile + create-ad saves (temporary — remove before v1 launch)
- [x] Antbot pod — 10 bots, Gemini 2.5 Flash, Map of Pi tasks
- [x] useSession hook — timeclock, geo, heartbeat, SC earned
- [x] Doorbell API — visitor tracking
- [x] Discord webhook — new signup notifications

---

## 🔄 IN PROGRESS

- [ ] Verify Supabase inserts working end-to-end (profile + ad tables)
- [ ] Confirm full flow: signup → profile → create-ad → dashboard
- [ ] antbots/index.ts — swap default from Map of Pi → ANTCPU platform tasks

---

## 🔜 UP NEXT (Priority Order)

### P1 — Core flow completion
- [ ] /profile/[id]/page.tsx — dynamic per-user profile page
      · Shows their brand, bio, contact
      · Their active ads with tier badges
      · Upgrade path CTA
- [ ] Remove debug alerts from profile + create-ad (post verification)
- [ ] Onboarding tracker Step 3 → "Your ad is in the Arena" + link to /profile/[id]

### P2 — Arena + Organizations
- [ ] Dashboard arena feed — Map of Pi pinned as free trial sponsor
- [ ] Photography API badge on Tier 2 upgrade path (Amanda)
- [ ] Separate promo codes per org (Mohammed, Andri, Amanda)
- [ ] Each org gets their own antbot pod tasks (not hardcoded Map of Pi)

### P3 — Engagement + Competition
- [ ] Ad impression + click tracking (views, clicks columns in ads table)
- [ ] Points system — engagement earns ladder points
- [ ] Weekly leaderboard — top ads by engagement
- [ ] Tier upgrade flow — buy Rising slot (image ad)

### P4 — Tier 2 — Photography API (Amanda)
- [ ] Image ad format in arena feed
- [ ] Photography API integration for image generation
- [ ] Amanda's profile + org setup
- [ ] Rising tier purchase flow ($TBD/slot)

### P5 — Tier 3 — Video (ANTCPU AI Phase)
- [ ] Video ad format in arena feed
- [ ] ANTCPU AI video generation integration
- [ ] Featured tier — weekly competition winner reward
- [ ] antcpu.com/cloud integration

### P6 — Top Tier — Cloud
- [ ] antcpu.com/cloud campaign dashboard
- [ ] Invite-only access flow
- [ ] Full 10-antbot campaign per client

---

## 🗄️ Supabase Tables

### ad_signups
- id, name, email, brand_name, website_url
- ad_category, has_used_ad_service, previous_ad_service
- promo_code, message, status, trial_days, trial_expiry

### ad_profiles
- id, email (unique), name, brand
- bio, website, contact
- created_at

### ads
- id, email, name, brand
- title, url, description, category
- status (pending_review / active), trial_status
- tier (entry / rising / featured / toptier)
- pinned (bool), created_at

### time_clock (via useSession)
- id, identity, identity_type, source
- status, punch_in, punch_out, duration_mins
- ip, city, country, timezone, lat, lng, sc_earned

---

## 🔑 Key URLs

| | URL |
|-|-----|
| Live app | https://antcpu-ads.vercel.app |
| GitHub | https://github.com/ANTCPU/ads |
| Supabase | https://supabase.com/dashboard/project/yeadfwqjoyemcjshydgj |
| Local | http://localhost:3001 |
| Tower | http://localhost:3000 |
| Cloud | https://antcpu.com/cloud (future) |

---

## 📝 NOTES

- antbots/index.ts tasks are currently hardcoded for Map of Pi
  → needs to be dynamic per client when Mohammed/Andri/Amanda onboard
- Debug alerts in profile/page.tsx + create-ad/page.tsx — remove after Supabase verified
- Sign-in flow is email-only (no password) — intentional for now
- ANTCPU seed ad is pinned=true, status=active, tier=entry
- Photography API = Amanda's org — powers Tier 2 image ads (not just a person signing up)
- Video phase = full ANTCPU AI integration — Tier 3 reward for weekly competition winners

---

## 🎯 DASHBOARD TIERS — Feature Matrix

| Feature | Entry (Free/$9.99) | Rising (Tier 2) | Featured (Tier 3) |
|---------|-------------------|-----------------|-------------------|
| View your ad in arena | ✅ | ✅ | ✅ |
| Edit your ad | ✅ | ✅ | ✅ |
| Basic stats (views/clicks) | ✅ | ✅ | ✅ |
| Custom image ad | ❌ locked | ✅ | ✅ |
| Photography API access | ❌ locked | ✅ powered by Amanda | ✅ |
| Antbot pod (10 bots) | ❌ locked | ❌ locked | ✅ |
| AI content generation | ❌ locked | ❌ locked | ✅ Gemini 2.5 Flash |
| Post preview + export | ❌ locked | ❌ locked | ✅ |
| antcpu.com/cloud | ❌ locked | ❌ locked | ❌ invite only |

---

## 💳 PAYMENTS — PayPal Integration

### Plans
| Plan | Price | Billing | Supabase status |
|------|-------|---------|-----------------|
| Entry | $0 | 3-day trial then $9.99/mo | trial / active |
| Rising | TBD | /mo or /slot | rising |
| Featured | TBD | /mo or competition win | featured |

### Flow
1. User completes signup (ad_signups table)
2. Trial starts (3 days free)
3. Trial expires → PayPal checkout triggered
4. PayPal webhook → updates ads.tier + ad_signups.status in Supabase
5. Dashboard unlocks features based on tier

### Tables needed
- payments: id, email, paypal_order_id, plan, amount, status, created_at
- Update ads table: add tier_expires_at column
- Update ad_signups: add payment_status column

### PayPal
- PayPal JS SDK (client-side checkout button)
- PayPal Webhooks API (server-side confirmation)
- Route: /api/paypal/webhook
- Route: /api/paypal/create-order
- Route: /api/paypal/capture-order

---

## 🖥️ DASHBOARD VIEWS — Per Tier

### Entry Dashboard (/dashboard/user)
- Your ad card (live preview)
- Arena feed (all ads)
- Basic stats placeholder (views/clicks — coming soon)
- Locked feature cards: image ads, antbots, cloud
- Upgrade CTA prominent

### Rising Dashboard (/dashboard/user) — unlocked at Tier 2
- Everything in Entry
- Image ad builder (Photography API — Amanda)
- Upload or generate custom image
- Stats: views + clicks live

### Featured Dashboard (/dashboard/user) — unlocked at Tier 3
- Everything in Rising  
- Antbot pod (10 bots, Gemini 2.5 Flash)
- AI content generation
- Post preview + export
- Weekly competition leaderboard

---

## 🔜 UPDATED PRIORITY ORDER

### P0 — Before Amanda tests tomorrow
- [ ] New user dashboard (/dashboard/user) — Entry tier view
- [ ] Locked feature cards visible (upsell)
- [ ] Profile page working (✅ done locally)
- [ ] Favicon fixed (✅ done locally)
- [ ] Supabase inserts verified end-to-end

### P1 — This week
- [ ] PayPal integration (create-order, capture-order, webhook)
- [ ] payments table in Supabase
- [ ] Trial expiry → PayPal checkout trigger
- [ ] Tier unlock on payment confirmed

### P2 — Amanda + Photography API
- [ ] Rising tier dashboard unlocked
- [ ] Image ad builder
- [ ] Photography API wired in
- [ ] Amanda org setup + profile seeded

### P3 — Mohammed + Andri + Invite Link
- [ ] Invite link system (one-click with code pre-filled)
- [ ] Map of Pi pinned as arena sponsor
- [ ] Per-org antbot tasks (Tier 3 only)

### P4 — Competition + Leaderboard
- [ ] Impression + click tracking
- [ ] Points system
- [ ] Weekly leaderboard
- [ ] Featured tier competition reward

### P5 — Top Tier Cloud
- [ ] antcpu.com/cloud integration
- [ ] Invite-only access flow

---

## 🤖 ADS AGENT INTERFACE — ads/index.html

Already built. Located at: /ads/index.html + /ads/face.js

### What it is
- Full chat interface with ADS talking head (SVG animated face)
- 4 tabs: Chat / Tasks / Stats / Log
- Task queue: blog draft, feed entry, social copy, campaign brief
- Gemini 2.5 Flash backend via /api/gemini
- Rate limit guard: 14 RPM / 18 RPD
- ANT token tracking per task
- localStorage persistence for session state

### Tier placement
- This is the TIER 3 (Featured) dashboard experience
- Advertisers at Tier 3 get access to the full ADS agent chat
- Tier 1 + 2 see it locked with upsell CTA

### Integration needed
- [ ] Wire AGENT_ACTIVE = true when user is Tier 3 (check Supabase tier)
- [ ] Replace /api/gemini with /api/ads-agent (already built in Next.js)
- [ ] Pass user brand/context into AGENT_PROMPT dynamically
- [ ] Embed in Next.js dashboard at /dashboard/user for Tier 3 users
- [ ] OR iframe it into the Next.js tier 3 dashboard view

### The talking head
- TalkingHeadSVG — requires talking-head-svg.js (in root)
- face.js mounts it with ADS palette (orange/amber)
- States: IDLE / THINKING / SPEAKING / ERROR
- window.ADS_HEAD exposed for external control

---

## 🗂️ FULL FILE MAP

### Next.js app (app/)
- page.tsx — signup flow (3 steps)
- profile/page.tsx — Step 2 profile builder
- profile/[id]/page.tsx — dynamic per-user profile ✅ built locally
- create-ad/page.tsx — Step 3 ad builder + live preview
- dashboard/page.tsx — arena feed + agent clients
- dashboard/antcpu/page.tsx — ANTCPU antbot pod (Tier 3)
- dashboard/mapofpi/page.tsx — Map of Pi antbot pod (Tier 3)
- dashboard/antcpu/post-preview/page.tsx — post preview + image gen
- dashboard/new/page.tsx — new client form
- layout.tsx — root layout (favicon ⚡ fixed locally)
- antbots/index.ts — 10 antbot pod (Map of Pi tasks — needs dynamic)
- clients/antcpu/kb.ts — ANTCPU brand KB
- clients/mapofpi/kb.ts — Map of Pi KB
- clients/index.ts — client registry
- api/ads-agent/route.ts — Gemini 2.5 Flash API
- api/ads-image/route.ts — image generation API
- api/doorbell/route.ts — visitor tracking
- lib/useSession.ts — timeclock + geo + heartbeat

### ADS Agent (ads/)
- ads/index.html — full ADS agent chat interface (Tier 3)
- ads/face.js — talking head mount (ADS palette)

### Root assets (referenced but not yet gathered)
- talking-head-svg.js — SVG talking head engine
- nav.js — navigation
- api/config — key config endpoint

---

## 🎯 ANTHUB — GOAL 1

Location: /staging/ads/anthub/GOAL-1.md

### The Mission
Use ANTCPU as the first real ADS agent client.
Fill the platform with all marketing work already built across antcpu sites.
Use that as the baseline to onboard real paying clients.

### The Trio
- antdrive — file storage + asset management
- file uploader — push files online
- anthub — shift coordination + build planning + branch prep

### ANTCPU Assets to feed into antbots
- antcpu.com — main brand
- antcpu.com/live.html — signal page
- antcpu.com/tower.html — genesis block monitor
- antcpu.com/edu — education hub
- antcpu.com/feed — blog + RSS
- antcpu-launcher — local dashboard
- ANTCPU ADS — ads platform
- Herald agent — communications
- Map of Pi — affiliate use case 1

### Build Sequence
- [ ] antcpu KB complete (clients/antcpu/kb.ts — partial)
- [ ] Run 10 antbots on ANTCPU — generate full campaign baseline
- [ ] Package output as demo for client onboarding
- [ ] Onboard first real client using ANTCPU as the pitch

### Scale Plan
- GitHub branches per client project
- Vercel preview URLs per branch
- anthub tracks all of it

---

## 🗂️ ROOT ASSETS (antcpu-launcher/)

Critical files that ads/ depends on:
- talking-head-svg.js — SVG talking head engine (used by ads/face.js)
- nav.js — navigation (used by ads/index.html)
- talking-head-fx.js — effects layer
- talking-head.js — base talking head

These live in the launcher root, NOT in the ads repo.
The ads/index.html references them via ../../
This means ads/index.html only works when served from the launcher,
NOT as a standalone Next.js route.

### Integration options for Tier 3 dashboard:
- Option A: Copy talking-head-svg.js into ads/public/ and serve locally
- Option B: iframe ads/index.html from the launcher into Next.js
- Option C: Rebuild the ADS agent interface as a proper Next.js page

Recommended: Option A — copy assets to public/, wire into Next.js Tier 3 dashboard

---

## 📋 TODO.md ITEMS (merged into build plan)

- [ ] Pricing tiers on landing page ($9.99 / $29 / $79)
- [ ] Supabase Auth — replace localStorage with supabase.auth.signInWithOtp()
- [ ] Gate dashboard behind real session
- [ ] Points → ladder level visible in UI
- [ ] antcpu.com/cloud → antcpu-ads.vercel.app flow

---

## 🔲 ONBOARDING TRACKER — moved to /dashboard/user

Removed from page.tsx (was post-signup screen).
Now lives as a compact checklist popup/widget in /dashboard/user.

### Steps (current)
1. ✅ You're in the Arena — signup complete
2. 👤 Complete Your Profile — checks ad_profiles table for bio
3. 📢 Create Your First Ad — checks ads table for at least 1 ad

### Logic
- If profile incomplete → show step 2 highlighted
- If no ads → show step 3 highlighted  
- If both complete → collapse/dismiss tracker
- Extensible — add steps here as needed (e.g. verify email, connect social)

### UI
- Compact — not full page, just a card at top of /dashboard/user
- Dismissible once all steps complete
- Shows progress bar across top

---

## 🎨 FAVICON / BRANDING — Per Dashboard

Backburner — needs real logo assets first.

### Plan
- /dashboard/antcpu → ANTCPU logo favicon
- /dashboard/mapofpi → Map of Pi logo favicon  
- /dashboard/user → per-user brand favicon (pull from ad_profiles)
- Requires: logo files in /public/logos/ per brand
- Each dashboard needs its own layout.tsx with metadata.icons

### Asset pipeline needed
- ANTCPU logo → /public/logos/antcpu.png
- Map of Pi logo → /public/logos/mapofpi.png
- Amanda Photography → /public/logos/amanda.png
- Generic fallback → /public/logos/arena.png

### This applies to all ANTCPU projects
- antcpu-launcher, ads, antcpu.com all need unified logo/favicon system

---

## 🪙 ANTCOIN × ADS INTEGRATION PLAN

### Click Tracking (build next)
- Table: `ad_clicks` — columns: ad_id, email, clicked_at, source
- Add `click_count` integer to `ads` table
- Every ad card click → insert to ad_clicks + increment count

### Reward Triggers (trial users)
| Clicks | Reward |
|--------|--------|
| 10 | 5 testcoin + 24hr pin |
| 25 | 15 testcoin + Rising upgrade offer |
| 50 | 50 testcoin + 48hr feature slot |
| 100 | 100 testcoin + Genesis node notification |

### Ledger Entry Format
`ad_reward · [email] · [ad_id] · [amount] testcoin`

### Pi Payments (backburner)
- Accept Pi for Rising / Featured / Top Tier membership
- Wire when Pi mainnet payments open
- Map of Pi partnership = natural first integration

### Arena Original Design
- First demo version used for Map of Pi Facebook post
- Buried in early sessions — revisit before next week with fresh eyes
- Do NOT overwrite current build — restore as reference only

### Genesis Connection
- Amanda Photography = Node 7 in antchain
- Top ad performers feed node health display
- 100 clicks from an ad = Genesis node notification trigger


---

## TODO — Profile Page Social Links

### Supabase Migration Needed
Run in SQL editor before profile social links go live:
alter table ad_profiles add column if not exists facebook text;
alter table ad_profiles add column if not exists antcoin_wallet text;

### Profile Page Updates (after migration)
- Add Facebook link — external, opens new tab
- Add antcoin wallet — truncated address, copy on click, antcoin badge
- Wire both fields into /profile/[id] display
- Wire both fields into /create-ad or profile edit form

### antcoin wallet notes
- Pi payments route through antcoin wallet
- Display format: first 6 + ... + last 4 chars
- Copy to clipboard on click
