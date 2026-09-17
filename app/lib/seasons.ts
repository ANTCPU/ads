// app/lib/seasons.ts
// ─── Season Registry ──────────────────────────────────────────────────────────
// Single source of truth for all Arena seasons.
//
// Slug convention: {number}-{name}{year}
//   0-current    — the original Arena, always open
//   1-fall2026   — Sep 22 → Dec 21 2026
//   2-winter2026 — Dec 22 2026 → Mar 19 2027
//   3-spring2027 — Mar 20 → Jun 20 2027
//   4-summer2027 — Jun 21 → Sep 21 2027
//
// Each season resolves to /arena/[slug] via the existing [slug] route.
// No new client needed — ArenaClient handles empty state natively.
//
// v1 (Sep 2026)
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonStatus = 'open' | 'upcoming' | 'closed';

export type Season = {
  slug:      string;
  number:    number;
  name:      string;
  emoji:     string;
  color:     string;
  opens:     Date;
  closes:    Date | null;   // null = no end
  tagline:   string;
};

export const SEASONS: Season[] = [
  {
    slug:    '0-current',
    number:  0,
    name:    'The Arena',
    emoji:   '🏟️',
    color:   '#f0883e',
    opens:   new Date('2026-01-01T00:00:00Z'),
    closes:  null,
    tagline: 'The original Arena. Always open.',
  },
  {
    slug:    '1-fall2026',
    number:  1,
    name:    'Fall 2026',
    emoji:   '🍂',
    color:   '#e85d04',
    opens:   new Date('2026-09-22T00:00:00Z'),
    closes:  new Date('2026-12-21T23:59:59Z'),
    tagline: 'Sep 22 — Dec 21. The first season.',
  },
  {
    slug:    '2-winter2026',
    number:  2,
    name:    'Winter 2026',
    emoji:   '❄️',
    color:   '#0070f3',
    opens:   new Date('2026-12-22T00:00:00Z'),
    closes:  new Date('2027-03-19T23:59:59Z'),
    tagline: 'Dec 22 — Mar 19. The second season.',
  },
  {
    slug:    '3-spring2027',
    number:  3,
    name:    'Spring 2027',
    emoji:   '🌸',
    color:   '#ff0080',
    opens:   new Date('2027-03-20T00:00:00Z'),
    closes:  new Date('2027-06-20T23:59:59Z'),
    tagline: 'Mar 20 — Jun 20. The third season.',
  },
  {
    slug:    '4-summer2027',
    number:  4,
    name:    'Summer 2027',
    emoji:   '☀️',
    color:   '#D4AF37',
    opens:   new Date('2027-06-21T00:00:00Z'),
    closes:  new Date('2027-09-21T23:59:59Z'),
    tagline: 'Jun 21 — Sep 21. The fourth season.',
  },
];

export function getSeasonStatus(season: Season, now = new Date()): SeasonStatus {
  if (now < season.opens) return 'upcoming';
  if (season.closes && now > season.closes) return 'closed';
  return 'open';
}

export function daysUntilOpen(season: Season, now = new Date()): number {
  if (getSeasonStatus(season, now) !== 'upcoming') return 0;
  return Math.ceil((season.opens.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysRemaining(season: Season, now = new Date()): number | null {
  if (!season.closes) return null;
  if (getSeasonStatus(season, now) !== 'open') return 0;
  return Math.ceil((season.closes.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
