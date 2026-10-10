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
    bg: '#0d1117',
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
    bg: '#faf6f0',
    accent: '#c2600a',
    border: '#e8d5c0',
    text: '#1a0e00',
    subtext: '#7a5c3a',
    badge: 'bg-amber-100 text-amber-800',
    label: '📣 Marketer',
    glow: '0 0 20px rgba(194,96,10,0.12)',
    particle: '#c2600a',
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
  cutoff_status: string | null;
  elevation_level?: number;
  elevation_note?: string | null;
  banner_url?: string | null;
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
    entry_open: boolean;
    next_cohort: NextCohort | null;
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

// ── Office Banner ─────────────────────────────────────────────
function OfficeBanner({
  bannerUrl, name, accent, border,
}: {
  bannerUrl: string | null | undefined;
  name: string; accent: string; border: string;
}) {
  if (!bannerUrl) return null;

  return (
    <div
      className="w-full rounded-xl overflow-hidden mb-6"
      style={{
        border: `1px solid ${border}`,
        aspectRatio: '1200 / 630',
        position: 'relative',
        background: '#f0e8dc',
      }}
    >
      <img
        src={bannerUrl}
        alt={`${name}'s office`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
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
    : "You're on the Week 3 watch list. Hit d8 this week to move up to Builder status.";
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
    ? ['general', 'marketing', 'standups']
    : ['general', 'dev', 'standups'];

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
    <div className="rounded-lg mb-6" style={{ border: `1px solid ${border}` }}>

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
      <div className="p-3 space-y-3 min-h-[80px] max-h-[200px] overflow-y-auto">
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
          style={{ color: accent }}
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
  const shareText = `${name} is building in the antcpu internship challenge — ${trackLabel} track.\n\n${officeUrl}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(officeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platforms = [
    { label: 'WhatsApp', icon: '💬', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: 'X',        icon: '𝕏',  url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
    { label: 'LinkedIn', icon: 'in', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(officeUrl)}` },
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
      <div className="flex gap-2">
        {platforms.map((p) => (
          <a
            key={p.label}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-2 rounded font-semibold"
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
  progress, clock, handle, accent, border, subtext,
}: {
  progress: number; clock: OfficeData['clock'];
  handle: string; accent: string; border: string; subtext: string;
}) {
  if (!clock) return null;

  const daysLeft = clock.days_left_total ?? 0;
  const week     = clock.week ?? 1;
  const weekName = clock.week_name ?? 'Explorer';
  const day      = clock.day ?? 1;

  // Active challenger — show next task prompt
  if (progress > 0) {
    return (
      <div
        className="rounded-lg p-4 mt-4"
        style={{ border: `1px solid ${accent}`, background: 'rgba(255,255,255,0.03)' }}
      >
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
          ⚡ Up Next
        </p>
        <p className="text-sm font-semibold mb-1">
          Week {week} — {weekName}
        </p>
        <p className="text-xs mb-3" style={{ color: subtext }}>
          Day {day} · {daysLeft} days left in the challenge
        </p>
        <a
          href="https://antcpu.io/next/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs font-bold py-2 rounded transition-opacity hover:opacity-80"
          style={{ background: accent, color: '#000' }}
        >
          Go to Next Task →
        </a>
      </div>
    );
  }

  // Visitor / not yet a challenger — show next cohort
  const next = clock.next_cohort;
  if (!next) return null;
  const month = new Date(next.opens).toLocaleDateString('en', {
    month: 'long', year: 'numeric',
  });

  return (
    <div
      className="rounded-lg p-4 mt-4"
      style={{ border: `1px solid ${border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">🗓 {month} Cohort</p>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ background: accent, color: '#000' }}
        >
          {next.opens_in_days}d
        </span>
      </div>
      {next.signups > 0 && (
        <p className="text-xs mb-3 font-semibold" style={{ color: accent }}>
          ⚡ {next.signups} already signed up
        </p>
      )}
      <a
        href={next.apply_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs font-bold py-2 rounded"
        style={{ background: accent, color: '#000' }}
      >
        Apply for {month} →
      </a>
    </div>
  );
}


// ── Main Component ────────────────────────────────────────────
export default function OfficeClient({ data }: { data: OfficeData }) {
  const theme = THEMES[data.track] ?? THEMES.dev;

  // ── Brightness override — respect user sitewide preference ──────────────
  // Reads arena_brightness from localStorage (set by NavIsland/ThemeSwitcher).
  // Overrides track default bg when user has explicitly chosen a brightness.
  const BG_OVERRIDE: Record<string, string> = {
    'dark':       '#0a0a0a',
    'mid':        '#111111',
    'light-grey': '#2a2a2a',
    'light':      '#3a3a3a',
  };
  const storedBrightness = typeof window !== 'undefined'
    ? localStorage.getItem('arena_brightness') ?? ''
    : '';
  const resolvedBg = BG_OVERRIDE[storedBrightness] ?? theme.bg;
  const flag = safeFlag(data.flag);
  const githubHandle = stripGithubUrl(data.github_handle);
  const arenaUrl = 'https://antcpu-ads.vercel.app/arena';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isInactive =
    data.cutoff_status === 'paused' ||
    (data.progress_pct < 25 && data.progress_pct > 0);

  const tz = COUNTRY_TZ[data.country] ?? 'UTC';
  const tzName = tz.split('/').pop()?.replace('_', ' ') ?? 'UTC';

  return (
    <>
      <style>{`
        .office-root {
          background: ${resolvedBg} !important;
          color: ${theme.text} !important;
          min-height: 100vh;
        }
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

      <div className="office-root">
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
                <h1 className="text-2xl font-bold">{data.name}</h1>
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
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-sm opacity-70">{data.role_title}</span>
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
              </div>
            </div>
          </div>

                    {/* ── Office Banner ── */}
          <OfficeBanner
            bannerUrl={(data as any).banner_url}
            name={data.name}
            accent={theme.accent}
            border={theme.border}
          />
          
          {/* ── Progress ── */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: theme.subtext }}>
                {data.clock
                  ? `Day ${data.clock.day} · Week ${data.clock.week} · ${data.clock.week_name}`
                  : 'Progress'}
              </span>
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
    </>
  );
}

              
