'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import { clearSessionCookie } from '../../lib/session';
import { notifyDiscord } from '../../lib/discord';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

// role required — set by persistSession/writeSession at login
type SessionUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role: string;
};

type Ad = {
  id: string;
  brand: string;
  title: string;
  url: string;
  description: string;
  category: string;
  status: string;
  tier: string;
  pinned: boolean;
  email: string;
  promo_code: string | null;
  click_count: number;
  share_count: number;
  points: number;
  rank_position: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry' },
  rising:   { color: '#7928ca', label: 'Rising' },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

const CATEGORY_TAGS: Record<string, string> = {
  'Pi Commerce':    '#mapofpi #pinetwork #picommerce #crypto',
  'Photography':    '#photography #portraits #memories #photographer',
  'Brand Awareness':'#branding #marketing #growthhacking',
  'Product Launch': '#productlaunch #startup #newproduct',
  'Other':          '#marketing #ads #business #antcpu',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const router = useRouter();

  // — state
  const [hydrated, setHydrated]           = useState(false);
  const [user, setUser]                   = useState<SessionUser | null>(null);
  const [myAd, setMyAd]                   = useState<Ad | null>(null);
  const [arenaAds, setArenaAds]           = useState<Ad[]>([]);
  const [referralCode, setReferralCode]   = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [sharedId, setSharedId]           = useState<string | null>(null);
  const [hasProfile, setHasProfile]       = useState(false);
  const [myRank, setMyRank]               = useState<number | null>(null);

  // ─── Auth guard + load ────────────────────────────────────────────────────
  // Role-only routing — no hardcoded emails anywhere.

  useEffect(() => {
    // fire-and-forget doorbell
    fetch('/api/doorbell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: '/dashboard/user',
        ref: document.referrer || 'direct',
        ts: new Date().toISOString(),
        ua: navigator.userAgent,
      }),
    }).catch(() => {});

    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }

    try {
      const u: SessionUser = JSON.parse(stored);
      // role-based redirect — no email checks
      if (u.role === 'super') { router.push('/dashboard/admin'); return; }
      if (u.role === 'admin') { router.push('/dashboard/users'); return; }
      setUser(u);
      fetchData(u.email);
      // check profile exists
      supabase
        .from('ad_profiles')
        .select('bio')
        .eq('email', u.email.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => { if (data?.bio) setHasProfile(true); });
      // load referral code
      supabase
        .from('ad_signups')
        .select('promo_code')
        .eq('email', u.email.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => {
          setReferralCode(
            data?.promo_code ||
            u.brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) ||
            ''
          );
        });
    } catch { router.push('/'); return; }

    setHydrated(true);
  }, []);

  // ─── Data fetch ───────────────────────────────────────────────────────────

  async function fetchData(email: string) {
    setLoading(true);
    const [
      { data: mine },
      { data: arena },
      { data: signups },
      { data: rankData },
    ] = await Promise.all([
      supabase.from('ads').select('*').eq('email', email).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
      supabase.from('ads').select('*').eq('status', 'active').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('ad_signups').select('email, promo_code'),
      supabase.from('ads').select('rank_position').eq('email', email).eq('status', 'active').order('rank_position', { ascending: true }).limit(1),
    ]);

    // enrich ads with promo codes
    const promoMap: Record<string, string> = {};
    (signups || []).forEach((s: { email: string; promo_code: string | null }) => {
      if (s.promo_code) promoMap[s.email] = s.promo_code.toLowerCase();
    });
    const enrich = (ads: Ad[]) => ads.map(a => ({ ...a, promo_code: promoMap[a.email] || null }));

    if (rankData && rankData.length > 0 && rankData[0].rank_position > 0) {
      setMyRank(rankData[0].rank_position);
    }
    const enrichedMine = enrich(mine || []);
    setMyAd(enrichedMine.length > 0 ? enrichedMine[0] : null);
    setArenaAds(enrich(arena || []));
    setLoading(false);
  }

  // ─── Track click + Discord milestone every 10 ─────────────────────────────

  async function trackClick(ad: Ad) {
    if (ad.id.startsWith('sample-') || !user) return;
    try {
      const newCount = (ad.click_count || 0) + 1;
      await Promise.all([
        supabase.from('ad_clicks').insert([{ ad_id: ad.id, email: user.email, source: 'arena_feed' }]),
        supabase.from('ads').update({ click_count: newCount }).eq('id', ad.id),
      ]);
      fetch('/api/scout/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: ad.id }),
      }).catch(() => {});
      if (newCount % 10 === 0) {
        notifyDiscord(`👆 **Click Milestone** — ${ad.brand} hit **${newCount} clicks**\n**Ad:** "${ad.title}"\n**Email:** ${ad.email}`);
      }
    } catch {}
  }

  // ─── Share ad — native share or clipboard fallback ────────────────────────

  async function shareAd(ad: Ad) {
    const tags = CATEGORY_TAGS[ad.category] || '#marketing #ads #antcpu';
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n${ad.description}\n\n→ ${ad.url}\n\n${tags} #antcpuads`;
    let shared = false;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: ad.title, text, url: ad.url }); shared = true; } catch {}
    }
    if (!shared) navigator.clipboard.writeText(text).catch(() => {});
    setSharedId(ad.id);
    setTimeout(() => setSharedId(null), 2500);
    if (!ad.id.startsWith('sample-') && user) {
      const newShares = (ad.share_count || 0) + 1;
      supabase.from('ads').update({ share_count: newShares }).eq('id', ad.id).then(() => {
        fetch('/api/scout/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ad_id: ad.id }),
        }).catch(() => {});
      });
      notifyDiscord(`↗ **Ad Shared** — ${ad.brand}\n**Title:** "${ad.title}"\n**By:** ${user.email}\n**Shares:** ${newShares}`);
    }
  }

  if (!hydrated || !user) return null;

  // ─── Derived values ───────────────────────────────────────────────────────

  const isTeam        = user.trialStatus === 'team';
  const accent        = isTeam ? '#7928ca' : '#0070f3';
  const firstName     = user.name?.includes('@')
    ? user.brand || user.email.split('@')[0]
    : user.name?.split(' ')[0];
  const showOnboarding = !hasProfile || !myAd;

  // ─── Styles ───────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#111', border: '1px solid #1a1a1a',
    borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem',
  };

  const label: React.CSSProperties = {
    fontSize: '0.68rem', color: '#555', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem',
  };

  const pill = (color: string, bg = 'transparent'): React.CSSProperties => ({
    background: bg, border: `1px solid ${color}40`, color,
    borderRadius: '999px', padding: '0.15rem 0.6rem',
    fontSize: '0.68rem', fontWeight: 700,
  });

  const btn = (bg: string, color = '#fff', border = 'none'): React.CSSProperties => ({
    background: bg, border, color, borderRadius: '8px',
    padding: '0.5rem 1rem', fontSize: '0.82rem',
    fontWeight: 700, cursor: 'pointer',
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role={user.role as 'admin' | 'team' | 'user' | 'mod'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '5rem 1.25rem 6rem' }}>

        {/* ── Welcome ── */}
        <div style={{ ...card, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.25rem' }}>
              Welcome back, {firstName} ⚡
            </div>
            <div style={{ fontSize: '0.82rem', color: '#555', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{user.brand}</span>
              <span>·</span>
              <span style={{ color: isTeam ? '#7928ca' : '#0070f3' }}>
                {isTeam ? 'Team — Unlimited' : '3-day trial'}
              </span>
              {myRank && (
                <>
                  <span>·</span>
                  <span style={{ color: '#f0883e' }}>#{myRank} in the Arena</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/create-ad')} style={btn(accent)}>📢 Create Ad</button>
            <button onClick={() => router.push('/profile')} style={btn('transparent', accent, `1px solid ${accent}`)}>👤 Profile</button>
          </div>
        </div>

        {/* ── Onboarding checklist — dark theme, only shown if incomplete ── */}
        {showOnboarding && (
          <div style={{ ...card }}>
            <div style={label}>Getting Started</div>
            {[
              { label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true, href: null },
              { label: 'Complete Your Profile', desc: 'Add your bio and contact details', done: hasProfile, href: '/profile' },
              { label: 'Create Your First Ad', desc: 'Build and launch your first ad', done: !!myAd, href: '/create-ad' },
            ].map((step, i) => (
              <div
                key={i}
                onClick={() => step.href && !step.done && router.push(step.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem',
                  background: step.done ? '#0d1f0d' : '#111',
                  border: `1px solid ${step.done ? '#1a3a1a' : '#222'}`,
                  borderRadius: '10px',
                  cursor: step.href && !step.done ? 'pointer' : 'default',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{step.done ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: step.done ? '#4ade80' : '#aaa' }}>{step.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>{step.desc}</div>
                </div>
                {!step.done && step.href && <span style={{ color: '#555', fontSize: '0.8rem' }}>→</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── My active ad ── */}
        <div style={card}>
          <div style={label}>My Ad</div>
          {!myAd ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontWeight: 600, color: '#aaa', marginBottom: '0.25rem' }}>No active ad yet</div>
              <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1rem' }}>Create your first ad and enter the Arena.</div>
              <button onClick={() => router.push('/create-ad')} style={btn(accent)}>Create Ad →</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{myAd.title}</span>
                <span style={pill(TIER_CONFIG[myAd.tier]?.color || '#0070f3')}>{TIER_CONFIG[myAd.tier]?.label || 'Entry'}</span>
                <span style={pill('#22c55e')}>🟢 LIVE</span>
                {(myAd.click_count || 0) > 0 && <span style={pill('#f0883e')}>👆 {myAd.click_count} clicks</span>}
                {(myAd.points || 0) > 0 && <span style={pill('#f0883e')}>⚡ {myAd.points} pts</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem', lineHeight: 1.5 }}>{myAd.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {myAd.promo_code && (
                  <button onClick={() => router.push(`/arena/${myAd.promo_code}`)} style={btn('transparent', accent, `1px solid ${accent}`)}>
                    🏟 View in Arena
                  </button>
                )}
                <button onClick={() => router.push('/create-ad')} style={btn('transparent', '#555', '1px solid #333')}>✏️ Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Referral code ── */}
        {referralCode && (
          <div style={card}>
            <div style={label}>Your Referral Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: accent, letterSpacing: '0.05em' }}>{referralCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/login?ref=${referralCode}`);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                style={btn(referralCopied ? '#22c55e' : accent)}
              >
                {referralCopied ? '✅ Copied' : '📋 Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* ── Arena feed ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={label}>The Arena</div>
            <button onClick={() => router.push('/arena')} style={btn('transparent', accent, `1px solid ${accent}`)}>View All →</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#555', fontSize: '0.85rem' }}>Loading arena...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {arenaAds.map(ad => {
                const tier  = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                const isOwn = ad.email === user.email;
                return (
                  <div
                    key={ad.id}
                    onClick={() => trackClick(ad)}
                    style={{
                      background: '#0a0a0a',
                      border: `1px solid ${ad.pinned ? '#f0883e40' : '#1a1a1a'}`,
                      borderLeft: `3px solid ${tier.color}`,
                      borderRadius: '10px', padding: '1rem', cursor: 'pointer',
                    }}
                  >
                    {/* Ad header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span
                        onClick={e => { e.stopPropagation(); if (ad.email) router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                        style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${tier.color}60` }}
                      >
                        {ad.brand}
                      </span>
                      {ad.pinned && <span style={pill('#f0883e')}>📌 PINNED</span>}
                      {isOwn   && <span style={pill(accent)}>YOUR AD</span>}
                      <span style={pill(tier.color)}>{tier.label}</span>
                      {ad.category && <span style={pill('#555')}>{ad.category}</span>}
                    </div>

                    {/* Ad body */}
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '0.25rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.5 }}>{ad.description}</div>

                    {/* Ad actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={e => { e.stopPropagation(); window.open(ad.url, '_blank'); }}
                        style={btn(tier.color)}
                      >
                        Visit →
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); shareAd(ad); }}
                        style={btn('transparent', sharedId === ad.id ? '#22c55e' : '#555', '1px solid #333')}
                      >
                        {sharedId === ad.id ? '✅ Shared' : '↗ Share'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <ArenaFooter />
    </div>
  );
}
