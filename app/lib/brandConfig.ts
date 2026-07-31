// ============================================================
// lib/brandConfig.ts — Brand skin registry for login page
// Add a new brand here — zero other files need changing
// Used by: login/page.tsx, internship/join/page.tsx
//
// SYNC RULE: Every entry here must have a matching row in
// the brand_config Supabase table. Run SQL insert first,
// then add the entry here. See DEV.md — Brand Config System.
// ============================================================

export type BrandConfig = {
  promo: string;
  name: string;
  accentColor: string;
  goldColor: string;
  badgeText: string;
  headline: string;
  headlineSub: string;
  subText: string;
  ctaLabel: string;
  ctaHref: string;
  trialDays: number;
  trialLabel: string;
  youtubeId?: string;
  logoEmoji?: string;
  skipBrandCheck?: boolean; // true = bypass brandCheck.ts (trusted promo channel)
};

export const BRAND_CONFIGS: Record<string, BrandConfig> = {

  // ── Map of Pi — Country Champion Program ──────────────────
  MAPOFPI: {
    promo: 'MAPOFPI',
    name: 'Map of Pi',
    accentColor: '#2E7D32',
    goldColor: '#D4AF37',
    badgeText: '🏆 Country Champion Program · 90 Days Free',
    headline: 'Your Country.',
    headlineSub: 'Your Arena.',
    subText: 'Real people. Real reviews. Real Pi commerce. Claim your country and deploy 10 antbots in minutes.',
    ctaLabel: 'Claim Your Country →',
    ctaHref: '/mapofpi/create-shop-ad',
    trialDays: 90,
    trialLabel: '90 days free · No credit card · Cancel anytime',
    youtubeId: 'PNoY1ffzciI',
    logoEmoji: '🗺️',
    skipBrandCheck: true,
  },

  // ── antcpu.io Internship Challenge ────────────────────────
  // Entry: antcpu-ads.vercel.app/login?promo=INTERNSHIP
  // Or direct: antcpu-ads.vercel.app/internship/join
  // Challengers are Arena brands. Skills are their service.
  // All August 2026 cohort = founding members (is_early_adopter: true)
  // See DEV.md — The Internship Arena
  INTERNSHIP: {
    promo: 'INTERNSHIP',
    name: 'antcpu.io — Internship Challenge',
    accentColor: '#2563eb',
    goldColor: '#2563eb',
    badgeText: '🚀 Human in the Loop · August 2026 Cohort · Founding Member',
    headline: 'The Human in',
    headlineSub: 'the Loop.',
    subText: '31 days. Real roles. Real CV. You are a brand. Your skills are your service. Pick your track and enter the Arena.',
    ctaLabel: 'Enter the Arena →',
    ctaHref: '/internship/join',
    trialDays: 31,
    trialLabel: '31-day challenge · Free · Global · Remote',
    logoEmoji: '⚡',
    skipBrandCheck: true,
  },

  // ── Default — Standard Arena signup ───────────────────────
  default: {
    promo: '',
    name: 'ANTCPU ADS',
    accentColor: '#0070f3',
    goldColor: '#0070f3',
    badgeText: '⚡ Deployment Status: Active',
    headline: 'Welcome to',
    headlineSub: 'The Arena.',
    subText: 'Automated marketing infrastructure. 3 days free, then $9.99/mo.',
    ctaLabel: 'Start Free →',
    ctaHref: '',
    trialDays: 3,
    trialLabel: 'Free 3-day trial · No credit card · Live within hours',
    logoEmoji: '⚡',
    skipBrandCheck: false,
  },

};

export function getBrandConfig(promo: string): BrandConfig {
  return BRAND_CONFIGS[promo.trim().toUpperCase()] ?? BRAND_CONFIGS.default;
}
