// ── Office constants — themes, badges, nodes, gates, tz ─────

export const WS_DEV = 'https://antcpu.io/dev/';
export const WS_MKT = 'https://antcpu.io/marketing/';

export type GateEntry = { id: string; pct: number; label: string; url?: string; urlMarketing?: string };

export const GATE_NEXT: GateEntry[] = [
  { id: 'd1',        pct: 5,   label: 'Register & Introduce Yourself',  url: 'https://antcpu.io/apply/' },
  { id: 'd2',        pct: 10,  label: 'Complete Your Profile',           url: 'https://antcpu.io/dashboard/' },
  { id: 'd3',        pct: 15,  label: 'Explore the Arena',               url: 'https://github.com/ANTCPU/ads', urlMarketing: 'https://antcpu.cloud/' },
  { id: 'd4',        pct: 20,  label: 'First Action in the Arena',       url: 'https://antcpu.cloud/' },
  { id: 'd5',        pct: 22,  label: 'First Submission'         },
  { id: 'd6',        pct: 24,  label: 'Give Peer Feedback'       },
  { id: 'd7',        pct: 25,  label: 'Week 1 Reflection'        },
  { id: 'd8',        pct: 30,  label: 'Week 2 Brief — Plan Your Build' },
  { id: 'd9',        pct: 35,  label: 'Research & Analyze'       },
  { id: 'd10',       pct: 38,  label: 'Build Day 1'              },
  { id: 'd11',       pct: 42,  label: 'Build Day 2'              },
  { id: 'd12',       pct: 46,  label: 'Ship & Submit'            },
  { id: 'd13',       pct: 48,  label: 'Peer Review'              },
  { id: 'd14',       pct: 50,  label: 'Week 2 Reflection'        },
  { id: 'd15',       pct: 55,  label: 'Meet Your Team'           },
  { id: 'd16',       pct: 58,  label: 'Team Brief — Define the Project' },
  { id: 'd17',       pct: 62,  label: 'Build Together Day 1'     },
  { id: 'd18',       pct: 65,  label: 'Build Together Day 2'     },
  { id: 'd19',       pct: 70,  label: 'Ship the Team Project'    },
  { id: 'd20',       pct: 72,  label: 'Cross-Track Peer Review'  },
  { id: 'd21',       pct: 75,  label: 'Week 3 Reflection'        },
  { id: 'd22',       pct: 80,  label: 'Claim Your Role'          },
  { id: 'd23',       pct: 85,  label: 'Final Build — Ship It'    },
  { id: 'd24',       pct: 95,  label: 'Final Submission & Showcase' },
  { id: 'd25-final', pct: 100, label: 'Selection Day'            },
];

export function getNextGate(completedGates: string[], track: string) {
  const g = GATE_NEXT.find(x => !completedGates.includes(x.id)) ?? null;
  if (!g) return null;
  return { ...g, url: g.url ?? WS_DEV, urlMarketing: g.urlMarketing ?? WS_MKT };
}

export const COUNTRY_TZ: Record<string, string> = {
  'United States': 'America/New_York',
  'United Kingdom': 'Europe/London',
  'Pakistan': 'Asia/Karachi',
  'India': 'Asia/Kolkata',
  'Nigeria': 'Africa/Lagos',
  'Kenya': 'Africa/Nairobi',
  'Ghana': 'Africa/Accra',
  'South Africa': 'Africa/Johannesburg',
  'Egypt': 'Africa/Cairo',
  'Germany': 'Europe/Berlin',
  'France': 'Europe/Paris',
  'Italy': 'Europe/Rome',
  'Spain': 'Europe/Madrid',
  'Turkey': 'Europe/Istanbul',
  'China': 'Asia/Shanghai',
  'Japan': 'Asia/Tokyo',
  'South Korea': 'Asia/Seoul',
  'Indonesia': 'Asia/Jakarta',
  'Vietnam': 'Asia/Ho_Chi_Minh',
  'Philippines': 'Asia/Manila',
  'Brazil': 'America/Sao_Paulo',
  'Mexico': 'America/Mexico_City',
  'Canada': 'America/Toronto',
  'Australia': 'Australia/Sydney',
  'Saudi Arabia': 'Asia/Riyadh',
  'United Arab Emirates': 'Asia/Dubai',
};

export const THEMES = {
  dev: {
    bg: 'linear-gradient(160deg, #0d1117 0%, #0a1628 40%, #0d1f2d 70%, #060d14 100%)',
    accent: '#00e5ff', border: '#1e3a4a', text: '#e6edf3', subtext: '#8b949e',
    badge: 'bg-cyan-900 text-cyan-300', label: '💻 Developer',
    glow: '0 0 20px rgba(0,229,255,0.15)', particle: '#00e5ff',
  },
  marketing: {
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #3b1f0f 40%, #2a1200 70%, #0f0800 100%)',
    accent: '#f0883e', border: '#2a1800', text: '#f5e6d0', subtext: '#a07850',
    badge: 'bg-amber-950 text-amber-400', label: '📣 Marketer',
    glow: '0 0 20px rgba(240,136,62,0.2)', particle: '#f0883e',
  },
} as const;

export const BADGE_MAP: Record<string, { label: string; emoji: string }> = {
  'first-click':   { label: 'First Click',      emoji: '🖱️' },
  'first-share':   { label: 'First Share',       emoji: '📤' },
  'first-like':    { label: 'First Like',        emoji: '❤️' },
  'early-bird':    { label: 'Early Bird',        emoji: '🐦' },
  'profile':       { label: 'Profile Complete',  emoji: '👤' },
  'mentor':        { label: 'Mentor',            emoji: '🎓' },
  'veteran':       { label: 'Veteran',           emoji: '🎖️' },
  'country-champ': { label: 'Country Champion',  emoji: '🏆' },
  'rising':        { label: 'Rising',            emoji: '⬆️' },
  'd1':            { label: 'Explorer',          emoji: '🚀' },
  'd2':            { label: 'Profile Set',       emoji: '✅' },
  'd3':            { label: 'Arena Explorer',    emoji: '🏟️' },
  'd6':            { label: 'Peer Reviewer',     emoji: '👥' },
  'd7':            { label: 'Week 1 Complete',   emoji: '🎯' },
  'd8':            { label: 'Planner',           emoji: '📋' },
  'd12':           { label: 'Shipped',           emoji: '🚢' },
  'd13':           { label: 'Code Reviewer',     emoji: '🔍' },
  'verified-cv':   { label: 'Verified CV',       emoji: '📄' },
  'returning':     { label: 'Returning',         emoji: '⭐' },
  'founder':       { label: 'Founder',           emoji: '⚡' },
};

export const NODE_MAP: Record<string, { name: string; color: string; emoji: string }> = {
  'node-1': { name: 'Alpha',  color: '#ff4d00', emoji: '🔴' },
  'node-2': { name: 'Beta',   color: '#00d4ff', emoji: '🔵' },
  'node-3': { name: 'Gamma',  color: '#ffd700', emoji: '🟡' },
  'node-4': { name: 'Delta',  color: '#00ff88', emoji: '🟢' },
};

export function safeFlag(flag: string | null): string {
  if (!flag) return '';
  return ['none', 'stalled', 'nudge', 'at-risk', 'shining'].includes(flag) ? '' : flag;
}

export function stripGithubUrl(raw: string | null): string {
  if (!raw) return '';
  return raw.replace('https://github.com/', '').replace('http://github.com/', '').replace(/\/$/, '');
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function tierLabel(tier: string | null): string {
  const map: Record<string, string> = {
    trial: 'Trial', member: 'Member',
    rising: '⬆ Rising', featured: '⭐ Featured', top: '🏆 Top',
  };
  return tier ? (map[tier] ?? tier) : '';
}

export function localTime(country: string): string {
  const tz = COUNTRY_TZ[country] ?? 'UTC';
  return new Intl.DateTimeFormat('en', {
    timeZone: tz, hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short', hour12: false,
  }).format(new Date());
}

export function formatBadge(slug: string): string {
  const b = BADGE_MAP[slug];
  return b ? `${b.emoji} ${b.label}` : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
