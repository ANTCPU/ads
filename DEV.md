# ⚡ DEV.md — ANTCPU ADS

*September 2026 · antcpu-ads.vercel.app · github.com/ANTCPU/ads*

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

|
 What you're touching        
|
 File                                              
|
|
-----------------------------
|
---------------------------------------------------
|
|
 Main Arena feed             
|
`app/arena/ArenaUniversalClient.tsx`
|
|
 Brand arena (slug)          
|
`app/arena/[slug]/ArenaClient.tsx`
|
|
 Scoring engine              
|
`app/api/scout/score/route.ts`
|
|
 Ad approval + management    
|
`app/dashboard/antcpu/page.tsx`
 ⚠️ gated         
|
|
 Agent pipeline + Herald     
|
`app/dashboard/agents/page.tsx`
|
|
 Module system               
|
`app/modules/index.ts`
 + 
`app/modules/types.ts`
|
|
 Module flag-gating          
|
`app/components/ModuleSlots.tsx`
|
|
 Discord notifications       
|
`app/lib/discord.ts`
|
|
 Share logic                 
|
`app/lib/socialShare.ts`
|
|
 Tracking (clicks/shares)    
|
`app/lib/tracking/index.ts`
 ← directory, not file 
|
|
 Session auth                
|
`app/lib/session.ts`
 + 
`app/api/user-auth/`
|
|
 Profile pages               
|
`app/profile/[id]/ProfileClient.tsx`
|
|
 Short links                 
|
`app/s/[id]/`
|
|
 Feature flags               
|
`app/lib/flags.ts`
|
|
 Agent registry              
|
`app/lib/agents.ts`
|
|
 Ad review logic             
|
`app/lib/aria.ts`
|
|
 Badge registry + awards     
|
`app/lib/badges.ts`
|
|
 Membership tiers            
|
`app/lib/membership.ts`
|
|
 Locale / i18n helpers       
|
`app/lib/locale.ts`
|
|
 Weekly digest cron          
|
`app/api/send-weekly/route.ts`
 + 
`vercel.json`
|

---

## Database — Tables That Matter

|
 Table             
|
 What it holds                                        
|
|
-------------------
|
------------------------------------------------------
|
|
`ads`
|
 Every ad — all statuses                              
|
|
`ad_signups`
|
 Every user — all roles                               
|
|
`ad_profiles`
|
 Brand bio + social links (optional per user)         
|
|
`ad_clicks`
|
 Click events                                         
|
|
`ad_shares`
|
 Share events                                         
|
|
`ad_reactions`
|
 Reaction events (hot / watching / interesting)       
|
|
`brand_config`
|
 Brand image + color overrides                        
|
|
`arena_modules`
|
 Module slot config per user/slug — currently empty   
|
|
`user_badges`
|
 Badge awards per user — all 18 badge types           
|
|
`notifications`
|
 In-app envelope — Herald writes here                 
|
|
`ledger`
|
 antcoin + samplecoin transactions (genesis: Apr 2026)
|
|
`challengers`
|
 Internship challenge participants                    
|
|
`bookings`
|
 Session booking requests                             
|

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
Flag-gating: `app/components/ModuleSlots.tsx` — reads from `app/lib/flags.ts`

Each module receives `ModuleContext` — `slug`, `user`, `ads`, `supabase`, `isSuper`.
Toggling a flag off in the DB hides the module from the picker and renders it as an empty slot — no deploy needed.

|
 Module         
|
 Tier     
|
 Flag ID                  
|
 Notes                                        
|
|
----------------
|
----------
|
--------------------------
|
----------------------------------------------
|
|
`share`
|
 trial    
|
`module-share`
|
 Platform grid + Discord notify               
|
|
`archive`
|
 trial    
|
`module-archive`
|
 All archived ads, all brands, collapsed      
|
|
`leaderboard`
|
 trial    
|
`module-leaderboard`
|
 Top performing ads                           
|
|
`create-ad`
|
 trial    
|
`module-create-ad`
|
 Ad creation form                             
|
|
`posts`
|
 standard 
|
`module-posts`
|
 Brand posts                                  
|
|
`region-map`
|
 basic    
|
`module-region-map`
|
 Live signup regions                          
|
|
`campaign-hub`
|
 basic    
|
`module-campaign-hub`
|
 Active campaigns by tier                     
|
|
`schedule`
|
 standard 
|
`module-schedule`
|
 Ad activity by day                           
|
|
`chat`
|
 standard 
|
`module-chat`
|
 Aria chat — unlocks at 10pts                 
|
|
`video-feed`
|
 premium  
|
`module-video-feed`
|
 v2 — not built                               
|
|
`youtube-live`
|
 premium  
|
`module-youtube-live`
|
 v2 — not built                               
|

`arena_modules` table exists but is empty — module slots are code-driven for now.

---

## Feature Flags

File: `app/lib/flags.ts`
Panel: `/dashboard/antcpu` → Arena Flags card

DB rows override code defaults instantly — no deploy needed.
`resolveFlag(id, dbFlags)` — DB first, code fallback.
`getFlags()` — async runtime fetcher, cached per session.
`isEnabled(flags, id)` — default true if flag not in DB.

Versions: `beta` · `v1` · `v1testing` · `v2` · `v2testing`
Statuses: `on` · `off` · `testing` · `killed`

---

## Agents

File: `app/lib/agents.ts` — registry, identities, `ARENA_CONTEXT`, `buildAgentPrompt`
Flag map: `app/lib/flags.ts` — `AGENT_FLAG_MAP`, `agentEnabled()`
Dashboard: `app/dashboard/agents/page.tsx` — Herald + Notif Log + registry

|
 Agent    
|
 Icon 
|
 Flag              
|
 Role                                        
|
|
----------
|
------
|
-------------------
|
---------------------------------------------
|
|
 Aria     
|
 🦋   
|
 persistent        
|
 Ad review · brand strategy · chat           
|
|
 Scout    
|
 🔍   
|
 persistent        
|
 Scoring · ranking · pinned output           
|
|
 Herald   
|
 🔔   
|
 persistent        
|
 Drop-off nudges · weekly digest · notif log 
|
|
 Ledger   
|
 📊   
|
`ledger-agent`
|
 Analytics — v1testing / OFF                 
|
|
 MAC      
|
 🗺️  
|
`mac-agent`
|
 Map of Pi agent — v1testing / OFF           
|
|
 Antbot   
|
 🤖   
|
`antbot-assignment`
|
 Champion challenger pods — v1testing / OFF 
|

**Herald cron:** `vercel.json` → `GET /api/send-weekly` every Monday 9AM UTC.
Auth: `x-vercel-cron: 1` header check (Hobby plan).

---

## Ad Lifecycle

submit → pending_review → [Aria verdict + admin review in /dashboard/antcpu] → active → Scout scores → rank_position + pinned set → archived → removed from Arena · appears in ArchiveModule → restore available in /dashboard/antcpu

Archive sets `status: archived` + `pinned: false` in one update.
Scout excludes archived ads on next run. Ranks shift organically.

---

## Email

All via Resend · `ads@antcpu.io`

|
 Route               
|
 Trigger                  
|
 Notes                              
|
|
---------------------
|
--------------------------
|
------------------------------------
|
|
`/api/send-welcome`
|
 Every signup             
|
 Fires automatically                
|
|
`/api/send-module`
|
 Champion onboarding      
|
 type: 'champion'                   
|
|
`/api/send-weekly`
|
 Vercel cron — Mon 9AM UTC
|
 GET handler + 
`WEEKLY_SECRET`
 check
|

---

## Discord Events

File: `app/lib/discord.ts` · All events typed in `DiscordEvent`

|
 Event           
|
 Channel                  
|
|
-----------------
|
--------------------------
|
|
`ad_approved`
|
 DISCORD_WEBHOOK_ADS      
|
|
`ad_rejected`
|
 DISCORD_WEBHOOK_ADS      
|
|
`ad_archived`
|
 DISCORD_WEBHOOK_ADS      
|
|
`share`
|
 DISCORD_WEBHOOK_SHARES   
|
|
`new_champion`
|
 DISCORD_WEBHOOK_CHAMPIONS
|
|
`herald_nudge`
|
 DISCORD_WEBHOOK_ADS      
|
|
`internship`
|
 DISCORD_INTERN           
|
|
`general`
|
 DISCORD_WEBHOOK_ADS      
|

Webhook env vars are in Vercel — not in repo.

---

## Auth Roles

|
 Role    
|
 How set                          
|
 Access                        
|
|
---------
|
----------------------------------
|
-------------------------------
|
|
`super`
|
 PIN via 
`/api/user-auth`
|
 Everything — all dashboards   
|
|
`admin`
|
`ad_signups.role = 'admin'`
|
 Approval queue · user list    
|
|
`team`
|
 Promo code signup                
|
 90-day access · brand arena   
|
|
`trial`
|
 Standard signup                  
|
 3-day access                  
|

`/dashboard/antcpu` is hardcoded to one email — migration to role-based approval queue is a planned next step (W-18/W-48).

---

## Known Gaps — September 2026

|
 Gap                                        
|
 File                        
|
 Priority  
|
|
--------------------------------------------
|
-----------------------------
|
-----------
|
|
 Profile page — no Edit/Archive for ads     
|
`ProfileClient.tsx`
|
 🔴 High   
|
|
`/dashboard/antcpu`
 hardcoded to 1 email   
|
`page.tsx`
|
 🔴 High   
|
|
 Scout loop bug — email var                 
|
`api/scout/score/route.ts`
|
 🟡 Medium 
|
|
`arena_modules`
 table unused               
|
 DB                          
|
 🟢 Low    
|
|
`cpu@antcpu.io`
 has null 
`brand_name`
|
`ad_signups`
 system row     
|
 🟢 Low    
|
|
 RVS — reaction velocity not tracked       
|
`api/scout/score/route.ts`
|
 🟡 Medium 
|
|
 Champion cycle DB not built               
|
 DB — see ARENAS.md          
|
 🟡 Medium 
|

---

## Next Session — Pickup Points

**Profile deep rebuild** — `ProfileClient.tsx` (W-49)
- Owner view: Edit (title/desc/url) + Archive per ad
- Admin/super view: same controls on any profile
- Status badges per ad (active / archived / pending / rejected)
- `canManage = isOwn || role === 'super'` gate
- `verified_brand` guard — lock brand name if true

**Homepage proof bar** — `app/page.tsx` (W-41)
- Consume reactions + shares from `/api/stats`
- Small visible strip showing live network engagement

**RVS + Rising Now** — Scout + Arena feed (W-33/W-42/W-43)
- `rising_score` col on `ads`
- Scout sub-routine calculates RVS on demand
- "Rising Now" section in `ArenaUniversalClient.tsx`

---

## Build Rule

Observe → Document → Discuss → Build.
Code follows the document. Never the other way around.
