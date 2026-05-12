'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Entry = {
  email: string;
  brand_name: string;
  name: string;
  status: string;
  points: number;
  ad_count: number;
  top_tier: string;
  created_at?: string;
  trial_expiry?: string;
};

const TIER_POINTS: Record<string, number> = {
  top_tier: 750,
  featured:  300,
  rising:    100,
  entry:       0,
};

const TIER_LABEL: Record<string, string> = {
  top_tier: '🏆 Top Tier',
  featured: '⭐ Featured',
  rising:   '📈 Rising',
  entry:    '🟢 Entry',
};

const RANK_BADGE: Record<number, string> = {
  0: '🥇',
  1: '🥈',
  2: '🥉',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userBrand, setUserBrand] = useState('');
  const [trialStatus, setTrialStatus] = useState<'team' | 'trial' | 'pending'>('trial');

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/login'); return; }
    try {
      const u = JSON.parse(stored);
      setUserName(u.name || '');
      setUserEmail(u.email || '');
      setUserBrand(u.brand || '');
      setTrialStatus(u.trialStatus || 'trial');
      if (u.email === 'antcpu@gmail.com') setRole('admin');
    } catch { router.push('/login'); return; }
    setHydrated(true);
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);

    // Pull all active ads grouped by email
    const { data: ads } = await supabase
      .from('ads')
      .select('email, name, brand, tier, points')
      .eq('status', 'active');

    // Pull signups for brand_name + status
    const { data: signups } = await supabase
      .from('ad_signups')
      .select('email, brand_name, name, status, points, created_at, trial_expiry');

    if (!ads || !signups) { setLoading(false); return; }

    // Group ads by email
    const map: Record<string, Entry> = {};

    for (const ad of ads) {
      if (!map[ad.email]) {
        const signup = signups.find(s => s.email?.toLowerCase() === ad.email?.toLowerCase());
        map[ad.email] = {
          email:     ad.email,
          brand_name: signup?.brand_name || ad.brand || ad.name || ad.email,
          name:      signup?.name || ad.name || '',
          status:    signup?.status || 'trial',
          points:    0,
          ad_count:  0,
          top_tier:  'entry',
        };
      }
      map[ad.email].ad_count += 1;
      map[ad.email].points += TIER_POINTS[ad.tier] ?? 0;
      if ((TIER_POINTS[ad.tier] ?? 0) > (TIER_POINTS[map[ad.email].top_tier] ?? 0)) {
        map[ad.email].top_tier = ad.tier;
      }
    }

    // Also include signups with points even if no active ads
    for (const s of signups) {
      if (!map[s.email] && (s.points ?? 0) > 0) {
        map[s.email] = {
          email:     s.email,
          brand_name: s.brand_name || s.name || s.email,
          name:      s.name || '',
          status:    s.status || 'trial',
          points:    s.points || 0,
          ad_count:  0,
          top_tier:  'entry',
        };
      }
    }

    const sorted = Object.values(map).sort((a, b) => b.points - a.points);
    setEntries(sorted);
    setLoading(false);
  }

  function trialCountdown(expiry?: string): string | null {
    if (!expiry) return null;
    const diff = new Date(expiry).getTime() - Date.now();
    if (diff <= 0) return 'expired';
    const days = Math.floor(diff / 86400000);
    const hrs  = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d left` : `${hrs}h left`;
  }

  if (!hydrated) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#333', fontSize: '0.85rem' }}>loading...</div>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role={role}
        userName={userName}
        userEmail={userEmail}
        userBrand={userBrand}
        trialStatus={trialStatus}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <button onClick={() => router.push(role === 'admin' ? '/dashboard' : '/dashboard/user')}
              style={{ background: 'none', border: 'none', color: '#444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, marginBottom: '0.75rem' }}>
              ← {role === 'admin' ? 'Admin' : 'Dashboard'}
            </button>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.3rem' }}>🏆 Leaderboard</h1>
            <p style={{ color: '#444', fontSize: '0.88rem' }}>Ranked by ad points · updates as tiers change</p>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4AF37' }}>{entries.length}</div>
            <div style={{ fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em' }}>COMPETITORS</div>
          </div>
        </div>

        {/* Tier legend */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' as const }}>
          {Object.entries(TIER_LABEL).map(([tier, label]) => (
            <div key={tier} style={{ fontSize: '0.72rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
              {label} · {TIER_POINTS[tier]}pts
            </div>
          ))}
        </div>

        {/* Board */}
        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem' }}>loading rankings...</div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#333', fontSize: '0.85rem' }}>no active ads yet — be the first</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
            {entries.map((e, i) => (
              <div key={e.email + i} style={{
                background: i === 0 ? '#D4AF3708' : i === 1 ? '#C0C0C008' : i === 2 ? '#CD7F3208' : '#111',
                border: `1px solid ${i === 0 ? '#D4AF3730' : i === 1 ? '#C0C0C020' : i === 2 ? '#CD7F3220' : '#1a1a1a'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                {/* Rank */}
                <div style={{ fontSize: i < 3 ? '1.5rem' : '1rem', minWidth: '2rem', textAlign: 'center' as const, color: i >= 3 ? '#333' : undefined }}>
                  {RANK_BADGE[i] ?? `#${i + 1}`}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' as const }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{e.brand_name || e.name || e.email}</span>
                    <span style={{ fontSize: '0.68rem', color: '#555' }}>{TIER_LABEL[e.top_tier]}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '0.15rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const }}>
                    <span>{e.ad_count} active ad{e.ad_count !== 1 ? 's' : ''} · {e.status}</span>
                    {e.created_at && <span>joined {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    {e.status === 'trial' && trialCountdown(e.trial_expiry) && (
                      <span style={{ color: trialCountdown(e.trial_expiry) === 'expired' ? '#ff4444' : '#f0c040' }}>
                        ⏱ {trialCountdown(e.trial_expiry)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: i === 0 ? '#D4AF37' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#f0883e' }}>
                    {e.points}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.08em' }}>PTS</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state CTA */}
        {!loading && entries.length === 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'center' as const }}>
            <button onClick={() => router.push('/create-ad')}
              style={{ background: '#f0883e', border: 'none', borderRadius: '10px', padding: '0.75rem 2rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
              Submit Your First Ad →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
