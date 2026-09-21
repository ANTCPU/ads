'use client';
// app/modules/featured-candidates/index.tsx
// ─── Featured Candidates — super admin only ───────────────────────────────────
//
// Shows ranked list of all active users scored by engagement.
// Lets admin set the featured-profile badge holder with one click.
//
// Engagement score = points + (shares×3) + (reactions×2) + likes + boosts + clicks
// Weighted: shares and reactions signal active promotion, not just passive points.
//
// Data sources:
//   ad_signups  — name, brand_name, points, email
//   ads         — share_count, like_count, boost_count, reaction_count, click_count
//   user_badges — badge_count, currently holds featured-profile
//
// Only renders when isSuper = true. Returns null otherwise.
// "Set as Featured" → POST /api/badges/rotate → rotateSingleHolderBadge()
//
// v1 (Sep 2026)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { ModuleContext }                     from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidate = {
  email:          string;
  name:           string;
  brand:          string;
  points:         number;
  totalShares:    number;
  totalLikes:     number;
  totalBoosts:    number;
  totalReactions: number;
  totalClicks:    number;
  badgeCount:     number;
  score:          number;
  isFeatured:     boolean;
};

// ─── Design tokens — matches admin palette (G) ────────────────────────────────
const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  blue:    '#0070f3',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  red:     '#ef4444',
};

// ─── Engagement score formula ─────────────────────────────────────────────────
function engagementScore(c: Omit<Candidate, 'score' | 'isFeatured'>): number {
  return (
    c.points +
    c.totalShares    * 3 +
    c.totalReactions * 2 +
    c.totalLikes         +
    c.totalBoosts        +
    Math.floor(c.totalClicks / 2)
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturedCandidatesModule({ supabase, isSuper, user }: ModuleContext) {

  const [candidates,    setCandidates]    = useState<Candidate[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [acting,        setActing]        = useState<string | null>(null);
  const [toast,         setToast]         = useState<string | null>(null);
  const [currentHolder, setCurrentHolder] = useState<string | null>(null);

  // ── Guard — super admin only ──────────────────────────────────────────────
  if (!isSuper) return null;

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get all signups
      const { data: signups } = await supabase
        .from('ad_signups')
        .select('email, name, brand_name, points')
        .order('points', { ascending: false });

      if (!signups || signups.length === 0) { setLoading(false); return; }

      // 2. Get all active ads — aggregate by email
      const { data: ads } = await supabase
        .from('ads')
        .select('email, share_count, like_count, boost_count, reaction_count, click_count')
        .eq('status', 'active');

      // 3. Get all badges — count per user + find featured holder
      const { data: badges } = await supabase
        .from('user_badges')
        .select('user_email, badge_slug');

      // ── Aggregate ads by email ────────────────────────────────────────────
      const adMap: Record<string, {
        shares: number; likes: number; boosts: number;
        reactions: number; clicks: number;
      }> = {};

      for (const ad of (ads || [])) {
        if (!adMap[ad.email]) adMap[ad.email] = { shares: 0, likes: 0, boosts: 0, reactions: 0, clicks: 0 };
        adMap[ad.email].shares    += ad.share_count    || 0;
        adMap[ad.email].likes     += ad.like_count     || 0;
        adMap[ad.email].boosts    += ad.boost_count    || 0;
        adMap[ad.email].reactions += ad.reaction_count || 0;
        adMap[ad.email].clicks    += ad.click_count    || 0;
      }

      // ── Badge count + featured holder ─────────────────────────────────────
      const badgeCountMap: Record<string, number> = {};
      let featuredEmail: string | null = null;

      for (const b of (badges || [])) {
        badgeCountMap[b.user_email] = (badgeCountMap[b.user_email] || 0) + 1;
        if (b.badge_slug === 'featured-profile') featuredEmail = b.user_email;
      }

      setCurrentHolder(featuredEmail);

      // ── Build candidate list ──────────────────────────────────────────────
      const list: Candidate[] = signups.map(s => {
        const eng = adMap[s.email] || { shares: 0, likes: 0, boosts: 0, reactions: 0, clicks: 0 };
        const base = {
          email:          s.email,
          name:           s.name           || s.email,
          brand:          s.brand_name     || '—',
          points:         s.points         || 0,
          totalShares:    eng.shares,
          totalLikes:     eng.likes,
          totalBoosts:    eng.boosts,
          totalReactions: eng.reactions,
          totalClicks:    eng.clicks,
          badgeCount:     badgeCountMap[s.email] || 0,
          isFeatured:     s.email === featuredEmail,
        };
        return { ...base, score: engagementScore(base) };
      });

      // Sort by score desc
      list.sort((a, b) => b.score - a.score);
      setCandidates(list);

    } catch {}
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Set featured ──────────────────────────────────────────────────────────
  async function setFeatured(email: string) {
    if (acting) return;
    setActing(email);
    try {
      const res  = await fetch('/api/badges/rotate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, awardedBy: user.email }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast(`⭐ ${email} is now featured`);
        setTimeout(() => setToast(null), 3000);
        await load();
      } else {
        setToast(`❌ Failed: ${data.error}`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast('❌ Network error');
      setTimeout(() => setToast(null), 3000);
    }
    setActing(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: C.text, marginBottom: '0.15rem' }}>
            ⭐ Featured Candidates
          </div>
          <div style={{ fontSize: '0.68rem', color: C.muted }}>
            Ranked by engagement score · click to set featured
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {currentHolder && (
            <span style={{
              fontSize: '0.62rem', color: C.gold, fontWeight: 700,
              background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
              borderRadius: '999px', padding: '0.15rem 0.5rem',
            }}>
              ⭐ {currentHolder.split('@')[0]}
            </span>
          )}
          <button
            onClick={load}
            style={{ background: 'none', border: `1px solid ${C.border2}`, borderRadius: '6px', color: C.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          background: C.card, border: `1px solid ${C.border2}`,
          borderRadius: '8px', padding: '0.5rem 0.85rem',
          fontSize: '0.78rem', color: C.green,
          marginBottom: '0.75rem', fontWeight: 700,
        }}>
          {toast}
        </div>
      )}

      {/* Score legend */}
      <div style={{
        background: C.card2, border: `1px solid ${C.border}`,
        borderRadius: '8px', padding: '0.5rem 0.85rem',
        fontSize: '0.62rem', color: C.dim,
        marginBottom: '0.85rem', lineHeight: 1.6,
      }}>
        Score = pts + shares×3 + reactions×2 + likes + boosts + clicks÷2
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ color: C.muted, fontSize: '0.82rem', padding: '1rem 0' }}>
          Loading candidates...
        </div>
      )}

      {/* Empty */}
      {!loading && candidates.length === 0 && (
        <div style={{ color: C.muted, fontSize: '0.82rem', padding: '1rem 0' }}>
          No candidates found.
        </div>
      )}

      {/* Candidate list */}
      {!loading && candidates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {candidates.map((c, i) => {
            const isBusy      = acting === c.email;
            const isCurrent   = c.isFeatured;
            const rankColor   = i === 0 ? C.gold : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : C.muted;
            const medal       = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

            return (
              <div key={c.email} style={{
                background:   isCurrent ? `${C.gold}08` : C.card,
                border:       `1px solid ${isCurrent ? C.gold + '40' : C.border}`,
                borderLeft:   `3px solid ${isCurrent ? C.gold : i < 3 ? rankColor : C.border}`,
                borderRadius: '10px',
                padding:      '0.75rem 0.85rem',
              }}>
                {/* Row 1 — rank + name + featured badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: medal ? '1rem' : '0.7rem', color: rankColor, width: '24px', textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>
                    {medal || `${i + 1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isCurrent ? C.gold : C.text }}>
                        {c.brand}
                      </span>
                      {isCurrent && (
                        <span style={{
                          fontSize: '0.6rem', color: C.gold, fontWeight: 700,
                          background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
                          borderRadius: '999px', padding: '0.1rem 0.4rem',
                        }}>
                          ⭐ Featured
                        </span>
                      )}
                      {c.badgeCount > 0 && (
                        <span style={{ fontSize: '0.6rem', color: C.blue, background: `${C.blue}15`, border: `1px solid ${C.blue}20`, borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                          {c.badgeCount} badge{c.badgeCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.1rem' }}>
                      {c.name} · {c.email}
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: i < 3 ? rankColor : C.orange }}>
                      {c.score.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>score</div>
                  </div>
                </div>

                {/* Row 2 — engagement breakdown */}
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: C.dim, marginBottom: '0.5rem', flexWrap: 'wrap', paddingLeft: '30px' }}>
                  <span style={{ color: C.orange }}>⚡ {c.points.toLocaleString()} pts</span>
                  {c.totalShares    > 0 && <span>↗ {c.totalShares}</span>}
                  {c.totalReactions > 0 && <span>🔥 {c.totalReactions}</span>}
                  {c.totalLikes     > 0 && <span>😊 {c.totalLikes}</span>}
                  {c.totalBoosts    > 0 && <span>⚡ ×{c.totalBoosts}</span>}
                  {c.totalClicks    > 0 && <span>👆 {c.totalClicks}</span>}
                </div>

                {/* Row 3 — action */}
                {!isCurrent && (
                  <div style={{ paddingLeft: '30px' }}>
                    <button
                      onClick={() => setFeatured(c.email)}
                      disabled={!!acting}
                      style={{
                        background:   isBusy ? C.card2 : `${C.gold}15`,
                        border:       `1px solid ${isBusy ? C.border : C.gold + '50'}`,
                        borderRadius: '6px',
                        color:        isBusy ? C.muted : C.gold,
                        fontWeight:   700,
                        fontSize:     '0.68rem',
                        padding:      '0.3rem 0.75rem',
                        cursor:       isBusy ? 'default' : 'pointer',
                        transition:   'all 0.15s',
                      }}
                    >
                      {isBusy ? '…' : '⭐ Set as Featured'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
