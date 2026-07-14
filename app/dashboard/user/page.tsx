'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import { clearSessionCookie } from '../../lib/session';
import { notifyDiscord } from '../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export default function UserDashboard() {
  const router = useRouter();

  const [hydrated,       setHydrated]       = useState(false);
  const [user,           setUser]           = useState<SessionUser | null>(null);
  const [myAd,           setMyAd]           = useState<Ad | null>(null);
  const [arenaAds,       setArenaAds]       = useState<Ad[]>([]);
  const [referralCode,   setReferralCode]   = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [sharedId,       setSharedId]       = useState<string | null>(null);
  const [hasProfile,     setHasProfile]     = useState(false);
  const [myRank,         setMyRank]         = useState<number | null>(null);

  useEffect(() => {
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
      if (u.role === 'super') { router.push('/dashboard/admin'); return; }
      if (u.role === 'admin') { router.push('/dashboard/users'); return; }
      setUser(u);
      fetchData(u.email);
      supabase
        .from('ad_profiles')
        .select('bio')
        .eq('email', u.email.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => { if (data?.bio) setHasProfile(true); });
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

  const isTeam    = user.trialStatus === 'team';
  const accent    = isTeam ? '#7928ca' : '#0070f3';
  const firstName = user.name?.includes('@')
    ? user.brand || user.email.split('@')[0]
    : user.name?.split(' ')[0];
  const showOnboarding = !hasProfile || !myAd;

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

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      <ArenaNav
        role={user.role === 'super' ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Welcome */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
            Welcome back, {firstName} ⚡
          </div>
          <div style={{ fontSize: '0.78rem', color: '#555', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={pill(accent)}>{user.brand}</span>
            <span>·</span>
            <span>{isTeam ? 'Team — Unlimited' : '3-day trial'}</span>
            {myRank && <><span>·</span><span>#{myRank} in the Arena</span></>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => router.push('/create-ad')} style={btn(accent)}>📢 Create Ad</button>
            <button onClick={() => router.push('/profile')} style={btn('transparent', accent, `1px solid ${accent}`)}>👤 Profile</button>
          </div>
        </div>

        {/* Onboarding */}
        {showOnboarding && (
          <div style={card}>
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
                <span>{step.done ? '✅' : '⭕'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{step.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>{step.desc}</div>
                </div>
                {!step.done && step.href && <span style={{ marginLeft: 'auto', color: '#555' }}>→</span>}
              </div>
            ))}
          </div>
        )}

        {/* My Ad */}
        <div style={card}>
          <div style={label}>My Ad</div>
          {!myAd ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ color: '#555', marginBottom: '1rem' }}>No active ad yet</div>
              <button onClick={() => router.push('/create-ad')} style={btn(accent)}>Create Ad →</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{myAd.title}</span>
                <span style={pill(TIER_CONFIG[myAd.tier]?.color || accent)}>{TIER_CONFIG[myAd.tier]?.label || 'Entry'}</span>
                <span style={pill('#22c55e')}>🟢 LIVE</span>
                {(myAd.click_count || 0) > 0 && <span style={{ fontSize: '0.75rem', color: '#555' }}>👆 {myAd.click_count} clicks</span>}
                {(myAd.points || 0) > 0 && <span style={{ fontSize: '0.75rem', color: '#f0883e' }}>⚡ {myAd.points} pts</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#aaa', marginBottom: '1rem' }}>{myAd.description}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        {/* Referral */}
        {referralCode && (
          <div style={card}>
            <div style={label}>Your Referral Code</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', color: accent, fontWeight: 700 }}>{referralCode}</span>
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

        {/* Arena feed */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={label}>The Arena</div>
            <button onClick={() => router.push('/arena')} style={btn('transparent', accent, `1px solid ${accent}`)}>View All →</button>
          </div>
          {loading ? (
            <div style={{ color: '#555', fontSize: '0.85rem' }}>Loading arena...</div>
          ) : (
            <div>
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
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <span
                        onClick={e => { e.stopPropagation(); if (ad.email) router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                        style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color, cursor: 'pointer' }}
                      >
                        {ad.brand}
                      </span>
                      {ad.pinned && <span style={pill('#f0883e')}>📌 PINNED</span>}
                      {isOwn  && <span style={pill('#22c55e')}>YOUR AD</span>}
                      <span style={pill(tier.color)}>{tier.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem' }}>{ad.description}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
