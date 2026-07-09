// ============================================================
// lib/brandConfig.ts — Brand skin registry for login page
// Add a new brand here — zero other files need changing
// Used by: login/page.tsx
// ============================================================

export type BrandConfig = {
  promo:            string;
  name:             string;
  accentColor:      string;
  goldColor:        string;
  badgeText:        string;
  headline:         string;
  headlineSub:      string;
  subText:          string;
  ctaLabel:         string;
  ctaHref:          string;
  trialDays:        number;
  trialLabel:       string;
  youtubeId?:       string;
  logoEmoji?:       string;
  skipBrandCheck?:  boolean; // true = bypass brandCheck.ts (trusted promo channel)
};

export const BRAND_CONFIGS: Record<string, BrandConfig> = {

  MAPOFPI: {
    promo:           'MAPOFPI',
    name:            'Map of Pi',
    accentColor:     '#2E7D32',
    goldColor:       '#D4AF37',
    badgeText:       '🏆 Country Champion Program · 90 Days Free',
    headline:        'Your Country.',
    headlineSub:     'Your Arena.',
    subText:         'Real people. Real reviews. Real Pi commerce. Claim your country and deploy 10 antbots in minutes.',
    ctaLabel:        'Claim Your Country →',
    ctaHref:         '/mapofpi/create-shop-ad',
    trialDays:       90,
    trialLabel:      '90 days free · No credit card · Cancel anytime',
    youtubeId:       'PNoY1ffzciI',
    logoEmoji:       '🗺️',
    skipBrandCheck:  true,
  },

  default: {
    promo:           '',
    name:            'ANTCPU ADS',
    accentColor:     '#0070f3',
    goldColor:       '#0070f3',
    badgeText:       '⚡ Deployment Status: Active',
    headline:        'Welcome to',
    headlineSub:     'The Arena.',
    subText:         'Automated marketing infrastructure. 3 days free, then $9.99/mo.',
    ctaLabel:        'Start Free →',
    ctaHref:         '',
    trialDays:       3,
    trialLabel:      'Free 3-day trial · No credit card · Live within hours',
    logoEmoji:       '⚡',
    skipBrandCheck:  false,
  },

};

export function getBrandConfig(promo: string): BrandConfig {
  return BRAND_CONFIGS[promo.trim().toUpperCase()] ?? BRAND_CONFIGS.default;
}
