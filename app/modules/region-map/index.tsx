'use client';
import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type RegionCount = {
  country: string;
  count:   number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegionalMapModule({ slug, isSuper }: ModuleContext) {
  const [regions, setRegions]   = useState<RegionCount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [total, setTotal]       = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/regions')
      .then(r => r.json())
      .then(({ counts, total }) => {
        setRegions(counts || []);
        setTotal(total || 0);
        setLoading(false);
      });
  }, [slug]);

  const max     = regions[0]?.count || 1;
  const display = isSuper
    ? (expanded ? regions : regions.slice(0, 20))
    : regions.slice(0, 8);

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🌍 Regional Map
        </div>
        {loading ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading...</div>
        ) : regions.length === 0 ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>No regional data yet.</div>
        ) : (
          <>
            <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem' }}>
              {total} signups · {regions.length} countries
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {display.map((r, i) => (
                <div key={r.country} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#555', minWidth: '20px' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{r.country}</span>
                      <span style={{ fontSize: '0.7rem', color: '#555' }}>{r.count}</span>
                    </div>
                    <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: '#0070f3', borderRadius: '2px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {regions.length > 8 && (
              <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.5rem' }}>
                +{regions.length - 8} more countries
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ─── Super admin view ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🌍 Regional Map — Admin
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
          <span style={{ color: '#0070f3', fontWeight: 700 }}>{total} signups</span>
          <span style={{ color: '#555' }}>{regions.length} countries</span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading...</div>
      ) : regions.length === 0 ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>No regional data yet.</div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { label: 'Top Country',  value: regions[0]?.country || '—',       color: '#D4AF37' },
              { label: 'Top Count',    value: regions[0]?.count || 0,            color: '#f0883e' },
              { label: 'Countries',    value: regions.length,                    color: '#0070f3' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#555', marginTop: '0.15rem' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Full country list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {display.map((r, i) => (
              <div key={r.country} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: i === 0 ? '#D4AF3710' : 'transparent', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#555', minWidth: '24px', fontWeight: 700 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: i < 3 ? 700 : 400 }}>{r.country}</span>
                    <span style={{ fontSize: '0.72rem', color: '#f0883e', fontWeight: 700 }}>{r.count}</span>
                  </div>
                  <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, background: i === 0 ? '#D4AF37' : i < 3 ? '#f0883e' : '#0070f3', borderRadius: '2px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#555', minWidth: '32px', textAlign: 'right' }}>
                  {Math.round((r.count / total) * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Show more / less */}
          {regions.length > 20 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ marginTop: '0.75rem', background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', cursor: 'pointer', width: '100%' }}
            >
              {expanded ? `Show less` : `Show all ${regions.length} countries`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
