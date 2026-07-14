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

// ─── Aria verdict ─────────────────────────────────────────────────────────────

const VERDICTS = {
  default:        { icon: '🦋', note: 'Looks good. Title clear, URL present, description readable. Ready for your call.' },
  no_desc:        { icon: '🦋', note: 'Description missing or too short. Ask the brand to add more context before approving.' },
  no_url:         { icon: '🦋', note: 'No destination URL. This ad has nowhere to send people — hold until fixed.' },
  short_title:    { icon: '🦋', note: 'Title is short. Will work, but a stronger headline would perform better.' },
  brand_mismatch: { icon: '⚠️', note: 'Brand mismatch — ANTCPU content under a different brand. Likely used the seed ad. Reject and ask them to rewrite.' },
  seed_ad:        { icon: '⚠️', note: 'Default seed ad detected — user did not edit the example. Reject and ask for their own ad.' },
};

const SEED    = ['coming in hot', 'antcpu ad network', 'antcpu ads'];
const ANTCPU  = ['antcpu', 'antcpu.com', 'antcpu-ads'];

function ariaVerdict(ad: PendingAd) {
  const c = `${ad.title} ${ad.description} ${ad.url}`.toLowerCase();
  const b = ad.brand.toLowerCase();
  if (SEED.some(p => c.includes(p)))                          return VERDICTS.seed_ad;
  if (b !== 'antcpu' && ANTCPU.some(p => c.includes(p)))     return VERDICTS.brand_mismatch;
  if (!ad.url || ad.url.length < 5)                          return VERDICTS.no_url;
  if (!ad.description || ad.description.length < 20)         return VERDICTS.no_desc;
  if (!ad.title || ad.title.length < 10)                     return VERDICTS.short_title;
  return VERDICTS.default;
}

// ─── Static content ───────────────────────────────────────────────────────────

const POSTS = [
  { id: 1, text: 'ANTCPU ADS — The Arena is Live\n\nA competitive ad network where brands grow through real engagement, promo codes, and community sharing.\n\nFree 3-day trial. No credit card required.\n\n#antcpuads #marketing #buildinpublic #adtech #startup' },
  { id: 2, text: 'Why pay for ads that nobody sees?\n\nANTCPU ADS puts your brand in the Arena — where every click, share, and referral earns points and moves your ad up.\n\nStart free today.\n\n#antcpuads #marketing #growthhacking #startup #buildinpublic' },
  { id: 3, text: 'The $9.99 is not paying for ad performance.\n\nIt is paying for the brand building system.\n\nANTCPU ADS — quality built in from day one.\n\n#antcpuads #branding #marketing #buildinpublic #adtech' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AntcpuDashboard() {
  const router = useRouter();
  const [hydrated,     setHydrated]     = useState(false);
  const [user,         setUser]         = useState<any>(null);
  const [copiedId,     setCopiedId]     = useState<number | null>(null);
  const [custom,       setCustom]       = useState('');
  const [customCopied, setCustomCopied] = useState(false);
  const [pendingAds,   setPendingAds]   = useState<PendingAd[]>([]);
  const [loadingAds,   setLoadingAds]   = useState(false);
  const [actionId,     setActionId]     = useState<string | null>(null);

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

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadPending();
  }, [loadPending]);

  async function approveAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
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

  function copyPost(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  function copyCustom() {
    if (!custom.trim()) return;
    navigator.clipboard.writeText(custom).then(() => {
      setCustomCopied(true);
      setTimeout(() => setCustomCopied(false), 2500);
    });
  }

  if (!hydrated || !user) return null;

  return (
    <div style={{ background: '#fff', minHeight: '100vh', color: '#0a0a0a' }}>
      <ArenaNav
        user={{ name: user.name, email: user.email, brand: user.brand, trialStatus: user.trialStatus, role: user.role }}
        onSignOut={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <AdminBar />

        {/* HEADER */}
        <Card>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.25rem' }}>⚡ ANTCPU</div>
          <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '1rem' }}>Brand dashboard — post builder + content tools</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Pill label="← Dashboard"   onClick={() => router.push('/dashboard')}       color="#0a0a0a" outline />
            <Pill label="📢 Create Ad"  onClick={() => router.push('/create-ad')}       color="#f0883e" />
            <Pill label="⚡ Admin"      onClick={() => router.push('/dashboard/admin')} color="#f0883e" outline />
          </div>
        </Card>

        {/* TEAM */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700 }}>Antony Ciccone</div>
              <div style={{ fontSize: '0.78rem', color: '#555' }}>antcpu@gmail.com · Founder & Admin</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>✅ Admin</span>
          </div>
        </Card>

        {/* ARIA APPROVAL QUEUE */}
        <Card>
          <SectionHeader
            title={`🦋 Aria Approval Queue${pendingAds.length > 0 ? ` (${pendingAds.length} pending)` : ''}`}
            sub="Aria reviews each submission — you make the final call"
          />
          {loadingAds && <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading queue...</div>}
          {!loadingAds && pendingAds.length === 0 && (
            <div style={{ color: '#555', fontSize: '0.82rem' }}>🦋 All clear — no ads pending review right now.</div>
          )}
          {pendingAds.map(ad => {
            const verdict = ariaVerdict(ad);
            const busy = actionId === ad.id;
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

        {/* POST BUILDER */}
        <Card>
          <SectionHeader title="📋 Ready-to-Post" sub="Copy and post to any platform — button turns green when copied" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {POSTS.map(p => (
              <div key={p.id} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem' }}>
                <pre style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.82rem', color: '#333', whiteSpace: 'pre-wrap', margin: '0 0 0.75rem', lineHeight: 1.6 }}>{p.text}</pre>
                <Pill
                  label={copiedId === p.id ? '✅ Copied — safe to post' : '↗ Copy Post'}
                  onClick={() => copyPost(p.text, p.id)}
                  color={copiedId === p.id ? '#22c55e' : '#0070f3'}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* CUSTOM POST */}
        <Card>
          <SectionHeader title="✏️ Custom Post" sub="Write your own — copy when ready" />
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Write your post here..."
            style={{ width: '100%', minHeight: '120px', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0a0a0a', fontFamily: 'system-ui, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <Pill
              label={customCopied ? '✅ Copied — safe to post' : '↗ Copy Custom Post'}
              onClick={copyCustom}
              color={customCopied ? '#22c55e' : '#f0883e'}
            />
          </div>
        </Card>

        <ArenaFooter accent="#f0883e" />
      </div>
    </div>
  );
}
