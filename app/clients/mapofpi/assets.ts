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
  { slug: 'coffee',        label: 'Coffee & Café',       emoji: '☕', color: '#2E7D32', accent: '#D4AF37' },
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
  { id: 'PNoY1ffzciI', title: 'Map of Pi Anthem',                          type: 'anthem',    featured: true  },
  { id: 'K6CDdFZnzg8', title: 'Map of Pi Anthem MV V2.0',                  type: 'anthem',    featured: false },
  { id: 'BZIUdMamkhE', title: 'Anthem Dance Challenge',                    type: 'community', featured: false },
  { id: 'Q-Qw6ZHT8A4', title: 'Darin — Cofounder Vision',                  type: 'team',      featured: true  },
  { id: 'mzPcbb9vyxI', title: 'Danny — Head of Development',               type: 'team',      featured: false },
  { id: 'BalnmP9i79c', title: 'Philip — Building Global Community',        type: 'team',      featured: false },
  { id: 'ArgZX-qMHG8', title: "Antony's AI Systems for Map of Pi",         type: 'team',      featured: false },
  { id: 'fV9VQxmIbjg', title: 'How to Search on Map of Pi',                type: 'howto',     featured: true  },
  { id: 'mnwi28uMvn0', title: 'Buy and Sell on Map of Pi',                 type: 'howto',     featured: false },
  { id: 'vTpxwZVgs6Y', title: 'Happy Map of Pi Day!',                      type: 'community', featured: false },
];

// ── Phase Roadmap ───────────────────────────────────────────
export type Phase = {
  id: string;
  label: string;
  description: string;
  unlockAt: number; // champion count
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
  { code: 'NG', name: 'Nigeria',        flag: '🇳🇬', lang: 'en' },
  { code: 'IN', name: 'India',          flag: '🇮🇳', lang: 'hi' },
  { code: 'CN', name: 'China',          flag: '🇨🇳', lang: 'zh' },
  { code: 'US', name: 'United States',  flag: '🇺🇸', lang: 'en' },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷', lang: 'pt' },
  { code: 'MX', name: 'Mexico',         flag: '🇲🇽', lang: 'es' },
  { code: 'PH', name: 'Philippines',    flag: '🇵🇭', lang: 'en' },
  { code: 'GH', name: 'Ghana',          flag: '🇬🇭', lang: 'en' },
  { code: 'KE', name: 'Kenya',          flag: '🇰🇪', lang: 'en' },
  { code: 'ZA', name: 'South Africa',   flag: '🇿🇦', lang: 'en' },
  { code: 'ID', name: 'Indonesia',      flag: '🇮🇩', lang: 'id' },
  { code: 'VN', name: 'Vietnam',        flag: '🇻🇳', lang: 'vi' },
  { code: 'KR', name: 'South Korea',    flag: '🇰🇷', lang: 'ko' },
  { code: 'JP', name: 'Japan',          flag: '🇯🇵', lang: 'ja' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lang: 'en' },
  { code: 'DE', name: 'Germany',        flag: '🇩🇪', lang: 'de' },
  { code: 'FR', name: 'France',         flag: '🇫🇷', lang: 'fr' },
  { code: 'SA', name: 'Saudi Arabia',   flag: '🇸🇦', lang: 'ar' },
  { code: 'EG', name: 'Egypt',          flag: '🇪🇬', lang: 'ar' },
  { code: 'PK', name: 'Pakistan',       flag: '🇵🇰', lang: 'ur' },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦', lang: 'en' },
  { code: 'AU', name: 'Australia',      flag: '🇦🇺', lang: 'en' },
  { code: 'TR', name: 'Turkey',         flag: '🇹🇷', lang: 'tr' },
  { code: 'AR', name: 'Argentina',      flag: '🇦🇷', lang: 'es' },
  { code: 'CO', name: 'Colombia',       flag: '🇨🇴', lang: 'es' },
];

export default MAPOFPI_ICONS;
