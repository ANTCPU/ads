# ADS — ARENA LIBRARY
> Single source of truth. Updated: 2026-05-31 (end-of-month audit)
> Maintained by: Antony Ciccone · antcpu@gmail.com

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
|---10---|--Y--|----Y---|

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
| FREETRIAL | trial | 90|


### Phase — Scale
- [ ] Per-client antbot tasks (dynamic)
- [ ] antcpu.cloud public leaderboard
- [ ] Invite link system
- [ ] Approval queue per client



## 📋 RULES

- KB files = public brand only. No internal build details.
- Deploy sparingly — batch changes, test locally first.
- Current workflow state is source of truth — always verify before modifying.
- Nothing goes live without admin approval.

---

## 🌍 I18N —  LANGUAGE LAUNCH (2026-05-16)

| Locale | URL | Status |
|--------|-----|--------|
| English | antcpu-ads.vercel.app | ✅ live |
| Arabic | antcpu-ads.vercel.app/ar | ✅ live · RTL |
| Chinese | antcpu-ads.vercel.app/zh | ✅ live |
| Spanish | antcpu-ads.vercel.app/es | ✅ live |
| Hindi | antcpu-ads.vercel.app/hi | ✅ live |
| Portuguese | antcpu-ads.vercel.app/pt | ✅ live |
| French | antcpu-ads.vercel.app/fr | ✅ live |
| Italian | antcpu-ads.vercel.app/it | ✅ live |

- Translation files: `app/lib/i18n/[locale].ts`
- Switcher: `app/components/LanguageSwitcher.tsx`
- Arabic uses `ar.ts` with `rtl: 'true'` flag — engine sets `dir="rtl"`
- All 8 locales registered in `app/lib/i18n/index.ts`
