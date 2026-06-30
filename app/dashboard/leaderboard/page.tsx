'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  entry:    { color: '#0070f3', label: 'Entry',    icon: '📝' },
  rising:   { color: '#7928ca', label: 'Rising',   icon: '🖼' },
  featured: { color: '#ff0080', label: 'Featured', icon: '🎬' },
  toptier:  { color: '#f0883e', label: 'Top Tier', icon: '☁️' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

type LeaderAd = {
  id: string; brand: string; title: string; email: string;
  tier: string; points: number; click_count: number;
  share_count: number; score: number; rank_position: number;
  is_system: boolean;
};

type User = { name: string; email: string; brand: string; trialStatus: string };


const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':          '#2E7D32',
  'ANTCPU ADS':         '#f0883e',
  'ANTCPU':             '#f0883e',
  'ANTCPU EDU':         '#0070f3',
  'ANTCPU CLOUD':       '#00ffcc',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':        '#FFD700',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ads, setAds] = useState<LeaderAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'user' | 'system'>('all');
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      fetchLeaderboard(u.email);
    } catch { router.push('/'); }
    setHydrated(true);
  }, []);

  async function fetchLeaderboard(email: string) {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('id, brand, title, email, tier, points, click_count, share_count, score, rank_position, is_system')
      .eq('status', 'active')
      .order('points', { ascending: false })
      .order('click_count', { ascending: false });

    const ranked = (data || []).sort((a, b) => (a.rank_position || 999) - (b.rank_position || 999));

    const mine = ranked.find(a => a.email === email);
    if (mine) setMyRank(mine.rank_position);
    setLoading(false);
  }

  if (!hydrated || !user) return null;

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam  = user.trialStatus === 'team';
  const accent  = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';

  const filtered = ads.filter(ad => {
    if (filter === 'user')   return !ad.is_system;
    if (filter === 'system') return ad.is_system;
    return true;
  });

  const myAd = ads.find(a => a.email === user.email);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as any}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            ⚡ ANTCPU ADS
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Leaderboard</h1>
          <div style={{ color: '#555', fontSize: '0.88rem', marginTop: '0.4rem' }}>
            Ranked by points · updates live · {ads.length} active ads
          </div>
        </div>

        {/* My rank banner */}
        {myAd && (
          <div style={{
            background: `${accent}15`, border: `1px solid ${accent}40`,
            borderRadius: '12px', padding: '1rem 1.25rem',
            marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Position</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>#{myRank} — {myAd.brand}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>{myAd.points} pts · {myAd.click_count || 0} clicks · {myAd.share_count || 0} shares</div>
            </div>
            <div style={{ fontSize: '2rem' }}>{myRank && myRank <= 3 ? MEDALS[myRank - 1] : '🏅'}</div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'user', 'system'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? accent : '#111',
              border: `1px solid ${filter === f ? accent : '#222'}`,
              color: filter === f ? '#fff' : '#555',
              borderRadius: '8px', padding: '0.4rem 1rem',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              textTransform: 'capitalize',
            }}>
              {f === 'all' ? `All (${ads.length})` : f === 'user' ? `Brands (${ads.filter(a => !a.is_system).length})` : `System (${ads.filter(a => a.is_system).length})`}
            </button>
          ))}
        </div>

        {/* Leaderboard list */}
        {loading ? (
          <div style={{ color: '#444', textAlign: 'center', padding: '3rem' }}>Loading leaderboard...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#444', textAlign: 'center', padding: '3rem' }}>No ads in this category yet.</div>
        ) : (
          filtered.map((ad, i) => {
            const tier  = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
            const rank  = ads.indexOf(ad) + 1;
            const isMe  = ad.email === user.email;
            const medal = rank <= 3 ? MEDALS[rank - 1] : null;

            return (
              <div key={ad.id} onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: isMe ? `${accent}10` : '#111',
                  border: `1px solid ${isMe ? accent + '40' : '#1a1a1a'}`,
                  borderLeft: `3px solid ${BRAND_COLORS[ad.brand] || tier.color}`,
                  borderRadius: '10px', padding: '0.9rem 1rem',
                  marginBottom: '0.5rem', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>

                {/* Rank */}
                <div style={{ minWidth: '2rem', textAlign: 'center', fontSize: medal ? '1.3rem' : '0.85rem', fontWeight: 700, color: medal ? undefined : '#444' }}>
                  {medal || `#${rank}`}
                </div>

                {/* Brand + title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: BRAND_COLORS[ad.brand] || tier.color }}>{ad.brand}</span>
                    {ad.is_system && <span style={{ fontSize: '0.65rem', background: '#ffffff10', border: '1px solid #333', color: '#555', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>SYSTEM</span>}
                    {isMe && <span style={{ fontSize: '0.65rem', background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: '4px', padding: '0.1rem 0.4rem' }}>YOU</span>}
                    <span style={{ fontSize: '0.68rem', color: '#444' }}>{tier.label}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{ad.points} <span style={{ fontSize: '0.7rem', color: '#555' }}>pts</span></div>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.2rem' }}>
                    👆{ad.click_count || 0} ↗{ad.share_count || 0}
                  </div>
                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`https://antcpu-ads.vercel.app/arena#ad-${ad.id}`); }} style={{ marginTop: '0.4rem', fontSize: '0.68rem', background: 'transparent', border: '1px solid #222', borderRadius: '6px', color: '#555', padding: '2px 8px', cursor: 'pointer' }}>🔗 Share</button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#333', fontSize: '0.75rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #111' }}>
          
        </div>
      </div>
    </div>
  );
}
