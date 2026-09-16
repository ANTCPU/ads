// app/lib/mapofpi-membership.ts
// ─── Map of Pi Membership Arena — v2 ─────────────────────────────────────────
// Constants, specs, and execution checklist for agent-driven build.
// No UI. No API calls. Import from here — do not duplicate in other files.
//
// AFFECTED FILES (agent reads this before touching any of these):
//   app/lib/flags.ts                               — 3 flags already added
//   app/api/upload/store-image/route.ts            — new, see UPLOAD_SPEC
//   app/mapofpi/create-shop-ad/page.tsx            — is_country_champion fix + share card step 5
//   app/dashboard/user/page.tsx                    — upload card + share nudge (campaign=mapofpi)
//   app/mapofpi/icons/arena/MapOfPiArenaClient.tsx — replace hardcoded MEMBERSHIP_STEPS
//
// CONTEXT:
//   2024: champions recruited to share Map of Pi on their own platforms.
//   Result: high signup, near-zero sharing. No in-product share surface existed.
//   v2 fixes this. Phase A first. Phase B only after Phase A is confirmed working.
//
// CHECKLIST — one flag per deploy, in order:
//   [ ] 1. Build /api/upload/store-image — see UPLOAD_SPEC below
//   [ ] 2. Add upload card to dashboard/user — campaign=mapofpi + flag=store-image-upload
//   [ ] 3. Flip store-image-upload → ON in flags.ts
//   [ ] 4. Fix create-shop-ad — add is_country_champion:true to ads insert
//   [ ] 5. Add share card to create-shop-ad step 5 + dashboard/user — flag=champion-share-surface
//   [ ] 6. Flip champion-share-surface → ON in flags.ts
//   [ ] 7. Wire resolveChampionTier() into MapOfPiArenaClient — flag=champion-membership-progress
//   [ ] 8. Flip champion-membership-progress → ON in flags.ts
//   [ ] 9. Confirm: shares writing to Supabase, points accumulating, tiers unlocking live
//   Phase B starts only after step 9 confirmed — see MARKETER_SPEC below
// ─────────────────────────────────────────────────────────────────────────────

// ─── Membership tiers ─────────────────────────────────────────────────────────
// Source of truth for tier thresholds.
// Matches MAPOFPI_PHASES in app/clients/mapofpi/assets.ts — keep in sync.
// Used by resolveChampionTier() and MapOfPiArenaClient when
// champion-membership-progress flag is ON.

export const MEMBERSHIP_TIERS = [
  { id: 'free',     label: 'Free',               emoji: '✅', pointsMin: 0    },
  { id: 'rising',   label: 'Rising',             emoji: '🚀', pointsMin: 100  },
  { id: 'featured', label: 'Featured',           emoji: '⭐', pointsMin: 250  },
  { id: 'top',      label: 'Top Tier',           emoji: '🏆', pointsMin: 500  },
  { id: 'v2',       label: 'v2 Online Shopping', emoji: '🛒', pointsMin: 1000 },
] as const;

export type MembershipTierId = typeof MEMBERSHIP_TIERS[number]['id'];

// Returns the highest tier the champion has unlocked.
// Import this into MapOfPiArenaClient — do not reimplement.
export function resolveChampionTier(points: number) {
  for (let i = MEMBERSHIP_TIERS.length - 1; i >= 0; i--) {
    if (points >= MEMBERSHIP_TIERS[i].pointsMin) return MEMBERSHIP_TIERS[i];
  }
  return MEMBERSHIP_TIERS[0];
}

// ─── Upload spec ──────────────────────────────────────────────────────────────
// Flag: store-image-upload
// Route to build: POST /api/upload/store-image
// Input: multipart/form-data — file (image/*) + email
// Server derives ad_id from email + campaign=mapofpi + status=active
// Never trust ad_id from client — prevents champion updating another's ad
// On success: writes image_url to ads row, returns { image_url }
// Fallback: if no image_url, champion card shows shop emoji — already works

export const UPLOAD_SPEC = {
  route:            '/api/upload/store-image',
  cloudinaryFolder: 'mapofpi-champions',
  maxBytes:         5 * 1024 * 1024,
  accepted:         ['image/jpeg', 'image/png', 'image/webp'],
  adLookup:         { campaign: 'mapofpi', status: 'active' },
  envVars:          ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
} as const;

// ─── Share surface spec ───────────────────────────────────────────────────────
// Flag: champion-share-surface
// Shown in: create-shop-ad step 5 (post-launch) + dashboard/user
// Gate: user's active ad has campaign=mapofpi
// Uses getShareText() + buildPost() from socialShare.ts — same as share module
// Calls recordShare() — writes to ad_shares, points flow to champion's ad
// Collapses to small link after collapseAfter shares (read from ad.share_count)

export const SHARE_SURFACE_SPEC = {
  locations:     ['create-shop-ad/step-5', 'dashboard/user'] as const,
  platforms:     ['whatsapp', 'telegram', 'twitter']         as const,
  collapseAfter: 3,
} as const;

// ─── Marketer spec — Phase B ──────────────────────────────────────────────────
// Do not build until Phase A step 9 is confirmed.
// Marketers share member ads on behalf of members, earn from engagement.
// They do not own ads. They are internal operators.
//
// When marketer-role flag is added to flags.ts (Phase B):
//   Role: 'marketer' in ad_signups
//   New table: marketer_shares
//     marketer_email    text
//     ad_id             uuid references ads(id)
//     platform          text
//     clicks_attributed integer default 0
//     shares_attributed integer default 0
//     created_at        timestamptz default now()
//   Attribution: marketer_email tags ad_shares row on every share
//   Compensation rate: undefined — business decision required, do not hardcode

export const MARKETER_SPEC = {
  role:             'marketer',
  table:            'marketer_shares',
  compensationRate: undefined as undefined, // set when business decision is made
} as const;
