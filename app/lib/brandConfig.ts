// ============================================================
// lib/brandConfig.ts — Brand skin registry for login page
// Add a new brand here — zero other files need changing
// Used by: login/page.tsx
// ============================================================

export type BrandConfig = {
  promo:        string;       // promo code e.g. 'MAPOFPI'
  name:         string;       // display name
  accentColor:  string;       // primary CTA color
  goldColor:    string;       // secondary/badge color
  badgeText:    string;       // hero badge label
  headline:     string;       // h1 line 1
  headlineSub:  string;       // h1 line 2
  subText:      string;       // paragraph under h1
  ctaLabel:     string;       // primary button text
  ctaHref:      string;       // where CTA goes
  trialDays:    number;
  trialLabel:   string;       // e.g. '90 days free'
  youtubeId?:   string;       // anthem embed (optional)
  logoEmoji?:   string;       // e.g. '🗺️'
};

export const BRAND_CONFIGS: Record<string, BrandConfig> = {

  MAPOFPI: {
    promo:       'MAPOFPI',
    name:        'Map of Pi',
    accentColor: '#2E7D32',
    goldColor:   '#D4AF37',
    badgeText:   '🏆 Country Champion Program · 90 Days Free',
    headline:    'Your Country.',
    headlineSub: 'Your Arena.',
    subText:     'Real people. Real reviews. Real Pi commerce. Claim your country and deploy 10 antbots in minutes.',
    ctaLabel:    'Claim Your Country →',
    ctaHref:     '/mapofpi/create-shop-ad',
    trialDays:   90,
    trialLabel:  '90 days free · No credit card · Cancel anytime',
    youtubeId:   'PNoY1ffzciI',
    logoEmoji:   '🗺️',
  },

  default: {
    promo:       '',
    name:        'ANTCPU ADS',
    accentColor: '#0070f3',
    goldColor:   '#0070f3',
    badgeText:   '⚡ Deployment Status: Active',
    headline:    'Welcome to',
    headlineSub: 'The Arena.',
    subText:     'Automated marketing infrastructure. 3 days free, then $9.99/mo.',
    ctaLabel:    'Start Free →',
    ctaHref:     '',           // handled by form submit
    trialDays:   3,
    trialLabel:  'Free 3-day trial · No credit card · Live within hours',
    logoEmoji:   '⚡',
  },

};

export function getBrandConfig(promo: string): BrandConfig {
  return BRAND_CONFIGS[promo.trim().toUpperCase()] ?? BRAND_CONFIGS.default;
}
