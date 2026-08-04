'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import AdminBar from '../../components/AdminBar';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord, DC } from '../../lib/discord';
import PostsModule from '../../modules/posts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingAd = {
  id: string; brand: string; email: string; title: string;
  url: string; description: string; category: string;
  tier: string; created_at: string;
};

type ActiveAd = {
  id: string; brand: string; title: string; description: string;
  url: string; points: number; tier: string; is_system: boolean;
  rank_position?: number;
};

type EditForm = { title: string; description: string; url: string };

// ─── Aria verdict ─────────────────────────────────────────────────────────────
// Aria pre-screens every pending ad before admin review.
// Verdicts are advisory — admin makes the final call.

const VERDICTS = {
  default:        { icon: '🦋', note: 'Looks good. Title clear, URL present, description readable. Ready for your call.' },
  no_desc:        { icon: '🦋', note: 'Description missing or too short. Ask the brand to add more context before approving.' },
  no_url:         { icon: '🦋', note: 'No destination URL. This ad has nowhere to send people — hold until fixed.' },
  short_title:    { icon: '🦋', note: 'Title is short. Will work, but a stronger headline would perform better.' },
  brand_mismatch: { icon: '⚠️', note: 'Brand mismatch — ANTCPU content under a different brand. Likely used the seed ad. Reject and ask them to rewrite.' },
  seed_ad:        { icon: '⚠️', note: 'Default seed ad detected — user did not edit the example. Reject and ask for their own ad.' },
};

const SEED   = ['coming in hot', 'antcpu ad network', 'antcpu ads'];
const ANTCPU = ['antcpu', 'antcpu.com', 'antcpu-ads'];

function ariaVerdict(ad: PendingAd) {
  const c = `${ad.title} ${ad.description} ${ad.url}`.toLowerCase();
  const b = ad.brand.toLowerCase();
  if (SEED.some(p => c.includes(p)))                      return VERDICTS.seed_ad;
  if (b !== 'antcpu' && ANTCPU.some(p => c.includes(p)))  return VERDICTS.brand_mismatch;
  if (!ad.url || ad.url.length < 5)                       return VERDICTS.no_url;
  if (!ad.description || ad.description.length < 20)      return VERDICTS.no_desc;
  if (!ad.title || ad.title.length < 10)                  return VERDICTS.short_title;
  return VERDICTS.default;
}

// ─── Rank medal helper ────────────────────────────────────────────────────────

function rankMedal(rank?: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank && rank <= 10) return `#${rank}`;
  return '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AntcpuDashboard() {
  const router = useRouter();

  const [hydrated,      setHydrated]      = useState(false);
  const [user,          setUser]          = useState<any>(null);

  // ── Approval queue ──
  const [pendingAds,    setPendingAds]    = useState<PendingAd[]>([]);
  const [loadingAds,    setLoadingAds]    = useState(false);
  const [actionId,      setActionId]      = useState<string | null>(null);

  // ── Active ads management ──
  const [activeAds,     setActiveAds]     = useState<ActiveAd[]>([]);
  const [archivedAds,   setArchivedAds]   = useState<ActiveAd[]>([]);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);   // archive confirm gate
  const [archivingId,   setArchivingId]   = useState<string | null>(null);   // archive in-flight
  const [restoringId,   setRestoringId]   = useState<string | null>(null);   // restore in-flight
  const [editingId,     setEditingId]     = useState<string | null>(null);   // edit form open
  const [editForm,      setEditForm]      = useState<EditForm>({ title: '', description: '', url: '' });
  const [savingId,      setSavingId]      = useState<string | null>(null);   // save in-flight
  const [recalculating, setRecalculating] = useState(false);                 // Scout recalc in-flight

  // ─── Data loaders ─────────────────────────────────────────────────────────

  const loadPending = useCallback(async () => {
    setLoadingAds(true);
    const { data } = await supabase
      .from('ads')
      .select('id, brand, email, title, url, description, category, tier, created_at')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });
    setPendingAds(data || []);
    setLoadingAds(false);
  }, []);

  const loadActive = useCallback(async () => {
    // Fetch active ads — ordered by points, rank_position included for medal display
    const { data: active } = await supabase
      .from('ads')
      .select('id, brand, title, description, url, points, tier, is_system, rank_position')
      .eq('status', 'active')
      .order('points', { ascending: false });
    setActiveAds(active || []);

    // Fetch archived ads — same owner, ordered by points for context
    const { data: archived } = await supabase
      .from('ads')
      .select('id, brand, title, description, url, points, tier, is_system, rank_position')
      .eq('status', 'archived')
      .eq('email', 'user.email')
      .order('points', { ascending: false });
    setArchivedAds(archived || []);
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
    loadPending();
    loadActive();
  }, [loadPending, loadActive]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function approveAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    // Fire Scout — recalculates all ranks after new ad enters Arena
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: id }),
    }).catch(() => {});
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      notifyDiscord('', 'ad_approved', {
        title: '✅ Ad Approved',
        color: DC.green,
        fields: [
          { name: 'Brand',    value: ad.brand,    inline: true },
          { name: 'Tier',     value: ad.tier,     inline: true },
          { name: 'Category', value: ad.category, inline: true },
          { name: 'Title',    value: ad.title,    inline: false },
          { name: 'Email',    value: ad.email,    inline: false },
        ],
        footer: 'Aria reviewed · approved by admin',
        timestamp: true,
      });
    }
    await loadPending();
    await loadActive();
    setActionId(null);
  }

  async function rejectAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', id);
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      const verdict = ariaVerdict(ad);
      notifyDiscord('', 'ad_rejected', {
        title: '❌ Ad Rejected',
        color: DC.red,
        fields: [
          { name: 'Brand',    value: ad.brand,     inline: true },
          { name: 'Tier',     value: ad.tier,      inline: true },
          { name: 'Category', value: ad.category,  inline: true },
          { name: 'Title',    value: ad.title,     inline: false },
          { name: 'Email',    value: ad.email,     inline: false },
          { name: '🦋 Aria',  value: verdict.note, inline: false },
        ],
        footer: 'ANTCPU ADS · Aria Review',
        timestamp: true,
      });
    }
    await loadPending();
    setActionId(null);
  }

  async function confirmArchive(id: string) {
    // Two-step archive — user confirmed, now execute
    setConfirmId(null);
    setArchivingId(id);
    await supabase.from('ads')
      .update({ status: 'archived', pinned: false })
      .eq('id', id);
    const ad = activeAds.find(a => a.id === id);
    if (ad) {
      notifyDiscord('', 'ad_archived', {
        title: '📦 Ad Archived',
        color: DC.orange,
        fields: [
          { name: 'Brand', value: ad.brand, inline: true },
          { name: 'Tier',  value: ad.tier,  inline: true },
          { name: 'Title', value: ad.title, inline: false },
        ],
        footer: 'ANTCPU ADS · Admin Archive',
        timestamp: true,
      });
    }
    await loadActive();
    setArchivingId(null);
  }

  async function restoreAd(id: string) {
    // Restore archived ad to active — Scout recalculates ranks
    setRestoringId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: id }),
    }).catch(() => {});
    await loadActive();
    setRestoringId(null);
  }

  function openEdit(ad: ActiveAd) {
    // Close any open confirm before opening edit
    setConfirmId(null);
    setEditingId(ad.id);
    setEditForm({ title: ad.title, description: ad.description, url: ad.url });
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    await supabase.from('ads')
      .update({
        title:       editForm.title.trim(),
        description: editForm.description.trim(),
        url:         editForm.url.trim(),
      })
      .eq('id', id);
    setEditingId(null);
    await loadActive();
    setSavingId(null);
  }

  async function recalcRankings() {
    // Manually trigger Scout on the top active ad — recalculates all 55 ads in one pass
    if (activeAds.length === 0) return;
    setRecalculating(true);
    await fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: activeAds[0].id }),
    });
    await loadActive();
    setRecalculating(false);
  }

  if (!hydrated || !user) return null;

  const moduleCtx = {
    slug: 'antcpu',
    user: { email: user.email, name: user.name, brand: user.brand, trialStatus: 'team' },
    ads: [],  // PostsModule fetches its own brand ads internally via slug
    supabase,
    isSuper: true,
  };

  // ─── Shared inline styles ──────────────────────────────────────────────────

  const inpStyle: React.CSSProperties = {
    width: '100%', background: '#fafafa', border: '1px solid #e5e5e5',
    borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
    color: '#0a0a0a', fontFamily: 'system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem',
  };

  const rowBtn = (color: string, disabled = false): React.CSSProperties => ({
    background: 'transparent',
    border: `1px solid ${disabled ? '#e5e5e5' : color}`,
    borderRadius: '8px',
    color: disabled ? '#ccc' : color,
    fontSize: '0.72rem', fontWeight: 700,
    padding: '0.35rem 0.6rem',
    cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#0a0a0a' }}>
      <ArenaNav
        role="admin"
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <AdminBar />

        {/* ── HEADER ── */}
        <Card>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.25rem' }}>⚡ ANTCPU</div>
          <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '1rem' }}>Brand dashboard — ad management + content tools</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Pill label="← Dashboard"  onClick={() => router.push('/dashboard')}       color="#0a0a0a" outline />
            <Pill label="📢 Create Ad" onClick={() => router.push('/create-ad')}       color="#f0883e" />
            <Pill label="⚡ Admin"     onClick={() => router.push('/dashboard/admin')} color="#f0883e" outline />
          </div>
        </Card>

        {/* ── TEAM ── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700 }}>Antony Ciccone</div>
              <div style={{ fontSize: '0.78rem', color: '#555' }}>{user.name} {user.email} · Founder & Admin</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>✅ Admin</span>
          </div>
        </Card>

        {/* ── ARIA APPROVAL QUEUE ── */}
        <Card>
          <SectionHeader
            title={`🦋 Aria Approval Queue${pendingAds.length > 0 ? ` (${pendingAds.length} pending)` : ''}`}
            sub="Aria reviews each submission — you make the final call"
          />
          {loadingAds && (
            <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading queue...</div>
          )}
          {!loadingAds && pendingAds.length === 0 && (
            <div style={{ color: '#555', fontSize: '0.82rem' }}>🦋 All clear — no ads pending review right now.</div>
          )}
          {pendingAds.map(ad => {
            const verdict = ariaVerdict(ad);
            const busy    = actionId === ad.id;
            return (
              <div key={ad.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{ad.brand}</span>
                  <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{ad.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.25rem' }}>{ad.description}</div>
                <a href={ad.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: '#0070f3', wordBreak: 'break-all', display: 'block', marginBottom: '0.25rem' }}>
                  {ad.url}
                </a>
                <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: '0.75rem' }}>
                  📧 {ad.email} · 🏷 {ad.category} · {ad.tier}
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  {verdict.icon} <strong>Aria:</strong> {verdict.note}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Pill label={busy ? '…' : '✅ Approve'} onClick={() => !busy && approveAd(ad.id)} color="#16a34a" />
                  <Pill label={busy ? '…' : '❌ Reject'}  onClick={() => !busy && rejectAd(ad.id)}  color="#dc2626" outline />
                </div>
              </div>
            );
          })}
        </Card>

        {/* ── ACTIVE ADS — MANAGE ── */}
        <Card>
          <SectionHeader
            title={`📋 Active Ads (${activeAds.length})`}
            sub="Edit or archive your active ads — Scout recalculates on next interaction"
          />

          {/* Recalculate rankings — forces Scout to run a full two-pass on all active ads */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={recalcRankings}
              disabled={recalculating || activeAds.length === 0}
              style={{
                background:   recalculating ? '#f5f5f5' : '#f0883e',
                border:       'none',
                borderRadius: '8px',
                color:        recalculating ? '#aaa' : '#fff',
                fontSize:     '0.78rem',
                fontWeight:   700,
                padding:      '0.5rem 1rem',
                cursor:       recalculating ? 'default' : 'pointer',
                transition:   'all 0.15s',
              }}
            >
              {recalculating ? '⏳ Recalculating…' : '⚡ Recalculate Rankings'}
            </button>
            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
              Run after archiving or restoring ads
            </span>
          </div>

          {activeAds.length === 0 ? (
            <div style={{ color: '#555', fontSize: '0.82rem' }}>No active ads.</div>
          ) : (
            activeAds.map(ad => {
              const isEditing = editingId === ad.id;
              const isConfirm = confirmId === ad.id;
              const isBusy    = archivingId === ad.id || savingId === ad.id;
              const medal     = rankMedal(ad.rank_position);

              return (
                <div key={ad.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>

                  {/* Row header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                    {medal && <span style={{ fontSize: '0.85rem' }}>{medal}</span>}
                    <span style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700 }}>{ad.brand}</span>
                    <span style={{ fontSize: '0.62rem', color: '#aaa', background: '#f5f5f5', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{ad.tier}</span>
                    {ad.is_system && <span style={{ fontSize: '0.6rem', color: '#bbb' }}>system</span>}
                    <span style={{ fontSize: '0.65rem', color: '#f0883e', fontWeight: 700, marginLeft: 'auto' }}>⚡ {ad.points ?? 0}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#333', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {ad.title}
                  </div>

                  {/* Edit form — inline, expands on ✏️ Edit click */}
                  {isEditing && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <input
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                        style={inpStyle}
                      />
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description"
                        rows={3}
                        style={{ ...inpStyle, resize: 'vertical' }}
                      />
                      <input
                        value={editForm.url}
                        onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                        placeholder="URL"
                        style={{ ...inpStyle, marginBottom: 0 }}
                      />
                    </div>
                  )}

                  {/* Archive confirm — inline amber warning before executing */}
                  {isConfirm && (
                    <div style={{ background: '#fff8f0', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.65rem', fontSize: '0.8rem', color: '#92400e' }}>
                      Archive this ad? It will leave the Arena feed.
                    </div>
                  )}

                  {/* Action buttons — mutually exclusive states */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!isEditing && !isConfirm && (
                      <>
                        <button onClick={() => openEdit(ad)}          style={rowBtn('#0070f3')}>✏️ Edit</button>
                        <button onClick={() => setConfirmId(ad.id)}   style={rowBtn('#f0883e')}>📦 Archive</button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button onClick={() => saveEdit(ad.id)} disabled={isBusy} style={rowBtn('#16a34a', isBusy)}>
                          {savingId === ad.id ? '…' : '💾 Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} style={rowBtn('#aaa')}>✕ Cancel</button>
                      </>
                    )}
                    {isConfirm && (
                      <>
                        <button onClick={() => confirmArchive(ad.id)} disabled={isBusy} style={rowBtn('#dc2626', isBusy)}>
                          {archivingId === ad.id ? '…' : '📦 Confirm Archive'}
                        </button>
                        <button onClick={() => setConfirmId(null)} style={rowBtn('#aaa')}>✕ Cancel</button>
                      </>
                    )}
                  </div>

                </div>
              );
            })
          )}

          {/* Archived ads — restore section */}
          {archivedAds.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
                📦 Archived ({archivedAds.length})
              </div>
              {archivedAds.map(ad => (
                <div key={ad.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem', opacity: 0.6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700 }}>{ad.brand} · </span>
                    <span style={{ fontSize: '0.78rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</span>
                    {(ad.points ?? 0) > 0 && (
                      <span style={{ fontSize: '0.62rem', color: '#f0883e', marginLeft: '0.4rem' }}>⚡ {ad.points}</span>
                    )}
                  </div>
                  <button
                    onClick={() => restoreAd(ad.id)}
                    disabled={restoringId === ad.id}
                    style={rowBtn('#22c55e', restoringId === ad.id)}
                  >
                    {restoringId === ad.id ? '…' : '↩ Restore'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── POSTS MODULE ── */}
        <Card>
          <PostsModule {...moduleCtx} />
        </Card>

        <ArenaFooter accent="#f0883e" />
      </div>
    </div>
  );
}
