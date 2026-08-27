'use client';

import React, { useState, useEffect } from 'react';
import { useRouter }                   from 'next/navigation';
import { createClient }                from '@supabase/supabase-js';
import ArenaNav                        from '../../components/ArenaNav';
import ArenaFooter                     from '../../components/ArenaFooter';
import { clearSessionCookie }          from '../../lib/session';

// ✅ notifyDiscord import REMOVED — now routed through /api/discord-notify

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🔒 Internal helper — routes all Discord calls through /api/discord-notify
function pingDiscord(content: string, event = 'general') {
  fetch('/api/discord-notify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content, event }),
  }).catch(() => {});
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email: string; name: string; brand: string;
  trialStatus: string; role: string;
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string;
  promo_code: string | null; click_count: number;
  share_count: number; points: number; rank_position: number;
};

// ─── Tier ladder ──────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'entry',    label: 'Entry',    color: '#0070f3', threshold: 0   },
  { key: 'rising',   label: 'Rising',   color: '#7928ca', threshold: 100 },
  { key: 'featured', label: 'Featured', color: '#ff0080', threshold: 300 },
  { key: 'top_tier', label: 'Top Tier', color: '#f0883e', threshold: 750 },
];

const TIER_CONFIG: Record<string, { color: string; label: string }> = Object.fromEntries(
  TIERS.map(t => [t.key, { color: t.color, label: t.label }])
);

const CATEGORY_TAGS: Record<string, string> = {
  'Pi Commerce':     '#mapofpi #pinetwork #picommerce #crypto',
  'Photography':     '#photography #portraits #memories #photographer',
  'Brand Awareness': '#branding #marketing #growthhacking',
  'Product Launch':  '#productlaunch #startup #newproduct',
  'Other':           '#marketing #ads #business #antcpu',
};

// ─── TierStrip ────────────────────────────────────────────────────────────────

function TierStrip({ points, tier }: { points: number; tier: string }) {
  const currentIdx = TIERS.findIndex(t => t.key === tier);
  const current    = TIERS[currentIdx] || TIERS[0];
  const next       = TIERS[currentIdx + 1] || null;

  const progress = next
    ? Math.min(((points - current.threshold) / (next.threshold - current.threshold)) * 100, 100)
    : 100;
  const ptsToNext = next ? next.threshold - points : 0;

  return (
    <div style={{
      background: '#0a0a0a', border: `1px solid ${current.color}25`,
      borderRadius: '10px', padding: '0.85rem 1rem', marginTop: '0.75rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, color: current.color,
            background: `${current.color}15`, border: `1px solid ${current.color}30`,
            borderRadius: '999px', padding: '0.1rem 0.5rem',
          }}>
            {current.label}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#555' }}>⚡ {points} pts</span>
        </div>
        {next && (
          <span style={{ fontSize: '0.68rem', color: '#444' }}>
            {ptsToNext} pts → <span style={{ color: next.color }}>{next.label}</span>
          </span>
        )}
        {!next && (
          <span style={{ fontSize: '0.68rem', color: current.color, fontWeight: 700 }}>
            🏆 Top Tier
          </span>
        )}
      </div>
      <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '999px',
          width: `${progress}%`,
          background: next
            ? `linear-gradient(90deg, ${current.color}, ${next.color})`
            : current.color,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {TIERS.map((t, i) => {
          const unlocked  = points >= t.threshold;
          const isCurrent = t.key === tier;
          return (
            <span key={t.key} style={{
              fontSize: '0.6rem', fontWeight: 700,
              color:      isCurrent ? t.color : unlocked ? t.color + '80' : '#333',
              background: isCurrent ? `${t.color}15` : 'transparent',
              border:     `1px solid ${isCurrent ? t.color + '40' : unlocked ? t.color + '20' : '#1a1a1a'}`,
              borderRadius: '999px', padding: '0.1rem 0.45rem',
              transition: 'all 0.2s',
            }}>
              {i > 0 && <span style={{ marginRight: '0.2rem', opacity: 0.4 }}>→</span>}
              {t.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [showCount,      setShowCount]      = useState(10);

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/doorbell', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: '/dashboard/user',
        ref:  document.referrer || 'direct',
        ts:   new Date().toISOString(),
        ua:   navigator.userAgent,
      }),
    }).catch(() => {});

    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }

    try {
      const u: SessionUser = JSON.parse(stored);
      if (u.role === 'super') { router.push('/dashboard/antcpu'); return; }
      if (u.role === 'admin') { router.push('/dashboard/users');  return; }
      setUser(u);
      setHydrated(true);
      fetchData(u.email);

      supabase
        .from('ad_profiles').select('bio')
        .eq('email', u.email.trim().toLowerCase()).maybeSingle()
        .then(({ data }) => { if (data?.bio) setHasProfile(true); });

      supabase
        .from('ad_signups').select('promo_code')
        .eq('email', u.email.trim().toLowerCase()).maybeSingle()
        .then(({ data }) => {
          setReferralCode(
            data?.promo_code ||
            u.brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || ''
          );
        });
    } catch { router.push('/'); return; }
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────

  async function fetchData(email: string) {
    setLoading(true);
    const [
      { data: mine },
      { data: arena },
      { data: signups },
      { data: rankData },
    ] = await Promise.all([
      supabase.from('ads').select('*')
        .eq('email', email).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1),
      supabase.from('ads').select('*')
        .eq('status', 'active')
        .order('pinned',  { ascending: false })
        .order('points',  { ascending: false }),
      supabase.from('ad_signups').select('email, promo_code'),
      supabase.from('ads').select('rank_position')
        .eq('email', email).eq('status', 'active')
        .order('rank_position', { ascending: true }).limit(1),
    ]);

    const promoMap: Record<string, string> = {};
    (signups || []).forEach((s: { email: string; promo_code: string | null }) => {
      if (s.promo_code) promoMap[s.email] = s.promo_code.toLowerCase();
    });

    const enrich = (ads: Ad[]) =>
      ads.map(a => ({ ...a, promo_code: promoMap[a.email] || null }));

    if (rankData?.[0]?.rank_position > 0) setMyRank(rankData[0].rank_position);

    const enrichedMine = enrich(mine || []);
    setMyAd(enrichedMine[0] || null);
    setArenaAds(enrich(arena || []));
    setLoading(false);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function trackClick(ad: Ad) {
    if (ad.id.startsWith('sample-') || !user) return;
    try {
      const n = (ad.click_count || 0) + 1;
      await Promise.all([
        supabase.from('ad_clicks').insert([{ ad_id: ad.id, email: user.email, source: 'dashboard_feed' }]),
        supabase.from('ads').update({ click_count: n }).eq('id', ad.id),
      ]);
      fetch('/api/scout/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: ad.id }),
      }).catch(() => {});

      // 🔒 Routed through API
      if (n % 10 === 0) {
        pingDiscord(
          `👆 **Click Milestone** — ${ad.brand} hit **${n} clicks**\n**Ad:** "${ad.title}"\n**Email:** ${ad.email}`,
          'click_milestone'
        );
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
      const n = (ad.share_count || 0) + 1;
      supabase.from('ads').update({ share_count: n }).eq('id', ad.id).then(() => {
        fetch('/api/scout/score', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ad_id: ad.id }),
        }).catch(() => {});
      });

      // 🔒 Routed through API
      pingDiscord(
        `↗ **Ad Shared** — ${ad.brand}\n**Title:** "${ad.title}"\n**By:** ${user.email}\n**Shares:** ${n}`,
        'share'
      );
    }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!hydrated || !user) return null;

  // ── Derived ───────────────────────────────────────────────────────────────

  const isTeam    = user.trialStatus === 'team';
  const accent    = isTeam ? '#7928ca' : '#0070f3';
  const firstName = user.name?.includes('@')
    ? user.brand || user.email.split('@')[0]
    : user.name?.split(' ')[0];

  const showOnboarding = !hasProfile || !myAd;
  const myPoints       = myAd?.points || 0;
  const myTierKey      = myAd?.tier   || 'entry';
  const nextTier       = TIERS.find(t => t.threshold > myPoints);
  const ptsToNext      = nextTier ? nextTier.threshold - myPoints : 0;
  const showStrip      = !!myAd;

  // ── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#111', border: '1px solid #1a1a1a',
    borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem',
  };

  const lbl: React.CSSProperties = {
    fontSize: '0.68rem', color: '#555', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem',
  };

  const pill = (color: string): React.CSSProperties => ({
    border: `1px solid ${color}40`, color, background: 'transparent',
    borderRadius: '999px', padding: '0.15rem 0.6rem',
    fontSize: '0.68rem', fontWeight: 700,
  });

  const btn = (bg: string, color = '#fff', border = 'none'): React.CSSProperties => ({
    background: bg, border, color, borderRadius: '8px',
    padding: '0.5rem 1rem', fontSize: '0.82rem',
    fontWeight: 700, cursor: 'pointer',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role={user.role as 'super' | 'admin' | 'team' | 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── Welcome ── */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
            Welcome back, {firstName} ⚡
          </div>
          <div style={{ fontSize: '0.78rem', color: '#555', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={pill(accent)}>{user.brand}</span>
            <span>·</span>
            <span>{isTeam ? 'Team — Unlimited' : 'Free'}</span>
            {myRank && <><span>·</span><span style={{ color: '#f0883e' }}>#{myRank} in the Arena</span></>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/create-ad')} style={btn(accent)}>📢 Create Ad</button>
            <button onClick={() => router.push(`/profile/${encodeURIComponent(user.email)}`)} style={btn('transparent', accent, `1px solid ${accent}`)}>👤 Profile</button>
            <button onClick={() => router.push('/arena')} style={btn('transparent', '#555', '1px solid #333')}>🏟 Arena</button>
          </div>
        </div>

        {/* ── Tier Progress Strip ── */}
        {showStrip && (
          <div style={card}>
            <div style={lbl}>Your Progress</div>
            <TierStrip points={myPoints} tier={myTierKey} />
          </div>
        )}

        {/* ── Points to next tier nudge ── */}
        {showStrip && nextTier && ptsToNext <= 30 && (
          <div style={{ ...card, border: `1px solid ${nextTier.color}40`, background: `${nextTier.color}08` }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: nextTier.color, marginBottom: '0.3rem' }}>
              ⚡ {ptsToNext} pts to {nextTier.label}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem' }}>
              Share your ad once to earn 10 points — you're almost there.
            </div>
            <button onClick={() => myAd && shareAd(myAd)} style={btn(nextTier.color, '#fff')}>
              ↗ Share Now → {nextTier.label}
            </button>
          </div>
        )}

        {/* ── Onboarding ── */}
        {showOnboarding && (
          <div style={card}>
            <div style={lbl}>Getting Started</div>
            {[
              { label: "You're in the Arena", desc: `Signed up as ${user.name}`, done: true,       href: null },
              { label: 'Complete Your Profile', desc: 'Add your bio and contact details',           done: hasProfile, href: `/profile/${encodeURIComponent(user.email)}` },
              { label: 'Create Your First Ad',  desc: 'Build and launch your first ad',            done: !!myAd,     href: '/create-ad' },
            ].map((step, i) => (
              <div
                key={i}
                onClick={() => step.href && !step.done && router.push(step.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem',
                  background: step.done ? '#0d1f0d' : '#0a0a0a',
                  border: `1px solid ${step.done ? '#1a3a1a' : '#222'}`,
                  borderRadius: '10px',
                  cursor: step.href && !step.done ? 'pointer' : 'default',
                  marginBottom: '0.5rem',
                }}>
                <span style={{ fontSize: '1.1rem' }}>{step.done ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{step.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem' }}>{step.desc}</div>
                </div>
                {!step.done && step.href && <span style={{ color: '#555', fontSize: '0.85rem' }}>→</span>}
              </div>
            ))}
          </div>
        )}

        {/* ── My Ad ── */}
        <div style={card}>
          <div style={lbl}>My Ad</div>
          {!myAd ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div style={{ color: '#555', marginBottom: '1rem', fontSize: '0.88rem' }}>No active ad yet</div>
              <button onClick={() => router.push('/create-ad')} style={btn(accent)}>Create Ad →</button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{myAd.title}</span>
                <span style={pill(TIER_CONFIG[myAd.tier]?.color || accent)}>
                  {TIER_CONFIG[myAd.tier]?.label || 'Entry'}
                </span>
                <span style={pill('#22c55e')}>🟢 Live</span>
                {(myAd.click_count || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#555' }}>👆 {myAd.click_count}</span>}
                {(myAd.share_count || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#555' }}>↗ {myAd.share_count}</span>}
                {(myAd.points     || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#f0883e' }}>⚡ {myAd.points} pts</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem', lineHeight: 1.5 }}>
                {myAd.description}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/arena')} style={btn('transparent', accent, `1px solid ${accent}`)}>🏟 View in Arena</button>
                <button onClick={() => shareAd(myAd)} style={btn(accent)}>↗ Share</button>
                <button onClick={() => router.push('/create-ad')} style={btn('transparent', '#555', '1px solid #333')}>✏️ Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Referral ── */}
        {referralCode && (
          <div style={card}>
            <div style={lbl}>Your Referral Link</div>
            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '0.75rem' }}>
              Share this link — anyone who signs up through it joins under your brand.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', color: accent, fontWeight: 700, fontSize: '0.88rem' }}>
                {referralCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/login?ref=${referralCode}`);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                style={btn(referralCopied ? '#22c55e' : accent)}>
                {referralCopied ? '✅ Copied' : '📋 Copy Link'}
              </button>
            </div>
          </div>
        )}

        {/* ── Arena nudge ── */}
        {myAd && (myAd.share_count || 0) === 0 && (myAd.click_count || 0) > 0 && (
          <div style={{ ...card, border: '1px solid #f0883e40', background: '#f0883e08' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f0883e', marginBottom: '0.4rem' }}>
              ⚡ Your ad has clicks — now share it
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem' }}>
              One share = 10 points. Shares are the fastest way to climb the Arena.
            </div>
            <button onClick={() => shareAd(myAd)} style={btn('#f0883e', '#000')}>
              ↗ Share My Ad Now
            </button>
          </div>
        )}

        {/* ── Arena feed ── */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={lbl}>The Arena</div>
            <button onClick={() => router.push('/arena')} style={btn('transparent', accent, `1px solid ${accent}`)}>
              View All →
            </button>
          </div>
          {loading ? (
            <div style={{ color: '#555', fontSize: '0.85rem', padding: '1rem 0' }}>Loading arena...</div>
          ) : (
            <div>
              {arenaAds.slice(0, showCount).map(ad => {
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
                      marginBottom: '0.75rem', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = tier.color + '60')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? '#f0883e40' : '#1a1a1a')}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span
                        onClick={e => { e.stopPropagation(); router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                        style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color, cursor: 'pointer' }}>
                        {ad.brand}
                      </span>
                      {ad.pinned          && <span style={pill('#f0883e')}>⭐ Featured</span>}
                      {isOwn              && <span style={pill('#22c55e')}>Your Ad</span>}
                      <span style={pill(tier.color)}>{tier.label}</span>
                      {ad.rank_position && ad.rank_position <= 3 && (
                        <span>{ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      {ad.description.length > 90 ? ad.description.slice(0, 90) + '…' : ad.description}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={e => { e.stopPropagation(); window.open(ad.url, '_blank', 'noopener,noreferrer'); }}
                        style={btn(tier.color)}>
                        Visit →
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); shareAd(ad); }}
                        style={btn('transparent', sharedId === ad.id ? '#22c55e' : '#555', '1px solid #333')}>
                        {sharedId === ad.id ? '✅ Shared' : '↗ Share'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {arenaAds.length > showCount ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => setShowCount(c => c + 10)}
                    style={{ ...btn('transparent', accent, `1px solid ${accent}`), flex: 1 }}>
                    Load {Math.min(10, arenaAds.length - showCount)} more ↓
                  </button>
                  <button
                    onClick={() => router.push('/arena')}
                    style={{ ...btn('transparent', '#555', '1px solid #333'), flex: 1 }}>
                    Full Arena →
                  </button>
                </div>
              ) : arenaAds.length > 10 ? (
                <button
                  onClick={() => router.push('/arena')}
                  style={{ ...btn('transparent', accent, `1px solid ${accent}`), width: '100%', marginTop: '0.5rem' }}>
                  You've seen all {arenaAds.length} ads — Open Full Arena →
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <ArenaFooter />
    </div>
  );
}
