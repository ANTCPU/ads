// ============================================================
// clients/mapofpi/assets.ts — Map of Pi Asset Registry
// Icons · Videos · Phase Roadmap · Country data
// Imported by: create-shop-ad, icons/arena, PhaseUnlockStrip
// ============================================================

export type ShopIcon = {
  slug: string;
  label: string;
  emoji: string;
  color: string;
  accent: string;
};

export const MAPOFPI_ICONS: ShopIcon[] = [
  { slug: 'coffee',        label: 'Coffee & Café',       emoji: '☕',  color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'restaurant',    label: 'Restaurant',           emoji: '🍽️', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'grocery',       label: 'Grocery & Market',     emoji: '🛒', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'clothing',      label: 'Clothing & Fashion',   emoji: '👗', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'beauty',        label: 'Beauty & Salon',       emoji: '💇', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'auto',          label: 'Auto & Car Dealer',    emoji: '🚗', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'services',      label: 'Repair & Services',    emoji: '🔧', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'electronics',   label: 'Electronics',          emoji: '📱', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'realestate',    label: 'Real Estate',          emoji: '🏠', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'education',     label: 'Education',            emoji: '🎓', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'health',        label: 'Health & Pharmacy',    emoji: '💊', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'art',           label: 'Art & Crafts',         emoji: '🎨', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'farm',          label: 'Farm & Fresh',         emoji: '🌿', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'entertainment', label: 'Entertainment',        emoji: '🎵', color: '#2E7D32', accent: '#D4AF37' },
  { slug: 'general',       label: 'General Shop',         emoji: '📦', color: '#2E7D32', accent: '#D4AF37' },
];

// ── YouTube Video Registry ──────────────────────────────────
export type MapOfPiVideo = {
  id: string;
  title: string;
  type: 'anthem' | 'team' | 'howto' | 'community';
  featured: boolean;
};

export const MAPOFPI_VIDEOS: MapOfPiVideo[] = [
  { id: 'PNoY1ffzciI', title: 'Map of Pi Anthem',                    type: 'anthem',    featured: true  },
  { id: 'K6CDdFZnzg8', title: 'Map of Pi Anthem MV V2.0',            type: 'anthem',    featured: false },
  { id: 'BZIUdMamkhE', title: 'Anthem Dance Challenge',              type: 'community', featured: false },
  { id: 'Q-Qw6ZHT8A4', title: 'Darin — Cofounder Vision',            type: 'team',      featured: true  },
  { id: 'mzPcbb9vyxI', title: 'Danny — Head of Development',         type: 'team',      featured: false },
  { id: 'BalnmP9i79c', title: 'Philip — Building Global Community',  type: 'team',      featured: false },
  { id: 'ArgZX-qMHG8', title: "Antony's AI Systems for Map of Pi",   type: 'team',      featured: false },
  { id: 'fV9VQxmIbjg', title: 'How to Search on Map of Pi',          type: 'howto',     featured: true  },
  { id: 'mnwi28uMvn0', title: 'Buy and Sell on Map of Pi',           type: 'howto',     featured: false },
  { id: 'vTpxwZVgs6Y', title: 'Happy Map of Pi Day!',                type: 'community', featured: false },
];

// ── Phase Roadmap ───────────────────────────────────────────
export type Phase = {
  id: string;
  label: string;
  description: string;
  unlockAt: number;
  unlocked: boolean;
  tier: 'free' | 'rising' | 'featured' | 'top' | 'v2';
};

export const MAPOFPI_PHASES: Phase[] = [
  {
    id: 'free',
    label: '✅ Free — Active Now',
    description: 'Icon ad · 10 antbots · Country Champion leaderboard',
    unlockAt: 0,
    unlocked: true,
    tier: 'free',
  },
  {
    id: 'rising',
    label: '🔒 Rising Tier',
    description: 'Higher priority + increased impressions across the network',
    unlockAt: 100,
    unlocked: false,
    tier: 'rising',
  },
  {
    id: 'featured',
    label: '🔒 Featured Placement',
    description: 'Featured placement + cross-channel distribution',
    unlockAt: 250,
    unlocked: false,
    tier: 'featured',
  },
  {
    id: 'top',
    label: '🔒 Top Tier',
    description: 'Full network + creator channel integrations',
    unlockAt: 500,
    unlocked: false,
    tier: 'top',
  },
  {
    id: 'v2',
    label: '🔒 v2 — Online Shopping',
    description: 'Map of Pi v2 online shopping + ANTCPU ADS deep integration',
    unlockAt: 1000,
    unlocked: false,
    tier: 'v2',
  },
];

// ── Country list with flags ─────────────────────────────────
export type Country = {
  code: string;
  name: string;
  flag: string;
  lang: string; // BCP-47 for antbot localization
};

export const MAPOFPI_COUNTRIES: Country[] = [

  // ── Africa ─────────────────────────────────────────────────
  { code: 'NG', name: 'Nigeria',       flag: '🇳🇬', lang: 'en' },
  { code: 'GH', name: 'Ghana',         flag: '🇬🇭', lang: 'en' },
  { code: 'KE', name: 'Kenya',         flag: '🇰🇪', lang: 'en' },
  { code: 'ZA', name: 'South Africa',  flag: '🇿🇦', lang: 'en' },
  { code: 'ET', name: 'Ethiopia',      flag: '🇪🇹', lang: 'am' },
  { code: 'TZ', name: 'Tanzania',      flag: '🇹🇿', lang: 'sw' },
  { code: 'UG', name: 'Uganda',        flag: '🇺🇬', lang: 'en' },
  { code: 'CM', name: 'Cameroon',      flag: '🇨🇲', lang: 'fr' },
  { code: 'SN', name: 'Senegal',       flag: '🇸🇳', lang: 'fr' },
  { code: 'CI', name: 'Ivory Coast',   flag: '🇨🇮', lang: 'fr' },
  { code: 'ZW', name: 'Zimbabwe',      flag: '🇿🇼', lang: 'en' },
  { code: 'ZM', name: 'Zambia',        flag: '🇿🇲', lang: 'en' },
  { code: 'RW', name: 'Rwanda',        flag: '🇷🇼', lang: 'rw' },
  { code: 'MA', name: 'Morocco',       flag: '🇲🇦', lang: 'ar' },
  { code: 'DZ', name: 'Algeria',       flag: '🇩🇿', lang: 'ar' },
  { code: 'TN', name: 'Tunisia',       flag: '🇹🇳', lang: 'ar' },
  { code: 'EG', name: 'Egypt',         flag: '🇪🇬', lang: 'ar' },
  { code: 'MZ', name: 'Mozambique',    flag: '🇲🇿', lang: 'pt' },
  { code: 'CD', name: 'DR Congo',      flag: '🇨🇩', lang: 'fr' },
  { code: 'TG', name: 'Togo',          flag: '🇹🇬', lang: 'fr' },
  { code: 'BJ', name: 'Benin',         flag: '🇧🇯', lang: 'fr' },
  { code: 'SL', name: 'Sierra Leone',  flag: '🇸🇱', lang: 'en' },
  { code: 'LR', name: 'Liberia',       flag: '🇱🇷', lang: 'en' },

  // ── Middle East ─────────────────────────────────────────────
  { code: 'SA', name: 'Saudi Arabia',  flag: '🇸🇦', lang: 'ar' },
  { code: 'AE', name: 'UAE',           flag: '🇦🇪', lang: 'ar' },
  { code: 'IL', name: 'Israel',        flag: '🇮🇱', lang: 'he' },

  // ── Asia ────────────────────────────────────────────────────
  { code: 'IN', name: 'India',         flag: '🇮🇳', lang: 'hi' },
  { code: 'PK', name: 'Pakistan',      flag: '🇵🇰', lang: 'ur' },
  { code: 'BD', name: 'Bangladesh',    flag: '🇧🇩', lang: 'bn' },
  { code: 'LK', name: 'Sri Lanka',     flag: '🇱🇰', lang: 'si' },
  { code: 'NP', name: 'Nepal',         flag: '🇳🇵', lang: 'ne' },
  { code: 'CN', name: 'China',         flag: '🇨🇳', lang: 'zh' },
  { code: 'JP', name: 'Japan',         flag: '🇯🇵', lang: 'ja' },
  { code: 'KR', name: 'South Korea',   flag: '🇰🇷', lang: 'ko' },
  { code: 'HK', name: 'Hong Kong',     flag: '🇭🇰', lang: 'zh' },
  { code: 'TW', name: 'Taiwan',        flag: '🇹🇼', lang: 'zh' },
  { code: 'SG', name: 'Singapore',     flag: '🇸🇬', lang: 'en' },
  { code: 'MY', name: 'Malaysia',      flag: '🇲🇾', lang: 'ms' },
  { code: 'ID', name: 'Indonesia',     flag: '🇮🇩', lang: 'id' },
  { code: 'PH', name: 'Philippines',   flag: '🇵🇭', lang: 'en' },
  { code: 'VN', name: 'Vietnam',       flag: '🇻🇳', lang: 'vi' },
  { code: 'TH', name: 'Thailand',      flag: '🇹🇭', lang: 'th' },
  { code: 'MM', name: 'Myanmar',       flag: '🇲🇲', lang: 'my' },
  { code: 'KH', name: 'Cambodia',      flag: '🇰🇭', lang: 'km' },
  { code: 'LA', name: 'Laos',          flag: '🇱🇦', lang: 'lo' },

  // ── Oceania ─────────────────────────────────────────────────
  { code: 'AU', name: 'Australia',     flag: '🇦🇺', lang: 'en' },
  { code: 'NZ', name: 'New Zealand',   flag: '🇳🇿', lang: 'en' },

  // ── Europe ──────────────────────────────────────────────────
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lang: 'en' },
  { code: 'DE', name: 'Germany',        flag: '🇩🇪', lang: 'de' },
  { code: 'FR', name: 'France',         flag: '🇫🇷', lang: 'fr' },
  { code: 'ES', name: 'Spain',          flag: '🇪🇸', lang: 'es' },
  { code: 'IT', name: 'Italy',          flag: '🇮🇹', lang: 'it' },
  { code: 'NL', name: 'Netherlands',    flag: '🇳🇱', lang: 'nl' },
  { code: 'PT', name: 'Portugal',       flag: '🇵🇹', lang: 'pt' },
  { code: 'GR', name: 'Greece',         flag: '🇬🇷', lang: 'el' },
  { code: 'SE', name: 'Sweden',         flag: '🇸🇪', lang: 'sv' },
  { code: 'NO', name: 'Norway',         flag: '🇳🇴', lang: 'no' },
  { code: 'DK', name: 'Denmark',        flag: '🇩🇰', lang: 'da' },
  { code: 'FI', name: 'Finland',        flag: '🇫🇮', lang: 'fi' },
  { code: 'CH', name: 'Switzerland',    flag: '🇨🇭', lang: 'de' },
  { code: 'AT', name: 'Austria',        flag: '🇦🇹', lang: 'de' },
  { code: 'BE', name: 'Belgium',        flag: '🇧🇪', lang: 'fr' },
  { code: 'PL', name: 'Poland',         flag: '🇵🇱', lang: 'pl' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', lang: 'cs' },
  { code: 'HU', name: 'Hungary',        flag: '🇭🇺', lang: 'hu' },
  { code: 'RO', name: 'Romania',        flag: '🇷🇴', lang: 'ro' },
  { code: 'BG', name: 'Bulgaria',       flag: '🇧🇬', lang: 'bg' },
  { code: 'RS', name: 'Serbia',         flag: '🇷🇸', lang: 'sr' },
  { code: 'HR', name: 'Croatia',        flag: '🇭🇷', lang: 'hr' },
  { code: 'SK', name: 'Slovakia',       flag: '🇸🇰', lang: 'sk' },
  { code: 'TR', name: 'Turkey',         flag: '🇹🇷', lang: 'tr' },

  // ── Americas ────────────────────────────────────────────────
  { code: 'US', name: 'United States',  flag: '🇺🇸', lang: 'en' },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦', lang: 'en' },
  { code: 'MX', name: 'Mexico',         flag: '🇲🇽', lang: 'es' },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷', lang: 'pt' },
  { code: 'AR', name: 'Argentina',      flag: '🇦🇷', lang: 'es' },
  { code: 'CO', name: 'Colombia',       flag: '🇨🇴', lang: 'es' },
  { code: 'VE', name: 'Venezuela',      flag: '🇻🇪', lang: 'es' },
  { code: 'PE', name: 'Peru',           flag: '🇵🇪', lang: 'es' },
  { code: 'CL', name: 'Chile',          flag: '🇨🇱', lang: 'es' },
  { code: 'EC', name: 'Ecuador',        flag: '🇪🇨', lang: 'es' },
  { code: 'BO', name: 'Bolivia',        flag: '🇧🇴', lang: 'es' },
  { code: 'HN', name: 'Honduras',       flag: '🇭🇳', lang: 'es' },
  { code: 'GT', name: 'Guatemala',      flag: '🇬🇹', lang: 'es' },
  { code: 'SV', name: 'El Salvador',    flag: '🇸🇻', lang: 'es' },

];

export default MAPOFPI_ICONS;
