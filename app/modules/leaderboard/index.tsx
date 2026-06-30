'use client';
import { useEffect, useState } from 'react';
import { ModuleContext, Ad } from '../types';

const TIER_COLOR: Record<string, string> = {
  toptier: '#f0883e', featured: '#ff0080', rising: '#7928ca', entry: '#0070f3',
};

export default function LeaderboardModule({ slug, supabase }: ModuleContext) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ads')
        .select('id, title, brand, points, tier, pinned')
        .eq('status', 'active')
        .order('points', { ascending: false })
        .limit(8);
      setAds(data || []);
      setLoading(false);
    }
    fetch();
  }, [slug]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>🏆 Leaderboard</div>
      {loading ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading...</div>
      ) : ads.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>No ads ranked yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ads.map((ad, i) => (
            <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: i === 0 ? '#f0883e' : '#333', width: '20px', textAlign: 'center', fontWeight: 700 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.title}</div>
                <div style={{ fontSize: '0.68rem', color: '#555' }}>{ad.brand}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', color: TIER_COLOR[ad.tier] || '#0070f3', fontWeight: 700 }}>{ad.tier?.toUpperCase()}</span>
                <span style={{ fontSize: '0.65rem', color: '#555' }}>{ad.points || 0} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
