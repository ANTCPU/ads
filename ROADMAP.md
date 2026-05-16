# ANTCPU ROADMAP — June / July 2026
> Author: Antony Ciccone · antcpu@gmail.com
> Goal: DEMO READY across all platforms by August 1, 2026
> Genesis Block #0 seals: August 10, 2026 (86 days)
> Last updated: 2026-05-16

---

## 🎯 MISSION

By August 1 every platform must be demo-ready:
- antcpu-ads.vercel.app — live ad network, paying users, real tiers
- antcpu.com/cloud — live agency page, applications flowing
- antcpu.com/edu — classes live, teachers onboarded, first students
- antchain.vercel.app — wallets growing, nodes seeded, funding started
- antcpu.com/live.html — daisy chain fully updated, all nodes v0.3+
- antcpu.com (main) — agent pages all live, no 404s

---

## 📅 MAY 2026 — CLIENT SPRINT (2 weeks left)
> Primary objective: Map of Pi client deliverables

### Week of May 16
- [x] 8-language launch — ADS platform (en/ar/zh/es/hi/pt/fr/it)
- [x] Arabic bilingual email sent to Mohammed
- [ ] Mohammed's ad title fixed (currently wrong — "ANTCPU Ad Network is coming in hot")
- [ ] Mohammed's ad approved → active
- [ ] Map of Pi featured partner section — cutting edge update
- [ ] Dashboard + Arena multi-language pass

### Week of May 19–31
- [ ] antcpu EDU documented — 26 classes live, teach page live, classroom page live
- [ ] Antcoin v0.5 — working mainnet demo
- [ ] antchain.vercel.app — wallet creation flow working end to end
- [ ] SFTP config saved to ~/.ssh/config — never lose again
- [ ] Agent pages — Scout, Vault, Forge deployed to Ionos (3 of 6 still 404)
- [ ] live.html → v0.3, next field updated

---

## 📅 JUNE 2026 — SPRINT 1 (June 1–14)
> Theme: Monetization + Auth

### ADS Platform
- [ ] PayPal integration — $9.99/mo payment live
- [ ] Supabase Auth — replace localStorage
- [ ] Trial expiry enforcement — 3-day gate
- [ ] Rising tier unlock — payment required
- [ ] Click + impression tracking live on all ad cards
- [ ] /dashboard/leaderboard — points system fully wired
- [ ] Rewards page — ad performance per user
- [ ] Share tracking — referral param on every ad link

### Antcoin
- [ ] Antcoin v0.5 — mainnet working demo
- [ ] Wallet creation flow — end to end
- [ ] First real wallet seeded (non-genesis)
- [ ] antchain.vercel.app — sign in + create account fully working
- [ ] Genesis funding tracker — wire to real payment

### EDU
- [ ] Classroom page live — antcpu.com/edu/classroom
- [ ] First teacher onboarded
- [ ] Course content — at least 1 full CPU course ready
- [ ] Discord integration — class announcements

---

## 📅 JUNE 2026 — SPRINT 2 (June 15–30)
> Theme: Agent Network + Content

### Agent System
- [ ] Scout, Vault, Forge — deployed to Ionos (antcpu.com/scout, /vault, /forge)
- [ ] All 6 agent pages live — zero 404s
- [ ] signal_gate — skip tasks with signal < 500 chars
- [ ] agent-convo.js — centralized conversation engine
- [ ] antai-gate.js — RAM context injection
- [ ] Auto morning report — 8am → Discord

### ADS Platform
- [ ] Herald email digest — weekly send scheduled via cron
- [ ] Agent auto-triggers — behavior-based notifications
  - No ad after 24hrs → Aria fires
  - No referral after 3 days → Herald fires
  - Weekly → Scout fires stats to all active users
- [ ] User PIN flow — users set own PIN on signup
- [ ] Drawer component — role-aware slide out (admin/team/user/mod)
- [ ] Mobile polish pass

### antcpu.com
- [ ] All daisy chain nodes → v0.3
- [ ] live.html next field updated — accurate
- [ ] resend-route.js + server-routes.js — remove from public Ionos root (security)
- [ ] car_workshop.zip + manda.zip + fc.zip — remove (30MB freed)

---

## 📅 JULY 2026 — SPRINT 3 (July 1–14)
> Theme: Scale + Demo Polish

### ADS Platform
- [ ] Video ad format — Featured tier
- [ ] Forge upgrade flow — Rising tier payment wired
- [ ] Featured page — antcpu.com/featured
- [ ] Platform share webhook — when ad posted externally
- [ ] Worker run results page — scoped summaries
- [ ] Agency dashboard — cross-platform performance
- [ ] antcpu.io — automation entry point for Cloud applicants

### Antcoin
- [ ] Genesis wallets — target 10/100 by July 1
- [ ] Genesis nodes — target 2/10 by July 1
- [ ] Genesis funding — target $100/$1,000 by July 1
- [ ] VAULT security upgrade — before any real ANT movement
- [ ] First live antcoin transaction — agent task → approve → 1 ANT reward

### EDU
- [ ] Live sessions schedule — July weekly cadence
- [ ] 3 teachers onboarded minimum
- [ ] Student enrollment flow — email capture → Discord invite
- [ ] antcpu.com/edu/classroom — live session room

---

## 📅 JULY 2026 — SPRINT 4 (July 15–31)
> Theme: Demo Ready — Final Polish

### All Platforms
- [ ] Full demo script written — 10 min walkthrough all platforms
- [ ] All pages mobile responsive
- [ ] All 404s resolved
- [ ] All version tags current
- [ ] OG images on all pages
- [ ] Analytics confirmed live — page_views accumulating

### ADS Demo Checklist
- [ ] Live paying user (not admin)
- [ ] Ad going through full lifecycle — submit → approve → active → tier climb
- [ ] Leaderboard showing real data
- [ ] Share tracking working
- [ ] Mobile experience clean

### Antcoin Demo Checklist
- [ ] Genesis block progress visible — wallets/nodes/funding non-zero
- [ ] Wallet creation working live
- [ ] 1 ANT transaction on record
- [ ] antchain.vercel.app — full sign in + dashboard working

### EDU Demo Checklist
- [ ] At least 1 class with real content
- [ ] Teacher application flow working
- [ ] Student can enroll and access content
- [ ] Live session scheduled

### antcpu.com Demo Checklist
- [ ] All 6 agent pages live
- [ ] Daisy chain all green
- [ ] live.html accurate and current
- [ ] No exposed server files

---

## ⛓ DAISY CHAIN STATUS (2026-05-16)

| Node | File | Version | Status |
|------|------|---------|--------|
| 1 | antcpu.com/live.html | v0.2 | 🔴 stale — update to v0.3 |
| 2 | antcpu.com/antcoin/live1.html | v0.4 | ✅ current |
| 3 | antcpu.com/cloud/live2.html | v1.0.0 | 🔴 update to v0.3 |
| 4 | antcpu.com/turtle/live3.html | v1.0.0 | 🔴 update to v0.3 |
| 5 | antcpu.com/edu/live4.html | v1.0.0 | 🟡 update to v0.3 |
| 6 | antcpu.com/AI/live5.html | v1.0.0 | 🔴 update to v0.3 |
| 7 | antcpu.com/TV/live6.html | unknown | ⚪ check |

---

## 🌍 LIVE PLATFORMS (2026-05-16)

| Platform | URL | Status | Version |
|----------|-----|--------|---------|
| ADS Arena | antcpu-ads.vercel.app | ✅ live | 8 languages |
| Cloud | antcpu.com/cloud | ✅ live | — |
| EDU | antcpu.com/edu | ✅ live | v1.0.1 · 26 classes |
| EDU Teach | antcpu.com/edu/teach | ✅ live | — |
| Antcoin | antcpu.com/antcoin | ✅ live | v0.4 |
| AntChain | antchain.vercel.app | ✅ live | Mainnet v1 |
| Main Site | antcpu.com | ✅ live | — |
| Pi Testnet | auth-antcpu.vercel.app | ✅ live | — |
| Intro to Pi | introtopi.com | ✅ live | — |
| Aria | antcpu.com/aria | ✅ live | — |
| Herald | antcpu.com/herald | ✅ live | — |
| Ledger | antcpu.com/ledger | ✅ live | — |
| Scout | antcpu.com/scout | ❌ 404 | — |
| Vault | antcpu.com/vault | ❌ 404 | — |
| Forge | antcpu.com/forge | ❌ 404 | — |

---

## 💰 PRICING LADDER

| Tier | Price | Status |
|------|-------|--------|
| Trial | Free · 3 days | ✅ live |
| Arena | $9.99/mo | ✅ live · payment not wired |
| Pro | $27/mo | 🔒 coming soon |
| Deluxe | $79/mo | 🔒 coming soon |
| Cloud | $20+/mo | ✅ apply form live |

---

## 🪙 ANTCOIN PHASE GATES

| Phase | Condition | Status |
|-------|-----------|--------|
| 1 — YELLOW | System building, no coin movement | NOW |
| 2 — GREEN | First real API call confirmed end-to-end | pending |
| 3 — LIVE | Agent task → human approve → 1 ANT reward fires | pending |
| 4 — MAINNET | After Genesis Block Aug 10, 2026 | pending |

---

## 🏆 GENESIS COUNTDOWN

- Block #0 seals: **Aug 10, 2026** (86 days)
- Block #1 seals: Dec 23, 2026
- Supply: 1,000,000 ANT minted · 500 allocated to Amanda
- Wallets: 0/100 · Nodes: 0/10 · Funding: $0/$1,000

---

*Built by Antony Ciccone · ANTCPU · Thomasville, NC*
*Veteran-owned · antcpu.com · antcpu.io*
