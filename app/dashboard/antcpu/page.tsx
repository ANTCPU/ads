'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter }             from 'next/navigation';
import ArenaNav                  from '../../components/ArenaNav';
import AdminBar                  from '../../components/AdminBar';
import MessageComposer           from '../../components/MessageComposer';
import { clearSessionCookie }    from '../../lib/session';
import { createClient }          from '@supabase/supabase-js';
import { ariaVerdict }           from '../../lib/aria';
import PostsModule               from '../../modules/posts';

// ✅ notifyDiscord + DC import REMOVED — routed through /api/discord-notify

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function pingDiscord(content: string, event: string, embed?: object) {
  fetch('/api/discord-notify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content, event, embed }),
  }).catch(() => {});
}

// ─── Design tokens — grey admin theme ────────────────────────────────────────
// Distinct from Arena (#0a0a0a black) and old white admin.
// Mid-grey command centre palette.

const G = {
  bg:      '#161616',
  card:    '#1e1e1e',
  card2:   '#242424',
  border:  '#2a2a2a',
  border2: '#333',
  text:    '#e0e0e0',
  muted:   '#888',
  dim:     '#444',
  orange:  '#f0883e',
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#0070f3',
  gold:    '#D4AF37',
  inp:     '#2a2a2a',
};

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

type ArenaFlag = {
  id:          string;
  label:       string;
  description: string;
  version:     string;
  status:      string;
  enabled:     boolean;
  notes?:      string;
  source?:     string;
};

type ArenaStats = {
  totalAds:         number;
  totalBrands:      number;
  totalCountries:   number;
  totalPoints:      number;
  totalAdvertisers: number;
  totalReactions:   number;
  totalShares:      number;
  totalClicks:      number;
  topBrand:         string | null;
  topAds:           { id: string; brand: string; points: number; rank_position?: number }[];
  generatedAt:      string;
};

// ─── Rank medal helper ────────────────────────────────────────────────────────

function rankMedal(rank?: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank && rank <= 10) return `#${rank}`;
  return '';
}

// ─── Version tab meta ─────────────────────────────────────────────────────────

const VERSION_TABS = [
  { id: 'beta',      label: '🧪 Beta'    },
  { id: 'v1',        label: '✅ v1'       },
  { id: 'v1testing', label: '🔬 v1 Test' },
  { id: 'v2',        label: '🚀 v2'       },
  { id: 'v2testing', label: '🔭 v2 Test' },
];

// ─── Aria response generator — client-side v1 ─────────────────────────────────
// Generates a contextual response based on the ad + question.
// Can be wired to a real LLM endpoint in v2.

function generateAriaResponse(ad: PendingAd, question: string): string {
  const verdict = ariaVerdict(ad);
  const q       = question.toLowerCase().trim();

  if (q.includes('approve') || q.includes('safe') || q.includes('ok')) {
    return verdict.autoApprove
      ? `🦋 Yes — I'd approve this. ${verdict.note}`
      : `🦋 I'd hold on this one. ${verdict.note} Review manually before approving.`;
  }

  if (q.includes('reject') || q.includes('problem') || q.includes('issue') || q.includes('wrong')) {
    return `🦋 Here's what I flagged: ${verdict.note} ${
      verdict.autoApprove
        ? 'That said, the ad looks clean overall.'
        : 'I recommend rejecting and asking the brand to revise.'
    }`;
  }

  if (q.includes('url') || q.includes('link') || q.includes('website')) {
    return ad.url && ad.url.length > 6
      ? `🦋 The URL looks present: ${ad.url} — verify it resolves to the brand's actual site.`
      : `🦋 No valid URL detected. I'll attempt to resolve one from the brand registry, but you should ask ${ad.brand} to provide their own link.`;
  }

  if (q.includes('brand') || q.includes('who') || q.includes('legit')) {
    return `🦋 Brand: **${ad.brand}** · Email: ${ad.email} · Category: ${ad.category} · Tier: ${ad.tier}. ${verdict.note}`;
  }

  if (q.includes('description') || q.includes('copy') || q.includes('text')) {
    return ad.description.length < 20
      ? `🦋 The description is too short (${ad.description.length} chars). Ask ${ad.brand} to expand it before approving.`
      : `🦋 Description looks adequate at ${ad.description.length} chars. ${verdict.note}`;
  }

  if (q.includes('title') || q.includes('headline')) {
    return ad.title.length < 8
      ? `🦋 Title is short (${ad.title.length} chars). It'll work but a stronger headline would perform better.`
      : `🦋 Title looks good: "${ad.title}"`;
  }

  // Default — return full verdict
  return `🦋 ${verdict.icon} ${verdict.note} ${
    verdict.autoApprove
      ? 'My recommendation: approve.'
      : 'My recommendation: review manually before approving.'
  }`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AntcpuDashboard() {
  const router = useRouter();

  const [hydrated,      setHydrated]      = useState(false);
  const [user,          setUser]          = useState<any>(null);
  const [pendingAds,    setPendingAds]    = useState<PendingAd[]>([]);
  const [loadingAds,    setLoadingAds]    = useState(false);
  const [actionId,      setActionId]      = useState<string | null>(null);
  const [activeAds,     setActiveAds]     = useState<ActiveAd[]>([]);
  const [archivedAds,   setArchivedAds]   = useState<ActiveAd[]>([]);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);
  const [archivingId,   setArchivingId]   = useState<string | null>(null);
  const [restoringId,   setRestoringId]   = useState<string | null>(null);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editForm,      setEditForm]      = useState<EditForm>({ title: '', description: '', url: '' });
  const [savingId,      setSavingId]      = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  // ── Flags state ──────────────────────────────────────────────────────────
  const [flags,        setFlags]        = useState<ArenaFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagVersion,  setFlagVersion]  = useState('beta');
  const [savingFlag,   setSavingFlag]   = useState<string | null>(null);

  // ── Arena stats — command centre header ──────────────────────────────────
  const [arenaStats,   setArenaStats]   = useState<ArenaStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Aria modal state ──────────────────────────────────────────────────────
  const [ariaModalAd,  setAriaModalAd]  = useState<PendingAd | null>(null);
  const [ariaQuestion, setAriaQuestion] = useState('');
  const [ariaResponse, setAriaResponse] = useState('');
  const [ariaAsking,   setAriaAsking]   = useState(false);

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
    const { data: active } = await supabase
      .from('ads')
      .select('id, brand, title, description, url, points, tier, is_system, rank_position')
      .eq('status', 'active')
      .order('points', { ascending: false });
    setActiveAds(active || []);

    const { data: archived } = await supabase
      .from('ads')
      .select('id, brand, title, description, url, points, tier, is_system, rank_position')
      .eq('status', 'archived')
      .order('points', { ascending: false });
    setArchivedAds(archived || []);
  }, []);

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true);
    try {
      const res  = await fetch('/api/flags');
      const json = await res.json();
      if (json.flags) setFlags(json.flags);
    } catch {}
    setFlagsLoading(false);
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
    // ── All 4 load in parallel ────────────────────────────────────────────
    Promise.all([loadPending(), loadActive(), loadFlags(), loadStats()]);
  }, [loadPending, loadActive, loadFlags, loadStats]);

  // ─── Ad handlers ──────────────────────────────────────────────────────────

  async function approveAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ad_id: id }),
    }).catch(() => {});

    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      pingDiscord('', 'ad_approved', {
        title:  '✅ Ad Approved',
        color:  0x2E7D32,
        fields: [
          { name: 'Brand',    value: ad.brand,    inline: true  },
          { name: 'Tier',     value: ad.tier,     inline: true  },
          { name: 'Category', value: ad.category, inline: true  },
          { name: 'Title',    value: ad.title,    inline: false },
          { name: 'Email',    value: ad.email,    inline: false },
        ],
        footer:    'Aria reviewed · approved by admin',
        timestamp: true,
      });
      fetch('/api/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:   ad.email,
          type:    'approved',
          title:   '✅ Your ad is live in the Arena',
          message: `"${ad.title}" has been approved and is now competing in the Arena. Share it to earn points and climb the ranks — every share counts.`,
        }),
      }).catch(() => {});
    }
    setAriaModalAd(null);
    await loadPending();
    await loadActive();
    await loadStats();
    setActionId(null);
  }

  async function rejectAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', id);

    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      const verdict = ariaVerdict(ad);
      pingDiscord('', 'ad_rejected', {
        title:  '❌ Ad Rejected',
        color:  0xEF4444,
        fields: [
          { name: 'Brand',    value: ad.brand,     inline: true  },
          { name: 'Tier',     value: ad.tier,      inline: true  },
          { name: 'Category', value: ad.category,  inline: true  },
          { name: 'Title',    value: ad.title,     inline: false },
          { name: 'Email',    value: ad.email,     inline: false },
          { name: '🦋 Aria',  value: verdict.note, inline: false },
        ],
        footer:    'ANTCPU ADS · Aria Review',
        timestamp: true,
      });
      fetch('/api/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:   ad.email,
          type:    'rejected',
          title:   '❌ Your ad needs a small revision',
          message: `"${ad.title}" wasn't approved yet. ${verdict.note} Edit your ad and resubmit — it usually takes just a few minutes to fix.`,
        }),
      }).catch(() => {});
    }
    setAriaModalAd(null);
    await loadPending();
    await loadStats();
    setActionId(null);
  }

  async function confirmArchive(id: string) {
    setConfirmId(null);
    setArchivingId(id);
    await supabase.from('ads')
      .update({ status: 'archived', pinned: false })
      .eq('id', id);

    const ad = activeAds.find(a => a.id === id);
    if (ad) {
      pingDiscord('', 'ad_archived', {
        title:  '📦 Ad Archived',
        color:  0xF0883E,
        fields: [
          { name: 'Brand', value: ad.brand, inline: true  },
          { name: 'Tier',  value: ad.tier,  inline: true  },
          { name: 'Title', value: ad.title, inline: false },
        ],
        footer:    'ANTCPU ADS · Admin Archive',
        timestamp: true,
      });
    }
    await loadActive();
    await loadStats();
    setArchivingId(null);
  }

  async function restoreAd(id: string) {
    setRestoringId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ad_id: id }),
    }).catch(() => {});
    await loadActive();
    await loadStats();
    setRestoringId(null);
  }

  function openEdit(ad: ActiveAd) {
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
    if (activeAds.length === 0) return;
    setRecalculating(true);
    await fetch('/api/scout/score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ad_id: activeAds[0].id }),
    });
    await loadActive();
    await loadStats();
    setRecalculating(false);
  }

  // ─── Flag handlers ────────────────────────────────────────────────────────

  async function toggleFlag(id: string, currentEnabled: boolean) {
    setSavingFlag(id);
    const newEnabled = !currentEnabled;
    const newStatus  = newEnabled ? 'on' : 'off';
    await fetch('/api/flags', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, enabled: newEnabled, status: newStatus }),
    });
    setFlags(prev => prev.map(f =>
      f.id === id ? { ...f, enabled: newEnabled, status: newStatus } : f
    ));
    setSavingFlag(null);
  }

  async function markKilled(id: string) {
    setSavingFlag(id);
    await fetch('/api/flags', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, enabled: false, status: 'killed' }),
    });
    setFlags(prev => prev.map(f =>
      f.id === id ? { ...f, enabled: false, status: 'killed' } : f
    ));
    setSavingFlag(null);
  }

  // ─── Aria modal handler ───────────────────────────────────────────────────

  function openAriaModal(ad: PendingAd) {
    setAriaModalAd(ad);
    setAriaQuestion('');
    setAriaResponse(generateAriaResponse(ad, ''));
  }

  async function askAria() {
    if (!ariaModalAd || !ariaQuestion.trim()) return;
    setAriaAsking(true);
    // Simulate a brief thinking delay — replace with real LLM call in v2
    await new Promise(r => setTimeout(r, 600));
    setAriaResponse(generateAriaResponse(ariaModalAd, ariaQuestion));
    setAriaAsking(false);
  }

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!hydrated || !user) return null;

  // ─── Derived ──────────────────────────────────────────────────────────────

  const moduleCtx = {
    slug:    'antcpu',
    user:    { email: user.email, name: user.name, brand: user.brand, trialStatus: 'team' },
    ads:     [],
    supabase,
    isSuper: true,
  };

  const visibleFlags = flags.filter(f => f.version === flagVersion);
  const killedCount  = flags.filter(f => f.status === 'killed').length;
  const topAd        = arenaStats?.topAds?.[0] || null;

  // ─── Shared styles ────────────────────────────────────────────────────────

  const inpStyle: React.CSSProperties = {
    width: '100%', background: G.inp, border: `1px solid ${G.border2}`,
    borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
    color: G.text, fontFamily: 'system-ui, sans-serif',
    outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem',
  };

  const rowBtn = (color: string, disabled = false): React.CSSProperties => ({
    background:   'transparent',
    border:       `1px solid ${disabled ? G.border : color}`,
    borderRadius: '8px',
    color:        disabled ? G.dim : color,
    fontSize:     '0.72rem', fontWeight: 700,
    padding:      '0.35rem 0.6rem',
    cursor:       disabled ? 'default' : 'pointer',
    whiteSpace:   'nowrap', transition: 'all 0.15s', flexShrink: 0,
  });
  
  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: G.bg, minHeight: '100vh', color: G.text, fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role="admin"
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <AdminBar role={user.role} />

        {/* ── ARIA MODAL ── */}
        {ariaModalAd && (() => {
          const verdict = ariaVerdict(ariaModalAd);
          const busy    = actionId === ariaModalAd.id;
          return (
            <>
              <div onClick={() => setAriaModalAd(null)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }} />
              <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: '92vw', maxWidth: 560, background: G.card,
                border: `1px solid ${G.orange}40`, borderRadius: '16px',
                padding: '1.5rem', zIndex: 1000, maxHeight: '85vh', overflowY: 'auto',
              }}>
                {/* Modal header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: G.orange, marginBottom: '0.2rem' }}>
                      🦋 Aria — Ad Review
                    </div>
                    <div style={{ fontSize: '0.75rem', color: G.muted }}>{ariaModalAd.brand} · {ariaModalAd.category} · {ariaModalAd.tier}</div>
                  </div>
                  <button onClick={() => setAriaModalAd(null)}
                    style={{ background: 'none', border: 'none', color: G.muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
                </div>

                {/* Ad details */}
                <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: G.text, marginBottom: '0.35rem' }}>{ariaModalAd.title}</div>
                  <div style={{ fontSize: '0.8rem', color: G.muted, lineHeight: 1.5, marginBottom: '0.5rem' }}>{ariaModalAd.description}</div>
                  <a href={ariaModalAd.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: G.blue, wordBreak: 'break-all', display: 'block', marginBottom: '0.35rem' }}>
                    {ariaModalAd.url || '— no url —'}
                  </a>
                  <div style={{ fontSize: '0.7rem', color: G.dim }}>
                    📧 {ariaModalAd.email} · {new Date(ariaModalAd.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Aria verdict */}
                <div style={{
                  background: verdict.autoApprove ? '#0a1a0a' : '#1a0e00',
                  border: `1px solid ${verdict.autoApprove ? G.green + '40' : G.orange + '40'}`,
                  borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
                  fontSize: '0.82rem', color: verdict.autoApprove ? G.green : G.orange, lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    {verdict.icon} Aria Verdict — {verdict.autoApprove ? 'Auto-approve recommended' : 'Manual review required'}
                  </div>
                  <div style={{ color: G.muted }}>{verdict.note}</div>
                </div>

                {/* Aria response */}
                {ariaResponse && (
                  <div style={{
                    background: '#0a0f1a', border: `1px solid ${G.blue}30`,
                    borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem',
                    fontSize: '0.82rem', color: '#a0c4ff', lineHeight: 1.6,
                  }}>
                    {ariaResponse}
                  </div>
                )}

                {/* Ask Aria input */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    value={ariaQuestion}
                    onChange={e => setAriaQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && askAria()}
                    placeholder="Ask Aria about this ad… e.g. 'Is the URL valid?' or 'Should I approve?'"
                    style={{ ...inpStyle, marginBottom: 0, flex: 1 }}
                  />
                  <button onClick={askAria} disabled={ariaAsking || !ariaQuestion.trim()}
                    style={{
                      background: ariaAsking ? G.card2 : G.orange,
                      border: 'none', borderRadius: '8px',
                      color: ariaAsking ? G.muted : '#000',
                      fontWeight: 800, fontSize: '0.78rem',
                      padding: '0 1rem', cursor: ariaAsking ? 'default' : 'pointer',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                    {ariaAsking ? '…' : 'Ask →'}
                  </button>
                </div>

                {/* Quick questions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {['Should I approve?', 'Any URL issues?', 'Check the brand', 'Review the title'].map(q => (
                    <button key={q}
                      onClick={() => { setAriaQuestion(q); }}
                      style={{
                        background: G.card2, border: `1px solid ${G.border2}`,
                        borderRadius: '999px', padding: '0.2rem 0.65rem',
                        fontSize: '0.68rem', color: G.muted, cursor: 'pointer',
                      }}>
                      {q}
                    </button>
                  ))}
                </div>

                {/* Approve / Reject inside modal */}
                <div style={{ display: 'flex', gap: '0.5rem', borderTop: `1px solid ${G.border}`, paddingTop: '1rem' }}>
                  <button
                    onClick={() => approveAd(ariaModalAd.id)}
                    disabled={busy}
                    style={{
                      flex: 1, background: busy ? G.card2 : '#0a2a0a',
                      border: `1px solid ${busy ? G.border : G.green + '60'}`,
                      borderRadius: '8px', color: busy ? G.dim : G.green,
                      fontWeight: 800, fontSize: '0.85rem', padding: '0.7rem',
                      cursor: busy ? 'default' : 'pointer',
                    }}>
                    {busy ? '…' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => rejectAd(ariaModalAd.id)}
                    disabled={busy}
                    style={{
                      flex: 1, background: busy ? G.card2 : '#2a0a0a',
                      border: `1px solid ${busy ? G.border : G.red + '60'}`,
                      borderRadius: '8px', color: busy ? G.dim : G.red,
                      fontWeight: 800, fontSize: '0.85rem', padding: '0.7rem',
                      cursor: busy ? 'default' : 'pointer',
                    }}>
                    {busy ? '…' : '❌ Reject'}
                  </button>
                  <button onClick={() => setAriaModalAd(null)}
                    style={rowBtn(G.muted)}>
                    Close
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* ── COMMAND CENTRE HEADER ── */}
        <div style={{
          background: G.card, border: `1px solid ${G.orange}30`,
          borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${G.orange}, ${G.gold}, transparent)` }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: G.orange, marginBottom: '0.2rem' }}>⚡ ANTCPU COMMAND CENTRE</div>
              <div style={{ fontSize: '0.75rem', color: G.muted }}>
                Arena network — live overview
                {arenaStats?.generatedAt && (
                  <span style={{ marginLeft: '0.5rem', color: G.dim }}>
                    · updated {new Date(arenaStats.generatedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                background: '#0a2a0a', border: `1px solid ${G.green}40`,
                borderRadius: '999px', padding: '0.2rem 0.65rem',
                fontSize: '0.65rem', color: G.green, fontWeight: 700,
              }}>🟢 LIVE</span>
              <button onClick={() => loadStats()}
                style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* ── Stat grid row 1 — network counts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { label: 'Active Ads',   value: statsLoading ? '…' : (arenaStats?.totalAds         ?? activeAds.length), color: G.orange },
              { label: 'Brands',       value: statsLoading ? '…' : (arenaStats?.totalBrands       ?? '—'),             color: G.blue   },
              { label: 'Countries',    value: statsLoading ? '…' : (arenaStats?.totalCountries    ?? '—'),             color: G.gold   },
              { label: 'Total Points', value: statsLoading ? '…' : (arenaStats?.totalPoints?.toLocaleString() ?? '—'), color: G.orange },
            ].map(s => (
              <div key={s.label} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Stat grid row 2 — engagement ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Clicks',      value: statsLoading ? '…' : (arenaStats?.totalClicks?.toLocaleString()    ?? '—'), color: G.blue  },
              { label: 'Shares',      value: statsLoading ? '…' : (arenaStats?.totalShares?.toLocaleString()    ?? '—'), color: G.green },
              { label: 'Reactions',   value: statsLoading ? '…' : (arenaStats?.totalReactions?.toLocaleString() ?? '—'), color: '#ff0080' },
              { label: 'Advertisers', value: statsLoading ? '…' : (arenaStats?.totalAdvertisers ?? '—'),                 color: G.gold  },
            ].map(s => (
              <div key={s.label} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Top brand + top ad ── */}
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

          {/* ── Pending alert + quick actions ── */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {pendingAds.length > 0 ? (
              <div style={{
                flex: 1, background: '#1a0e00', border: `1px solid ${G.orange}50`,
                borderRadius: '8px', padding: '0.5rem 0.85rem',
                fontSize: '0.78rem', color: G.orange, fontWeight: 700,
              }}>
                ⚠️ {pendingAds.length} ad{pendingAds.length !== 1 ? 's' : ''} pending review
              </div>
            ) : (
              <div style={{
                flex: 1, background: '#0a1a0a', border: `1px solid ${G.green}30`,
                borderRadius: '8px', padding: '0.5rem 0.85rem',
                fontSize: '0.78rem', color: G.green, fontWeight: 700,
              }}>
                🦋 Queue clear — no ads pending
              </div>
            )}
            <button onClick={() => router.push('/create-ad')}
              style={{ background: G.orange, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.85rem', cursor: 'pointer' }}>
              📢 Create Ad
            </button>
            <button onClick={() => router.push('/dashboard/admin')}
              style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '8px', color: G.muted, fontWeight: 700, fontSize: '0.75rem', padding: '0.5rem 0.85rem', cursor: 'pointer' }}>
              ⚡ Admin →
            </button>
          </div>
        </div>

        {/* ── TEAM ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
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
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
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

          {/* ── Scroll box ── */}
          {pendingAds.length > 0 && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem',
             paddingRight: '0.25rem',
             scrollbarWidth: 'thin',
             scrollbarColor: `${G.border2} transparent`,
             } as any}>
              {pendingAds.map(ad => {
                const verdict = ariaVerdict(ad);
                const busy    = actionId === ad.id;
                return (
                  <div key={ad.id} style={{
                    background: G.card2, border: `1px solid ${G.border}`,
                    borderRadius: '10px', padding: '1rem',
                    borderLeft: `3px solid ${verdict.autoApprove ? G.green : G.orange}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text }}>{ad.brand}</span>
                      <span style={{ fontSize: '0.68rem', color: G.dim }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: G.text, marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.78rem', color: G.muted, marginBottom: '0.3rem', lineHeight: 1.4 }}>
                      {ad.description.length > 100
                        ? ad.description.slice(0, ad.description.lastIndexOf(' ', 100)) + '…'
                        : ad.description}
                    </div>
                    <a href={ad.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.72rem', color: G.blue, wordBreak: 'break-all', display: 'block', marginBottom: '0.4rem' }}>
                      {ad.url || '— no url —'}
                    </a>
                    <div style={{ fontSize: '0.68rem', color: G.dim, marginBottom: '0.75rem' }}>
                      📧 {ad.email} · 🏷 {ad.category} · {ad.tier}
                    </div>

                    {/* Aria verdict strip */}
                    <div style={{
                      background: verdict.autoApprove ? '#0a1a0a' : '#1a0e00',
                      border: `1px solid ${verdict.autoApprove ? G.green + '30' : G.orange + '30'}`,
                      borderRadius: '8px', padding: '0.5rem 0.75rem',
                      marginBottom: '0.75rem', fontSize: '0.75rem',
                      color: verdict.autoApprove ? G.green : G.orange, lineHeight: 1.5,
                    }}>
                      {verdict.icon} {verdict.note}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button onClick={() => openAriaModal(ad)}
                        style={{ background: `${G.orange}15`, border: `1px solid ${G.orange}40`, borderRadius: '8px', color: G.orange, fontWeight: 700, fontSize: '0.72rem', padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
                        🦋 Ask Aria
                      </button>
                      <button onClick={() => !busy && approveAd(ad.id)} disabled={busy}
                        style={rowBtn(G.green, busy)}>
                        {busy ? '…' : '✅ Approve'}
                      </button>
                      <button onClick={() => !busy && rejectAd(ad.id)} disabled={busy}
                        style={rowBtn(G.red, busy)}>
                        {busy ? '…' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ACTIVE ADS ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text }}>📋 Active Ads ({activeAds.length})</div>
              <div style={{ fontSize: '0.72rem', color: G.muted }}>Edit or archive — Scout recalculates on next interaction</div>
            </div>
            <button onClick={recalcRankings} disabled={recalculating || activeAds.length === 0}
              style={{
                background: recalculating ? G.card2 : G.orange,
                border: 'none', borderRadius: '8px',
                color: recalculating ? G.muted : '#000',
                fontSize: '0.75rem', fontWeight: 700,
                padding: '0.45rem 0.85rem',
                cursor: recalculating ? 'default' : 'pointer',
              }}>
              {recalculating ? '⏳ Recalculating…' : '⚡ Recalc Rankings'}
            </button>
          </div>

          {/* ── Scroll box ── */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
            {activeAds.length === 0 ? (
              <div style={{ color: G.muted, fontSize: '0.82rem', padding: '1rem 0' }}>No active ads.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeAds.map(ad => {
                  const isEditing = editingId === ad.id;
                  const isConfirm = confirmId === ad.id;
                  const isBusy    = archivingId === ad.id || savingId === ad.id;
                  const medal     = rankMedal(ad.rank_position);
                  return (
                    <div key={ad.id} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                        {medal && <span style={{ fontSize: '0.9rem' }}>{medal}</span>}
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: G.text }}>{ad.brand}</span>
                        <span style={{ fontSize: '0.62rem', color: G.muted, background: G.bg, border: `1px solid ${G.border}`, borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{ad.tier}</span>
                        {ad.is_system && <span style={{ fontSize: '0.6rem', color: G.dim }}>system</span>}
                        <span style={{ fontSize: '0.7rem', color: G.orange, fontWeight: 700, marginLeft: 'auto' }}>⚡ {ad.points ?? 0}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: G.muted, marginBottom: '0.6rem' }}>{ad.title}</div>

                      {isEditing && (
                        <div style={{ marginBottom: '0.65rem' }}>
                          <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" style={inpStyle} />
                          <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3} style={{ ...inpStyle, resize: 'vertical' }} />
                          <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" style={{ ...inpStyle, marginBottom: 0 }} />
                        </div>
                      )}

                      {isConfirm && (
                        <div style={{ background: '#1a0e00', border: `1px solid ${G.orange}30`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.65rem', fontSize: '0.78rem', color: G.orange }}>
                          Archive this ad? It will leave the Arena feed.
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {!isEditing && !isConfirm && (
                          <>
                            <button onClick={() => openEdit(ad)}        style={rowBtn(G.blue)}>✏️ Edit</button>
                            <button onClick={() => setConfirmId(ad.id)} style={rowBtn(G.orange)}>📦 Archive</button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <button onClick={() => saveEdit(ad.id)} disabled={isBusy} style={rowBtn(G.green, isBusy)}>
                              {savingId === ad.id ? '…' : '💾 Save'}
                            </button>
                            <button onClick={() => setEditingId(null)} style={rowBtn(G.muted)}>✕ Cancel</button>
                          </>
                        )}
                        {isConfirm && (
                          <>
                            <button onClick={() => confirmArchive(ad.id)} disabled={isBusy} style={rowBtn(G.red, isBusy)}>
                              {archivingId === ad.id ? '…' : '📦 Confirm'}
                            </button>
                            <button onClick={() => setConfirmId(null)} style={rowBtn(G.muted)}>✕ Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Archived ── */}
          {archivedAds.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${G.border}` }}>
              <div style={{ fontSize: '0.68rem', color: G.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
                📦 Archived ({archivedAds.length})
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
                {archivedAds.map(ad => (
                  <div key={ad.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', opacity: 0.6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', color: G.muted, fontWeight: 700 }}>{ad.brand} · </span>
                      <span style={{ fontSize: '0.75rem', color: G.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</span>
                      {(ad.points ?? 0) > 0 && <span style={{ fontSize: '0.62rem', color: G.orange, marginLeft: '0.4rem' }}>⚡ {ad.points}</span>}
                    </div>
                    <button onClick={() => restoreAd(ad.id)} disabled={restoringId === ad.id} style={rowBtn(G.green, restoringId === ad.id)}>
                      {restoringId === ad.id ? '…' : '↩ Restore'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SEND MESSAGE ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, marginBottom: '0.2rem' }}>✉️ Send Message</div>
          <div style={{ fontSize: '0.72rem', color: G.muted, marginBottom: '1rem' }}>Sends directly to any user's in-app envelope — appears instantly</div>
          <MessageComposer dark={true} />
        </div>

        {/* ── ARENA FLAGS ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, marginBottom: '0.2rem' }}>⚡ Arena Flags</div>
          <div style={{ fontSize: '0.72rem', color: G.muted, marginBottom: '1rem' }}>Toggle features by version — DB overrides code defaults instantly</div>

          {/* Version tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {VERSION_TABS.map(v => (
              <button key={v.id} onClick={() => setFlagVersion(v.id)}
                style={{
                  background:   flagVersion === v.id ? G.orange : 'transparent',
                  border:       `1px solid ${flagVersion === v.id ? G.orange : G.border2}`,
                  borderRadius: '6px', padding: '0.25rem 0.65rem',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  color: flagVersion === v.id ? '#000' : G.muted,
                  transition: 'all 0.15s',
                }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Flag rows — scroll box */}
          {flagsLoading ? (
            <div style={{ fontSize: '0.82rem', color: G.muted, padding: '0.5rem 0' }}>Loading flags...</div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
              {visibleFlags.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: G.muted, padding: '0.5rem 0' }}>No flags in this version yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {visibleFlags.map(f => {
                    const busy    = savingFlag === f.id;
                    const killed  = f.status === 'killed';
                    const testing = f.status === 'testing';
                    return (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 0.75rem',
                        background: killed ? '#1a0a0a' : G.card2,
                        border: `1px solid ${killed ? G.red + '30' : G.border}`,
                        borderRadius: '8px',
                        opacity: killed ? 0.7 : 1,
                        transition: 'opacity 0.15s',
                      }}>

                        {/* Toggle switch */}
                        <button
                          onClick={() => !killed && !busy && toggleFlag(f.id, f.enabled)}
                          disabled={killed || busy}
                          title={killed ? 'Killed — cannot toggle' : f.enabled ? 'Turn off' : 'Turn on'}
                          style={{
                            position: 'relative', width: '36px', height: '20px',
                            borderRadius: '999px', border: 'none',
                            cursor: killed || busy ? 'default' : 'pointer',
                            background: busy ? G.border : killed ? G.red + '40' : f.enabled ? G.green : G.border2,
                            flexShrink: 0, transition: 'background 0.2s', padding: 0,
                          }}>
                          <span style={{
                            position: 'absolute', top: '2px',
                            left: f.enabled && !killed ? '18px' : '2px',
                            width: '16px', height: '16px',
                            borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', display: 'block',
                          }} />
                        </button>

                        {/* Label + description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.82rem', fontWeight: 700,
                            color: killed ? G.dim : G.text,
                            textDecoration: killed ? 'line-through' : 'none',
                            marginBottom: '0.1rem',
                          }}>
                            {f.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.description}
                          </div>
                        </div>

                        {/* Status pill */}
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                          padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.05em',
                          background: killed  ? G.red + '20'   : testing ? G.orange + '20' : f.enabled ? G.green + '20' : G.border,
                          color:      killed  ? G.red           : testing ? G.orange        : f.enabled ? G.green        : G.muted,
                        }}>
                          {busy ? '…' : f.status.toUpperCase()}
                        </span>

                        {/* Kill button */}
                        {!killed ? (
                          <button onClick={() => !busy && markKilled(f.id)} disabled={busy}
                            title="Mark as killed — flag for cleanup"
                            style={{
                              background: 'none', border: `1px solid ${G.red}40`,
                              borderRadius: '6px', color: G.red,
                              fontSize: '0.65rem', fontWeight: 700,
                              padding: '0.2rem 0.45rem',
                              cursor: busy ? 'default' : 'pointer',
                              flexShrink: 0, transition: 'all 0.15s',
                            }}>
                            ✕
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: G.red, flexShrink: 0, fontWeight: 700 }}>KILL</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Killed summary */}
          {killedCount > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${G.border}`, fontSize: '0.72rem', color: G.red, fontWeight: 600 }}>
              ✕ {killedCount} flag{killedCount !== 1 ? 's' : ''} marked for cleanup
            </div>
          )}
        </div>

        {/* ── POSTS MODULE ── */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <PostsModule {...moduleCtx} />
        </div>

        {/* ── ADMIN FOOTER ── */}
        <div style={{
          background: G.card, border: `1px solid ${G.border}`,
          borderRadius: '12px', padding: '1.25rem', marginTop: '1rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${G.orange}, transparent)` }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: G.orange }}>⚡ ANTCPU ADMIN</div>
            <a href="mailto:antcpu@gmail.com" style={{ fontSize: '0.72rem', color: G.muted, textDecoration: 'none' }}>✉️ antcpu@gmail.com</a>
          </div>

          {/* Quick-jump — admin surfaces */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.6rem', color: G.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Admin Surfaces</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { label: '🏗 Ad Builder',  path: '/dashboard/admin'        },
                { label: '👥 Users',        path: '/dashboard/users'        },
                { label: '🤖 Agents',       path: '/dashboard/agents'       },
                { label: '🗺️ Map of Pi',    path: '/dashboard/mapofpi'      },
                { label: '🏆 Leaderboard',  path: '/dashboard/leaderboard'  },
                { label: '📸 Photography',  path: '/dashboard/photography'  },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => router.push(path)}
                  style={{
                    background: G.card2, border: `1px solid ${G.border2}`,
                    borderRadius: '6px', padding: '0.3rem 0.65rem',
                    fontSize: '0.72rem', color: G.muted, cursor: 'pointer',
                    fontWeight: 600, transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick-jump — tools */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.6rem', color: G.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 700 }}>Tools</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { label: '📢 Create Ad',  path: '/create-ad'       },
                { label: '🏟 Arena',      path: '/arena'            },
                { label: '🏆 Champions',  path: '/champions'        },
                { label: '🗺️ Map of Pi',  path: '/mapofpi/arena'   },
                { label: '💬 Discord',    path: 'https://discord.gg/antcpu' },
              ].map(({ label, path }) => (
                <button key={path}
                  onClick={() => path.startsWith('http') ? window.open(path, '_blank') : router.push(path)}
                  style={{
                    background: 'transparent', border: `1px solid ${G.border}`,
                    borderRadius: '6px', padding: '0.3rem 0.65rem',
                    fontSize: '0.72rem', color: G.dim, cursor: 'pointer',
                    fontWeight: 600, transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
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

      </div>
    </div>
  );
}
