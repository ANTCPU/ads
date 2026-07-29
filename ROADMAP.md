# ⚡ AD Network — Roadmap

> This is a living document. Phases unlock based on real milestones, not timelines.
> See DEV.md for the full technical reference.

---

## Phase 1 — Core Arena ✅ Live

The foundation. A working ad network with real scoring, real reach, and real brands.

- Live ad network with points-based ranking
- 10-antbot campaign pods per brand (`buildPod()` — dynamic per brand context)
- AI agents: Aria (review + chat), Scout (scoring), Herald (email), Vault (auth)
- 8-language support
- Role-based dashboard system (super / admin / team / user)
- Admin dashboard + user dashboard + brand dashboards
- Discord real-time notifications on all key events
- Supabase-backed data layer with RLS
- PIN authentication system for returning users
- IP geolocation capture at signup (country, city, region)
- `/api/doorbell` visit tracking on key pages
- `/api/agent` Zapier bridge endpoint (GET snapshot + POST actions)
- Aria live chat at `/antbots/chat` — powered by Gemini 2.5 Flash

---

## Phase 2 — Brand Partners ✅ Live

The first external brand joins the Arena with a dedicated onboarding flow.

- Brand-aware login skins via promo codes (`getBrandConfig()`)
- Country Champion program (Map of Pi) — 80+ countries supported
- 6-step shop builder with AI description hints
- `buildPod(ctx)` — dynamic antbot pods per champion (shop, country, language)
- Champion welcome email via `/api/send-module` (tier ladder, points guide, share link)
- Partner splash pages with video carousel
- `/mapofpi/icons/arena` — Country Champions icon arena
- M.A.C. — Map of Pi AI companion at chatwithmac.com (Zapier-powered, separate product)
- `ad_profiles` table — public brand profile pages at `/profile/[id]`
- Short share links at `/s/[id]`

---

## Phase 2.5 — Early Adopter Program 🟡 In Progress

Rewarding the brands that showed up before the crowd.

- **Indefinite trial extension** for founding members — no expiry until paid tiers launch
- **Early adopter badge** — visible on dashboard and Arena ad cards
- **Weekly Herald digest** — `/api/send-weekly` is built and ready, needs cron trigger
- **Trial status display** — show users their current status in the dashboard
- **Country Champion email onboarding** — wire `send-module` to `create-shop-ad` wizard
- **Ad Builder page** — `/ad-builder` dedicated creative workspace (see DEV.md)
- **Approval Queue page** — `/dashboard/review` dedicated admin review interface (see DEV.md)

---

## Phase 3 — Community 🟡 Triggered

The Arena becomes self-governing. **Trigger reached: 50+ active ads.**

- Moderator role system (role infrastructure already exists — add `moderator`)
- Community flag + review flow
- 72-hour response window for flagged ads
- Community vote on unresolved flags
- Mod assignment via admin dashboard
- `/dashboard/review` approval queue (documented in DEV.md — build here)

---

## Phase 4 — Monetization 🔜

The Arena becomes a real business. Planned trigger: **Community established.**

- Rising, Featured, Top Tier paid upgrades
- Stripe or Pi Network payment integration
- Brand operator accounts — dedicated dashboards per partner
- Referral reward system (codes exist, reward logic needed)
- Second-ad unlock — earn a second ad slot through engagement (1-ad rule upgrade path)
- Ledger billing panel

---

## Phase 5 — ANTCPU Cloud 🔜

The Arena goes public as a platform. Planned trigger: **Multi-brand leaderboard ready.**

- Public cross-brand leaderboard
- antcpu.com/cloud — proof of work is public
- Open contributor program (Phase 4 is when the door opens)
- API access for brand integrations

---

## What We Don't Do

- No pay-to-win ranking — points are earned, not bought
- No black-box algorithms — the scoring formula is documented
- No data selling — user data stays in the Arena
- No lock-in — cancel anytime, export your data

---

*Last updated: July 2026*
*Built by Antony Ciccone · ANTCPU*
