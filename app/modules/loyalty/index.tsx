'use client';
// app/modules/loyalty/index.tsx
// ─── Loyalty Module ───────────────────────────────────────────────────────────
//
// Explains the loyalty system clearly, then renders the appropriate state.
//
// Sections:
//   1. Context block  — always visible — explains trial → restart → badge
//   2. Active card    — shown when user is active/team (LoyaltyCard returns null)
//   3. LoyaltyCard    — handles trial warning / expired / restart states
//
// v2 (Sep 2026):
//   — Context block added — system is now self-explanatory
//   — Active state card added — no more blank render for active members
//   — Text sizes bumped to 0.85rem+ throughout
//   — Points + tier shown for active members
//   — Fetches user's top ad for tier display
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { ModuleContext }        from '../types';
import LoyaltyCard              from '../../components/LoyaltyCard';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  blue:    '#0070f3',
  purple:  '#7928ca',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  top_tier: '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};

const TIER_LABEL: Record<string, string> = {
  top_tier: 'Top Tier',
  featured: 'Featured',
  rising:   'Rising',
  entry:    'Entry',
};

const TIER_NEXT_PTS: Record<string, number | null> = {
  entry:    50,
  rising:   150,
  featured: 300,
  top_tier: null,
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SignupRow = {
  status:            string;
  created_at:        string;
  points:            number;
  trial_extended_at: string | null;
};

type TopAd = {
  tier:   string;
  points: number;
  title:  string;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoyaltyModule({ user, supabase }: ModuleContext) {
  const [row,        setRow]        = useState<SignupRow | null>(null);
  const [topAd,      setTopAd]      = useState<TopAd | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!user.email) { setLoading(false); return; }
    Promise.all([
      supabase
        .from('ad_signups')
        .select('status, created_at, points, trial_extended_at')
        .eq('email', user.email.trim().toLowerCase())
        .maybeSingle(),
      supabase
        .from('ads')
        .select('tier, points, title')
        .eq('email', user.email.trim().toLowerCase())
        .eq('status', 'active')
        .order('points', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([signupRes, adRes]) => {
      setRow(signupRes.data   || null);
      setTopAd(adRes.data     || null);
      setLoading(false);
    });
  }, [user.email]);

  async function handleRestart() {
    if (!user.email || restarting) return;
    setRestarting(true);
    try {
      const res  = await fetch('/api/loyalty/restart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (data.ok && data.extended) {
        setRow(prev => prev
          ? { ...prev, trial_extended_at: new Date().toISOString() }
          : prev
        );
      }
    } catch {}
    setRestarting(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isActive = row?.status === 'active' || row?.status === 'team';
  const tier      = topAd?.tier || 'entry';
  const tierColor = TIER_COLOR[tier] || C.blue;
  const tierLabel = TIER_LABEL[tier] || 'Entry';
  const nextPts   = TIER_NEXT_PTS[tier];
  const points    = row?.points || 0;
  const ptsToNext = nextPts !== null ? Math.max(nextPts - points, 0) : 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ color: C.muted, fontSize: '0.85rem' }}>Loading...</div>
  );

  if (!row) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* ── Section header ── */}
      <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '1.25rem' }}>
        🔄 Loyalty
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONTEXT BLOCK — always visible — explains the system
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:   C.bg,
        border:       `1px solid ${C.border}`,
        borderRadius: '12px',
        padding:      '1.1rem 1.25rem',
        marginBottom: '1rem',
      }}>
        <div style={{
          fontSize:      '0.65rem',
          color:         C.orange,
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom:  '0.85rem',
        }}>
          How Loyalty Works
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[
            {
              icon:  '🆓',
              title: '3-Day Free Trial',
              desc:  'Full access from day one. No card required. Your ad goes live immediately.',
              color: C.blue,
            },
            {
              icon:  '⚡',
              title: 'Earn Points in the Arena',
              desc:  'Every share, like, boost, and reaction earns points. Points determine your tier — Entry → Rising → Featured → Top Tier.',
              color: C.orange,
            },
            {
              icon:  '🔄',
              title: 'Loyalty Restart',
              desc:  'If your trial expires and you have points, you qualify for a free 7-day extension. Your activity proves you belong here.',
              color: C.green,
            },
            {
              icon:  '🏅',
              title: 'Loyal Member Badge',
              desc:  'Restarting awards the permanent 🔄 Loyal Member badge — visible on your profile and ad cards forever.',
              color: C.gold,
            },
          ].map(step => (
            <div key={step.title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.05rem' }}>{step.icon}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: step.color, marginBottom: '0.15rem' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: C.sub, lineHeight: 1.55 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVE STATE CARD
          Shown when LoyaltyCard would return null (active/team members)
      ══════════════════════════════════════════════════════════════════ */}
      {isActive && (
        <div style={{
          background:   '#0a1a0a',
          border:       `1px solid ${C.green}30`,
          borderLeft:   `3px solid ${C.green}`,
          borderRadius: '12px',
          padding:      '1.1rem 1.25rem',
          marginBottom: '1rem',
        }}>
          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: C.green, display: 'inline-block',
              boxShadow: `0 0 6px ${C.green}80`,
            }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.green }}>
              Your ad is live
            </span>
            <span style={{
              marginLeft:   'auto',
              fontSize:     '0.65rem',
              color:        row.status === 'team' ? C.gold : C.green,
              background:   row.status === 'team' ? `${C.gold}15` : `${C.green}15`,
              border:       `1px solid ${row.status === 'team' ? C.gold : C.green}30`,
              borderRadius: '999px',
              padding:      '0.15rem 0.5rem',
              fontWeight:   700,
              textTransform: 'uppercase',
            }}>
              {row.status === 'team' ? '⚡ Team' : '✅ Active'}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '8px',
              padding:      '0.6rem 0.85rem',
              flex:         1,
              minWidth:     '80px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.orange }}>
                {points.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Points
              </div>
            </div>
            <div style={{
              background:   C.card,
              border:       `1px solid ${tierColor}30`,
              borderRadius: '8px',
              padding:      '0.6rem 0.85rem',
              flex:         1,
              minWidth:     '80px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: tierColor }}>
                {tierLabel}
              </div>
              <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Current Tier
              </div>
            </div>
          </div>

          {/* Tier progress */}
          {nextPts !== null && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: C.muted, marginBottom: '0.35rem' }}>
                <span>Progress to <span style={{ color: tierColor, fontWeight: 700 }}>
                  {tier === 'entry' ? 'Rising' : tier === 'rising' ? 'Featured' : 'Top Tier'}
                </span></span>
                <span style={{ color: C.orange, fontWeight: 700 }}>
                  {ptsToNext > 0 ? `${ptsToNext} pts to go` : '✅ Unlocked'}
                </span>
              </div>
              <div style={{ height: '5px', background: C.border, borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height:     '100%',
                  width:      `${Math.min((points / nextPts) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${tierColor}, ${tierColor}88)`,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Top ad */}
          {topAd && (
            <div style={{ fontSize: '0.78rem', color: C.sub, marginBottom: '0.85rem' }}>
              Top ad: <span style={{ color: C.text, fontWeight: 600 }}>
                {topAd.title.length > 40
                  ? topAd.title.slice(0, 40) + '…'
                  : topAd.title}
              </span>
              <span style={{ color: C.orange, marginLeft: '0.5rem' }}>
                ⚡ {topAd.points} pts
              </span>
            </div>
          )}

          {/* Nudge */}
          <div style={{
            fontSize:     '0.78rem',
            color:        C.dim,
            lineHeight:   1.55,
            borderTop:    `1px solid ${C.border}`,
            paddingTop:   '0.75rem',
          }}>
            {nextPts !== null && ptsToNext > 0
              ? `Share your ad ${ptsToNext > 20 ? 'more' : 'once more'} to reach ${tier === 'entry' ? 'Rising' : tier === 'rising' ? 'Featured' : 'Top Tier'} tier — higher placement, more visibility.`
              : nextPts === null
              ? '🏆 You\'re at the top tier. Maximum placement. Keep sharing to stay there.'
              : `You've hit the ${tierLabel} threshold. Keep engaging to maintain your position.`
            }
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOYALTY CARD — trial warning / expired / restart states
          Returns null for active/team — handled above
      ══════════════════════════════════════════════════════════════════ */}
      <LoyaltyCard
        status={row.status}
        createdAt={row.created_at}
        points={points}
        trialExtendedAt={row.trial_extended_at}
        restarting={restarting}
        onRestart={handleRestart}
        onUpgrade={() => {
          if (typeof window !== 'undefined') window.location.href = '/?upgrade=1';
        }}
      />

      {/* ── Tier ladder reference ── */}
      <div style={{
        background:   C.bg,
        border:       `1px solid ${C.border}`,
        borderRadius: '12px',
        padding:      '1rem 1.25rem',
        marginTop:    '0.75rem',
      }}>
        <div style={{
          fontSize:      '0.65rem',
          color:         C.muted,
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom:  '0.75rem',
        }}>
          Promotion Ladder
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[
            { tier: 'entry',    label: 'Entry',    pts: 0,   desc: 'Your ad is live'              },
            { tier: 'rising',   label: 'Rising',   pts: 50,  desc: 'Growing reach'                },
            { tier: 'featured', label: 'Featured', pts: 150, desc: 'Top of feed placement'        },
            { tier: 'top_tier', label: 'Top Tier', pts: 300, desc: 'Maximum exposure — pinned'    },
          ].map(step => {
            const isCurrentTier = step.tier === tier;
            const isPast        = points >= step.pts;
            const color         = TIER_COLOR[step.tier];
            return (
              <div key={step.tier} style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '0.75rem',
                padding:      '0.5rem 0.65rem',
                background:   isCurrentTier ? `${color}10` : 'transparent',
                border:       `1px solid ${isCurrentTier ? color + '40' : C.border}`,
                borderRadius: '8px',
              }}>
                <span style={{
                  width:        '8px',
                  height:       '8px',
                  borderRadius: '50%',
                  background:   isPast ? color : C.dim,
                  flexShrink:   0,
                  boxShadow:    isCurrentTier ? `0 0 6px ${color}80` : 'none',
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: isCurrentTier ? 700 : 400, color: isPast ? color : C.muted }}>
                    {step.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: C.dim, marginLeft: '0.5rem' }}>
                    {step.desc}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: isPast ? color : C.dim, fontWeight: 700 }}>
                  {step.pts === 0 ? 'Start' : `${step.pts} pts`}
                </span>
                {isCurrentTier && (
                  <span style={{
                    fontSize:     '0.6rem',
                    color:        color,
                    background:   `${color}15`,
                    border:       `1px solid ${color}30`,
                    borderRadius: '999px',
                    padding:      '0.1rem 0.4rem',
                    fontWeight:   700,
                  }}>
                    You
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
