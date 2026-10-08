'use client';

import { useState } from 'react';

// ── Themes ────────────────────────────────────────────────────────────────────

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
  },
  marketing: {
    bg: '#2c1a0e',
    accent: '#e87c2e',
    border: '#8b4513',
    text: '#fdf3e7',
    subtext: '#c4a882',
    badge: 'bg-amber-900 text-amber-200',
    label: '📣 Marketer',
    glow: '0 0 20px rgba(232,124,46,0.15)',
  },
} as const;

type TrackKey = keyof typeof THEMES;

// ── Types ─────────────────────────────────────────────────────────────────────

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
  } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function tierLabel(tier: string | null): string {
  const map: Record<string, string> = {
    trial: 'Trial',
    member: 'Member',
    rising: '⬆ Rising',
    featured: '⭐ Featured',
    top: '🏆 Top',
  };
  return tier ? (map[tier] ?? tier) : '';
}

// ── Share Strip ───────────────────────────────────────────────────────────────

function OfficeShareStrip({
  handle,
  name,
  track,
  accent,
  border,
}: {
  handle: string;
  name: string;
  track: string;
  accent: string;
  border: string;
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
    {
      label: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'X',
      icon: '𝕏',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'LinkedIn',
      icon: 'in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(officeUrl)}`,
    },
  ];

  return (
    <div
      className="rounded-lg p-4 mt-6"
      style={{ border: `1px solid ${border}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-3">
        Share This Office
      </p>

      {/* URL copy row */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="flex-1 text-xs truncate opacity-60 font-mono"
        >
          {officeUrl}
        </span>
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

      {/* Platform buttons */}
      <div className="flex gap-2">
        {platforms.map((p) => (
          <a
            key={p.label}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-2 rounded font-semibold transition-opacity hover:opacity-80"
            style={{
              border: `1px solid ${border}`,
              color: accent,
            }}
          >
            {p.icon} {p.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OfficeClient({ data }: { data: OfficeData }) {
  const theme = THEMES[data.track] ?? THEMES.dev;
  const flag = safeFlag(data.flag);
  const githubHandle = stripGithubUrl(data.github_handle);
  const arenaUrl = 'https://antcpu-ads.vercel.app/arena';

  return (
    <>
      {/* Scoped style — beats global layout override */}
      <style>{`
        .office-root {
          background: ${theme.bg} !important;
          color: ${theme.text} !important;
          min-height: 100vh;
        }
      `}</style>

      <div className="office-root">
        <div className="p-6 max-w-2xl mx-auto pb-16">

          {/* ── Header ── */}
          <div className="flex items-center gap-4 mb-6">
            {/* Avatar with color ring + glow */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{
                background: data.color ?? theme.accent,
                color: theme.bg,
                boxShadow: theme.glow,
                border: `2px solid ${theme.accent}`,
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
                {data.arena?.tier && (
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
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: theme.border }}
            >
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${data.progress_pct}%`,
                  background: theme.accent,
                  boxShadow: data.progress_pct > 0 ? theme.glow : 'none',
                }}
              />
            </div>
          </div>

          {/* ── Stats grid — 4 cards ── */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: 'Tasks', value: data.tasks_done, icon: '✅' },
              { label: 'Submitted', value: data.submissions, icon: '📤' },
              { label: 'Arena Pts', value: data.arena?.points ?? 0, icon: '⚡' },
              { label: 'Badges', value: data.badges.length, icon: '🎖' },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="rounded-lg p-3 text-center"
                style={{ border: `1px solid ${theme.border}` }}
              >
                <div className="text-lg mb-0.5">{icon}</div>
                <div
                  className="text-xl font-bold"
                  style={{ color: theme.accent }}
                >
                  {value}
                </div>
                <div className="text-xs opacity-50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Bio ── */}
          {data.bio && (
            <div
              className="rounded-lg p-4 mb-4 text-sm leading-relaxed"
              style={{
                border: `1px solid ${theme.border}`,
                color: theme.subtext,
              }}
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
                <span style={{ color: theme.subtext }}>
                  🛠 {data.stack}
                </span>
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
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80"
                    style={{
                      border: `1px solid ${theme.border}`,
                      color: theme.accent,
                    }}
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
              className="flex items-center justify-between rounded-lg p-4 mb-4 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                border: `1px solid ${theme.accent}`,
                color: theme.accent,
              }}
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
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded-full ${theme.badge}`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                    <span className="text-xs opacity-40">
                      {relativeTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Share strip ── */}
          <OfficeShareStrip
            handle={data.handle}
            name={data.name}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
          />

          {/* ── Footer ── */}
          <p className="text-xs opacity-30 mt-6 text-center">
            {data.clock
              ? `Day ${data.clock.day} · Week ${data.clock.week} · ${data.clock.week_name} · ${data.cohort}`
              : data.cohort}
          </p>

        </div>
      </div>
    </>
  );
}
