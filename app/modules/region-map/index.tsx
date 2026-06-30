'use client';
import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';

type RegionRow = {
  country: string;
  city: string;
  region: string;
};

type RegionCount = {
  country: string;
  count: number;
};

export default function RegionalMapModule({ slug, supabase }: ModuleContext) {
  const [regions, setRegions] = useState<RegionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
  async function fetchRegions() {
    const res = await fetch('/api/regions');
    const { counts, total } = await res.json();
    setRegions(counts || []);
    setTotal(total || 0);
    setLoading(false);
  }
  fetchRegions();
}, [slug]);


      if (!data) { setLoading(false); return; }

      // Count by country
      const counts: Record<string, number> = {};
      data.forEach((row: { country: string }) => {
        const c = row.country?.trim() || 'Unknown';
        counts[c] = (counts[c] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      setRegions(sorted);
      setTotal(data.length);
      setLoading(false);
    }
    fetchRegions();
  }, [slug]);

  const top = regions.slice(0, 8);
  const max = top[0]?.count || 1;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🌍 Regional Map</div>
        {!loading && (
          <div style={{ fontSize: '0.7rem', color: '#555' }}>
            {total} signups · {regions.length} countries
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading regions...</div>
      ) : regions.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>No regional data yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {top.map((r, i) => (
            <div key={r.country}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.78rem', color: i === 0 ? '#f0883e' : '#aaa' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {r.country}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#555' }}>{r.count}</span>
              </div>
              <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(r.count / max) * 100}%`,
                  background: i === 0 ? '#f0883e' : '#333',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ))}
          {regions.length > 8 && (
            <div style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.25rem' }}>
              +{regions.length - 8} more countries
            </div>
          )}
        </div>
      )}
    </div>
  );
}
