'use client';

import { useState, useEffect } from 'react';

// ── Timezone map — country → IANA tz ─────────────────────────
const COUNTRY_TZ: Record<string, string> = {
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

// ── Themes ────────────────────────────────────────────────────
const THEMES = {
  dev: {
    bg: 'linear-gradient(160deg, #0d1117 0%, #0a1628 40%, #0d1f2d 70%, #060d14 100%)',
    accent: '#00e5ff',
    border: '#1e3a4a',
    text: '#e6edf3',
    subtext: '#8b949e',
    badge: 'bg-cyan-900 text-cyan-300',
    label: '💻 Developer',
    glow: '0 0 20px rgba(0,229,255,0.15)',
    particle: '#00e5ff',
  },
  marketing: {
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #3b1f0f 40%, #2a1200 70%, #0f0800 100%)',
    accent: '#f0883e',
    border: '#2a1800',
    text: '#f5e6d0',
    subtext: '#a07850',
    badge: 'bg-amber-950 text-amber-400',
    label: '📣 Marketer',
    glow: '0 0 20px rgba(240,136,62,0.2)',
    particle: '#f0883e',
  },
} as const;

type TrackKey = keyof typeof THEMES;

// ── Badge Map ─────────────────────────────────────────────────
const BADGE_MAP: Record<string, { label: string; emoji: string }> = {
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
};

function formatBadge(slug: string): string {
  const b = BADGE_MAP[slug];
  return b
    ? `${b.emoji} ${b.label}`
    : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Types ─────────────────────────────────────────────────────
type NextCohort = {
  cohort: string;
  opens: string;
  opens_in_days: number;
  signups: number;
  apply_url: string;
};

type OfficeData = {
  handle: string;
  intern_id: string;
  name: string;
  initials: string;
  flag: string | null;
  color: string | null;
  track: TrackKey;
  country: string;
  progress_pct: number;
  role_title: string;
  badges: string[];
  tasks_done: number;
  submissions: number;
  last_seen: string | null;
  ad_id: string | null;
  ad_url: string | null;
  github_handle: string | null;
  stack: string | null;
  channels: string | null;
  bio: string | null;
  links: Record<string, string> | null;
  cohort: string;
  is_captain: boolean | null;
  team_id: string | null;
  captain_team: string | null;
  team_notes: string | null;
  cutoff_status: string | null;
  elevation_level?: number;
  elevation_note?: string | null;
  banner_url?: string | null;
  brand_slug?: string | null;
  arena: {
    points: number;
    tier: string | null;
    is_champion: boolean;
    streak: number;
    visits: number;
    brand_name: string | null;
  } | null;
  activity: {
    label: string;
    icon: string;
    created_at: string;
  }[];
  clock: {
    day: number;
    week: number;
    week_name: string;
    days_left_total: number;
    days_left_week: number | null;
    entry_open: boolean;
    next_cohort: NextCohort | null;
  } | null;
  presence: {
    sessions_active_1h: number;
    office_posts_today: number;
    virtual_office_live: boolean;
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────
function safeFlag(flag: string | null): string {
  if (!flag) return '';
  const invalid = ['none', 'stalled', 'nudge', 'at-risk', 'shining'];
  return invalid.includes(flag) ? '' : flag;
}

function stripGithubUrl(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace('https://github.com/', '')
    .replace('http://github.com/', '')
    .replace(/\/$/, '');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function tierLabel(tier: string | null): string {
  const map: Record<string, string> = {
    trial: 'Trial', member: 'Member',
    rising: '⬆ Rising', featured: '⭐ Featured', top: '🏆 Top',
  };
  return tier ? (map[tier] ?? tier) : '';
}

function localTime(country: string): string {
  const tz = COUNTRY_TZ[country] ?? 'UTC';
  return new Intl.DateTimeFormat('en', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  }).format(new Date());
}


const NODE_MAP: Record<string, { name: string; color: string; emoji: string }> = {
  'node-1': { name: 'Alpha',  color: '#ff4d00', emoji: '🔴' },
  'node-2': { name: 'Beta',   color: '#00d4ff', emoji: '🔵' },
  'node-3': { name: 'Gamma',  color: '#ffd700', emoji: '🟡' },
  'node-4': { name: 'Delta',  color: '#00ff88', emoji: '🟢' },
};

// ── Office Banner ─────────────────────────────────────────────
function OfficeBanner({
  bannerUrl, name, accent, border, teamId, isCaptain, captainTeam, track, brandSlug,
}: {
  bannerUrl: string | null | undefined;
  name: string; accent: string; border: string;
  teamId?: string | null; isCaptain?: boolean | null;
  captainTeam?: string | null; track?: string;
  brandSlug?: string | null;
}) {
  const node = teamId ? NODE_MAP[teamId] : null;

  // Track-aware CTA links
  const devLink     = 'https://github.com/ANTCPU/ads/issues';
  const mktLink     = brandSlug ? `https://antcpu-ads.vercel.app/arena/${brandSlug}` : 'https://antcpu-ads.vercel.app/arena';
  const ctaUrl      = track === 'marketing' ? mktLink : devLink;
  const ctaLabel    = track === 'marketing' ? '→ Arena' : '→ GitHub Issues';
  const captainUrl  = captainTeam
    ? `https://antcpu-ads.vercel.app/office/${captainTeam}`
    : null;

  return (
    <div className="mb-6 rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
      {/* Banner image if set */}
      {bannerUrl && (
        <div style={{ aspectRatio: '1200 / 630', position: 'relative', background: '#f0e8dc' }}>
          <img src={bannerUrl} alt={`${name}'s office`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Node team strip — always shown if team assigned */}
      {node && (
        <div style={{
          background: `${node.color}18`,
          borderTop: bannerUrl ? `1px solid ${border}` : 'none',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              background: node.color, color: '#000', fontWeight: 700,
              fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px',
            }}>
              {node.emoji} NODE {teamId?.split('-')[1]?.toUpperCase()} — {node.name.toUpperCase()}
            </span>
            {isCaptain && (
              <span style={{
                background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70055',
                fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px',
              }}>
                👑 Captain
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {captainUrl && !isCaptain && (
              <a href={captainUrl} target="_blank" rel="noreferrer" style={{
                fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
                border: `1px solid ${node.color}`, color: node.color, textDecoration: 'none',
              }}>
                → Captain Office
              </a>
            )}
            <a href={`https://antcpu-ads.vercel.app/squad/${teamId}`} style={{
              fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
              border: `1px solid ${node.color}44`, color: node.color, textDecoration: 'none',
            }}>
              👥 View Squad
            </a>
            <a href={ctaUrl} target="_blank" rel="noreferrer" style={{
              fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
              background: node.color, color: '#000', fontWeight: 600, textDecoration: 'none',
            }}>
              {ctaLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Elevation Banner ──────────────────────────────────────────
function ElevationBanner({
  level, track, accent, border,
}: {
  level?: number; track: string;
  accent: string; border: string;
}) {
  if (!level || level < 2) return null;

  const isBuilder = level >= 3;
  const emoji = isBuilder ? '🔥' : '⬆️';
  const title = isBuilder
    ? 'Week 2 Builder — Selected'
    : 'Week 2 Contender — Watch List';
  const message = isBuilder
    ? "You've been selected as a potential Week 3 team lead. Gate d8 is open. Fork the repo, write your PLAN.md, reply to Issue #1. Your work gets reviewed by Arena4 personally."
    : "You're on the watch list. Hit d8 this week to move up to Builder status.";
  const mentor = track === 'marketing'
    ? 'Mohamed39, Marketing Lead'
    : 'Arena4, Dev Lead';

  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{
        border: `1px solid ${accent}`,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wide mb-1"
        style={{ color: accent }}
      >
        {emoji} {title}
      </p>
      <p className="text-sm mb-2 leading-relaxed opacity-80">
        {message}
      </p>
      <p className="text-xs opacity-40">
        — {mentor} · antcpu.io
      </p>
    </div>
  );
}

// ── Office Message Panel ──────────────────────────────────────
function OfficeMessagePanel({
  cohort, handle, track, accent, border, subtext,
}: {
  cohort: string; handle: string; track: string;
  accent: string; border: string; subtext: string;
}) {
  const rooms = track === 'marketing'
    ? ['general', 'marketing', 'mentors', 'standups']
    : ['general', 'dev', 'mentors', 'standups'];

  const roomLabels: Record<string, string> = {
    general:   '💬 General',
    dev:       '💻 Dev',
    marketing: '📣 Marketing',
    standups:  '📋 Standups',
    mentors:   '🎓 Mentors',
  };

  const [activeRoom, setActiveRoom] = useState(rooms[0]);
  const [messages, setMessages] = useState<{
    id: string;
    author_name: string;
    content: string;
    created_at: string;
  }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/internship/office?cohort=${cohort}&room=${activeRoom}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []));
  }, [activeRoom, cohort]);

  async function send() {
    if (!input.trim()) return;
    setSending(true);
    await fetch('/api/internship/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort,
        room: activeRoom,
        author_id: handle,
        author_name: handle,
        author_type: 'challenger',
        content: input.trim(),
      }),
    });
    setInput('');
    setSending(false);
    fetch(`/api/internship/office?cohort=${cohort}&room=${activeRoom}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []));
  }

  return (
    <div className="rounded-lg mb-6" style={{ border: `1px solid ${border}`, background: 'rgba(255,255,255,0.02)' }}>

      {/* Room tabs */}
      <div className="flex border-b" style={{ borderColor: border }}>
        {rooms.map(r => (
          <button
            key={r}
            onClick={() => setActiveRoom(r)}
            className="flex-1 text-xs py-2.5 font-semibold transition-colors"
            style={{
              color: activeRoom === r ? accent : subtext,
              borderBottom: activeRoom === r
                ? `2px solid ${accent}`
                : '2px solid transparent',
            }}
          >
            {roomLabels[r]}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="p-3 space-y-3 min-h-[80px] max-h-[200px] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {messages.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: subtext }}>
            No messages yet. Be the first.
          </p>
        ) : (
          messages.slice(0, 5).map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: accent }}>
                  {m.author_name}
                </span>
                <span className="text-xs opacity-40">
                  {relativeTime(m.created_at)}
                </span>
              </div>
              <p className="opacity-80 mt-0.5">{m.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t" style={{ borderColor: border }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Message #${activeRoom}...`}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: '#ccc' }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="text-xs px-3 py-1 rounded font-semibold disabled:opacity-30"
          style={{ background: accent, color: '#000' }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ── Share Strip ───────────────────────────────────────────────
function OfficeShareStrip({
  handle, name, track, accent, border, subtext,
}: {
  handle: string; name: string; track: string;
  accent: string; border: string; subtext: string;
}) {
  const [copied, setCopied] = useState(false);
  const officeUrl = `https://antcpu-ads.vercel.app/office/${handle}`;
  const trackLabel = track === 'dev' ? '💻 Dev' : '📣 Marketing';
  const isFounder  = handle === 'Antony0';
  const shareText  = isFounder
    ? `Building the antcpu Arena — automated marketing for the next generation of brands.\n\n${officeUrl}`
    : `${name} is building in the antcpu internship challenge — ${trackLabel} track.\n\n${officeUrl}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(officeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platforms = [
    { label: 'WhatsApp',  icon: '💬', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: 'X',         icon: '𝕏',  url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
    { label: 'LinkedIn',  icon: 'in', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(officeUrl)}` },
    { label: 'Bluesky',   icon: '🦋', url: `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}` },
    { label: 'Pinterest', icon: '📌', url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(officeUrl)}&description=${encodeURIComponent(shareText)}` },
    { label: 'Tumblr',    icon: '📝', url: `https://www.tumblr.com/share/link?url=${encodeURIComponent(officeUrl)}&description=${encodeURIComponent(shareText)}` },
    { label: 'Telegram',  icon: '✈️', url: `https://t.me/share/url?url=${encodeURIComponent(officeUrl)}&text=${encodeURIComponent(shareText)}` },
    { label: 'Reddit',    icon: '🔴', url: `https://reddit.com/submit?url=${encodeURIComponent(officeUrl)}&title=${encodeURIComponent(shareText)}` },
    { label: 'Facebook',  icon: '👤', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(officeUrl)}` },
  ];

  return (
    <div className="rounded-lg p-4 mb-6" style={{ border: `1px solid ${border}` }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: accent }}>
        📣 Share Your Office
      </p>
      <p className="text-xs mb-3" style={{ color: subtext }}>
        Show the world you're building.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex-1 text-xs truncate opacity-60 font-mono">{officeUrl}</span>
        <button
          onClick={copyUrl}
          className="text-xs px-3 py-1 rounded font-semibold transition-all"
          style={{
            background: copied ? accent : 'transparent',
            color: copied ? '#000' : accent,
            border: `1px solid ${accent}`,
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <a
            key={p.label}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs py-2 px-3 rounded font-semibold"
            style={{ border: `1px solid ${border}`, color: accent }}
          >
            {p.icon} {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Next Action Bubble ───────────────
function NextActionPanel({
  progress, clock, handle, accent, border, subtext, brandSlug,
}: {
  progress: number; clock: OfficeData['clock'];
  handle: string; accent: string; border: string; subtext: string;
  brandSlug?: string | null;
}) {
  if (!clock) return null;

  const daysLeft  = clock.days_left_total ?? 0;
  const week      = clock.week ?? 1;
  const weekName  = clock.week_name ?? 'Explorer';
  const day       = clock.day ?? 1;
  const arenaHref = brandSlug
    ? `https://antcpu-ads.vercel.app/arena/${brandSlug}`
    : 'https://antcpu-ads.vercel.app/arena';

  const iconRow = (
    <div className="flex gap-2 mb-3 flex-wrap">
      <a href={arenaHref} target="_blank" rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded font-semibold"
        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
        ⚡ Arena
      </a>
      <a href={`https://antcpu-ads.vercel.app/office/${handle}`} target="_blank" rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded font-semibold"
        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
        🏢 Office
      </a>
      <a href="https://github.com/ANTCPU" target="_blank" rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded font-semibold"
        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
        🐙 GitHub
      </a>
      <a href="https://antcpu.io" target="_blank" rel="noopener noreferrer"
        className="text-xs px-2 py-1 rounded font-semibold"
        style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
        🌐 antcpu.io
      </a>
    </div>
  );

  // 100% complete
  if (progress >= 99) {
    return (
      <div className="rounded-lg p-4 mt-4"
        style={{ border: `1px solid ${accent}`, background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
          🏆 Challenge Complete
        </p>
        <p className="text-sm font-semibold mb-3">
          Week {week} — {weekName} · {daysLeft} days left
        </p>
        {iconRow}
        <a href={`https://antcpu-ads.vercel.app/office/${handle}`}
          target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs font-bold py-2 rounded transition-opacity hover:opacity-80"
          style={{ background: accent, color: '#000' }}>
          Share Your Office →
        </a>
      </div>
    );
  }

  // Active — in progress
  if (progress > 0) {
    return (
      <div className="rounded-lg p-4 mt-4"
        style={{ border: `1px solid ${accent}`, background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
          ⚡ Up Next
        </p>
        <p className="text-sm font-semibold mb-1">
          Week {week} — {weekName}
        </p>
        <p className="text-xs mb-3" style={{ color: subtext }}>
          Day {day} · {daysLeft} days left in the challenge
        </p>
        {iconRow}
        <a href="https://antcpu.io/next/"
          target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs font-bold py-2 rounded transition-opacity hover:opacity-80"
          style={{ background: accent, color: '#000' }}>
          Go to Next Task →
        </a>
      </div>
    );
  }

  // Visitor / not yet started — next cohort
  const next = clock.next_cohort;
  if (!next) return null;
  const month = new Date(next.opens).toLocaleDateString('en', {
    month: 'long', year: 'numeric',
  });

  return (
    <div className="rounded-lg p-4 mt-4" style={{ border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">🗓 {month} Cohort</p>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: accent, color: '#000' }}>
          {next.opens_in_days}d
        </span>
      </div>
      {next.signups > 0 && (
        <p className="text-xs mb-3 font-semibold" style={{ color: '#aaa' }}>
          ⚡ {next.signups} already signed up
        </p>
      )}
      <a href={next.apply_url} target="_blank" rel="noopener noreferrer"
        className="block text-center text-xs font-bold py-2 rounded"
        style={{ background: accent, color: '#000' }}>
        Apply for {month} →
      </a>
    </div>
  );
}



// ── D15 Intro Button — owner only, Week 3, at 50% ────────────
function D15IntroButton({
  handle, internId, name, track, country, cohort, accent, border,
}: {
  handle: string; internId: string; name: string;
  track: string; country: string; cohort: string;
  accent: string; border: string;
}) {
  const storageKey = `d15_done_${handle}`;
  const [state, setState] = useState<'idle'|'loading'|'done'>(() => {
    try { return localStorage.getItem(storageKey) === '1' ? 'done' : 'idle'; }
    catch { return 'idle'; }
  });

  async function handleClick() {
    if (state !== 'idle') return;
    setState('loading');
    const trackEmoji = track === 'marketing' ? '📣 Marketing' : '💻 Dev';
    const msg = `👋 Hey team! I'm ${name} — ${trackEmoji} · ${country}. Ready to build. Check my office: https://antcpu-ads.vercel.app/office/${handle}`;
    await Promise.allSettled([
      fetch('/api/internship/office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort, room: 'general', author_id: handle, content: msg }),
      }),
      fetch('/api/internship/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intern_id: internId, gate_id: 'd15' }),
      }),
    ]);
    try { localStorage.setItem(storageKey, '1'); } catch {}
    setState('done');
  }

  if (state === 'done') {
    return (
      <div className="rounded-lg p-4 mb-4 text-sm font-bold flex items-center gap-2"
        style={{ background: `${accent}22`, border: `1px solid ${accent}`, color: accent }}>
        <span>✅ d15 complete — Team intro posted · 55% unlocked</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="w-full rounded-lg p-4 mb-4 text-sm font-bold text-left flex items-center justify-between disabled:opacity-50"
      style={{ background: accent, color: '#000', border: 'none', cursor: state === 'loading' ? 'wait' : 'pointer' }}
    >
      <span>{state === 'loading' ? 'Posting intro...' : '👋 Introduce Yourself to Your Team — d15'}</span>
      <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>50% → 55%</span>
    </button>
  );
}


// ── Admin Slideout — Founder only ────────────────────────────
function AdminSlideout({ accent, border, cohort }: { accent: string; border: string; cohort: string }) {
  const [open, setOpen]           = useState(false);
  const [challengers, setChallengers] = useState<{
    handle: string; name: string; track: string;
    progress_pct: number; country: string; email: string | null;
  }[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!open || challengers.length) return;
    setLoading(true);
    fetch(`/api/internship/challengers?view=public&cohort=${cohort}`)
      .then(r => r.json())
      .then(d => setChallengers(d.challengers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const adminLinks = [
    { label: '⚡ Command Centre', href: '/dashboard/antcpu' },
    { label: '👥 Users',          href: '/dashboard/users'  },
    { label: '🤖 Agents',         href: '/dashboard/agents' },
    { label: '🏆 Leaderboard',    href: '/champions'        },
    { label: '🏟 Arena',          href: '/arena'            },
  ];

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: accent, color: '#000', border: 'none',
          borderRadius: '999px', padding: '0.6rem 1rem',
          fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
          boxShadow: `0 4px 20px ${accent}55`,
        }}
      >
        {open ? '✕ Close' : '⚡ Admin'}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Slideout panel */}
      <div style={{
        position: 'fixed', top: 0, right: open ? 0 : '-360px',
        width: '340px', height: '100vh', zIndex: 9999,
        background: '#0d1117', borderLeft: `1px solid ${border}`,
        overflowY: 'auto', transition: 'right 0.3s ease',
        padding: '1.5rem 1rem 4rem',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: accent, marginBottom: '1rem' }}>
          ⚡ Admin Panel
        </div>

        {/* Quick links */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            Quick Links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {adminLinks.map(l => (
              <a key={l.href} href={l.href}
                style={{
                  display: 'block', padding: '0.45rem 0.75rem',
                  background: '#161b22', border: `1px solid ${border}`,
                  borderRadius: '8px', color: accent,
                  fontSize: '0.78rem', fontWeight: 600,
                  textDecoration: 'none',
                }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Challenger offices */}
        <div>
          <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            Challenger Offices
          </div>
          {loading && (
            <div style={{ fontSize: '0.78rem', color: '#666', padding: '0.5rem 0' }}>Loading...</div>
          )}
          {!loading && challengers.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: '#666', padding: '0.5rem 0' }}>No challengers found.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {challengers.map(c => (
              <div key={c.handle}
                style={{
                  background: '#161b22', border: `1px solid ${border}`,
                  borderRadius: '8px', padding: '0.5rem 0.75rem',
                }}>
                {/* Name + progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e6edf3' }}>
                      {c.track === 'marketing' ? '📣' : '💻'} {c.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.1rem' }}>
                      {c.country} · {c.progress_pct}%
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: accent, fontWeight: 700 }}>
                    {c.progress_pct}%
                  </span>
                </div>
                {/* Dual links */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <a href={`/office/${c.handle}`}
                    style={{
                      flex: 1, textAlign: 'center', padding: '0.3rem 0',
                      background: `${accent}18`, border: `1px solid ${accent}44`,
                      borderRadius: '6px', color: accent,
                      fontSize: '0.68rem', fontWeight: 700, textDecoration: 'none',
                    }}>
                    🏢 Office
                  </a>
                  {c.email && (
                    <a href={`/profile/${encodeURIComponent(c.email)}`}
                      style={{
                        flex: 1, textAlign: 'center', padding: '0.3rem 0',
                        background: '#1c2128', border: `1px solid ${border}`,
                        borderRadius: '6px', color: '#8b949e',
                        fontSize: '0.68rem', fontWeight: 700, textDecoration: 'none',
                      }}>
                      👤 Profile
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function OfficeClient({ data }: { data: OfficeData }) {
  const theme = THEMES[data.track] ?? THEMES.dev;

  const flag = safeFlag(data.flag);

  // ── Track bg — elevation 99 gets cream, marketing gets gradient, dev stays flat
  const resolvedBg = (data.elevation_level ?? 0) >= 99
    ? 'linear-gradient(160deg, #c8a882 0%, #8b5e3c 40%, #5c3317 70%, #2a1500 100%)'
    : theme.bg;
  const githubHandle = stripGithubUrl(data.github_handle);
  const arenaUrl = data.brand_slug ? `https://antcpu-ads.vercel.app/arena/${data.brand_slug}` : 'https://antcpu-ads.vercel.app/arena';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Online count from presence ──
  const onlineCount = data.presence?.sessions_active_1h ?? 0;

  // ── Is this the session owner? ──
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('antcpu_session') || '{}');
      if (s?.handle && s.handle === data.handle) setIsOwner(true);
    } catch {}
  }, [data.handle]);

  // ── Workspace route by track ──
  const workspaceHref = data.track === 'marketing' ? '/marketing/' : '/dev/';
  const workspaceLabel = data.track === 'marketing' ? '📣 Go to Workspace' : '💻 Go to Workspace';

  // ── Week 2 deadline warning ──
  const daysLeftWeek = data.clock?.days_left_week ?? null;
  const showDeadlineBanner = daysLeftWeek !== null && daysLeftWeek <= 2 && (data.clock?.week ?? 0) === 2;

  // ── Session ping — fires on mount, updates last_seen ──────
  useEffect(() => {
    if (!data.handle) return;
    fetch('/api/internship/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intern_id: data.intern_id ?? data.handle }),
    }).catch(() => {});
  }, [data.handle]);

  // ── Season emoji ─────────────────────────────────────────────────────────
  const [seasonEmoji, setSeasonEmoji] = useState('');
  useEffect(() => {
    const month = new Date().getMonth() + 1;
    if (month === 10)                    setSeasonEmoji('🎃');
    else if (month === 11 || month === 12 || month === 1) setSeasonEmoji('❄️');
    else if (month === 4)                setSeasonEmoji('🌸');
    else if (month >= 6 && month <= 8)   setSeasonEmoji('☀️');
  }, []);

  const isInactive =
    data.cutoff_status === 'paused' ||
    (data.progress_pct < 25 && data.progress_pct > 0);

  const tz = COUNTRY_TZ[data.country] ?? 'UTC';
  const tzName = tz.split('/').pop()?.replace('_', ' ') ?? 'UTC';

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: ${theme.glow}; }
          50% { box-shadow: 0 0 32px ${theme.particle}55; }
        }
        @keyframes drift-particle {
          0% { transform: translateY(-20px) translateX(0px); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { transform: translateY(110vh) translateX(40px); opacity: 0; }
        }
      `}</style>

      <div
        className="office-root"
        style={{
          background: resolvedBg,
          color: theme.text,
          minHeight: '100vh',
        }}>
        <div className="p-6 max-w-2xl mx-auto pb-16">

          {/* ── Header ── */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{
                background: data.color ?? theme.accent,
                color: theme.bg,
                border: `2px solid ${theme.accent}`,
                animation: mounted ? 'pulse-glow 3s ease-in-out infinite' : 'none',
              }}
            >
              {data.initials ?? data.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold" style={{ textShadow: `0 1px 8px rgba(0,0,0,0.5)` }}>{seasonEmoji ? `${seasonEmoji} ` : ''}{data.name}</h1>
                {data.is_captain && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">
                    ⚓ Captain
                  </span>
                )}
              </div>
              <p className="text-sm mt-0.5" style={{ color: theme.accent }}>
                {flag && <span className="mr-1">{flag}</span>}
                {data.country} · {theme.label}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1 px-3 py-1.5 rounded-lg" style={{ background: '#1c1f26' }}>
                {(data.elevation_level ?? 0) >= 99 ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: theme.accent, color: '#000' }}
                  >
                    ⚡ Founder · ANTCPU
                  </span>
                ) : (
                  <span className="text-sm opacity-70">{data.role_title}</span>
                )}
                {data.arena?.is_champion && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">
                    🏆 Country Champion
                  </span>
                )}
                {data.arena?.tier && data.arena.tier !== 'trial' && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ border: `1px solid ${theme.border}`, color: theme.accent }}
                  >
                    {tierLabel(data.arena.tier)}
                  </span>
                )}
                {(data.elevation_level ?? 0) >= 99 && (
                  <span className="text-xs opacity-50">
                    Veteran-owned · United States
                  </span>
                )}
              {mounted && onlineCount > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: theme.subtext }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  {onlineCount} online now
                </span>
              )}
              </div>
            </div>
          </div>

                    {/* ── Office Banner ── */}
          <OfficeBanner
            bannerUrl={(data as any).banner_url}
            name={data.name}
            accent={theme.accent}
            border={theme.border}
            teamId={data.team_id}
            isCaptain={data.is_captain}
            captainTeam={(data as any).captain_team}
            track={data.track}
            brandSlug={data.brand_slug}
          />
          
          {/* ── D15 Intro Button — owner only, Week 3, at 50% ── */}
          {isOwner && data.progress_pct === 50 && (data.clock?.week ?? 0) >= 3 && data.team_id && (
            <D15IntroButton
              handle={data.handle}
              internId={data.intern_id}
              name={data.name}
              track={data.track}
              country={data.country}
              cohort={data.cohort}
              accent={theme.accent}
              border={theme.border}
            />
          )}

          {/* ── Progress ── */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: theme.subtext }}>
                {data.clock
                  ? `Day ${data.clock.day} · Week ${data.clock.week} · ${data.clock.week_name}`
                  : 'Progress'}
              </span>
              {data.clock?.week && (
                <a href={`/internship/week/${data.clock.week}`}
                  style={{ fontSize: '0.68rem', color: '#f97316',
                    textDecoration: 'none', marginLeft: '0.5rem', opacity: 0.85 }}>
                  Week {data.clock.week} tasks →
                </a>
              )}
              <span className="font-bold" style={{ color: theme.accent }}>
                {data.progress_pct}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.border }}>
              <div
                className="h-3 rounded-full"
                style={{
                  width: mounted ? `${data.progress_pct}%` : '0%',
                  background: theme.accent,
                  boxShadow: data.progress_pct > 0 ? theme.glow : 'none',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>

          {/* ── Week 2 deadline banner ── */}
          {showDeadlineBanner && (
            <div
              className="rounded-lg p-3 mb-4 text-sm font-medium flex items-center gap-2"
              style={{ background: 'rgba(224,123,32,0.1)', border: `1px solid ${theme.accent}`, color: theme.accent }}
            >
              <span>⏳</span>
              <span>Week 2 closes in {daysLeftWeek} day{daysLeftWeek === 1 ? '' : 's'} — submit your build.</span>
            </div>
          )}

          {/* ── Workspace button — owner only ── */}
          {isOwner && (
            <a
              href={workspaceHref}
              className="flex items-center justify-between rounded-lg p-4 mb-4 text-sm font-bold"
              style={{ background: theme.accent, color: '#fff', textDecoration: 'none' }}
            >
              <span>{workspaceLabel} →</span>
              <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>{data.progress_pct}% complete</span>
            </a>
          )}

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Tasks',     value: data.tasks_done,        icon: '✅' },
              { label: 'Submitted', value: data.submissions,       icon: '📤' },
              { label: 'Arena Pts', value: data.arena?.points ?? 0, icon: '⚡' },
              { label: 'Badges',    value: data.badges.length,     icon: '🎖' },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="rounded-lg p-3 text-center"
                style={{ border: `1px solid ${theme.border}` }}
              >
                <div className="text-lg mb-0.5">{icon}</div>
                <div className="text-xl font-bold" style={{ color: theme.accent }}>{value}</div>
                <div className="text-xs opacity-50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Elevation Banner ── */}
          <ElevationBanner
            level={data.elevation_level}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
          />

          {/* ── Message Panel ── */}
          <OfficeMessagePanel
            cohort={data.cohort}
            handle={data.handle}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
            subtext={theme.subtext}
          />

          {/* ── Bio ── */}
          {data.bio && (
            <div
              className="rounded-lg p-4 mb-4 text-sm leading-relaxed"
              style={{ border: `1px solid ${theme.border}`, color: theme.subtext }}
            >
              {data.bio}
            </div>
          )}

          {/* ── Dev extras ── */}
          {data.track === 'dev' && (githubHandle || data.stack) && (
            <div
              className="rounded-lg p-3 mb-4 flex flex-wrap gap-3 text-sm"
              style={{ border: `1px solid ${theme.border}` }}
            >
              {githubHandle && (
                <a
                  href={`https://github.com/${githubHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: theme.accent }}
                >
                  🐙 {githubHandle}
                </a>
              )}
              {data.stack && (
                <span style={{ color: theme.subtext }}>🛠 {data.stack}</span>
              )}
            </div>
          )}

          {/* ── Marketer extras ── */}
          {data.track === 'marketing' && data.channels && (
            <div
              className="rounded-lg p-3 mb-4 text-sm"
              style={{ border: `1px solid ${theme.border}`, color: theme.subtext }}
            >
              📣 {data.channels}
            </div>
          )}

          {/* ── Links ── */}
          {data.links && Object.keys(data.links).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data.links)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ border: `1px solid ${theme.border}`, color: theme.accent }}
                  >
                    {k} →
                  </a>
                ))}
            </div>
          )}

          {/* ── Arena ad link ── */}
          {data.ad_id && (
            <a
              href={arenaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg p-4 mb-4 text-sm font-medium"
              style={{ border: `1px solid ${theme.accent}`, color: theme.accent }}
            >
              <span>⚡ View Live Arena Ad</span>
              <span>→</span>
            </a>
          )}

          {/* ── Badges ── */}
          {data.badges.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
                Badges
              </p>
              <div className="flex flex-wrap gap-2">
                {data.badges.map((b, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full ${theme.badge}`}>
                    {formatBadge(b)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Share strip ── */}
          <OfficeShareStrip
            handle={data.handle}
            name={data.name}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
            subtext={theme.subtext}
          />

          {/* ── Recent activity ── */}
          {data.activity.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
                Recent Activity
              </p>
              <ul className="space-y-2">
                {data.activity.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm py-2"
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                  >
                    <span className="flex items-center gap-2">
                      <span>{a.icon}</span>
                      <span style={{ color: theme.subtext }}>{a.label}</span>
                    </span>
                    <span className="text-xs opacity-40">{relativeTime(a.created_at)}</span>
                  </li>
              ))}
              </ul>
            </div>
          )}

          {/* ── Next action / next cohort ── */}
          <NextActionPanel
            progress={data.progress_pct}
            clock={data.clock}
            handle={data.handle}
            accent={theme.accent}
            border={theme.border}
            subtext={theme.subtext}
            brandSlug={data.brand_slug}
          />

          {/* ── Footer ── */}
          <div className="mt-6 text-center space-y-1">
            <p className="text-xs opacity-30">
              {data.clock
                ? `Day ${data.clock.day} · Week ${data.clock.week} · ${data.clock.week_name} · ${data.cohort}`
                : data.cohort}
            </p>
            <p className="text-xs opacity-20">
              {mounted ? localTime(data.country) : ''} · {tzName}
            </p>
          </div>

        </div>
      </div>

      {/* ── Admin slideout — founder only ── */}
      {data.handle === 'Antony0' && (
        <AdminSlideout accent={theme.accent} border={theme.border} cohort={data.cohort} />
      )}
    </>
  );
}

              
