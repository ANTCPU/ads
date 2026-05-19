# ANTCPU ADS — Roadmap & Ideas Log
*Last updated: 2026-05-13*
*PRIVATE — never push to repo*

---

## ✅ Built & Live

- Text ad builder → arena ad
- Social post builder → copy for platforms
- Ad preview (text, image-ready for v2)
- Promo code system → referral + points
- Arena feed → all active ads
- Tier system → Entry, Rising, Featured, Top Tier
- Click tracking → Supabase
- ArenaNav → About, Teams group, Return to Admin
- Auth guards → per dashboard
- 1 active ad per user in Phase 1
- /about page → 3 steps, arena, promo, rewards, screenshot placeholders
- /arena/mapofpi → light green theme, correct logo, hero image
- /dashboard/user → clean hub, 1 active ad, arena feed, referral code
- Brand images → /public/brands/mapofpi/

---

## 🔨 To Build — Confirmed

### Pages
- `/tos` — Terms of Service, worldwide compliant
- `/privacy` — Privacy Policy, worldwide compliant
- `/` — Community hub redesign, welcoming, arena feed visible
- `/dashboard/antcpu` — ANTCPU brand builder
- `/leaderboard` — public leaderboard, friendly competition

### Arena
- Fix /arena/mapofpi logo — still showing old Amanda URL on live site
- Seed Map of Pi text ad via ad builder
- Arena page for photography brand

### Ad Format Progression
Level 1 — Plain text (current)
  - Headline + Body + Hashtags
  - No emojis, no URL
  - High bar from day one

Level 2 — Plain text + URL
  - Pulls OG image automatically
  - Platform dependent

Level 3 — Emoji upgrade (Aria reward)
  - Aria selects performing ads for free emoji upgrade
  - Notifies user: "Your ad has been selected for a free upgrade"
  - Earned not bought — builds loyalty

Level 4 — Image ads (v2)
  - Mapofpiv2.jpg ready as marketing asset
  - Builder upgrade when ready

### Sharing System
Current:
  - Copy to clipboard → button turns checkmark ✅
  - Mobile user knows safe to leave

Next:
  - Native Share API → stay in network priority
  - Platform-specific post formatter (Twitter, LinkedIn, Facebook, Instagram)
  - Share tracking → points awarded on share
  - Referral link sharing → promo code embedded

### Aria — Ad Intelligence
- Reviews every new ad on submission
- Selects performing ads for free emoji upgrade
- Notifies user when ad is upgraded
- Future: worldwide marketing insights layer
- Future: ad performance scoring
- Future: suggested improvements per ad

### Two-Factor Profile + PIN System
- PIN set in user profile
- Unlocks: upgrade tier, publish ads, team sections
- Not a full page lock — targeted protection only
- Notifications tied to profile
- Alerts: ad clicks, new members, tier changes

### Rewards + Competition
- Points: click, share, referral signup, emoji upgrade milestone
- Leaderboard: friendly competition, top performers featured
- Aria rewards: free emoji upgrade, "selected" notification
- Worldwide marketing insights feed into rankings

### Brand Builder Flow (per brand dashboard)
1. Text Ad Builder → creates/replaces arena ad
2. Social Post Builder → platform-ready copy
3. Ad Preview → shows ad as it will appear
4. Quick actions:
   - New post → copy → checkmark → safe to leave
   - New arena ad → replaces underperforming existing ad
5. Future: native share → stay in network

### Worldwide Marketing Insights
- Intelligence layer behind all ad decisions
- Feeds into Aria recommendations
- Informs tier upgrades and rewards
- Regional performance data
- Future: dashboard view per brand

---

## 🖼 Assets Ready

| File | Location | Status |
|---|---|---|
| map-of-pi-logo.png | /public/brands/mapofpi/ | ✅ Live |
| Mapofpiv2.jpg | /public/brands/mapofpi/ | ✅ Ready — image ad marketing asset |
| amandaphotographylogo.png | antcpu.com/drive/ | ✅ Live |

---

## 📸 Screenshots Needed (for /about placeholders)
- Step 1 → sign up form
- Step 2 → ad builder (take during Map of Pi ad build)
- Step 3 → arena feed with live ads

---

## 💡 Key Principles
- $9.99 is not paying for ad performance — it's paying for the brand building system
- Quality of what gets built is the product
- High bar from day one — plain text, no emojis until earned
- Sharing = staying in network is a priority
- Aria upgrades feel like rewards, not upsells
- Simple 1-step progressions build worldwide marketing insights
- The arena is where ads live and compete — dashboard is the builder
- Community hub (/) = welcoming, not commanding


---

## 📦 Built in Earlier Sessions (from git log)

### Components
- Pill, SectionHeader, Card — shared UI components
- AdminBar — admin pills component
- ArenaNav — white nav, white dropdown, all admin links

### Auth + Login
- PIN login → admin env var
- Admin PIN redirects to /dashboard/user
- Post-signup share screen
- Sign-in flow with referral code support

### Profile
- /profile — view + edit mode
- Bio edit, social fields seeded
- Ad preview in profile
- Profile persistence in OnboardingTracker
- Profile share button

### Arena
- Sticky join CTA on arena
- Share ad uses category hashtags
- Share button on arena ad cards — copies post text
- Arena card hierarchy with sample ads

### Ad Creation
- /create-ad — slim signup step 1
- Tier layout in dashboard

### Admin
- /dashboard/admin hub
- Click tracking card in admin
- /dashboard/users — white cards, expand rows

### Map of Pi
- v0.5 demo build — green/gold branding
- Post builder green/gold branding, quick copy mode
- Logo, branded image prompt
- Dashboard facelift

### API + Infrastructure
- Full staging sync — API routes, middleware
- Doorbell API → page visit tracking
- Vercel.json clean config
- Supabase — ad_signups, ads, ad_clicks, ad_profiles tables


---

## 🕳 Gaps — Discussed But Not Yet Captured

### Map of Pi Ad Copy (ready to seed)
Headline: Map of Pi — Version 2 is Coming 🗺️
Body: 2.1M+ users. 148K sellers. 173K+ transactions. The Pi Network
community is building real commerce — and Map of Pi is leading the way.
Version 2 makes finding shops easier than ever. Trust built one review
at a time. 2024 Pi Commerce Hackathon Winner.
Hashtags: #mapofpi #pinetwork #picommerce #buildinpublic #web3
Status: approved, ready to seed via ad builder

### Ad Quality = Marketing Asset
- Mapofpiv2.jpg + seeded text ad = pre-built marketing material
- Used to screenshot features being built
- Image + text preview = v2 image ad marketing asset
- Text ad seeded now = tomorrow's post ready

### Brand Arena Fix Needed
- /arena/mapofpi still showing Amanda logo URL on live site
- Needs logo fix before Mohamed uses it

### Navigation — Home Page
- Home page nav has no About link yet
- No Teams dropdown on public home page
- ArenaNav has it but home page is separate component

### Session Drift — Root Cause
- /dashboard/mapofpi had no auth guard → auto-logged as Mohamed
- Fixed with guard but needs testing
- Return to Admin button added to ArenaNav dropdown

### Doorbell → Supabase
- Currently fires but may not be persisting
- Needs verification that visits are landing in Supabase

### /dashboard/antcpu
- ANTCPU brand builder not built yet
- Linked in ArenaNav Teams group but page does not exist
- Will 404 if clicked

### TOS + Privacy
- Linked from /about footer
- Both pages 404 currently
- Need worldwide compliant versions

