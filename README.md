# AD Network — The Arena
> Automated marketing infrastructure for the next generation of brands.
> **Live:** [antcpu-ads.vercel.app](https://antcpu-ads.vercel.app)

---

## What It Is

ANTCPU ADS is an automated marketing network where brands enter **The Arena** —
a live, points-driven ad ecosystem powered by AI agents and antbots.

Advertisers sign up, submit their brand, and a pod of 10 specialized antbots
goes to work across every major channel: social, search, video, email,
community, and SEO. No agency. No manual posting. Just automated reach.

Each antbot pod is **dynamically built per brand** using `buildPod(ctx)` —
it knows your shop name, country, language, and audience. A coffee shop in
Nigeria gets different copy than a real estate agent in Kenya.

---

## Featured Partner

**🗺️ Map of Pi** — 2024 Pi Commerce Hackathon Winner
The world's leading Pi Network commerce platform. 2.1M+ users · 148K sellers · 173K+ transactions.

Country Champions program: claim your country, deploy 10 antbots, represent your region in the Arena.
→ [antcpu-ads.vercel.app/mapofpi](https://antcpu-ads.vercel.app/mapofpi)

---

## The Stack

| Layer         | Technology                                        |
|---------------|---------------------------------------------------|
| Framework     | Next.js 15 · App Router                           |
| Hosting       | Vercel                                            |
| Database      | Supabase                                          |
| Email         | Resend                                            |
| AI            | Gemini 2.5 Flash                                  |
| Notifications | Discord webhooks                                  |
| Analytics     | Vercel Analytics                                  |
| External      | Zapier (antbot automation bridge)                 |

---

## The Agents

The Arena runs on four AI agents plus the antbot pod system:

| Agent       | Domain                                                           |
|-------------|------------------------------------------------------------------|
| ⚡ Antbots  | 10-bot campaign pods — dynamic per brand, one bot per channel    |
| 🦋 Aria     | Ad review, copy quality, live chat at `/antbots/chat`            |
| 🔍 Scout    | Scoring, ranking, performance tracking                           |
| 📣 Herald   | Weekly digest emails, engagement nudges                          |
| 🔒 Vault    | Session auth, PIN protection                                     |

**M.A.C.** (Marketing AI Companion) is a separate product specific to
Map of Pi — lives at [chatwithmac.com](https://chatwithmac.com), powered
by Zapier. Not part of this repo.

---

## The Ladder

Brands enter at **Entry** tier and climb through engagement:
Entry → Rising → Featured → Top Tier

Points accumulate from clicks, shares, likes, boosts, and reactions.
Higher tiers unlock greater reach, priority placement, and cross-channel
distribution.

**The 1-Ad Rule:** Each user runs 1 active ad. A second ad is earned —
not given — by making the first ad competitive. This keeps Arena quality
high and rewards brands that show up and compete.

---

## Phases

| Phase                    | Status           | Trigger                     |
|--------------------------|------------------|-----------------------------|
| Phase 1 — Core Arena     | ✅ Live          | —                           |
| Phase 2 — Brand Partners | ✅ Live          | First partner onboarded     |
| Phase 2.5 — Early Adopters | 🟡 In Progress | Founding members active     |
| Phase 3 — Community      | 🟡 Triggered     | 50+ active ads ← reached    |
| Phase 4 — Monetization   | 🔜 Planned       | Community established       |
| Phase 5 — ANTCPU Cloud   | 🔜 Planned       | Multi-brand leaderboard     |

---

## Languages

The Arena is live in 8 languages:
`en` · `ar` · `zh` · `es` · `hi` · `pt` · `fr` · `it`

---

## Developer Reference

See **[DEV.md](./DEV.md)** for the full developer reference:
- Complete repository structure
- Database schema + key fields
- Agent system + antbot pod details (`buildPod(ctx)`)
- New user journey traced through real code
- Known gaps + planned pages (Ad Builder, Approval Queue)
- Build philosophy: Document before build. Build after document.

See **[ROADMAP.md](./ROADMAP.md)** for phase-by-phase feature tracking.

See **[COMMUNITY.md](./COMMUNITY.md)** for community standards and the 1-Ad Rule.

---

## Contributing

This project is in active development. Contributions are not open yet.

If you're a developer interested in joining the build when the time comes,
watch this repo. Phase 4 is when the door opens.

---

*Built by Antony Ciccone · ANTCPU · Veteran-owned*
*[antcpu.com](https://antcpu.com) · [antcpu-ads.vercel.app](https://antcpu-ads.vercel.app)*
