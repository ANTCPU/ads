# ANTCPU ADS — TODO

## Next Build Session

### 1. Pricing Tiers (Landing Page)
- [ ] Add $9.99 / $29 / $79 tier cards to landing page
- [ ] Show feature diff per tier
- [ ] Highlight recommended tier

### 2. 3-Day Free Trial
- [ ] Auto-assign trial status to new signups
- [ ] Show trial badge + countdown in onboarding tracker
- [ ] Trial gets all $9.99 features for 3 days

### 3. Supabase Auth (replace localStorage TODOs)
- [ ] Replace localStorage with supabase.auth.signInWithOtp()
- [ ] Listen for session via onAuthStateChange
- [ ] Gate dashboard behind real session

### 4. Ad Builder
- [ ] Unlock "Create Your First Ad" step in onboarding tracker
- [ ] Build ad form (title, URL, description, image, category)
- [ ] Connect to Supabase ads table
- [ ] AI ad builder for Premium ($29) and Featured ($79) users via antcpu.io agents

### 5. Rewards System
- [ ] Points → ladder level visible in UI
- [ ] Featured placement at Entry monthly level
- [ ] Show points balance + progress to next tier

### 6. antcpu.io Agent Integration
- [ ] Premium + Featured users get AI ad builder
- [ ] Connect to antcpu.io agents for ad generation

## Flow
antcpu.com/cloud/ → antcpu-ads.vercel.app → onboarding → build ad

## Notes
- TRIAL_MODE flag already in page.tsx — wire to Supabase
- Discord webhook already firing on signup
- Dashboard /dashboard is agent-facing — needs separate user-facing dashboard
