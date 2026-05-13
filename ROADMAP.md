# ANTCPU ADS — Roadmap & Ideas Log
*Last updated: 2026-05-13*

---

## 🏗 Phase 1 — Current Build (Live)

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

---

## 📋 Ad Format Progression

### Level 1 — Plain Text (current)
- Headline + Body + Hashtags
- No emojis, no URL
- Clean, professional, high bar from day one

### Level 2 — Plain Text + URL
- Pulls OG image automatically from URL
- Higher trust signal
- Platform dependent (Twitter, LinkedIn, Facebook)

### Level 3 — Emoji Upgrade (Aria reward)
- Aria selects performing ads for a free emoji upgrade
- 1 step forward — feels earned not bought
- Notifies user: "Your ad has been selected for a free upgrade"
- Builds loyalty + engagement loop

### Level 4 — Image Ads (v2)
- Mapofpiv2.jpg style — image + text
- Ad preview mockup ready now as marketing asset
- Builder upgrade when ready

---

## 🤖 Aria — Ad Intelligence

- Reviews every new ad on submission
- Selects performing ads for free emoji upgrade
- Notifies user when ad is upgraded
- Future: worldwide marketing insights layer
- Future: ad performance scoring
- Future: suggested improvements per ad

---

## 🔗 Sharing System

### Current
- Copy to clipboard → button turns to checkmark ✅
- Mobile user knows it's safe to leave
- Plain text post ready for any platform

### Next
- Native Share API → stay in network priority
- Platform-specific post formatter (Twitter, LinkedIn, Facebook, Instagram)
- Share tracking → points awarded on share
- Referral link sharing → promo code embedded

---

## 🏆 Rewards + Competition

### Points Engine
- Click = points
- Share = points
- Referral signup = points
- Emoji upgrade = milestone reward
- Points move ad up the Arena

### Leaderboard
- Friendly competition between brands
- Top performers get featured placement
- Recognition + exclusive rewards as system grows
- Worldwide marketing insights feed into rankings

### Aria Rewards
- Free emoji upgrade for performing ads
- "Your ad has been selected" notification
- Simple 1-step progression — earned not paid

---

## 🔐 Two-Factor Profile + PIN System

- PIN set in user profile
- Used to unlock protected actions:
  - Upgrade membership tier
  - Publish ads
  - Access team sections
- Not a full page lock — targeted protection only
- Notifications tied to profile
- Alert on: ad clicks, new members, tier changes

---

## 👥 Team + Brand Showcase

- Each brand gets a dedicated Arena page `/arena/[slug]`
- Team page per member
- Brand images stored in `/public/brands/[brand]/`
- Image ad preview as marketing asset (not live yet)
- Team dashboard = brand builder + social post builder

---

## 📱 Brand Builder Flow (per brand dashboard)

1. Text Ad Builder → creates/replaces arena ad
2. Social Post Builder → platform-ready copy
3. Ad Preview → shows ad as it will appear
4. Quick actions:
   - New post → copy → checkmark → safe to leave
   - New arena ad → replaces underperforming existing ad
5. Future: native share → stay in network

---

## 🌍 Worldwide Marketing Insights

- Intelligence layer behind all ad decisions
- Feeds into Aria recommendations
- Informs tier upgrades and rewards
- Regional performance data
- Future: dashboard view per brand

---

## 📄 Pages Still to Build

| Page | Notes |
|---|---|
| `/tos` | Terms of Service — worldwide compliant |
| `/privacy` | Privacy Policy — worldwide compliant |
| `/` | Community hub redesign — welcoming, arena feed visible |
| `/dashboard/antcpu` | ANTCPU brand builder |
| `/leaderboard` | Public leaderboard — friendly competition |

---

## 🖼 Assets Ready

| File | Location | Status |
|---|---|---|
| `map-of-pi-logo.png` | `/public/brands/mapofpi/` | ✅ Live |
| `Mapofpiv2.jpg` | `/public/brands/mapofpi/` | ✅ Ready — image ad marketing asset |
| `amandaphotographylogo.png` | `antcpu.com/drive/` | ✅ Live |

---

## 📸 Screenshots Needed (for /about placeholders)

- Step 1 → Sign up form
- Step 2 → Ad builder (take during Map of Pi ad build)
- Step 3 → Arena feed with live ads

---

## 💡 Key Principles

- **$9.99 is not paying for ad performance — it's paying for the brand building system**
- **Quality of what gets built is the product**
- **High bar from day one — plain text, no emojis until earned**
- **Sharing = staying in network is a priority**
- **Aria upgrades feel like rewards, not upsells**
- **Simple 1-step progressions build worldwide marketing insights**

---

*This file is updated as ideas are confirmed. Nothing in here is built until it appears in the codebase.*
