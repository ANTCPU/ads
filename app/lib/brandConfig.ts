// ============================================================
// lib/brandConfig.ts — Brand skin registry
//
// How to add a new brand:
//   1. Insert a row into brand_config Supabase table
//   2. Add the entry to BRAND_CONFIGS below
//   3. Zero other files need changing
//
// Used by: login/page.tsx, internship/join/page.tsx
//
// SYNC RULE: Supabase row first. Code entry second.
// See DEV.md — Brand Config System.
// ============================================================

// ─── Auto cohort label ───────────────────────────────────────
// Recalculates every month automatically.
// No manual "August 2026" strings anywhere.

const _now   = new Date();
const _month = _now.toLocaleString('en-US', { month: 'long',  timeZone: 'UTC' });
const _year  = _now.toLocaleString('en-US', { year:  'numeric', timeZone: 'UTC' });
const _cohort = `${_month} ${_year}`;

// ─── Type ────────────────────────────────────────────────────

export type BrandConfig = {
  promo:           string;
  name:            string;
  accentColor:     string;
  goldColor:       string;
  badgeText:       string;
  headline:        string;
  headlineSub:     string;
  subText:         string;
  ctaLabel:        string;
  ctaHref:         string;
  trialDays:       number;
  trialLabel:      string;
  youtubeId?:      string;
  logoEmoji?:      string;
  skipBrandCheck?: boolean; // true = bypass brandCheck.ts (trusted promo channel)
};

// ─── Registry ────────────────────────────────────────────────

export const BRAND_CONFIGS: Record<string, BrandConfig> = {

  // ── Map of Pi — Country Champion Program ─────────────────
  // Entry: /login?promo=MAPOFPI or /mapofpi/create-shop-ad
  // 90-day trial. Champion program. Global.

  MAPOFPI: {
    promo:          'MAPOFPI',
    name:           'Map of Pi',
    accentColor:    '#2E7D32',
    goldColor:      '#D4AF37',
    badgeText:      '🏆 Country Champion Program · 90 Days Free',
    headline:       'Your Country.',
    headlineSub:    'Your Arena.',
    subText:        'Real people. Real reviews. Real Pi commerce. Claim your country and deploy 10 antbots in minutes.',
    ctaLabel:       'Claim Your Country →',
    ctaHref:        '/mapofpi/create-shop-ad',
    trialDays:      90,
    trialLabel:     '90 days free · No credit card · Cancel anytime',
    youtubeId:      'PNoY1ffzciI',
    logoEmoji:      '🗺️',
    skipBrandCheck: true,
  },

  // ── antcpu.io Internship Challenge ───────────────────────
  // Entry: /login?promo=INTERNSHIP or /internship/join
  // Cohort label auto-updates every month.
  // Challengers are Arena brands. Skills are their service.
  // All cohort members = founding members (is_early_adopter: true)
  // See DEV.md — The Internship Arena

  INTERNSHIP: {
    promo:          'INTERNSHIP',
    name:           'antcpu.io — Internship Challenge',
    accentColor:    '#2563eb',
    goldColor:      '#2563eb',
    badgeText:      `🚀 Human in the Loop · ${_cohort} Cohort · Founding Member`,
    headline:       'The Human in',
    headlineSub:    'the Loop.',
    subText:        '31 days. Real roles. Real CV. You are a brand. Your skills are your service. Pick your track and enter the Arena.',
    ctaLabel:       'Enter the Arena →',
    ctaHref:        '/internship/join',
    trialDays:      31,
    trialLabel:     '31-day challenge · Free · Global · Remote',
    logoEmoji:      '⚡',
    skipBrandCheck: true,
  },

  // ── CPU — antcpu Challenge AI ─────────────────────────────
  // System account. Not a real login brand.
  // Used internally to identify CPU posts in the community feed.
  // Never shown on the login page.

  CPU: {
    promo:          'CPU',
    name:           'CPU',
    accentColor:    '#2563eb',
    goldColor:      '#2563eb',
    badgeText:      '⚡ antcpu Challenge Agent',
    headline:       'CPU.',
    headlineSub:    'Challenge Guide.',
    subText:        'I don\'t do fluff. I do: here\'s what to do next. Go.',
    ctaLabel:       '',
    ctaHref:        '',
    trialDays:      0,
    trialLabel:     '',
    logoEmoji:      '⚡',
    skipBrandCheck: true,
  },

  // ── Default — Standard Arena signup ──────────────────────
  // Entry: /login (no promo code)
  // 3-day trial. Standard onboarding.

  default: {
    promo:          '',
    name:           'ANTCPU ADS',
    accentColor:    '#0070f3',
    goldColor:      '#0070f3',
    badgeText:      '⚡ Deployment Status: Active',
    headline:       'Welcome to',
    headlineSub:    'The Arena.',
    subText:        'Automated marketing infrastructure. 3 days free, then $9.99/mo.',
    ctaLabel:       'Start Free →',
    ctaHref:        '',
    trialDays:      3,
    trialLabel:     'Free 3-day trial · No credit card · Live within hours',
    logoEmoji:      '⚡',
    skipBrandCheck: false,
  },

};

// ─── Lookup ──────────────────────────────────────────────────

export function getBrandConfig(promo: string): BrandConfig {
  return BRAND_CONFIGS[promo.trim().toUpperCase()] ?? BRAND_CONFIGS.default;
}
