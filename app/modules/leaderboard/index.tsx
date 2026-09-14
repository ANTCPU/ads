// app/modules/leaderboard/index.tsx
// ─── Leaderboard module — brand scope + arena scope ───────────────────────────
//
// scope detection (automatic — no prop needed):
//   slug === 'arena'  →  arena mode: fetches /api/stats topAds, shows network leaderboard
//   any other slug    →  brand mode: queries ads table filtered by user.brand
//
// Arena I threshold:
//   ARENA_I_THRESHOLD = 10_000
//   Progress bar shows totalPoints / 10_000
//   Commented config block at bottom — ready to wire to /api/stats or flags when needed
//
// Fixes vs previous version:
//   - BRAND_MAP removed — uses user.brand directly
//   - TIER_COLOR removed — imported from adminTokens (G)
//   - rank_position medals added (🥇🥈🥉 + #4–10) via rankMedal()
//   - arena scope no longer returns 0 rows
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState }   from 'react';
import { ModuleContext }          from '../types';
import { rankMedal }              from '../../lib/adminTokens';

// ─── Arena I config ───────────────────────────────────────────────────────────
// When ready to wire to /api/stats or a flag, replace this block.
// For now: hardcoded + commented so the build is solid and the intent is clear.

const ARENA_I_THRESHOLD = 10_000;  // total network points to close Arena I
const ARENA_I_LABEL     = 'Arena I — The Founding Arena';
// const ARENA_II_LABEL = 'Arena II — The Growth Arena';  // uncomment when Arena I closes

// ─── Tier colours — Arena feed palette (not admin palette) ───────────────────
const TIER_COLOR: Record<string, string> = {
  top_tier: '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};
const tierColor = (tier: string) => TIER_COLOR[tier] || '#0070f3';

// ─── Types ────────────────────────────────────────────────────────────────────

type TopAd = {
  id:             string;
  brand:          string;
  points:         number;
  rank_position?: number;
  share_count?:   number;
  click_count?:   number;
  tier?:          string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaderboardModule({ slug, supabase, user }: ModuleContext) {
  const [ads,         setAds]         = useState<TopAd[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading,     setLoading]     = useState(true);

  const isArena = slug === 'arena';

  useEffect(() => {
    if (isArena) {
      loadArena();
    } else {
      loadBrand();
    }
  }, [slug]);

  // ── Arena mode — consume /api/stats (already cached at 60s) ──────────────
  async function loadArena() {
    setLoading(true);
    try {
      const res  = await fetch('/api/stats');
      const data = await res.json();
      setAds(data.topAds   || []);
      setTotalPoints(data.totalPoints || 0);
    } catch {}
    setLoading(false);
  }

  // ── Brand mode — query by user.brand ─────────────────────────────────────
  async function loadBrand() {
    setLoading(true);
    const brandName = user.brand || slug;
    const { data } = await supabase
      .from('ads')
      .select('id, brand, points, rank_position, share_count, click_count, tier')
      .ilike('brand', `%${brandName}%`)
      .eq('status', 'active')
      .order('points', { ascending: false })
      .limit(8);
    setAds(data || []);
    setLoading(false);
  }

  // ── Arena progress ────────────────────────────────────────────────────────
  const progress    = Math.min((totalPoints / ARENA_I_THRESHOLD) * 100, 100);
  const ptsLeft     = Math.max(ARENA_I_THRESHOLD - totalPoints, 0);
  const progressPct = progress.toFixed(1);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e0e0e0' }}>
          🏆 {isArena ? 'Arena I Leaderboard' : `${user.brand || slug} — Top Ads`}
        </div>
        {isArena && (
          <span style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700,
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
            {ads.length} ranked
          </span>
        )}
      </div>

      {/* Arena I progress bar */}
      {isArena && (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a',
          borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f0883e' }}>
              ⚡ {ARENA_I_LABEL}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#555' }}>
              {totalPoints.toLocaleString()} / {ARENA_I_THRESHOLD.toLocaleString()} pts
            </div>
          </div>

          {/* Progress track */}
          <div style={{ height: '6px', background: '#1a1a1a',
            borderRadius: '999px', overflow: 'hidden', marginBottom: '0.4rem' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress >= 100
                ? '#22c55e'
                : `linear-gradient(90deg, #f0883e, #D4AF37)`,
              borderRadius: '999px',
              transition: 'width 0.6s ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#444' }}>
              {progressPct}% complete
            </span>
            {ptsLeft > 0 ? (
              <span style={{ fontSize: '0.65rem', color: '#555' }}>
                {ptsLeft.toLocaleString()} pts until Arena II opens
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 700 }}>
                🏆 Arena I complete
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rows */}
      {loading ? (
        <div style={{ color: '#555', fontSize: '0.8rem', padding: '0.5rem 0' }}>
          Loading...
        </div>
      ) : ads.length === 0 ? (
        <div style={{ color: '#555', fontSize: '0.8rem', padding: '0.5rem 0' }}>
          {isArena ? 'No ads ranked yet — be the first.' : 'No ads for this brand yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ads.map((ad, i) => {
            const medal    = rankMedal(ad.rank_position ?? (i + 1));
            const isMedal  = (ad.rank_position ?? (i + 1)) <= 3;
            const color    = tierColor(ad.tier || 'entry');
            const position = ad.rank_position ?? (i + 1);

            return (
              <div key={ad.id} style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '0.75rem',
                padding:    '0.6rem 0.75rem',
                background: isMedal ? '#111' : '#0a0a0a',
                border:     `1px solid ${isMedal ? color + '30' : '#1a1a1a'}`,
                borderLeft: `3px solid ${isMedal ? color : '#1a1a1a'}`,
                borderRadius: '8px',
                transition: 'border-color 0.15s',
              }}>

                {/* Position */}
                <div style={{
                  fontSize:   isMedal ? '1rem' : '0.72rem',
                  color:      isMedal ? undefined : '#444',
                  width:      '24px',
                  textAlign:  'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {medal || `#${position}`}
                </div>

                {/* Brand + title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize:     '0.8rem',
                    fontWeight:   700,
                    color:        '#e0e0e0',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {ad.brand}
                  </div>
                  {/* Engagement micro-stats */}
                  {((ad.click_count || 0) > 0 || (ad.share_count || 0) > 0) && (
                    <div style={{ display: 'flex', gap: '0.5rem',
                      fontSize: '0.62rem', color: '#444', marginTop: '0.15rem' }}>
                      {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                      {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count}</span>}
                    </div>
                  )}
                </div>

                {/* Points + tier */}
                <div style={{ display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: color,
                    fontWeight: 700 }}>
                    ⚡ {(ad.points || 0).toLocaleString()}
                  </span>
                  {ad.tier && (
                    <span style={{ fontSize: '0.6rem', color: color,
                      opacity: 0.7, textTransform: 'uppercase',
                      letterSpacing: '0.05em' }}>
                      {ad.tier}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Arena I footnote */}
      {isArena && ads.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.65rem',
          color: '#333', textAlign: 'center', lineHeight: 1.5 }}>
          Top brands in Arena I earn Founding status — permanent, visible forever.
          {/* Arena II opens at {ARENA_I_THRESHOLD.toLocaleString()} total network points. */}
        </div>
      )}

    </div>
  );
}
