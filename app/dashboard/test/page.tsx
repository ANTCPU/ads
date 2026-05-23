'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestDashboard() {
  const router = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ts, setTs]         = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/agent?token=antcpu-agent-2026');
      const j = await r.json();
      setData(j);
      setTs(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading || !data) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'system-ui' }}>
      Loading...
    </div>
  );

  const accent = '#f0883e';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: accent }}>⚡ Arena Status</div>
            <div style={{ fontSize: '0.72rem', color: '#333', marginTop: '0.2rem' }}>
              {data.build?.version} · refreshed {ts}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={load} style={{ background: accent, border: 'none', color: '#000', borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>↻ Refresh</button>
            <button onClick={() => router.push('/dashboard/antcpu')} style={{ background: 'none', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}>← Admin</button>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Active Ads',     value: data.arena.total_active_ads, icon: '📢', color: '#0070f3' },
            { label: 'Users',          value: data.arena.total_users,      icon: '👥', color: '#7928ca' },
            { label: 'Clicks Today',   value: data.today.clicks,           icon: '👆', color: '#22c55e' },
            { label: 'Pending Review', value: data.health.pending_review,  icon: '🦋', color: data.health.pending_review > 0 ? accent : '#333' },
            { label: 'Archived',       value: data.health.archived_total,  icon: '📦', color: '#333' },
            { label: 'Image Ready',    value: `${data.image_readiness.pct_ready}%`, icon: '🖼', color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: `1px solid ${s.color}25`, borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, margin: '0.2rem 0' }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: '#444' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Today note */}
        <div style={{ background: '#111', border: `1px solid ${accent}25`, borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#888' }}>
          📅 {data.today.note}
        </div>

        {/* Leaderboard */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', marginBottom: '1rem' }}>🏆 TOP 5</div>
          {data.leaderboard.map((ad: any) => (
            <div key={ad.rank} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #0a0a0a' }}>
              <div style={{ fontWeight: 800, minWidth: '28px', textAlign: 'center', fontSize: '0.9rem', color: ad.rank === 1 ? accent : '#333' }}>
                {ad.rank === 1 ? '🥇' : ad.rank === 2 ? '🥈' : ad.rank === 3 ? '🥉' : `#${ad.rank}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                <div style={{ fontSize: '0.68rem', color: '#444' }}>
                  {ad.brand} · {ad.tier}{ad.is_system ? ' · sys' : ''}{ad.has_image ? ' · 🖼' : ' · text'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: accent, fontSize: '0.85rem' }}>⚡{ad.points}</div>
                <div style={{ fontSize: '0.65rem', color: '#444' }}>👆{ad.clicks} ↗{ad.shares}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Brands */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', marginBottom: '1rem' }}>🏷 BRANDS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
            {data.brands.map((b: any) => (
              <div key={b.brand} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', marginBottom: '0.3rem' }}>{b.brand}</div>
                <div style={{ fontSize: '0.68rem', color: '#555' }}>📢 {b.ads} ads · ⚡ {b.points}pts</div>
                <div style={{ fontSize: '0.68rem', color: '#444' }}>👆 {b.clicks} · ↗ {b.shares}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Build flags */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff', marginBottom: '0.75rem' }}>🏗 BUILD — {data.build?.version}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            {Object.entries(data.build?.features || {}).map(([k, v]) => (
              <span key={k} style={{ background: '#22c55e15', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: '5px', padding: '0.15rem 0.45rem', fontSize: '0.65rem', fontWeight: 600 }}>
                ✓ {k.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(data.build?.deluxe_coming_soon || []).map((k: string) => (
              <span key={k} style={{ background: '#f0883e10', border: '1px solid #f0883e25', color: '#f0883e', borderRadius: '5px', padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>
                🔒 {k.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Raw JSON — collapsed */}
        <details style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#333', fontWeight: 600 }}>{ } Raw JSON</summary>
          <pre style={{ marginTop: '1rem', fontSize: '0.68rem', color: '#444', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>

        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.68rem', color: '#1a1a1a' }}>
          ⚡ ANTCPU ADS · Arena Status · Step 1 of N
        </div>
      </div>
    </div>
  );
}
