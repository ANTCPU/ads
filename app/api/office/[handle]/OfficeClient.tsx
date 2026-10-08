'use client';

import { ShareModule } from '@/app/modules/share';

// Track theme tokens
const THEMES = {
  dev: {
    bg: 'var(--office-dev-bg, #0d1117)',
    accent: 'var(--office-dev-accent, #00e5ff)',
    border: 'var(--office-dev-border, #1e3a4a)',
    text: 'var(--office-dev-text, #e6edf3)',
    badge: 'bg-cyan-900 text-cyan-300',
    label: '💻 Developer',
  },
  marketing: {
    bg: 'var(--office-mktr-bg, #2c1a0e)',
    accent: 'var(--office-mktr-accent, #e87c2e)',
    border: 'var(--office-mktr-border, #8b4513)',
    text: 'var(--office-mktr-text, #fdf3e7)',
    badge: 'bg-amber-900 text-amber-200',
    label: '📣 Marketer',
  },
};

type OfficeData = {
  handle: string;
  name: string;
  initials: string;
  flag: string;
  color: string;
  track: 'dev' | 'marketing';
  country: string;
  progress_pct: number;
  role_title: string;
  badges: string[];
  tasks_done: number;
  submissions: number;
  last_seen: string;
  ad_id: string;
  ad_url: string;
  github_handle: string;
  stack: string;
  channels: string;
  bio: string;
  cohort: string;
  arena: {
    points: number;
    tier: string;
    is_champion: boolean;
    streak: number;
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
  } | null;
};

export default function OfficeClient({ data }: { data: OfficeData }) {
  const theme = THEMES[data.track] ?? THEMES.dev;
  const arenaUrl = `https://antcpu-ads.vercel.app/arena`;

  return (
    <main
      data-track={data.track}
      style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}
      className="p-6 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{ background: theme.accent, color: theme.bg }}
        >
          {data.initials ?? data.name?.[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p style={{ color: theme.accent }}>
            {data.flag} {data.country} · {theme.label}
          </p>
          <p className="text-sm opacity-70">{data.role_title}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span style={{ color: theme.accent }}>{data.progress_pct}%</span>
        </div>
        <div
          className="h-2 rounded-full"
          style={{ background: theme.border }}
        >
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${data.progress_pct}%`,
              background: theme.accent,
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tasks Done', value: data.tasks_done },
          { label: 'Submissions', value: data.submissions },
          { label: 'Arena Pts', value: data.arena?.points ?? 0 },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg p-3 text-center"
            style={{ border: `1px solid ${theme.border}` }}
          >
            <div
              className="text-2xl font-bold"
              style={{ color: theme.accent }}
            >
              {value}
            </div>
            <div className="text-xs opacity-60">{label}</div>
          </div>
        ))}
      </div>

      {/* Arena ad link */}
      {data.ad_url && (
        <a
          href={arenaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg p-4 mb-6 text-sm"
          style={{ border: `1px solid ${theme.accent}`, color: theme.accent }}
        >
          ⚡ View Live Arena Ad →
        </a>
      )}

      {/* Dev extras */}
      {data.track === 'dev' && data.github_handle && (
        <div className="mb-4 text-sm opacity-70">
          🐙 github.com/{data.github_handle}
          {data.stack && <span className="ml-3">🛠 {data.stack}</span>}
        </div>
      )}

      {/* Marketer extras */}
      {data.track === 'marketing' && data.channels && (
        <div className="mb-4 text-sm opacity-70">
          📣 Channels: {data.channels}
        </div>
      )}

      {/* Recent activity */}
      {data.activity.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2 opacity-60 uppercase tracking-wide">
            Recent Activity
          </h2>
          <ul className="space-y-2">
            {data.activity.map((a, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Badges */}
      {data.badges.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {data.badges.map((b, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded-full ${theme.badge}`}
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Share module */}
      {data.ad_id && (
        <ShareModule
          adId={data.ad_id}
          context="office"
        />
      )}

      {/* Clock context */}
      {data.clock && (
        <p className="text-xs opacity-40 mt-6 text-center">
          Day {data.clock.day} · Week {data.clock.week} · {data.clock.week_name}
          · {data.cohort}
        </p>
      )}
    </main>
  );
}
