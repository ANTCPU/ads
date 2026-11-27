'use client';

import { useState, useEffect } from 'react';
import { pingActivity } from '../../../lib/pingActivity';
import {
  THEMES, BADGE_MAP, NODE_MAP, GATE_NEXT, COUNTRY_TZ,
  safeFlag, stripGithubUrl, relativeTime,
  tierLabel, localTime, formatBadge, getNextGate,
} from '../../../lib/officeConstants';
import type { OfficeData, NextCohort, TrackKey } from '../../../types/office';
import IdentityIsland from './IdentityIsland';
import OfficeBanner from './OfficeBanner';
import MentorDashboard from './MentorDashboard';
import PeoplePanel from './PeoplePanel';





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
  cohort, handle, track, accent, border, subtext, isElevated = false, myInternId = '',
}: {
  cohort: string; handle: string; track: string;
  accent: string; border: string; subtext: string;
  isElevated?: boolean; myInternId?: string;
}) {
  const rooms = track === 'marketing'
    ? ['general', 'marketing', 'mentors', 'standups', 'people']
    : ['general', 'dev', 'mentors', 'standups', 'people'];

  const roomLabels: Record<string, string> = {
    general: '💬 General', dev: '💻 Dev', marketing: '📣 Marketing',
    standups: '📋 Standups', mentors: '🎓 Mentors', people: '👥 People',
  };

  const [activeRoom, setActiveRoom] = useState(rooms[0]);
  const [messages, setMessages]     = useState<{ id: string; author_name: string; author_type: string; content: string; created_at: string }[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const cohortSlug = cohort?.replace('-', '-') ?? 'nov';

  function fetchMessages() {
    setLoading(true);
    fetch(`/api/internship/office?cohort=${cohort}&room=${activeRoom}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchMessages(); }, [activeRoom, cohort]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    const res = await fetch('/api/internship/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohort,
        room: activeRoom,
        author_id: handle,
        content: input.trim(),
      }),
    }).catch(() => null);
    if (res && !res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Failed to send');
    } else {
      setInput('');
      fetchMessages();
    }
    setSending(false);
  }

  const canPost = (activeRoom !== 'mentors' && activeRoom !== 'people') || isElevated;

  return (
    <div className="rounded-lg mb-6" style={{ border: `1px solid ${border}`, background: 'rgba(255,255,255,0.02)' }}>

      {/* Room tabs */}
      <div className="flex border-b" style={{ borderColor: border }}>
        {rooms.map(r => (
          <button key={r} onClick={() => setActiveRoom(r)}
            className="flex-1 text-xs py-2.5 font-semibold transition-colors"
            style={{
              color: activeRoom === r ? accent : subtext,
              borderBottom: activeRoom === r ? `2px solid ${accent}` : '2px solid transparent',
            }}>
            {roomLabels[r]}
          </button>
        ))}
      </div>

      {/* Standup banner */}
      {activeRoom === 'standups' && (
        <div className="mx-3 mt-3 rounded-lg p-3" style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.18)' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold" style={{ color: accent }}>📅 Friday Standup — {cohort}</p>
              <p className="text-xs mt-0.5" style={{ color: subtext }}>Join live or leave a message below — async standups count too.</p>
            </div>
            <a href={`https://tv-ten-psi.vercel.app/standup-room.html?room=${cohortSlug}&name=${encodeURIComponent(handle)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-lg font-bold shrink-0 transition-opacity hover:opacity-80"
              style={{ background: accent, color: '#000' }}>
              ▶ Join Standup
            </a>
          </div>
          <p className="text-xs mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,230,118,0.12)', color: subtext }}>
            <span style={{ color: accent }}>💡 Tip:</span> No one live? Drop your standup note below — what you built, what&apos;s next, any blockers.
          </p>
        </div>
      )}

      {/* Mentors room notice for challengers */}
      {activeRoom === 'mentors' && !isElevated && (
        <div className="mx-3 mt-3 rounded-lg p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}`, color: subtext }}>
          🎓 Mentor room — read only. Messages from your mentors appear here.
        </div>
      )}

      {/* People tab */}
      {activeRoom === 'people' && (
        <PeoplePanel
          myInternId={myInternId}
          myHandle={handle}
          myCohort={cohort}
          myTrack={track as 'dev' | 'marketing'}
          isTeam={isElevated}
          accent={accent}
          border={border}
          subtext={subtext}
        />
      )}

      {/* Messages */}
      <div className="p-3 space-y-3 min-h-[80px] max-h-[320px] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {loading ? (
          <p className="text-xs text-center py-4 opacity-40" style={{ color: subtext }}>Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: subtext }}>No messages yet. Be the first.</p>
        ) : (
          messages.slice(0, 20).map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold" style={{ color: m.author_type === 'mentor' ? '#ffd700' : m.author_type === 'system' ? subtext : accent }}>
                  {m.author_type === 'mentor' ? '🎓 ' : m.author_type === 'system' ? '⚡ ' : ''}{m.author_name}
                </span>
                <span className="text-xs opacity-40">{relativeTime(m.created_at)}</span>
              </div>
              <p className="opacity-80 mt-0.5">{m.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Input — hidden for challengers in mentors room */}
      {canPost && (
        <div className="flex flex-col gap-1 p-3 border-t" style={{ borderColor: border }}>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={activeRoom === 'standups' ? `What you built, what's next, any blockers...` : `Message #${activeRoom}...`}
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#ccc' }} />
            <button onClick={send} disabled={sending || !input.trim()}
              className="text-xs px-3 py-1 rounded font-semibold disabled:opacity-30"
              style={{ background: accent, color: '#000' }}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function OfficeShareStrip({
  handle, name, track, accent, border, subtext, badges,
}: {
  handle: string; name: string; track: string;
  accent: string; border: string; subtext: string;
  badges: string[];
}) {
  const [copied, setCopied] = useState(false);
  const officeUrl = `https://antcpu-ads.vercel.app/office/${handle}`;
  const trackLabel = track === 'dev' ? '💻 Dev' : '📣 Marketing';
  const isFounder  = handle === 'Antony0';
  const isTeamMember = badges.includes('mentor');
  const shareText  = isTeamMember
    ? `${name} is on the antcpu team — building the Human in the Loop Challenge.\n\n${officeUrl}`
    : isFounder
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
  progress, clock, handle, accent, border, subtext, brandSlug, completedGates, track,
}: {
  progress: number; clock: OfficeData['clock'];
  handle: string; accent: string; border: string; subtext: string;
  brandSlug?: string | null; completedGates: string[]; track: string;
}) {
  if (!clock) return null;

  const daysLeft  = clock.days_left_total ?? 0;
  const week      = clock.week ?? 1;
  const weekName  = clock.week_name ?? 'Explorer';
  const day       = clock.day ?? 1;
  const nextGate  = getNextGate(completedGates, track);
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
        {nextGate && (
          <div className="mb-3 rounded p-3" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}33` }}>
            <div className="text-xs font-bold mb-0.5" style={{ color: accent }}>
              {nextGate.id.toUpperCase()} · +{nextGate.pct}%
            </div>
            <div className="text-sm font-semibold">{nextGate.label}</div>
          </div>
        )}
        <a href={nextGate
            ? (track === 'marketing' && nextGate.urlMarketing ? nextGate.urlMarketing : nextGate.url)
            : 'https://antcpu.io/'}
          target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs font-bold py-2 rounded transition-opacity hover:opacity-80"
          style={{ background: accent, color: '#000' }}>
          {nextGate ? `Start ${nextGate.id.toUpperCase()} →` : 'Go to Workspace →'}
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



// ── Main Component ────────────────────────────────────────────

export default function OfficeClient({ data }: { data: OfficeData }) {
  // ── Route: non-owners see clean corporate profile ──
  const [isOwner, setIsOwner] = useState(false);



  const theme = THEMES[data.track] ?? THEMES.dev;
  const flag = safeFlag(data.flag);

  // ── Track bg — elevation 99 gets cream, marketing gets gradient, dev stays flat
  const isTeam = (data as any).profile_type === 'team' ||
                 (data as any).profile_type === 'founder' ||
                 data.badges.some((b: string) =>
                   b.toLowerCase().includes('mentor') ||
                   b.toLowerCase().includes('founder') ||
                   b.toLowerCase().includes('captain')
                 ) ||
                 data.handle === 'Antony0';
  const resolvedBg = (data.elevation_level ?? 0) >= 99
    ? 'linear-gradient(160deg, #c8a882 0%, #8b5e3c 40%, #5c3317 70%, #2a1500 100%)'
    : theme.bg;
  const githubHandle = stripGithubUrl(data.github_handle);
  const displayProgress = isTeam ? 100 : data.progress_pct;
  // Force 100% for mentor/team profiles


  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Online count from presence ──
  const onlineCount = data.presence?.sessions_active_1h ?? 0;
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('antcpu_session') || '{}');

      // check all possible handle keys written by login/register
      const sessionHandle =
        s?.handle ||
        localStorage.getItem('intern_handle') ||
        '';

      if (sessionHandle && sessionHandle === data.handle) {
        setIsOwner(true);
        return;
      }

      // fallback: intern_id match
      const sessionInternId = s?.intern_id || '';
      if (sessionInternId && data.intern_id && sessionInternId === data.intern_id) {
        setIsOwner(true);
        return;
      }

      // auto-session: if no session exists at all and this is a founder/elevated profile,
      // write a minimal session from the already-public office API data
      const noSession = !s?.handle && !s?.intern_id;
      const isElevated = (data as any).elevation_level >= 99 || (data as any).is_captain === true;
      if (noSession && isElevated && data.handle && data.intern_id) {
        const minimal = {
          handle:    data.handle,
          intern_id: data.intern_id,
          track:     data.track ?? 'dev',
        };
        localStorage.setItem('antcpu_session', JSON.stringify(minimal));
        localStorage.setItem('intern_handle',  data.handle);
        localStorage.setItem('intern_id',      data.intern_id);
        setIsOwner(true);
      }
    } catch {}
  }, [data.handle, data.intern_id]);

  // ── Workspace route by track ──
  const workspaceHref = data.track === 'marketing' ? '/marketing/' : '/dev/';
  const workspaceLabel = data.track === 'marketing' ? '📣 Go to Workspace' : '💻 Go to Workspace';

  // ── Week 2 deadline warning ──
  const daysLeftWeek = data.clock?.days_left_week ?? null;
  const showDeadlineBanner = daysLeftWeek !== null && daysLeftWeek <= 2 && (data.clock?.week ?? 0) === 2;

  // ── Session ping — fires on mount, updates last_seen ──────
  useEffect(() => {
    if (!data.handle) return;
    // activity ping — owner viewing their own office
    pingActivity({ label: 'Viewed their office', icon: '🏢', type: 'nav' });
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
            <IdentityIsland
              data={data}
              isOwner={isOwner}
              isTeam={isTeam}
              accent={theme.accent}
              border={theme.border}
              theme={{ bg: theme.bg, text: theme.text, subtext: theme.subtext, accent: theme.accent, border: theme.border }}
            />
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
                {isTeam ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: theme.accent, color: '#000' }}
                  >
                    {(data as any).profile_type === 'founder'
                      ? '⚡ antcpu Founder'
                      : data.track === 'dev'
                        ? '💻 antcpu Team · Dev'
                        : '📣 antcpu Team · Marketing'}
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
            bannerLink={(data as any).banner_link ?? null}
            name={data.name}
            accent={theme.accent}
            border={theme.border}
            teamId={data.team_id}
            isCaptain={data.is_captain}
            captainTeam={(data as any).captain_team}
            track={data.track}
            brandSlug={data.brand_slug}
            progressPct={data.progress_pct}
            bannerUnlocked={(data as any).banner_unlocked ?? false}
            isOwner={isOwner}
            challengerId={data.id}
          />
          
          {/* ── D15 Intro Button — owner only, Week 3, at 50% ── */}
          {isOwner && !isTeam && data.progress_pct === 50 && (data.clock?.week ?? 0) >= 3 && data.team_id && (
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
          {!isTeam && <div className="mb-6">
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
                {displayProgress}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.border }}>
              <div
                className="h-3 rounded-full"
                style={{
                  width: mounted ? `${displayProgress}%` : '0%',
                  background: theme.accent,
                  boxShadow: data.progress_pct > 0 ? theme.glow : 'none',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>}

          {/* ── Week 2 deadline banner ── */}
          {!isTeam && showDeadlineBanner && (
            <div
              className="rounded-lg p-3 mb-4 text-sm font-medium flex items-center gap-2"
              style={{ background: 'rgba(224,123,32,0.1)', border: `1px solid ${theme.accent}`, color: theme.accent }}
            >
              <span>⏳</span>
              <span>Week 2 closes in {daysLeftWeek} day{daysLeftWeek === 1 ? '' : 's'} — submit your build.</span>
            </div>
          )}

          {/* ── Workspace button — owner only ── */}
          {isOwner && !isTeam && (
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
          {!isTeam && <ElevationBanner
            level={data.elevation_level}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
          />}

          {/* ── Message Panel ── */}
          <OfficeMessagePanel
            cohort={data.cohort}
            handle={data.handle}
            track={data.track}
            accent={theme.accent}
            border={theme.border}
            subtext={theme.subtext}
            isElevated={isTeam}
            myInternId={data.intern_id ?? ''}
          />

          {/* ── Mentor Dashboard — team/founder only ── */}
          {isTeam && (
            <MentorDashboard
              data={data}
              accent={theme.accent}
              border={theme.border}
              subtext={theme.subtext}
              isFounder={(data as any).profile_type === 'founder'}
            />
          )}


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
              href={data.brand_slug ? `https://antcpu-ads.vercel.app/arena/${data.brand_slug}` : 'https://antcpu-ads.vercel.app/arena'}
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
            badges={data.badges}
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
          {!isTeam && (
          <NextActionPanel
            progress={data.progress_pct}
            clock={data.clock}
            handle={data.handle}
            accent={theme.accent}
            border={theme.border}
            subtext={theme.subtext}
            brandSlug={data.brand_slug}
            completedGates={data.completed_gates ?? []}
            track={data.track}
          />
          )}

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

              
