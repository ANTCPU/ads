'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import AdminBar from '../../components/AdminBar';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

type PendingAd = {
  id: string;
  brand: string;
  email: string;
  title: string;
  url: string;
  description: string;
  category: string;
  tier: string;
  created_at: string;
};

const ARIA_VERDICTS: Record<string, { icon: string; note: string }> = {
  default:       { icon: '🦋', note: 'Looks good to me. Title is clear, URL present, description readable. Ready for your call.' },
  no_desc:       { icon: '🦋', note: 'Description is missing or very short. Worth asking the brand to add more context before approving.' },
  no_url:        { icon: '🦋', note: 'No destination URL detected. This ad has nowhere to send people — hold until fixed.' },
  short_title:   { icon: '🦋', note: 'Title is quite short. It will work, but a stronger headline would perform better.' },
  brand_mismatch:{ icon: '⚠️', note: 'Brand mismatch detected — this ad contains ANTCPU content but was submitted under a different brand. Likely used the pre-filled seed ad. Reject and ask them to rewrite with their own brand.' },
  seed_ad:       { icon: '⚠️', note: 'This looks like the default seed ad — "ANTCPU Ad Network is coming in hot". The user did not edit the example. Reject and ask them to submit their own ad.' },
};

const SEED_PHRASES = ['coming in hot', 'antcpu ad network', 'antcpu ads'];
const ANTCPU_PHRASES = ['antcpu', 'antcpu.com', 'antcpu-ads'];

function ariaVerdict(ad: PendingAd) {
  const combined = `${ad.title} ${ad.description} ${ad.url}`.toLowerCase();
  const brandLower = ad.brand.toLowerCase();
  // Seed ad check
  if (SEED_PHRASES.some(p => combined.includes(p))) return ARIA_VERDICTS.seed_ad;
  // Brand mismatch — non-ANTCPU brand but ANTCPU content in the ad
  if (brandLower !== 'antcpu' && ANTCPU_PHRASES.some(p => combined.includes(p))) return ARIA_VERDICTS.brand_mismatch;
  if (!ad.url || ad.url.length < 5) return ARIA_VERDICTS.no_url;
  if (!ad.description || ad.description.length < 20) return ARIA_VERDICTS.no_desc;
  if (!ad.title || ad.title.length < 10) return ARIA_VERDICTS.short_title;
  return ARIA_VERDICTS.default;
}

const TEAM = [
  { name: 'Antony Ciccone', email: 'antcpu@gmail.com', role: 'Founder & Admin', icon: '⚡' },
];

const POSTS = [
  { id: 1, text: 'ANTCPU ADS — The Arena is Live\n\nA competitive ad network where brands grow through real engagement, promo codes, and community sharing.\n\nFree 3-day trial. No credit card required.\n\n#antcpuads #marketing #buildinpublic #adtech #startup' },
  { id: 2, text: 'Why pay for ads that nobody sees?\n\nANTCPU ADS puts your brand in the Arena — where every click, share, and referral earns points and moves your ad up.\n\nStart free today.\n\n#antcpuads #marketing #growthhacking #startup #buildinpublic' },
  { id: 3, text: 'The $9.99 is not paying for ad performance.\n\nIt is paying for the brand building system.\n\nANTCPU ADS — quality built in from day one.\n\n#antcpuads #branding #marketing #buildinpublic #adtech' },
];

export default function AntcpuDashboard() {
  const router = useRouter();
  const [hydrated, setHydrated]         = useState(false);
  const [user, setUser]                 = useState<any>(null);
  const [copiedId, setCopiedId]         = useState<number | null>(null);
  const [custom, setCustom]             = useState('');
  const [customCopied, setCustomCopied] = useState(false);

  // Approval queue
  const [pendingAds, setPendingAds]     = useState<PendingAd[]>([]);
  const [loadingAds, setLoadingAds]     = useState(false);
  const [actionId, setActionId]         = useState<string | null>(null);

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
    // Wire Scout score API
    await fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: id }),
    }).catch(() => {});
    // Find ad details for Discord
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `✅ **Ad Approved**\n**Brand:** ${ad.brand}\n**Title:** "${ad.title}"\n**Email:** ${ad.email}\n**Tier:** ${ad.tier}`,
        }),
      }).catch(() => {});
    }
    await loadPending();
    setActionId(null);
  }

  async function rejectAd(id: string) {
    setActionId(id);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', id);
    // Discord notification with Aria verdict
    const ad = pendingAds.find(a => a.id === id);
    if (ad) {
      const verdict = ariaVerdict(ad);
      fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `❌ **Ad Rejected**\n**Brand:** ${ad.brand}\n**Title:** "${ad.title}"\n**Email:** ${ad.email}\n**Aria:** ${verdict.note}`,
        }),
      }).catch(() => {});
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
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role="admin"
        userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ADMIN BAR */}
        <AdminBar />

        {/* HEADER */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0a0a0a' }}>⚡ ANTCPU</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>Brand dashboard — post builder + content tools</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pill label="🏠 Hub" onClick={() => router.push('/dashboard')} color="#0a0a0a" outline />
              <Pill label="📢 Create Ad" onClick={() => router.push('/create-ad')} color="#f0883e" />
              <Pill label="⚙️ Admin" onClick={() => router.push('/dashboard/admin')} color="#f0883e" outline />
            </div>
          </div>
        </Card>

        {/* TEAM */}
        <Card>
          <SectionHeader title="👥 Team" sub="ANTCPU brand members" />
          {TEAM.map(m => (
            <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{m.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{m.email} · {m.role}</div>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#fff7ed', color: '#f0883e', border: '1px solid #fed7aa', borderRadius: '999px', padding: '0.15rem 0.6rem', fontWeight: 700 }}>✅ Admin</span>
            </div>
          ))}
        </Card>

        {/* ARIA APPROVAL QUEUE */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <SectionHeader
              title={`🦋 Aria — Ad Review${pendingAds.length > 0 ? ` (${pendingAds.length} pending)` : ''}`}
              sub="Aria reviews each submission — you make the final call"
            />
            <Pill
              label={loadingAds ? '⟳' : '↻ Refresh'}
              onClick={loadPending}
              color="#888"
              outline
            />
          </div>

          {loadingAds && (
            <div style={{ color: '#aaa', fontSize: '0.82rem', padding: '1rem 0' }}>Loading queue...</div>
          )}

          {!loadingAds && pendingAds.length === 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem', fontSize: '0.82rem', color: '#16a34a' }}>
              🦋 All clear — no ads pending review right now.
            </div>
          )}

          {pendingAds.map(ad => {
            const verdict = ariaVerdict(ad);
            const busy = actionId === ad.id;
            return (
              <div key={ad.id} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderLeft: '3px solid #f0883e', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>

                {/* Ad details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0a0a0a' }}>{ad.brand}</span>
                  <span style={{ fontSize: '0.7rem', color: '#aaa' }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0a0a0a', marginBottom: '0.25rem' }}>{ad.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.25rem', lineHeight: 1.5 }}>{ad.description}</div>
                <a href={ad.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', color: '#0070f3', wordBreak: 'break-all', display: 'block', marginBottom: '0.25rem' }}>
                  {ad.url}
                </a>
                <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: '0.75rem' }}>
                  📧 {ad.email} · 🏷 {ad.category} · {ad.tier}
                </div>

                {/* Aria verdict */}
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  {verdict.icon} <strong>Aria:</strong> {verdict.note}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Pill
                    label={busy ? '…' : '✅ Approve'}
                    onClick={() => !busy && approveAd(ad.id)}
                    color="#16a34a"
                  />
                  <Pill
                    label={busy ? '…' : '❌ Reject'}
                    onClick={() => !busy && rejectAd(ad.id)}
                    color="#dc2626"
                    outline
                  />
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

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}
