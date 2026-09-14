// app/embed/mapofpi/page.tsx
// ─── Map of Pi Arena embed — for mapofpi.com Wix HTML widget ──────────────────
// Self-contained page. No nav, no footer, no auth.
// Light theme — matches mapofpi.com white/gold palette.
// Fetches from /api/embed/mapofpi (60s cached, service role, no key exposure).
// Auto-refreshes every 60s.
// Drop into Wix via: <iframe src="https://antcpu-ads.vercel.app/embed/mapofpi" ...>
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';

// ─── Palette — matches mapofpi.com light theme ────────────────────────────────
const C = {
  bg:      '#ffffff',
  card:    '#f9f9f9',
  border:  '#e8e8e8',
  text:    '#1a1a2e',
  muted:   '#666',
  dim:     '#999',
  gold:    '#c9a227',
  goldBg:  '#fffbf0',
  goldBdr: '#f0d060',
  blue:    '#1a3a6e',
  green:   '#1a7a3a',
  orange:  '#c85a00',
};

const TIER_COLOR: Record<string, string> = {
  top_tier: C.orange,
  featured: '#9b1a8a',
  rising:   '#5a1a9b',
  entry:    C.blue,
};

const TIER_LABEL: Record<string, string> = {
  top_tier: 'Top Tier',
  featured: 'Featured',
  rising:   'Rising',
  entry:    'Entry',
};

type Ad = {
  id:             string;
  title:          string;
  description:    string;
  url:            string;
  tier:           string;
  points:         number;
  rank_position?: number;
  share_count?:   number;
  click_count?:   number;
  reaction_count?: number;
};

type EmbedData = {
  ads:         Ad[];
  totalPoints: number;
  topRank:     number | null;
  adCount:     number;
  generatedAt: string;
};

export default function MapOfPiEmbed() {
  const [data,    setData]    = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  async function load() {
    try {
      const res  = await fetch('/api/embed/mapofpi');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Auto-refresh every 60s — matches CDN cache window
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: C.dim, fontSize: '0.85rem' }}>Loading Map of Pi Arena...</div>
    </div>
  );

  if (error || !data) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: C.dim, fontSize: '0.85rem' }}>Unable to load — try refreshing.</div>
    </div>
  );

  const medal = (rank?: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:  C.bg,
      minHeight:   '100vh',
      fontFamily:  'system-ui, -apple-system, sans-serif',
      padding:     '1.5rem 1.25rem 2rem',
      boxSizing:   'border-box',
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: C.text }}>
            🗺️ Map of Pi — Arena Campaign
          </div>
          <span style={{
            background: C.goldBg, border: `1px solid ${C.goldBdr}`,
            borderRadius: '999px', padding: '0.2rem 0.65rem',
            fontSize: '0.65rem', color: C.gold, fontWeight: 700,
          }}>
            ⚡ LIVE
          </span>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Arena Points',  value: data.totalPoints.toLocaleString(), color: C.gold  },
            { label: 'Active Ads',    value: data.adCount,                      color: C.blue  },
            { label: 'Network Rank',  value: data.topRank ? `#${data.topRank}` : '#1', color: C.orange },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.62rem', color: C.muted,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.15rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${C.gold}, transparent)`,
        marginBottom: '1.25rem', borderRadius: '999px' }} />

      {/* ── Ad cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.ads.map((ad, i) => {
          const rank  = ad.rank_position ?? (i + 1);
          const m     = medal(rank);
          const color = TIER_COLOR[ad.tier] || C.blue;
          const isTop = rank <= 3;

          return (
            <a
              key={ad.id}
              href={ad.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background:   isTop ? C.goldBg : C.card,
                border:       `1px solid ${isTop ? C.goldBdr : C.border}`,
                borderLeft:   `3px solid ${isTop ? C.gold : color}`,
                borderRadius: '10px',
                padding:      '0.85rem 1rem',
                cursor:       'pointer',
                transition:   'box-shadow 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>

                  {/* Rank medal */}
                  <div style={{
                    fontSize:   m ? '1.1rem' : '0.72rem',
                    color:      m ? undefined : C.dim,
                    width:      '24px',
                    textAlign:  'center',
                    flexShrink: 0,
                    paddingTop: '0.1rem',
                    fontWeight: 700,
                  }}>
                    {m || `#${rank}`}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight:   700,
                      fontSize:     '0.88rem',
                      color:        C.text,
                      marginBottom: '0.25rem',
                      lineHeight:   1.3,
                    }}>
                      {ad.title}
                    </div>
                    <div style={{
                      fontSize:   '0.75rem',
                      color:      C.muted,
                      lineHeight: 1.4,
                      marginBottom: '0.5rem',
                    }}>
                      {ad.description.length > 90
                        ? ad.description.slice(0, 90) + '…'
                        : ad.description}
                    </div>

                    {/* Footer row */}
                    <div style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>

                      {/* Tier badge */}
                      <span style={{
                        fontSize:     '0.6rem',
                        fontWeight:   700,
                        color:        color,
                        background:   `${color}15`,
                        border:       `1px solid ${color}30`,
                        borderRadius: '999px',
                        padding:      '0.15rem 0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {TIER_LABEL[ad.tier] || ad.tier}
                      </span>

                      {/* Engagement + points */}
                      <div style={{ display: 'flex', gap: '0.75rem',
                        fontSize: '0.68rem', color: C.muted }}>
                        {(ad.click_count  || 0) > 0 && <span>👆 {ad.click_count}</span>}
                        {(ad.share_count  || 0) > 0 && <span>↗ {ad.share_count}</span>}
                        {(ad.reaction_count || 0) > 0 && <span>⚡ {ad.reaction_count}</span>}
                        <span style={{ color: C.gold, fontWeight: 700 }}>
                          ⚡ {(ad.points || 0).toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Footer CTA ── */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <a
          href="https://antcpu-ads.vercel.app/mapofpi?promo=MAPOFPI"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:        'inline-block',
            background:     C.gold,
            color:          '#fff',
            fontWeight:     700,
            fontSize:       '0.85rem',
            padding:        '0.65rem 1.5rem',
            borderRadius:   '8px',
            textDecoration: 'none',
            marginBottom:   '0.75rem',
          }}
        >
          ⚡ Place Your Shop Ad in the Arena →
        </a>
        <div style={{ fontSize: '0.62rem', color: C.dim }}>
          Powered by{' '}
          <a href="https://antcpu-ads.vercel.app/arena"
            target="_blank" rel="noopener noreferrer"
            style={{ color: C.dim }}>
            ANTCPU ADS Arena
          </a>
          {' '}· updates every 60s
        </div>
      </div>

    </div>
  );
}
