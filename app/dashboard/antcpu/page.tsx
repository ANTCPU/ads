// app/dashboard/antcpu/page.tsx
// ─── ANTCPU Command Centre — super admin ──────────────────────────────────────
// Layout shell (bg, max-width, padding) owned by layout.tsx.
// This file owns: nav, data, handlers, section wiring only.
// Sections extracted to: AriaModal, ActiveAdsModule, DigestMonitor, ArenaFlagsModule
//
// v2 (Sep 2026):
//   — Tools link /mapofpi/arena → /arena/mapofpi
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import { createClient }          from '@supabase/supabase-js';
import ArenaNav                  from '../../components/ArenaNav';
import AdminBar                  from '../../components/AdminBar';
import AriaModal                 from '../../components/AriaModal';
import MessageComposer           from '../../components/MessageComposer';
import PostsModule               from '../../modules/posts';
import ActiveAdsModule           from '../../modules/active-ads';
import DigestMonitor             from '../../modules/digest-monitor';
import ArenaFlagsModule          from '../../modules/arena-flags';
import { clearSessionCookie }    from '../../lib/session';
import { ariaVerdict }           from '../../lib/aria';
import {
  G, sectionCard, pingDiscord,
}                                from '../../lib/adminTokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingAd = {
  id: string; brand: string; email: string; title: string;
  url: string; description: string; category: string;
  tier: string; created_at: string;
};

type ArenaStats = {
  totalAds: number; totalBrands: number; totalCountries: number;
  totalPoints: number; totalAdvertisers: number; totalReactions: number;
  totalShares: number; totalClicks: number;
  topBrand: string | null;
  topAds:   { id: string; brand: string; points: number; rank_position?: number }[];
  generatedAt: string;
};

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function AntcpuDashboard() {
  const router = useRouter();

  const [hydrated,     setHydrated]     = useState(false);
  const [user,         setUser]         = useState<any>(null);
  const [pendingAds,   setPendingAds]   = useState<PendingAd[]>([]);
  const [loadingAds,   setLoadingAds]   = useState(false);
  const [actionId,     setActionId]     = useState<string | null>(null);
  const [ariaAd,       setAriaAd]       = useState<PendingAd | null>(null);
  const [arenaStats,   setArenaStats]   = useState<ArenaStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadPending = useCallback(async () => {
    setLoadingAds(true);
    const { data } = await supabase
      .from('ads')
      .select('id,brand,email,title,url,description,category,tier,created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });
    setPendingAds(data || []);
    setLoadingAds(false);
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res  = await fetch('/api/stats');
      const json = await res.json();
      setArenaStats(json);
    } catch {}
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'super' && u.role !== 'admin') { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);
    Promise.all([loadPending(), loadStats()]);
  }, [loadPending, loadStats]);

  // ─── Ad handlers ──────────────────────────────────────────────────────────

  async function approveAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: id }) }).catch(() => {});
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      pingDiscord('', 'ad_approved', { title: '✅ Ad Approved', color: 0x2E7D32, fields: [{ name: 'Brand', value: ad.brand, inline: true }, { name: 'Tier', value: ad.tier, inline: true }, { name: 'Category', value: ad.category, inline: true }, { name: 'Title', value: ad.title, inline: false }, { name: 'Email', value: ad.email, inline: false }], footer: 'Aria reviewed · approved by admin', timestamp: true });
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ad.email, type: 'approved', title: '✅ Your ad is live in the Arena', message: `"${ad.title}" has been approved and is now competing in the Arena. Share it to earn points and climb the ranks.` }) }).catch(() => {});
    }
    setAriaAd(null);
    await loadPending();
    await loadStats();
    setActionId(null);
  }

  async function rejectAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', id);
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      const verdict = ariaVerdict(ad);
      pingDiscord('', 'ad_rejected', { title: '❌ Ad Rejected', color: 0xEF4444, fields: [{ name: 'Brand', value: ad.brand, inline: true }, { name: 'Tier', value: ad.tier, inline: true }, { name: 'Category', value: ad.category, inline: true }, { name: 'Title', value: ad.title, inline: false }, { name: 'Email', value: ad.email, inline: false }, { name: '🦋 Aria', value: verdict.note, inline: false }], footer: 'ANTCPU ADS · Aria Review', timestamp: true });
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ad.email, type: 'rejected', title: '❌ Your ad needs a small revision', message: `"${ad.title}" wasn't approved yet. ${verdict.note} Edit and resubmit.` }) }).catch(() => {});
    }
    setAriaAd(null);
    await loadPending();
    await loadStats();
    setActionId(null);
  }

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!hydrated || !user) return null;

  const topAd = arenaStats?.topAds?.[0] || null;

  const moduleCtx = {
    slug: 'antcpu',
    user: { email: user.email, name: user.name, brand: user.brand, trialStatus: 'team' },
    ads: [], supabase, isSuper: true,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Nav — outside layout container so it spans full width ── */}
      <ArenaNav
        role="admin"
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      {/* ── All sections — layout.tsx owns the container ── */}
      <AdminBar role={user.role} />

      {/* Aria modal — portal-style, renders above everything */}
      <AriaModal
        ad={ariaAd}
        actionId={actionId}
        onClose={() => setAriaAd(null)}
        onApprove={approveAd}
        onReject={rejectAd}
      />

      {/* ── COMMAND CENTRE HEADER ── */}
      <div style={{ background: G.card, border: `1px solid ${G.orange}30`, borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${G.orange}, ${G.gold}, transparent)` }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: G.orange, marginBottom: '0.2rem' }}>⚡ ANTCPU COMMAND CENTRE</div>
            <div style={{ fontSize: '0.75rem', color: G.muted }}>
              Arena network — live overview
              {arenaStats?.generatedAt && <span style={{ marginLeft: '0.5rem', color: G.dim }}>· updated {new Date(arenaStats.generatedAt).toLocaleTimeString()}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#0a2a0a', border: `1px solid ${G.green}40`, borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.65rem', color: G.green, fontWeight: 700 }}>🟢 LIVE</span>
            <button onClick={loadStats} style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↻ Refresh</button>
          </div>
        </div>

        {/* Stat grid row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {[
            { label: 'Active Ads',   value: statsLoading ? '…' : (arenaStats?.totalAds         ?? '—'), color: G.orange },
            { label: 'Brands',       value: statsLoading ? '…' : (arenaStats?.totalBrands       ?? '—'), color: G.blue   },
            { label: 'Countries',    value: statsLoading ? '…' : (arenaStats?.totalCountries    ?? '—'), color: G.gold   },
            { label: 'Total Points', value: statsLoading ? '…' : (arenaStats?.totalPoints?.toLocaleString() ?? '—'), color: G.orange },
          ].map(s => (
            <div key={s.label} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Stat grid row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Clicks',      value: statsLoading ? '…' : (arenaStats?.totalClicks?.toLocaleString()    ?? '—'), color: G.blue    },
            { label: 'Shares',      value: statsLoading ? '…' : (arenaStats?.totalShares?.toLocaleString()    ?? '—'), color: G.green   },
            { label: 'Reactions',   value: statsLoading ? '…' : (arenaStats?.totalReactions?.toLocaleString() ?? '—'), color: '#ff0080' },
            { label: 'Advertisers', value: statsLoading ? '…' : (arenaStats?.totalAdvertisers ?? '—'),                 color: G.gold    },
          ].map(s => (
            <div key={s.label} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top brand + top ad */}
        {(arenaStats?.topBrand || topAd) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {arenaStats?.topBrand && (
              <div style={{ flex: 1, minWidth: '140px', background: G.card2, border: `1px solid ${G.gold}30`, borderRadius: '10px', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>🥇 Top Brand</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.gold }}>{arenaStats.topBrand}</div>
              </div>
            )}
            {topAd && (
              <div style={{ flex: 2, minWidth: '180px', background: G.card2, border: `1px solid ${G.orange}30`, borderRadius: '10px', padding: '0.65rem 0.85rem' }}>
                <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>⚡ Top Ad</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.orange }}>{topAd.brand}</div>
                <div style={{ fontSize: '0.7rem', color: G.muted }}>{topAd.points.toLocaleString()} pts</div>
              </div>
            )}
          </div>
        )}

        {/* Pending alert + quick actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {pendingAds.length > 0 ? (
            <div style={{ flex: 1, background: '#1a0e00', border: `1px solid ${G.orange}50`, borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.78rem', color: G.orange, fontWeight: 700 }}>
              ⚠️ {pendingAds.length} ad{pendingAds.length !== 1 ? 's' : ''} pending review
            </div>
          ) : (
            <div style={{ flex: 1, background: '#0a1a0a', border: `1px solid ${G.green}30`, borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '0.78rem', color: G.green, fontWeight: 700 }}>
              🦋 Queue clear — no ads pending
            </div>
          )}
          <button onClick={() => router.push('/create-ad')} style={{ background: G.orange, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.85rem', cursor: 'pointer' }}>📢 Create Ad</button>
          <button onClick={() => router.push('/dashboard/admin')} style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '8px', color: G.muted, fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.85rem', cursor: 'pointer' }}>⚡ Admin →</button>
        </div>
      </div>

      {/* ── TEAM CARD ── */}
      <div style={{ ...sectionCard, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, color: G.text }}>Antony Ciccone</div>
            <div style={{ fontSize: '0.75rem', color: G.muted }}>{user.email} · Founder & Admin</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: G.green, fontWeight: 700 }}>✅ Super Admin</span>
        </div>
      </div>

      {/* ── ARIA APPROVAL QUEUE ── */}
      <div style={sectionCard}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, marginBottom: '0.2rem' }}>
            🦋 Aria Approval Queue
            {pendingAds.length > 0 && (
              <span style={{ marginLeft: '0.5rem', background: `${G.orange}20`, border: `1px solid ${G.orange}40`, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', color: G.orange, fontWeight: 700 }}>
                {pendingAds.length} pending
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: G.muted }}>Aria reviews each submission — click 🦋 to open the live interface</div>
        </div>

        {loadingAds && <div style={{ color: G.muted, fontSize: '0.82rem', padding: '1rem 0' }}>Loading queue...</div>}
        {!loadingAds && pendingAds.length === 0 && (
          <div style={{ color: G.muted, fontSize: '0.82rem', padding: '1rem 0', textAlign: 'center' }}>🦋 All clear — no ads pending review.</div>
        )}

        {pendingAds.length > 0 && (
          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
            {pendingAds.map(ad => {
              const verdict = ariaVerdict(ad);
              const busy    = actionId === ad.id;
              return (
                <div key={ad.id} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '1rem', borderLeft: `3px solid ${verdict.autoApprove ? G.green : G.orange}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text }}>{ad.brand}</span>
                    <span style={{ fontSize: '0.68rem', color: G.dim }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: G.text, marginBottom: '0.3rem' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.78rem', color: G.muted, marginBottom: '0.3rem', lineHeight: 1.4 }}>
                    {ad.description.length > 100 ? ad.description.slice(0, ad.description.lastIndexOf(' ', 100)) + '…' : ad.description}
                  </div>
                  <a href={ad.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: G.blue, wordBreak: 'break-all', display: 'block', marginBottom: '0.4rem' }}>{ad.url || '— no url —'}</a>
                  <div style={{ fontSize: '0.68rem', color: G.dim, marginBottom: '0.75rem' }}>📧 {ad.email} · 🏷 {ad.category} · {ad.tier}</div>
                  <div style={{ background: verdict.autoApprove ? '#0a1a0a' : '#1a0e00', border: `1px solid ${verdict.autoApprove ? G.green + '30' : G.orange + '30'}`, borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: verdict.autoApprove ? G.green : G.orange, lineHeight: 1.5 }}>
                    {verdict.icon} {verdict.note}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setAriaAd(ad)} style={{ background: `${G.orange}15`, border: `1px solid ${G.orange}40`, borderRadius: '8px', color: G.orange, fontWeight: 700, fontSize: '0.72rem', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>🦋 Ask Aria</button>
                    <button onClick={() => !busy && approveAd(ad.id)} disabled={busy} style={{ background: 'transparent', border: `1px solid ${busy ? G.border : G.green}`, borderRadius: '8px', color: busy ? G.dim : G.green, fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.6rem', cursor: busy ? 'default' : 'pointer' }}>{busy ? '…' : '✅ Approve'}</button>
                    <button onClick={() => !busy && rejectAd(ad.id)} disabled={busy} style={{ background: 'transparent', border: `1px solid ${busy ? G.border : G.red}`, borderRadius: '8px', color: busy ? G.dim : G.red, fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.6rem', cursor: busy ? 'default' : 'pointer' }}>{busy ? '…' : '❌ Reject'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ACTIVE ADS MODULE ── */}
      <ActiveAdsModule supabase={supabase} onStatsRefresh={loadStats} />

      {/* ── SEND MESSAGE ── */}
      <div style={sectionCard}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, marginBottom: '0.2rem' }}>✉️ Send Message</div>
        <div style={{ fontSize: '0.72rem', color: G.muted, marginBottom: '1rem' }}>Sends directly to any user's in-app envelope — appears instantly</div>
        <MessageComposer dark={true} />
      </div>

      {/* ── DIGEST MONITOR MODULE ── */}
      <DigestMonitor supabase={supabase} />

      {/* ── ARENA FLAGS MODULE ── */}
      <ArenaFlagsModule />

      {/* ── POSTS MODULE ── */}
      <div style={sectionCard}>
        <PostsModule {...moduleCtx} />
      </div>

      {/* ── ADMIN FOOTER ── */}
      <div style={{ ...sectionCard, marginTop: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${G.orange}, transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: G.orange }}>⚡ ANTCPU ADMIN</div>
          <a href="mailto:antcpu@gmail.com" style={{ fontSize: '0.72rem', color: G.muted, textDecoration: 'none' }}>✉️ antcpu@gmail.com</a>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.6rem', color: G.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Admin Surfaces</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { label: '🏗 Ad Builder', path: '/dashboard/admin'       },
              { label: '👥 Users',      path: '/dashboard/users'       },
              { label: '🤖 Agents',     path: '/dashboard/agents'      },
              { label: '🗺️ Map of Pi',  path: '/dashboard/mapofpi'     },
              { label: '🏆 Leaderboard',path: '/dashboard/leaderboard' },
              { label: '📸 Photography',path: '/dashboard/photography' },
            ].map(({ label, path }) => (
              <button key={path} onClick={() => router.push(path)}
                style={{ background: G.card2, border: `1px solid ${G.border2}`, borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', color: G.muted, cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6rem', color: G.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Tools</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { label: '📢 Create Ad', path: '/create-ad'                 },
              { label: '🏟 Arena',     path: '/arena'                     },
              { label: '🏆 Champions', path: '/champions'                 },
              { label: '🗺️ Map of Pi', path: '/arena/mapofpi'             }, // FIX
              { label: '💬 Discord',   path: 'https://discord.gg/antcpu' },
            ].map(({ label, path }) => (
              <button key={path}
                onClick={() => path.startsWith('http') ? window.open(path, '_blank') : router.push(path)}
                style={{ background: 'transparent', border: `1px solid ${G.border}`, borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', color: G.dim, cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: G.dim }}>
            © {new Date().getFullYear()} ANTCPU ADS · Built by Antony Ciccone · Thomasville, NC
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: G.dim }}>
              {arenaStats ? `${arenaStats.totalAds} ads · ${arenaStats.totalBrands} brands · ${arenaStats.totalCountries} countries` : '—'}
            </span>
            <span style={{ fontSize: '0.68rem', color: G.orange, fontWeight: 700 }}>⚡ v2</span>
          </div>
        </div>
      </div>
    </>
  );
}
