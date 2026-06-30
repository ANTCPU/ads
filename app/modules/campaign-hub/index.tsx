'use client';
import { useEffect, useState } from 'react';
import { ModuleContext, Ad } from '../types';

const TIER_COLOR: Record<string, string> = {
  toptier: '#f0883e', featured: '#ff0080', rising: '#7928ca', entry: '#0070f3',
};

type TierGroup = { tier: string; count: number; totalPoints: number };

export default function CampaignHubModule({ slug, supabase }: ModuleContext) {
  const [groups, setGroups] = useState<TierGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ads')
        .select('tier, points, status')
        .eq('status', 'active');

      if (!data) { setLoading(false); return; }

      const map: Record<string, TierGroup> = {};
      data.forEach((ad: { tier: string; points: number }) => {
        const t = ad.tier || 'entry';
        if (!map[t]) map[t] = { tier: t, count: 0, totalPoints: 0 };
        map[t].count++;
        map[t].totalPoints += ad.points || 0;
      });

      const order = ['toptier', 'featured', 'rising', 'entry'];
      const sorted = order.filter(t => map[t]).map(t => map[t]);
      setGroups(sorted);
      setTotal(data.length);
      setLoading(false);
    }
    fetch();
  }, [slug]);

  const TIER_LABEL: Record<string, string> = {
    toptier: 'Top Tier', featured: 'Featured', rising: 'Rising', entry: 'Entry',
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📡 Campaign Hub</div>
        {!loading && <div style={{ fontSize: '0.7rem', color: '#555' }}>{total} active</div>}
      </div>
      {loading ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading...</div>
      ) : groups.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>No active campaigns.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {groups.map(g => (
            <div key={g.tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: '#0a0a0a', borderRadius: '8px', border: `1px solid ${TIER_COLOR[g.tier]}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TIER_COLOR[g.tier] || '#333' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: TIER_COLOR[g.tier] }}>{TIER_LABEL[g.tier] || g.tier}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#555' }}>{g.count} ads</span>
                <span style={{ fontSize: '0.72rem', color: '#444' }}>{g.totalPoints} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
