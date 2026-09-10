// app/dashboard/agents/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';
import ArenaFooter from '../../components/ArenaFooter';
import { AGENT_REGISTRY } from '../../lib/agents';
import { AGENT_FLAG_MAP } from '../../lib/flags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#161616',
  border:  '#1a1a1a',
  border2: '#222',
  text:    '#e0e0e0',
  muted:   '#555',
  dim:     '#333',
  orange:  '#f0883e',
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#0070f3',
  gold:    '#D4AF37',
  purple:  '#7928ca',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type HeraldData = {
  noAd:     any[];
  noShares: any[];
  inactive: any[];
};

type NotifLog = {
  id: string; email: string; type: string;
  title: string; message: string; read: boolean; created_at: string;
};

type Ad = {
  id: string; brand: string; email: string; title: string;
  status: string; tier: string; created_at: string; category?: string;
};

type BrandStats = {
  id: string; name: string; icon: string; color: string;
  desc: string; path: string; total: number; active: number;
  pending: number; rejected: number; lastAd: string;
};

type AmandaLive = {
  assets: number; events: number; discordLive: boolean;
  topCategory: string | null; arenaPoints: number;
  arenaAds: number; pointsToRising: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(m / 60), dy = Math.floor(h / 24);
  return dy > 0 ? `${dy}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'just now';
}

function pingDiscord(content: string, event: string, embed?: object) {
  fetch('/api/discord-notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, event, embed }),
  }).catch(() => {});
}

const NOTIF_TYPE_COLOR: Record<string, string> = {
  approved: G.green, rejected: G.red, aria: G.orange,
  nudge: G.purple, rank: G.gold, info: G.muted, points: G.gold,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const router = useRouter();

  const [hydrated,      setHydrated]      = useState(false);
  const [adminUser,     setAdminUser]     = useState<{ email: string; name: string }>({ email: '', name: '' });

  // ── Herald state ──────────────────────────────────────────────────────────
  const [herald,        setHerald]        = useState<HeraldData | null>(null);
  const [heraldTab,     setHeraldTab]     = useState<'noShares' | 'noAd' | 'inactive'>('noShares');
  const [nudgingId,     setNudgingId]     = useState<string | null>(null);
  const [nudgedIds,     setNudgedIds]     = useState<Set<string>>(new Set());

  // ── Notif log state ───────────────────────────────────────────────────────
  const [notifLog,      setNotifLog]      = useState<NotifLog[]>([]);
  const [notifFilter,   setNotifFilter]   = useState('all');
  const [notifLoading,  setNotifLoading]  = useState(false);

  // ── Brand pipeline state (existing) ──────────────────────────────────────
  const [brands,        setBrands]        = useState<BrandStats[]>([]);
  const [recentAds,     setRecentAds]     = useState<Ad[]>([]);
  const [totalUsers,    setTotalUsers]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [amanda,        setAmanda]        = useState<AmandaLive | null>(null);
  const [amandaLoading, setAmandaLoading] = useState(true);

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadHerald = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/herald');
      const json = await res.json();
      setHerald(json);
    } catch {}
  }, []);

  const loadNotifLog = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res  = await fetch('/api/admin/notifications');
      const json = await res.json();
      setNotifLog(json.notifications || []);
    } catch {}
    setNotifLoading(false);
  }, []);

  async function fetchAmanda() {
    setAmandaLoading(true);
    try {
      const [statsRes, assetsRes] = await Promise.all([
        fetch('https://amandaland.vercel.app/api/stats'),
        fetch('https://amandaland.vercel.app/api/assets'),
      ]);
      const stats  = await statsRes.json();
      const assets = await assetsRes.json();
      const arenaPoints = 70;
      const arenaAds    = 4;
      setAmanda({
        assets:         assets.count ?? 0,
        events:         stats.status?.totalEvents ?? 0,
        discordLive:    stats.status?.discordConnected ?? false,
        topCategory:    stats.status?.topCategory ?? null,
        arenaPoints, arenaAds,
        pointsToRising: Math.max(0, 100 - arenaPoints),
      });
    } catch { setAmanda(null); }
    finally  { setAmandaLoading(false); }
  }

  async function fetchData() {
    setLoading(true);
    const [{ data: ads }, { data: signups }] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_signups').select('email, brand_name, promo_code, created_at'),
    ]);
    const allAds     = (ads     || []) as Ad[];
    const allSignups = signups  || [];
    setTotalUsers(allSignups.length);
    setRecentAds(allAds.slice(0, 8));

    const BRAND_DEFS = [
      { id: 'antcpu',      name: 'ANTCPU',             icon: '⚡',  color: G.orange,  desc: 'Automated marketing · Ad network · Agent pipeline',    path: '/dashboard/antcpu',      emails: ['antcpu@gmail.com'] },
      { id: 'mapofpi',     name: 'Map of Pi',           icon: '🗺️', color: G.gold,    desc: 'Pi Network marketplace · 2.1M users · Real commerce',  path: '/dashboard/mapofpi',     emails: allSignups.filter((s: any) => s.promo_code === 'MAPOFPI').map((s: any) => s.email) },
      { id: 'photography', name: 'Amanda Photography',  icon: '📸',  color: '#e91e8c', desc: 'Portrait photography · Events · Thomasville NC',        path: '/dashboard/photography', emails: ['mishoemanda@gmail.com'] },
    ];

    setBrands(BRAND_DEFS.map(b => {
      const brandAds = allAds.filter(a => b.emails.includes(a.email) || a.brand?.toLowerCase().includes(b.id === 'mapofpi' ? 'map' : 'antcpu'));
      return {
        ...b,
        total:    brandAds.length,
        active:   brandAds.filter(a => a.status === 'active').length,
        pending:  brandAds.filter(a => a.status === 'pending_review').length,
        rejected: brandAds.filter(a => a.status === 'rejected').length,
        lastAd:   brandAds[0]?.created_at ? new Date(brandAds[0].created_at).toLocaleDateString() : '—',
      };
    }));
    setLoading(false);
  }

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
      setAdminUser({ email: u.email, name: u.name || 'Antony Ciccone' });
    } catch { router.push('/'); return; }
    setHydrated(true);
    Promise.all([loadHerald(), loadNotifLog(), fetchData(), fetchAmanda()]);
  }, [loadHerald, loadNotifLog]);

  // ─── Nudge handler ────────────────────────────────────────────────────────

  async function nudgeUser(u: any, bucket: string) {
    const key = u.email + bucket;
    setNudgingId(key);
    const msgs: Record<string, { title: string; message: string }> = {
      noShares: {
        title:   '⚡ Your ad is live — share it to earn points',
        message: `${u.name?.split(' ')[0] || 'Hey'} — your ad "${u.ad_title || 'in the Arena'}" is live but hasn't been shared yet. One share earns points and moves you up the ladder.`,
      },
      noAd: {
        title:   '🔔 Your Arena spot is waiting',
        message: `${u.name?.split(' ')[0] || 'Hey'} — you're registered but haven't created your first ad yet. It takes 2 minutes. The Arena is live.`,
      },
      inactive: {
        title:   '👋 Welcome back to the Arena',
        message: `${u.name?.split(' ')[0] || 'Hey'} — it's been a while. Your brand ${u.brand_name || ''} still has a spot in the Arena. Come back and share to climb the ranks.`,
      },
    };
    const msg = msgs[bucket] || msgs.inactive;
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, type: 'nudge', title: msg.title, message: msg.message }),
    });
    pingDiscord('', 'herald_nudge', {
      title: '🔔 Herald Nudge Sent', color: 0x7928CA,
      fields: [
        { name: 'User',   value: `${u.name} (${u.email})`, inline: false },
        { name: 'Brand',  value: u.brand_name || '—',       inline: true  },
        { name: 'Bucket', value: bucket,                    inline: true  },
      ],
      footer: 'Herald · ANTCPU ADS', timestamp: true,
    });
    setNudgedIds(prev => new Set([...prev, key]));
    setNudgingId(null);
    await loadNotifLog();
  }

  if (!hydrated) return (
    <div style={{ background: G.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: G.dim, fontSize: '0.85rem' }}>loading...</div>
    </div>
  );

  // ─── Derived ──────────────────────────────────────────────────────────────

  const heraldList = herald
    ? (heraldTab === 'noShares' ? herald.noShares
      : heraldTab === 'noAd'   ? herald.noAd.filter((u: any) => u.email !== 'test@antcpu.com')
      : herald.inactive)
    : [];

  const filteredNotifs = notifLog.filter(n =>
    notifFilter === 'all'    ? true :
    notifFilter === 'unread' ? !n.read :
    n.type === notifFilter
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: G.bg, color: G.text, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role="admin"
        userName={adminUser.name}
        userEmail={adminUser.email}
        userBrand="ANTCPU"
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>🤖 Arena Agents</div>
            <div style={{ color: G.muted, fontSize: '0.82rem' }}>Herald · Aria · Scout · Ledger · MAC · Antbot — pipeline status + live controls</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: G.orange }}>{totalUsers}</div>
            <div style={{ fontSize: '0.6rem', color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Users</div>
          </div>
        </div>

        {/* ── AGENT REGISTRY — persistent + gated ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border2}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: G.text, marginBottom: '0.2rem' }}>⚡ Agent Registry</div>
          <div style={{ fontSize: '0.7rem', color: G.muted, marginBottom: '1rem' }}>Persistent agents always run · Gated agents check their flag before executing</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {AGENT_REGISTRY.map(agent => {
              const flagId     = AGENT_FLAG_MAP[agent.id];
              const persistent = flagId === null;
              return (
                <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: G.card2, border: `1px solid ${G.border}`, borderRadius: '8px', borderLeft: `3px solid ${persistent ? G.green : G.muted}` }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{agent.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: G.text }}>{agent.name}</div>
                    <div style={{ fontSize: '0.68rem', color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.role}</div>
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', flexShrink: 0, background: persistent ? `${G.green}20` : `${G.muted}15`, color: persistent ? G.green : G.muted, border: `1px solid ${persistent ? G.green + '40' : G.border2}` }}>
                    {persistent ? 'PERSISTENT' : `FLAG: ${flagId}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HERALD — drop-off intelligence ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border2}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: G.text, marginBottom: '0.2rem' }}>🔔 Herald — Drop-off Intelligence</div>
              <div style={{ fontSize: '0.7rem', color: G.muted }}>Users who need a nudge · in-app notify · email cadence coming</div>
            </div>
            <button onClick={loadHerald} style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↻</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {([
              { id: 'noShares' as const, label: '📢 No Shares', count: herald?.noShares?.length ?? 0 },
              { id: 'noAd'     as const, label: '🦋 No Ad',     count: herald?.noAd?.filter((u: any) => u.email !== 'test@antcpu.com').length ?? 0 },
              { id: 'inactive' as const, label: '💤 Inactive',  count: herald?.inactive?.length ?? 0 },
            ]).map(t => (
              <button key={t.id} onClick={() => setHeraldTab(t.id)} style={{
                background:   heraldTab === t.id ? G.purple : 'transparent',
                border:       `1px solid ${heraldTab === t.id ? G.purple : G.border2}`,
                borderRadius: '6px', padding: '0.25rem 0.65rem',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                color: heraldTab === t.id ? '#fff' : G.muted, transition: 'all 0.15s',
              }}>
                {t.label}{t.count > 0 ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>

          {/* List */}
          {!herald ? (
            <div style={{ color: G.muted, fontSize: '0.82rem' }}>Loading...</div>
          ) : heraldList.length === 0 ? (
            <div style={{ color: G.muted, fontSize: '0.82rem', padding: '0.75rem 0', textAlign: 'center' }}>🔔 No users in this bucket.</div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
              {heraldList.map((u: any) => {
                const key    = u.email + heraldTab;
                const nudged = nudgedIds.has(key);
                const busy   = nudgingId === key;
                const days   = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86_400_000);
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', background: G.card2, border: `1px solid ${G.border}`, borderRadius: '8px', borderLeft: `3px solid ${G.purple}`, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: G.text }}>{u.name || u.email}</div>
                      <div style={{ fontSize: '0.68rem', color: G.muted }}>{u.brand_name} · {u.country} · {days}d ago</div>
                      {heraldTab === 'noShares' && u.ad_title && (
                        <div style={{ fontSize: '0.65rem', color: G.dim, marginTop: '0.1rem' }}>"{u.ad_title.slice(0, 55)}{u.ad_title.length > 55 ? '…' : ''}"</div>
                      )}
                    </div>
                    <button onClick={() => !busy && !nudged && nudgeUser(u, heraldTab)} disabled={busy || nudged} style={{
                      background:   nudged ? G.card2 : `${G.purple}20`,
                      border:       `1px solid ${nudged ? G.border : G.purple + '60'}`,
                      borderRadius: '8px', color: nudged ? G.dim : '#b388ff',
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.6rem',
                      cursor: nudged || busy ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {nudged ? '✅ Sent' : busy ? '…' : '✉️ Nudge'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── NOTIFICATION LOG ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border2}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: G.text, marginBottom: '0.2rem' }}>✉️ Notification Log</div>
              <div style={{ fontSize: '0.7rem', color: G.muted }}>{notifLog.length} total · {notifLog.filter(n => !n.read).length} unread</div>
            </div>
            <button onClick={loadNotifLog} style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['all', 'unread', 'approved', 'rejected', 'nudge', 'rank', 'aria'].map(f => (
              <button key={f} onClick={() => setNotifFilter(f)} style={{
                background:   notifFilter === f ? G.orange : 'transparent',
                border:       `1px solid ${notifFilter === f ? G.orange : G.border2}`,
                borderRadius: '6px', padding: '0.2rem 0.5rem',
                fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                color: notifFilter === f ? '#000' : G.muted, transition: 'all 0.15s',
              }}>{f}</button>
            ))}
          </div>

          {notifLoading ? (
            <div style={{ color: G.muted, fontSize: '0.82rem' }}>Loading...</div>
          ) : filteredNotifs.length === 0 ? (
            <div style={{ color: G.muted, fontSize: '0.82rem', padding: '0.75rem 0', textAlign: 'center' }}>No notifications in this filter.</div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
              {filteredNotifs.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', background: G.card2, border: `1px solid ${G.border}`, borderRadius: '8px', borderLeft: `3px solid ${NOTIF_TYPE_COLOR[n.type] || G.muted}`, opacity: n.read ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: G.text, flex: 1 }}>{n.title}</div>
                      <div style={{ fontSize: '0.62rem', color: G.dim, flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: G.muted }}>{n.email}</div>
                    {n.message && <div style={{ fontSize: '0.65rem', color: G.dim, marginTop: '0.15rem', lineHeight: 1.4 }}>{n.message.slice(0, 90)}{n.message.length > 90 ? '…' : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', background: `${NOTIF_TYPE_COLOR[n.type] || G.muted}20`, color: NOTIF_TYPE_COLOR[n.type] || G.muted }}>{n.type}</span>
                    {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: G.orange, display: 'block' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AMANDA AGENT CARD — unchanged from original ── */}
        <div style={{ background: 'linear-gradient(135deg, #0d0a10 0%, #1a0d18 100%)', border: '1px solid #e91e8c33', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '200px', background: 'radial-gradient(ellipse at 80% 0%, rgba(233,30,140,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem' }}>📸</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Amanda Photography</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '0.15rem' }}>Portrait · Events · Thomasville NC · amandaland.vercel.app</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', background: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4caf50', borderRadius: '999px', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>
                {amanda?.discordLive ? '● Discord Live' : '○ Discord Offline'}
              </span>
              <span style={{ fontSize: '0.65rem', background: '#e91e8c15', border: '1px solid #e91e8c33', color: '#e91e8c', borderRadius: '999px', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>KB active</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { label: 'ASSETS',    value: amandaLoading ? '…' : String(amanda?.assets ?? 0),          color: '#fff'     },
              { label: 'EVENTS',    value: amandaLoading ? '…' : String(amanda?.events ?? 0),          color: '#fff'     },
              { label: 'TOP CAT',   value: amandaLoading ? '…' : String(amanda?.topCategory ?? '—'),   color: '#e91e8c'  },
              { label: 'ARENA ADS', value: amandaLoading ? '…' : String(amanda?.arenaAds ?? 0),        color: '#fff'     },
              { label: 'ARENA PTS', value: amandaLoading ? '…' : String(amanda?.arenaPoints ?? 0),     color: '#c8f564'  },
              { label: 'TO RISING', value: amandaLoading ? '…' : `${amanda?.pointsToRising ?? '—'} pts`, color: '#f5a623' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{stat.label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          {amanda && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.08em' }}>ARENA TIER PROGRESS</span>
                <span style={{ fontSize: '0.65rem', color: '#c8f564', fontWeight: 700 }}>{amanda.arenaPoints} / 100 pts → Rising</span>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (amanda.arenaPoints / 100) * 100)}%`, background: 'linear-gradient(90deg, #e91e8c, #c8f564)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => window.open('https://amandaland.vercel.app/agent', '_blank')} style={{ background: '#e91e8c', border: 'none', color: '#fff', borderRadius: '10px', padding: '0.65rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>🤖 Open Amanda Agent</button>
            <button onClick={() => router.push('/dashboard/photography')} style={{ background: '#e91e8c15', border: '1px solid #e91e8c33', color: '#e91e8c', borderRadius: '10px', padding: '0.65rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>📋 Post Builder</button>
            <button onClick={() => window.open('https://antcpu-ads.vercel.app/arena', '_blank')} style={{ background: '#c8f56415', border: '1px solid #c8f56433', color: '#c8f564', borderRadius: '10px', padding: '0.65rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>⚡ Arena</button>
            <button onClick={() => window.open('https://antcpu.com/manda/', '_blank')} style={{ background: '#ffffff08', border: '1px solid #333', color: '#888', borderRadius: '10px', padding: '0.65rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>🌐 Portfolio</button>
          </div>
        </div>

        {/* ── BRAND PIPELINE CARDS — unchanged from original ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px,100%), 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
          {loading ? (
            [0, 1].map(i => (
              <div key={i} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '16px', padding: '1.5rem', height: '160px' }} />
            ))
          ) : brands.filter(b => b.id !== 'photography').map(b => (
            <div key={b.id} style={{ background: G.card, border: `1px solid ${b.color}22`, borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{b.icon} {b.name}</div>
                  <div style={{ fontSize: '0.75rem', color: G.muted }}>{b.desc}</div>
                </div>
                <span style={{ fontSize: '0.65rem', background: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4caf50', borderRadius: '999px', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>KB active</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'TOTAL ADS', value: b.total,   color: '#fff'    },
                  { label: 'LIVE',      value: b.active,  color: '#4caf50' },
                  { label: 'REVIEW',    value: b.pending, color: '#f0c040' },
                  { label: 'LAST AD',   value: b.lastAd,  color: '#888', small: true },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{stat.label}</div>
                    <div style={{ fontSize: stat.small ? '0.82rem' : '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push(b.path)} style={{ width: '100%', background: `${b.color}15`, border: `1px solid ${b.color}33`, color: b.color, borderRadius: '10px', padding: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                Open {b.name} Pipeline →
              </button>
            </div>
          ))}
        </div>

        {/* ── RECENT AD ACTIVITY — unchanged from original ── */}
        <div>
          <div style={{ fontSize: '0.7rem', color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Recent Ad Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {loading ? (
              <div style={{ color: G.dim, fontSize: '0.82rem' }}>loading...</div>
            ) : recentAds.map(ad => (
              <div key={ad.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: G.text }}>{ad.brand}</span>
                  <span style={{ fontSize: '0.7rem', color: G.muted }}>{ad.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: ad.status === 'active' ? '#4caf50' : ad.status === 'pending_review' ? '#f0c040' : '#ff4444' }}>
                    {ad.status === 'active' ? '🟢 LIVE' : ad.status === 'pending_review' ? '🟡 REVIEW' : '🔴 REJECTED'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: G.dim }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <ArenaFooter />
    </div>
  );
}
