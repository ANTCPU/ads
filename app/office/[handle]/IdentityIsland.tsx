'use client';

import { useState, useEffect } from 'react';
import { relativeTime, WS_DEV, WS_MKT } from '../../../lib/officeConstants';
import type { OfficeData } from '../../../types/office';

// ── Types ─────────────────────────────────────────────────────
type Notif = { id: string; title: string; message: string; link?: string; read: boolean; created_at: string };
type ChallengerRow = { handle: string; name: string; track: string; progress_pct: number; country: string; email: string | null };
type PageView = { page: string; ref: string; ts: string; email: string | null; handle?: string | null };

// ── Static constants — outside component ─────────────────────
const ADMIN_LINKS = [
  { label: '⚡ Command Centre', href: '/dashboard/antcpu' },
  { label: '👥 Users',          href: '/dashboard/users'  },
  { label: '🤖 Agents',         href: '/dashboard/agents' },
  { label: '🏆 Leaderboard',    href: '/champions'        },
  { label: '🏟 Arena',          href: '/arena'            },
  { label: '🦋 Collab Hub',     href: '/internship/collab'},
];

// ── Sub-components ────────────────────────────────────────────
function PageCounters({ pageViews, accent, border }: { pageViews: PageView[]; accent: string; border: string }) {
  const applyVisits    = pageViews.filter(v => v.page === '/apply').length;
  const registrations  = pageViews.filter(v => v.page === '/apply/complete').length;
  const refs           = pageViews.map(v => v.ref).filter(r => r && r !== 'direct' && r !== 'register');
  const topRef         = refs.length
    ? Object.entries(refs.reduce((acc: Record<string, number>, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])[0]?.[0]?.replace('https://', '').replace('www.', '').split('/')[0]
    : 'direct';

  return (
    <div style={{ display: 'flex', gap: '0.4rem', padding: '0.25rem 1rem 0.5rem' }}>
      {[
        { label: '👀 Visits',  value: applyVisits },
        { label: '✅ Signups', value: registrations },
        { label: '🔗 Top Ref', value: topRef },
      ].map(s => (
        <div key={s.label} style={{ flex: 1, background: '#161b22', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.4rem 0.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: accent }}>{s.value}</div>
          <div style={{ fontSize: '0.55rem', color: '#555', marginTop: '0.1rem' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ChallengerCard({ c, pageViews, accent, border }: { c: ChallengerRow; pageViews: PageView[]; accent: string; border: string }) {
  const lastView = pageViews.find(v => v.email === c.email || v.handle === c.handle);
  const progressColor = c.progress_pct >= 75 ? '#22c55e' : c.progress_pct >= 50 ? accent : '#888';

  return (
    <div style={{ background: '#161b22', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e6edf3' }}>
            {c.track === 'marketing' ? '📣' : '💻'} {c.name}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.1rem' }}>
            @{c.handle} · {c.country}
          </div>
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: progressColor, background: `${progressColor}18`, border: `1px solid ${progressColor}44`, borderRadius: 999, padding: '0.15rem 0.5rem' }}>
          {c.progress_pct}%
        </span>
      </div>
      {lastView && (() => {
        const mins = Math.round((Date.now() - new Date(lastView.ts).getTime()) / 60000);
        const ago  = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
        return (
          <div style={{ fontSize: '0.62rem', color: '#22c55e', marginBottom: '0.35rem', background: '#22c55e10', border: '1px solid #22c55e22', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
            🟢 {lastView.handle ?? lastView.email ?? 'visitor'} · {lastView.page} · {ago}
          </div>
        );
      })()}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <a href={`/office/${c.handle}`} style={{ flex: 1, textAlign: 'center', padding: '0.3rem 0', background: `${accent}18`, border: `1px solid ${accent}44`, borderRadius: '6px', color: accent, fontSize: '0.68rem', fontWeight: 700, textDecoration: 'none' }}>
          🏢 Office
        </a>
        {c.email && (
          <a href={`/profile/${encodeURIComponent(c.email)}`} style={{ flex: 1, textAlign: 'center', padding: '0.3rem 0', background: '#1c2128', border: `1px solid ${border}`, borderRadius: '6px', color: '#8b949e', fontSize: '0.68rem', fontWeight: 700, textDecoration: 'none' }}>
            👤 Profile
          </a>
        )}
      </div>
    </div>
  );
}

function NotifItem({ n, accent, textColor, subtextColor, border }: { n: Notif; accent: string; textColor: string; subtextColor: string; border: string }) {
  return (
    <div
      style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${border}`, background: n.read ? 'transparent' : `${accent}0d`, cursor: n.link ? 'pointer' : 'default' }}
      onClick={() => n.link && window.open(n.link, '_blank')}
    >
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: textColor, lineHeight: 1.3 }}>{n.title}</div>
      {n.message && (
        <div style={{ fontSize: '0.7rem', color: subtextColor, marginTop: 2, lineHeight: 1.4 }}>
          {n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}
        </div>
      )}
      <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 3 }}>{relativeTime(n.created_at)}</div>
    </div>
  );
}

// ── Main IdentityIsland ───────────────────────────────────────
export default function IdentityIsland({
  data, isOwner, isTeam, accent, border, theme,
}: {
  data: OfficeData;
  isOwner: boolean;
  isTeam: boolean;
  accent: string;
  border: string;
  theme?: { bg: string; text: string; subtext: string; accent: string; border: string };
}) {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<'me' | 'admin'>('me');
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [unread, setUnread]       = useState(0);
  const [challengers, setChallengers] = useState<ChallengerRow[]>([]);
  const [challLoading, setChallLoading] = useState(false);
  const [challLoaded, setChallLoaded]   = useState(false);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [pvLoaded, setPvLoaded]   = useState(false);

  // Derived constants
  const week         = data.clock?.week ?? 1;
  const textColor    = theme?.text    ?? '#e6edf3';
  const subtextColor = theme?.subtext ?? '#888';
  const arenaHref    = data.brand_slug ? `https://antcpu-ads.vercel.app/arena/${data.brand_slug}` : 'https://antcpu-ads.vercel.app/arena';
  const workspaceHref  = data.track === 'marketing' ? WS_MKT : WS_DEV;
  const workspaceLabel = data.track === 'marketing' ? '📣 Workspace' : '💻 Workspace';
  const githubHandle   = data.github_handle?.replace('https://github.com/', '').replace(/\/$/, '') ?? null;

  const navLinks = [
    { label: workspaceLabel,              href: workspaceHref,                                      external: true  },
    { label: `📋 Week ${week} Tasks`,     href: `/internship/week/${week}`,                         external: false },
    { label: '🏟 Arena',                  href: arenaHref,                                          external: true  },
    ...(githubHandle ? [{ label: '🐙 GitHub', href: `https://github.com/${githubHandle}`, external: true }] : []),
    { label: '🌐 antcpu.io',              href: 'https://antcpu.io',                                external: true  },
  ];

  // ── Fetch challengers on admin tab open ───────────────────
  useEffect(() => {
    if (!open || tab !== 'admin' || challLoaded) return;
    setChallLoading(true);
    fetch(`/api/internship/challengers?view=public&cohort=${data.cohort ?? 'november-2026'}`)
      .then(r => r.json())
      .then(d => { setChallengers(d.challengers ?? []); setChallLoaded(true); })
      .catch(() => setChallLoaded(true))
      .finally(() => setChallLoading(false));
  }, [open, tab, challLoaded, data.cohort]);

  // ── Fetch page views on admin tab open ────────────────────
  useEffect(() => {
    if (!open || tab !== 'admin' || pvLoaded) return;
    fetch('/api/doorbell')
      .then(r => r.json())
      .then(d => { setPageViews(d.recent ?? []); setPvLoaded(true); })
      .catch(() => setPvLoaded(true));
  }, [open, tab, pvLoaded]);

  // ── Fetch notifications on mount ─────────────────────────
  useEffect(() => {
    if (!isOwner || !data.intern_id) return;
    fetch(`/api/internship/notifications?intern_id=${data.intern_id}&limit=10`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setNotifs(d.notifications ?? []); setUnread(d.unread ?? 0); } })
      .catch(() => null);
  }, [isOwner, data.intern_id]);

  function markAllRead() {
    if (!data.intern_id) return;
    fetch(`/api/internship/notifications?intern_id=${data.intern_id}`, { method: 'PATCH' }).catch(() => null);
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnread(0);
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>

      {/* ── Avatar button ── */}
      <button
        onClick={() => { if (isOwner) setOpen(o => { if (!o && unread > 0) markAllRead(); return !o; }); }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: data.color ?? accent, color: theme?.bg,
          border: `2px solid ${accent}`, fontSize: '1.5rem', fontWeight: 800,
          cursor: isOwner ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', animation: 'pulse-glow 3s ease-in-out infinite', flexShrink: 0,
        }}
      >
        {data.initials ?? data.name?.[0]}
        {isOwner && unread > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: `2px solid ${theme?.bg}`, fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* ── Island panel ── */}
      {isOwner && open && (
        <div style={{ position: 'absolute', top: 72, left: 0, zIndex: 50, width: 280, background: '#0d1117', border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

          {/* Header strip */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${border}`, background: `${accent}0d` }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{data.name}</div>
            <div style={{ fontSize: '0.75rem', color: accent, marginTop: 2 }}>
              {data.track === 'dev' ? '💻 Dev' : '📣 Marketing'} · Week {week} · {data.progress_pct}%
            </div>
            {isTeam && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                {(['me', 'admin'] as const).map(t_ => (
                  <button key={t_} onClick={() => setTab(t_)} style={{ flex: 1, padding: '0.3rem 0', background: tab === t_ ? accent : 'transparent', border: `1px solid ${tab === t_ ? accent : border}`, borderRadius: 6, color: tab === t_ ? '#000' : '#888', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    {t_ === 'me' ? '🏢 My Office' : '⚡ Admin'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* My Office tab */}
          {tab === 'me' && (
            <div style={{ padding: '0.5rem 0' }}>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined} onClick={() => setOpen(false)}
                  style={{ display: 'block', padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 600, color: textColor, textDecoration: 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accent}18`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* Admin tab */}
          {tab === 'admin' && isTeam && (
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ padding: '0.25rem 1rem 0.5rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>Quick Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {ADMIN_LINKS.map(l => (
                    <a key={l.href} href={l.href} style={{ display: 'block', padding: '0.45rem 0.75rem', background: '#161b22', border: `1px solid ${border}`, borderRadius: '8px', color: accent, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
              {pvLoaded && <PageCounters pageViews={pageViews} accent={accent} border={border} />}
              <div style={{ padding: '0.5rem 1rem 0' }}>
                <div style={{ fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontWeight: 700 }}>
                  Challengers ({challengers.length})
                </div>
                {challLoading && <div style={{ fontSize: '0.75rem', color: '#555', padding: '0.5rem 0' }}>Loading...</div>}
                {!challLoading && challLoaded && challengers.length === 0 && <div style={{ fontSize: '0.75rem', color: '#555', padding: '0.5rem 0' }}>No challengers found.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {challengers.map(c => <ChallengerCard key={c.handle} c={c} pageViews={pageViews} accent={accent} border={border} />)}
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          <div style={{ borderTop: `1px solid ${border}` }}>
            {notifs.length === 0 ? (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#555' }}>No notifications yet.</div>
            ) : (
              <>
                <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, opacity: 0.7 }}>
                  Notifications
                </div>
                {notifs.slice(0, 5).map(n => <NotifItem key={n.id} n={n} accent={accent} textColor={textColor} subtextColor={subtextColor} border={border} />)}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
