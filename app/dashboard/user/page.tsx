'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import { notifyDiscord } from '../../lib/discord';
import { createClient } from '@supabase/supabase-js';
import ArenaFooter from '../../components/ArenaFooter';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role?: string;
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
  'Pi Commerce':      '#mapofpi #pinetwork #picommerce #crypto',
  'Photography':      '#photography #portraits #memories #photographer',
  'Brand Awareness':  '#branding #marketing #growthhacking',
  'Product Launch':   '#productlaunch #startup #newproduct',
  'Other':            '#marketing #ads #business #antcpu',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const router = useRouter();

  // — state
  const [hydrated, setHydrated]         = useState(false);
  const [user, setUser]                 = useState<SessionUser | null>(null);
  const [myAd, setMyAd]                 = useState<Ad | null>(null);
  const [arenaAds, setArenaAds]         = useState<Ad[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [sharedId, setSharedId]         = useState<string | null>(null);
  const [hasProfile, setHasProfile]     = useState(false);
  const [myRank, setMyRank]             = useState<number | null>(null);

  // — auth guard + load
  useEffect(() => {
    fetch('/api/doorbell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/dashboard/user', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }),
    }).catch(() => {});

    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u: SessionUser = JSON.parse(stored);
      // super + admin redirect to their dashboards
      if (u.email === 'antcpu@gmail.com' || u.role === 'super') { router.push('/dashboard/admin'); return; }
      if (u.role === 'admin') { router.push('/dashboard/users'); return; }
      setUser(u);
      fetchData(u.email);
      // check profile exists
      supabase.from('ad_profiles').select('bio').eq('email', u.email.trim().toLowerCase()).maybeSingle()
        .then(({ data }) => { if (data?.bio) setHasProfile(true); });
      // load referral code
      supabase.from('ad_signups').select('promo_code').eq('email', u.email.trim().toLowerCase()).maybeSingle()
        .then(({ data }) => {
          setReferralCode(data?.promo_code || u.brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || '');
        });
    } catch { router.push('/'); return; }
    setHydrated(true);
  }, []);

  // — fetch ads + rank
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
    setMyAd(enrich(mine || []).length > 0 ? enrich(mine || [])[0] : null);
    setArenaAds(enrich(arena || []));
    setLoading(false);
  }

  // — track ad click + discord milestone every 10
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

  // — share ad via native share or clipboard fallback
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

  // — derived values
  const isTeam    = user.trialStatus === 'team';
  const accent    = isTeam ? '#7928ca' : '#0070f3';
  const firstName = user.name?.includes('@')
    ? user.brand || user.email.split('@')[0]
    : user.name?.split(' ')[0];
  const showOnboarding = !hasProfile || !myAd;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role={isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>
            Welcome back, {firstName} ⚡
          </div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{user.brand} · {isTeam ? 'Team — Unlimited' : '3-day trial'}</span>
            {myRank && <span style={{ background: '#f0883e15', color: '#f0883e', border: '1px solid #f0883e30', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>#{myRank} in the Arena</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/create-ad')} style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              📢 Create Ad
            </button>
            <button onClick={() => router.push('/profile')} style={{ background: 'transparent', border: `1px solid ${accent}`, color: accent, borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              👤 Profile
            </button>
          </div>
        </div>

        {/* Onboarding checklist — only shown if incomplete */}
        {showOnboarding && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Getting Started</div>
            {[
              { label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true, href: null },
              { label: 'Complete Your Profile', desc: 'Add your bio and contact details', done: hasProfile, href: '/profile' },
              { label: 'Create Your First Ad', desc: 'Build and launch your first ad', done: !!myAd, href: '/create-ad' },
            ].map((step, i) => (
              <div
                key={i}
                onClick={() => step.href && !step.done && router.push(step.href)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: step.done ? '#f0fdf4' : '#fafafa', border: `1px solid ${step.done ? '#bbf7d0' : '#e5e5e5'}`, borderRadius: '10px', cursor: step.href && !step.done ? 'pointer' : 'default', marginBottom: '0.5rem' }}
              >
                <span>{step.done ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{step.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{step.desc}</div>
                </div>
                {!step.done && step.href && <span style={{ color: '#aaa', fontSize: '0.8rem' }}>→</span>}
              </div>
            ))}
          </div>
        )}

        {/* My active ad */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>My Ad</div>
          {!myAd ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No active ad yet</div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem' }}>Create your first ad and enter the Arena.</div>
              <button onClick={() => router.push('/create-ad')} style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                Create Ad →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{myAd.title}</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: TIER_CONFIG[myAd.tier]?.color || accent, background: `${TIER_CONFIG[myAd.tier]?.color || accent}15`, border: `1px solid ${TIER_CONFIG[myAd.tier]?.color || accent}30`, borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                  {TIER_CONFIG[myAd.tier]?.label || 'Entry'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>🟢 LIVE</span>
                {(myAd.click_count || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#888' }}>👆 {myAd.click_count} clicks</span>}
                {(myAd.points || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#f0883e' }}>⚡ {myAd.points} pts</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: '0.75rem' }}>{myAd.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {myAd.promo_code && (
                  <button onClick={() => router.push(`/arena/${myAd.promo_code}`)} style={{ background: 'transparent', border: `1px solid ${accent}`, color: accent, borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    🏟 View in Arena
                  </button>
                )}
                <button onClick={() => router.push('/create-ad')} style={{ background: 'transparent', border: '1px solid #e5e5e5', color: '#888', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Referral code */}
        {referralCode && (
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Referral Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: accent, letterSpacing: '0.05em' }}>{referralCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/login?ref=${referralCode}`);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                style={{ background: referralCopied ? '#22c55e' : accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {referralCopied ? '✅ Copied' : '📋 Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* Arena feed */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>The Arena</div>
            <button onClick={() => router.push('/arena')} style={{ background: 'transparent', border: `1px solid ${accent}`, color: accent, borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              View All →
            </button>
          </div>

          {loading ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Loading arena...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {arenaAds.map(ad => {
                const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                const isOwn = ad.email === user.email;
                return (
                  <div
                    key={ad.id}
                    onClick={() => trackClick(ad)}
                    style={{ background: '#fafafa', border: `1px solid ${ad.pinned ? '#f0883e40' : '#e5e5e5'}`, borderLeft: `3px solid ${tier.color}`, borderRadius: '10px', padding: '1rem', cursor: 'pointer' }}
                  >
                    {/* Ad header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span
                        onClick={e => { e.stopPropagation(); if (ad.email) router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                        style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${tier.color}60` }}
                      >
                        {ad.brand}
                      </span>
                      {ad.pinned && <span style={{ fontSize: '0.65rem', color: '#f0883e', fontWeight: 700 }}>📌 PINNED</span>}
                      {isOwn && <span style={{ fontSize: '0.65rem', color: accent, fontWeight: 700 }}>YOUR AD</span>}
                      <span style={{ fontSize: '0.65rem', color: tier.color, fontWeight: 700 }}>{tier.label}</span>
                      {ad.category && <span style={{ fontSize: '0.65rem', color: '#888', border: '1px solid #e5e5e5', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>{ad.category}</span>}
                    </div>

                    {/* Ad body */}
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.75rem' }}>{ad.description}</div>

                    {/* Ad actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={e => { e.stopPropagation(); window.open(ad.url, '_blank'); }}
                        style={{ background: tier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Visit →
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); shareAd(ad); }}
                        style={{ background: 'transparent', border: '1px solid #e5e5e5', color: sharedId === ad.id ? '#22c55e' : '#888', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
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

      {/* Footer */}
      <ArenaFooter />

    </div>
  );
}
