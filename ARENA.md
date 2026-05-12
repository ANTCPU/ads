# ANTCPU ADS — ARENA LIBRARY
> Single source of truth. Updated: 2026-05-11
> Maintained by: Antony Ciccone · antcpu@gmail.com

---

## 🌐 KEY URLS

| | URL |
|-|-----|
| Live | https://antcpu-ads.vercel.app |
| Supabase | https://supabase.com/dashboard/project/yeadfwqjoyemcjshydgj |
| Local | http://localhost:3001 |
| Discord webhook | active — fires on every signup |
| Resend | active — welcome email on every new signup |

---

## 👥 USERS

| Name | Email | Brand | Status | Code |
|------|-------|-------|--------|------|
| Antony Ciccone | antcpu@gmail.com | ANTCPU | team | MAPOFPI |
| Mohamed Elshoshani | melshoshani@gmail.com | Map of Pi | team | MAPOFPI |
| Amanda (team) | amanda@antcpu.com | Amanda Photography | team | MAPOFPI |
| Amanda Mishoe | Mishoemanda@gmail.com | Amanda Photography | arena | — |
| Test User | test@antcpu.com | Test Brand | trial | FREETRIAL |

---

## 🗄️ SUPABASE SCHEMA

### ad_signups
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | gen_random_uuid() |
| name | text | |
| email | text | |
| brand_name | text | |
| website_url | text | |
| ad_category | text | |
| has_used_ad_service | boolean | default false |
| previous_ad_service | text | |
| promo_code | text | |
| message | text | |
| status | text | pending / trial / arena / team |
| trial_days | integer | default 3 |
| trial_expiry | text | |
| country | text | from getLocation() |
| city | text | from getLocation() |
| region | text | from getLocation() |
| ip | text | from getLocation() |
| points | integer | default 0 |
| created_at | timestamp | now() |

### ads
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | gen_random_uuid() |
| email | text | |
| name | text | |
| brand | text | |
| title | text | |
| url | text | |
| description | text | |
| category | text | |
| status | text | pending_review / active |
| trial_status | text | |
| tier | text | entry / rising / featured / top_tier |
| pinned | boolean | default false |
| promo_code | text | default FREETRIAL |
| points | integer | default 0 |
| created_at | timestamp | now() |

### Missing — build next
- ad_profiles: id, email, name, brand, bio, website, contact, facebook, antcoin_wallet
- ad_clicks: id, ad_id, email, clicked_at, source
- payments: id, email, paypal_order_id, plan, amount, status, created_at

---

## 🏆 TIER SYSTEM

| Tier | Points | Price |
|------|--------|-------|
| Entry | 0 | Free trial / $9.99/mo |
| Rising | 100 | TBD |
| Featured | 300 | Weekly competition win |
| Top Tier | 750 | antcpu.com/cloud · invite only |

---

## 🤖 AGENTS

| Agent | Role | Status |
|-------|------|--------|
| Aria 🦋 | Ad reviewer | Active |
| Scout 🔍 | Scoring + notifications | Built — /api/scout/* |
| Herald 📣 | Weekly email digest | Phase 2 |
| Forge ⚙️ | Ad builder assistant | Phase 2 |
| Vault 🔒 | Account protection | Phase 2 |

---

## 📄 PAGES

| Route | Who | Status |
|-------|-----|--------|
| / | Everyone | ✅ |
| /login | Signup + signin | ✅ |
| /create-ad | Ad submission | ✅ |
| /dashboard | Admin only | ✅ |
| /dashboard/user | All users | ✅ |
| /dashboard/users | Admin | ✅ |
| /dashboard/agents | Admin | ✅ |
| /dashboard/antcpu | ANTCPU antbot pod | ✅ |
| /dashboard/mapofpi | Map of Pi antbot pod | ✅ |
| /dashboard/new | Admin — new client | ✅ |
| /dashboard/leaderboard | All users | ❌ Not built |
| /profile/[id] | Public brand profile | ✅ |
| /profile | Profile editor | ✅ |
| /api/scout/score | Scout scoring | ✅ |
| /api/scout/notify | Scout notifications | ✅ |
| /api/send-welcome | Welcome email | ✅ |

---

## 🔧 PIPELINE

1. Signup → Supabase insert (new) or update location (returning)
2. Discord webhook fires
3. Resend welcome email sent
4. Ad submitted → pending_review
5. Admin approves → active → Scout scores → notify user
6. Points accumulate → tier upgrades → leaderboard

---

## 🔑 PROMO CODES

| Code | Status | Days |
|------|--------|------|
| MAPOFPI | team | 90 |
| FREETRIAL | trial | 3 |

---

## 🚧 BUILD QUEUE

### This batch
- [ ] /dashboard/leaderboard
- [ ] Test mode banner on /dashboard/user
- [ ] Wire approveAd() → Scout score API
- [ ] ad_profiles table + facebook + antcoin_wallet columns
- [ ] ads click_count column

### Phase 2 — Monetization
- [ ] PayPal integration
- [ ] payments table
- [ ] Trial expiry enforcement
- [ ] Supabase Auth (replace localStorage)

### Phase 3 — Tiers
- [ ] Rising tier — Photography API (Amanda)
- [ ] Featured tier — Video ad format
- [ ] Top Tier — antcpu.com/cloud

### Phase 4 — Scale
- [ ] Per-client antbot tasks (dynamic)
- [ ] antcpu.com/cloud public leaderboard
- [ ] Invite link system
- [ ] Approval queue per client

---

## 🪙 ANTCOIN × ADS

| Clicks | Reward |
|--------|--------|
| 10 | 5 testcoin + 24hr pin |
| 25 | 15 testcoin + Rising upgrade offer |
| 50 | 50 testcoin + 48hr feature slot |
| 100 | 100 testcoin + Genesis node notification |

---

## 📋 RULES

- KB files = public brand only. No internal build details.
- Deploy sparingly — batch changes, test locally first.
- Current workflow state is source of truth — always verify before modifying.
- Nothing goes live without admin approval.
