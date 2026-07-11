'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav    from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import { clearSessionCookie } from '../../lib/session';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry' },
  rising:   { color: '#7928ca', label: 'Rising' },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':          '#D4AF37',
  'ANTCPU ADS':         '#f0883e',
  'ANTCPU':             '#f0883e',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':        '#7928ca',
};

const MEDALS = ['🥇', '🥈', '🥉'];

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaderAd = {
  id:            string;
  brand:         string;
  title:         string;
  email:         string;
  tier:          string;
  points:        number;
  click_count:   number;
  share_count:   number;
  rank_position: number;
  is_system:     boolean;
};

type SessionUser = {
  name:        string;
  email:       string;
  brand:       string;
  trialStatus: string;
  role?:       string;
};

type Filter = 'all' | 'user' | 'system';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [user, setUser]         = useState<SessionUser | null>(null);
  const [ads, setAds]           = useState<LeaderAd[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<Filter>('all');
  const [myRank, setMyRank]     = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u: SessionUser = JSON.parse(stored);
      setUser(u);
      fetchLeaderboard(u.email);
    } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  async function fetchLeaderboard(email: string) {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('id, brand, title, email, tier, points, click_count, share_count, rank_position, is_system')
      .eq('status', 'active')
      .order('points',      { ascending: false })
      .order('click_count', { ascending: false });

    const ranked = (data || []).sort(
      (a, b) => (a.rank_position || 999) - (b.rank_position || 999)
    );

    const mine = ranked.find(a => a.email === email);
    if (mine) setMyRank(mine.rank_position);
    setAds(ranked); // ← was missing
    setLoading(false);
  }

  if (!hydrated || !user) return null;

  // — derived
  const isSuper = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const accent  = isSuper ? '#f0883e' : user.trialStatus === 'team' ? '#7928ca' : '#0070f3';
  const myAd    = ads.find(a => a.email === user.email);

  const filtered = ads.filter(ad => {
    if (filter === 'user')   return !ad.is_system;
    if (filter === 'system') return ad.is_system;
    return true;
  });

  const filterCounts = {
    all:    ads.length,
    user:   ads.filter(a => !a.is_system).length,
    system: ads.filter(a =>  a.is_system).length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={isSuper ? 'admin' : user.role === 'mod' ? 'admin' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            ⚡ ANTCPU ADS
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.6rem' }}>Leaderboard</div>
          <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.25rem' }}>
            Ranked by points · updates live · {ads.length} active ads
          </div>
        </div>

        {/* My rank banner */}
        {myAd && (
          <div style={{ background: `${accent}10`, border: `1px solid ${accent}30`, borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Your Position</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: accent }}>#{myRank} — {myAd.brand}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.2rem' }}>
                {myAd.points} pts · {myAd.click_count || 0} clicks · {myAd.share_count || 0} shares
              </div>
            </div>
            <div style={{ fontSize: '2rem' }}>
              {myRank && myRank <= 3 ? MEDALS[myRank - 1] : '🏅'}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(['all', 'user', 'system'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background:   filter === f ? accent : '#111',
                border:       `1px solid ${filter === f ? accent : '#222'}`,
                color:        filter === f ? '#fff' : '#555',
                borderRadius: '8px',
                padding:      '0.4rem 1rem',
                fontSize:     '0.78rem',
                fontWeight:   600,
                cursor:       'pointer',
              }}
            >
              {f === 'all'    ? `All (${filterCounts.all})`       :
               f === 'user'   ? `Brands (${filterCounts.user})`   :
               `System (${filterCounts.system})`}
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Loading leaderboard...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>No ads in this category yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((ad, i) => {
              const tier  = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
              const rank  = ads.indexOf(ad) + 1;
              const isMe  = ad.email === user.email;
              const medal = rank <= 3 ? MEDALS[rank - 1] : null;
              const brandColor = BRAND_COLORS[ad.brand] || tier.color;

              return (
                <div
                  key={ad.id}
                  onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '1rem',
                    background:   isMe ? `${accent}10` : '#111',
                    border:       `1px solid ${isMe ? accent + '40' : '#1a1a1a'}`,
                    borderLeft:   `3px solid ${brandColor}`,
                    borderRadius: '10px',
                    padding:      '0.9rem 1rem',
                    cursor:       'pointer',
                    transition:   'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = brandColor + '60')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = isMe ? accent + '40' : '#1a1a1a')}
                >
                  {/* Rank */}
                  <div style={{ minWidth: '2rem', textAlign: 'center', fontSize: medal ? '1.2rem' : '0.82rem', fontWeight: 800, color: medal ? undefined : '#555' }}>
                    {medal || `#${rank}`}
                  </div>

                  {/* Brand + title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: brandColor }}>{ad.brand}</span>
                      {ad.is_system && <span style={{ fontSize: '0.6rem', color: '#555', background: '#1a1a1a', border: '1px solid #222', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>SYSTEM</span>}
                      {isMe && <span style={{ fontSize: '0.6rem', color: accent, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>YOU</span>}
                      <span style={{ fontSize: '0.65rem', color: tier.color, fontWeight: 700, textTransform: 'uppercase' }}>{tier.label}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f0883e' }}>{ad.points} pts</div>
                    <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                      👆{ad.click_count || 0} · ↗{ad.share_count || 0}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/arena#ad-${ad.id}`); }}
                      style={{ marginTop: '0.4rem', fontSize: '0.65rem', background: 'transparent', border: '1px solid #222', borderRadius: '6px', color: '#555', padding: '2px 8px', cursor: 'pointer' }}
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ArenaFooter />
    </div>
  );
}
